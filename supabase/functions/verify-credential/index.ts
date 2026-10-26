// ============================================================
// KAWSEC Voting System — Edge Function: verify-credential
// ============================================================
// Step 2 of student login. Takes the plaintext credential
// the student entered, finds their stored verifier hash,
// and checks it. On success, marks the credential as used
// and returns a session token the frontend uses for ballot
// submission in Phase 4.
//
// Request (POST):
//   { student_id_number: string, election_id: string, credential: string }
//
// Response:
//   200 { success: true,  student_id: string, full_name: string, session_token: string }
//   400 { success: false, message: string }
//   401 { success: false, message: string }  — wrong credential
// ============================================================

import { serve }         from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient }  from "https://esm.sh/@supabase/supabase-js@2";

// Set ALLOWED_ORIGIN in Supabase Dashboard secrets to restrict to production domain
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
const CORS = {
  "Access-Control-Allow-Origin":  allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashCredential(credential: string, salt: string): Promise<string> {
  const data    = new TextEncoder().encode(credential + salt);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string): Promise<string> {
  const data    = new TextEncoder().encode(token);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Generate a short-lived session token signed with a random nonce.
 *  Phase 4 (cast-ballot) will validate this token before accepting a ballot. */
async function generateSessionToken(studentId: string, electionId: string): Promise<string> {
  const nonce   = crypto.randomUUID();
  const payload = `${studentId}:${electionId}:${nonce}:${Date.now()}`;
  const data    = new TextEncoder().encode(payload);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  const token   = hashArr.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 48);
  return token;
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

  let body: { student_id_number?: string; election_id?: string; credential?: string };
  try { body = await req.json(); }
  catch { return json({ success: false, message: "Invalid request body." }, 400); }

  const { student_id_number, election_id, credential } = body;
  if (!student_id_number?.trim() || !election_id?.trim() || !credential?.trim()) {
    return json({ success: false, message: "student_id_number, election_id, and credential are required." }, 400);
  }

  const studentIdNum    = student_id_number.trim().toUpperCase();
  const credentialClean = credential.trim().toUpperCase();

  // ── 1. Look up student ──────────────────────────────────────
  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, is_active")
    .eq("student_id_number", studentIdNum)
    .eq("is_active", true)
    .single();

  if (!student) {
    return json({ success: false, message: "Student not found." }, 400);
  }

  // ── 2. Find active credential verifier ─────────────────────
  const { data: verifier } = await supabase
    .from("credential_verifiers")
    .select("id, verifier_hash, used_at, revoked")
    .eq("student_id", student.id)
    .eq("election_id", election_id)
    .eq("revoked", false)
    .is("used_at", null)
    .order("issued_at", { ascending: false })
    .limit(1)
    .single();

  if (!verifier) {
    return json({
      success: false,
      message: "No active credential found. Please go back and enter your Student ID again.",
    }, 401);
  }

  // ── 3. Verify the credential ────────────────────────────────
  const [salt, storedHash] = verifier.verifier_hash.split(":");
  if (!salt || !storedHash) {
    return json({ success: false, message: "Credential data is corrupted. Contact IT Coordinator." }, 500);
  }

  const computedHash = await hashCredential(credentialClean, salt);
  if (computedHash !== storedHash) {
    return json({
      success: false,
      message: "Incorrect credential. Please check and try again, or contact the IT Coordinator.",
    }, 401);
  }

  // ── 4. Mark credential as used ──────────────────────────────
  await supabase
    .from("credential_verifiers")
    .update({ used_at: new Date().toISOString() })
    .eq("id", verifier.id);

  // ── 5. Generate session token ────────────────────────────────
  const sessionToken = await generateSessionToken(student.id, election_id);

  // ── 5a. Store session token hash for cast-ballot validation ──
  const sessionTokenHash = await hashToken(sessionToken);
  await supabase
    .from("credential_verifiers")
    .update({ session_token_hash: sessionTokenHash })
    .eq("id", verifier.id);

  // ── 6. Log to audit ─────────────────────────────────────────
  await supabase.from("audit_events").insert({
    election_id,
    actor:   studentIdNum,
    action:  "student.authenticated",
    details: { student_id: student.id },
  });

  return json({
    success:       true,
    student_id:    student.id,
    full_name:     student.full_name,
    session_token: sessionToken,
    message:       `Welcome, ${student.full_name}. Your identity has been verified.`,
  });
});
