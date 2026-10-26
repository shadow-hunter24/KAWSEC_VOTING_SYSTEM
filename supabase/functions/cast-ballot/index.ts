// ============================================================
// KAWSEC Voting System — Edge Function: cast-ballot
// ============================================================
// The ONLY way votes enter the system. Runs server-side with
// the service-role key so it can bypass RLS for the atomic
// entitlement-consumption + ballot-insert transaction.
//
// Security properties:
//  - Verifies session token issued by verify-credential
//  - Checks every position the student is eligible for
//  - Rejects partial ballots (all eligible positions required)
//  - Uses a Postgres transaction: entitlements consumed AND
//    ballots inserted atomically — either all succeed or none
//  - Ballots table has NO student_id column (ballot secrecy)
//  - Idempotent: if all entitlements already consumed, returns
//    "already voted" without inserting duplicates
//
// Request (POST):
//   {
//     student_id:    string,
//     election_id:   string,
//     session_token: string,   // from verify-credential
//     votes: [{ position_id: string, candidate_id: string }]
//   }
//
// Response 200: { success: true,  ballot_count: number, message: string }
// Response 4xx: { success: false, message: string }
// ============================================================

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set ALLOWED_ORIGIN in Supabase Dashboard secrets to restrict to production domain
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
const CORS = {
  "Access-Control-Allow-Origin":  allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashToken(token: string): Promise<string> {
  const data    = new TextEncoder().encode(token);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ success: false, message: "Method not allowed." }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: {
    student_id?:    string;
    election_id?:   string;
    session_token?: string;
    votes?:         { position_id: string; candidate_id: string }[];
  };

  try { body = await req.json(); }
  catch { return json({ success: false, message: "Invalid request body." }, 400); }

  const { student_id, election_id, session_token, votes } = body;

  // ── 1. Basic validation ─────────────────────────────────────
  if (!student_id || !election_id || !session_token || !votes?.length) {
    return json({ success: false, message: "student_id, election_id, session_token, and votes are required." }, 400);
  }

  // ── 2. Verify session token exists (stored in credential_verifiers.used_at) ─
  // We validate that the credential was used (not revoked, used_at is set)
  const { data: cred } = await supabase
    .from("credential_verifiers")
    .select("id, used_at, revoked, session_token_hash")
    .eq("student_id", student_id)
    .eq("election_id", election_id)
    .eq("revoked", false)
    .not("used_at", "is", null)
    .order("used_at", { ascending: false })
    .limit(1)
    .single();

  if (!cred) {
    return json({
      success: false,
      message: "Invalid or expired session. Please log in again.",
    }, 401);
  }

  // Hash the incoming token and compare to stored hash
  const incomingHash = await hashToken(session_token);
  if (!cred.session_token_hash || incomingHash !== cred.session_token_hash) {
    return json({
      success: false,
      message: "Invalid or expired session. Please log in again.",
    }, 401);
  }

  // ── 3. Check election is still open ─────────────────────────
  const { data: election } = await supabase
    .from("elections")
    .select("id, status, voting_closes_at")
    .eq("id", election_id)
    .single();

  if (!election || election.status !== "open") {
    return json({ success: false, message: "Voting is not currently open." }, 400);
  }

  // Note: voting_closes_at is informational only.
  // The admin manually closes voting via Close Voting button.
  // The status field above is the single source of truth.

  // ── 4. Load student's entitlements ──────────────────────────
  const { data: entitlements } = await supabase
    .from("voting_entitlements")
    .select("id, position_id, consumed")
    .eq("student_id", student_id)
    .eq("election_id", election_id);

  if (!entitlements?.length) {
    return json({ success: false, message: "No voting entitlements found for this student in this election." }, 400);
  }

  // ── 5. Already voted? ────────────────────────────────────────
  const allConsumed = entitlements.every(e => e.consumed);
  if (allConsumed) {
    return json({ success: false, message: "You have already completed voting in this election." }, 400);
  }

  // ── 6. Validate votes cover ALL unconsumed entitlements ─────
  const unconsumedPositionIds = entitlements
    .filter(e => !e.consumed)
    .map(e => e.position_id);

  const votedPositionIds = votes.map(v => v.position_id);

  const missingPositions = unconsumedPositionIds.filter(
    pid => !votedPositionIds.includes(pid)
  );

  if (missingPositions.length > 0) {
    return json({
      success: false,
      message: `Incomplete ballot. You must vote in all ${unconsumedPositionIds.length} eligible positions. Missing: ${missingPositions.length} position(s).`,
    }, 400);
  }

  // ── 7. Validate each vote: candidate must belong to position ─
  for (const vote of votes) {
    const { data: candidate } = await supabase
      .from("candidates")
      .select("id, position_id, status")
      .eq("id", vote.candidate_id)
      .eq("position_id", vote.position_id)
      .eq("status", "approved")
      .single();

    if (!candidate) {
      return json({
        success: false,
        message: `Invalid candidate selection for position ${vote.position_id}.`,
      }, 400);
    }
  }

  // ── 8. Atomic transaction: consume entitlements + insert ballots ─
  // We use Supabase RPC to run this as a single Postgres transaction.
  // The RPC function is defined in migration 0005 below.
  const { data: txResult, error: txError } = await supabase.rpc(
    "cast_ballot_transaction",
    {
      p_student_id:   student_id,
      p_election_id:  election_id,
      p_votes:        JSON.stringify(votes),
    }
  );

  if (txError) {
    // Check for duplicate vote (race condition)
    if (txError.message.includes("already_voted")) {
      return json({ success: false, message: "You have already voted in this election." }, 400);
    }
    console.error("Transaction error:", txError);
    return json({ success: false, message: "Failed to record your ballot. Please try again." }, 500);
  }

  // ── 9. Audit log ─────────────────────────────────────────────
  await supabase.from("audit_events").insert({
    election_id,
    actor:   student_id,
    action:  "ballot.cast",
    details: { ballot_count: votes.length },
  });

  return json({
    success:      true,
    ballot_count: votes.length,
    message:      `Your ballot has been recorded successfully. ${votes.length} vote(s) cast.`,
  });
});
