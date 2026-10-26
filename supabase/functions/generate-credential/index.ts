// ============================================================
// KAWSEC Voting System — Edge Function: generate-credential
// ============================================================
// Called when a student enters their Student ID on the login
// screen. Looks up the student, checks rate limits, generates
// a cryptographically random one-time credential, stores its
// bcrypt hash, and returns the plaintext credential ONCE.
//
// The plaintext is never stored — only the hash is saved.
// The student must use the credential before the session ends.
//
// Request (POST):
//   { student_id_number: string, election_id: string }
//
// Response:
//   200 { success: true,  credential: string, student_name: string, masked_id: string }
//   400 { success: false, message: string }
//   429 { success: false, message: string }  — rate limited
// ============================================================

import { serve }         from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient }  from "https://esm.sh/@supabase/supabase-js@2";

// ── Config ───────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_ATTEMPTS   = 3;
const CREDENTIAL_LENGTH         = 8; // chars — e.g. "X7K2-M9PQ"

// Set ALLOWED_ORIGIN in Supabase Dashboard secrets to restrict to production domain
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
const CORS = {
  "Access-Control-Allow-Origin":  allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ──────────────────────────────────────────────────

/** Generate a random uppercase alphanumeric credential like "X7K2M9PQ" */
function generateCredential(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/1/I confusion
  const bytes = crypto.getRandomValues(new Uint8Array(CREDENTIAL_LENGTH));
  const raw   = Array.from(bytes).map(b => chars[b % chars.length]).join("");
  // Format as XXXX-XXXX for readability
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/** Simple bcrypt-like hash using Web Crypto (SHA-256 + salt).
 *  Production: use a proper bcrypt/argon2 library. */
async function hashCredential(credential: string, salt: string): Promise<string> {
  const data    = new TextEncoder().encode(credential + salt);
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

// ── Handler ──────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return json({ success: false, message: "Method not allowed." }, 405);
  }

  // Service-role client — bypasses RLS for internal operations
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: { student_id_number?: string; election_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, message: "Invalid request body." }, 400);
  }

  const { student_id_number, election_id } = body;

  if (!student_id_number?.trim() || !election_id?.trim()) {
    return json({ success: false, message: "student_id_number and election_id are required." }, 400);
  }

  const studentIdNum = student_id_number.trim().toUpperCase();

  // ── 1. Rate limit check ─────────────────────────────────────
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const { count: recentAttempts } = await supabase
    .from("credential_attempts")
    .select("*", { count: "exact", head: true })
    .eq("student_id_number", studentIdNum)
    .eq("election_id", election_id)
    .gte("attempted_at", windowStart);

  if ((recentAttempts ?? 0) >= RATE_LIMIT_MAX_ATTEMPTS) {
    await supabase.from("credential_attempts").insert({
      student_id_number: studentIdNum,
      election_id,
      success: false,
    });
    return json({
      success: false,
      message: `Too many attempts. Please wait ${RATE_LIMIT_WINDOW_MINUTES} minutes before trying again, or contact the IT Coordinator.`,
    }, 429);
  }

  // ── 2. Look up student ──────────────────────────────────────
  const { data: student, error: stuErr } = await supabase
    .from("students")
    .select("id, full_name, student_id_number, is_active")
    .eq("student_id_number", studentIdNum)
    .eq("is_active", true)
    .single();

  if (stuErr || !student) {
    await supabase.from("credential_attempts").insert({
      student_id_number: studentIdNum,
      election_id,
      success: false,
    });
    return json({
      success: false,
      message: "Student ID not found or account is inactive. Please check your ID card or contact the IT Coordinator.",
    }, 400);
  }

  // ── 3. Check election is open ───────────────────────────────
  const { data: election, error: elecErr } = await supabase
    .from("elections")
    .select("id, status, voting_opens_at, voting_closes_at")
    .eq("id", election_id)
    .single();

  if (elecErr || !election) {
    return json({ success: false, message: "Election not found." }, 400);
  }

  if (election.status !== "open") {
    return json({
      success: false,
      message: `Voting is not currently open. Election status: ${election.status}.`,
    }, 400);
  }

  // Note: voting_opens_at / voting_closes_at are informational only.
  // The admin manually controls the lifecycle via Open Voting / Close Voting.
  // The status field above is the single source of truth.

  // ── 4. Check if already voted (all entitlements consumed) ───
  const { data: entitlements } = await supabase
    .from("voting_entitlements")
    .select("id, consumed")
    .eq("student_id", student.id)
    .eq("election_id", election_id);

  if (entitlements && entitlements.length > 0) {
    const allConsumed = entitlements.every(e => e.consumed);
    if (allConsumed) {
      return json({
        success: false,
        message: "You have already completed voting in this election.",
      }, 400);
    }
  }

  // ── 5. Check for existing unused credential ─────────────────
  // If one exists and is not yet used, revoke it and issue fresh
  await supabase
    .from("credential_verifiers")
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq("student_id", student.id)
    .eq("election_id", election_id)
    .is("used_at", null)
    .eq("revoked", false);

  // ── 6. Generate and store new credential ────────────────────
  const plaintext = generateCredential();
  const salt      = crypto.randomUUID();
  const hash      = await hashCredential(plaintext, salt);
  // Store hash as "salt:hash" so we can verify later
  const verifierHash = `${salt}:${hash}`;

  const { error: insertErr } = await supabase
    .from("credential_verifiers")
    .insert({
      student_id:    student.id,
      election_id,
      verifier_hash: verifierHash,
    });

  if (insertErr) {
    console.error("Failed to store credential:", insertErr);
    return json({
      success: false,
      message: "Failed to generate credential. Please try again.",
    }, 500);
  }

  // ── 7. Log successful attempt ────────────────────────────────
  await supabase.from("credential_attempts").insert({
    student_id_number: studentIdNum,
    election_id,
    success: true,
  });

  // ── 8. Mask student ID for display (show last 4 chars) ──────
  const masked = studentIdNum.slice(-4).padStart(studentIdNum.length, "*");

  return json({
    success:      true,
    credential:   plaintext,           // shown once — never stored in plaintext
    student_name: student.full_name,
    masked_id:    masked,
    message:      `Credential generated for ${student.full_name}. Use it now — it is valid for this session only.`,
  });
});
