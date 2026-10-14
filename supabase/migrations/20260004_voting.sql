-- =============================================================
-- KAWSEC VOTING SYSTEM — Migration 0004
-- Voting: entitlements, ballots, audit log, published results
-- =============================================================
-- CRITICAL SECURITY DESIGN:
--
-- voting_entitlements tracks WHO is eligible and WHETHER they
-- have voted (consumed = true). It does NOT store what they
-- voted for.
--
-- ballots stores WHAT was voted for, but NOT who cast the vote.
-- The only link between them is that they share (election_id,
-- position_id) — which reveals only aggregate turnout, never
-- individual choices.
--
-- This separation is a NECESSARY but NOT SUFFICIENT condition
-- for ballot secrecy. A full privacy review is required before
-- production use.
-- =============================================================

-- ── 1. VOTING ENTITLEMENTS ────────────────────────────────────
-- Generated when an election is approved. One row per student
-- per position they are eligible to vote in.
-- consumed = true means the student has voted for this position.
-- consumed_at records when — useful for audit.

CREATE TABLE IF NOT EXISTS voting_entitlements (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id  uuid    NOT NULL REFERENCES elections(id)  ON DELETE CASCADE,
  student_id   uuid    NOT NULL REFERENCES students(id)   ON DELETE CASCADE,
  position_id  uuid    NOT NULL REFERENCES positions(id)  ON DELETE CASCADE,
  consumed     boolean NOT NULL DEFAULT false,
  consumed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- One entitlement per student per position per election
  UNIQUE (student_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_election  ON voting_entitlements (election_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_student   ON voting_entitlements (student_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_position  ON voting_entitlements (position_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_consumed  ON voting_entitlements (consumed);

-- ── 2. BALLOTS ────────────────────────────────────────────────
-- One row per vote cast. Contains ONLY the election/position/
-- candidate — NO student identifier. The entitlement row is
-- marked consumed atomically in the cast_ballot Edge Function.

CREATE TABLE IF NOT EXISTS ballots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id  uuid NOT NULL REFERENCES elections(id)   ON DELETE CASCADE,
  position_id  uuid NOT NULL REFERENCES positions(id)   ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id)  ON DELETE CASCADE,
  submitted_at timestamptz NOT NULL DEFAULT now()
  -- Deliberately NO student_id column.
  -- Ballot count = valid votes for each candidate per position.
);

CREATE INDEX IF NOT EXISTS idx_ballots_election   ON ballots (election_id);
CREATE INDEX IF NOT EXISTS idx_ballots_position   ON ballots (position_id);
CREATE INDEX IF NOT EXISTS idx_ballots_candidate  ON ballots (candidate_id);

-- ── 3. AUDIT EVENTS ───────────────────────────────────────────
-- Tamper-evident log of privileged system actions.
-- Rows are INSERT-only — no UPDATE or DELETE permitted.
-- action examples: 'election.created', 'election.approved',
--   'election.opened', 'election.closed', 'results.published',
--   'candidate.approved', 'credential.revoked', etc.

CREATE TABLE IF NOT EXISTS audit_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid REFERENCES elections(id) ON DELETE SET NULL,
  actor       text NOT NULL,   -- IT Coordinator identifier (email or ID)
  action      text NOT NULL,   -- dot-namespaced action string
  details     jsonb,           -- additional context (no credentials, no vote data)
  ip_address  text,            -- optional, for supervised station logging
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_election ON audit_events (election_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor    ON audit_events (actor);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_events (action);
CREATE INDEX IF NOT EXISTS idx_audit_time     ON audit_events (created_at DESC);

-- ── 4. PUBLISHED RESULTS ─────────────────────────────────────
-- Written once after IT Coordinator approves the tally.
-- Includes tie_flag so the UI can show panel-decision outcomes.
-- This table is the ONLY source of truth for public results.

CREATE TABLE IF NOT EXISTS published_results (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id    uuid    NOT NULL REFERENCES elections(id)  ON DELETE CASCADE,
  position_id    uuid    NOT NULL REFERENCES positions(id)  ON DELETE CASCADE,
  position_title text    NOT NULL,   -- denormalised for display after positions change
  candidate_id   uuid    NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  candidate_name text    NOT NULL,   -- denormalised
  vote_count     integer NOT NULL CHECK (vote_count >= 0),
  rank           smallint NOT NULL CHECK (rank >= 1),
  tie_flag       boolean NOT NULL DEFAULT false,
  panel_decision text,               -- if tie_flag=true, record the panel's ruling here
  published_at   timestamptz NOT NULL DEFAULT now(),
  published_by   text NOT NULL,      -- IT Coordinator identifier
  UNIQUE (position_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_pub_results_election  ON published_results (election_id);
CREATE INDEX IF NOT EXISTS idx_pub_results_position  ON published_results (position_id);

-- ── 5. ROW LEVEL SECURITY ─────────────────────────────────────

ALTER TABLE voting_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballots              ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_results    ENABLE ROW LEVEL SECURITY;

-- Entitlements: anon can check their OWN entitlement status (consumed or not)
-- but only via the Edge Function (service-role bypasses RLS).
-- Direct API access by anon is denied for security.
DROP POLICY IF EXISTS "No anon direct entitlement access" ON voting_entitlements;
CREATE POLICY "No anon direct entitlement access"
  ON voting_entitlements FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Auth manage entitlements" ON voting_entitlements;
CREATE POLICY "Auth manage entitlements"
  ON voting_entitlements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ballots: NEVER readable by anon or authenticated users directly.
-- Only the Edge Function (service-role) inserts and tallies ballots.
DROP POLICY IF EXISTS "No public ballot access" ON ballots;
CREATE POLICY "No public ballot access"
  ON ballots FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "No auth ballot read" ON ballots;
CREATE POLICY "No auth ballot read"
  ON ballots FOR SELECT TO authenticated USING (false);

DROP POLICY IF EXISTS "Auth service ballot write" ON ballots;
CREATE POLICY "Auth service ballot write"
  ON ballots FOR INSERT TO authenticated WITH CHECK (true);

-- Audit log: insert-only for authenticated; no deletes; anon blocked
DROP POLICY IF EXISTS "No anon audit access" ON audit_events;
CREATE POLICY "No anon audit access"
  ON audit_events FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Auth read audit" ON audit_events;
CREATE POLICY "Auth read audit"
  ON audit_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth insert audit" ON audit_events;
CREATE POLICY "Auth insert audit"
  ON audit_events FOR INSERT TO authenticated WITH CHECK (true);

-- Published results: public can read (results page)
DROP POLICY IF EXISTS "Public read published results" ON published_results;
CREATE POLICY "Public read published results"
  ON published_results FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM elections e
      WHERE e.id = election_id AND e.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Auth manage published results" ON published_results;
CREATE POLICY "Auth manage published results"
  ON published_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 6. HELPER: GET TURNOUT (admin use only) ──────────────────
-- Returns aggregate turnout counts per position for an election.
-- Does NOT reveal any candidate totals — safe to show admins
-- while voting is open.

CREATE OR REPLACE FUNCTION get_election_turnout(p_election_id uuid)
RETURNS TABLE (
  position_id    uuid,
  position_title text,
  total_eligible bigint,
  total_voted    bigint,
  turnout_pct    numeric
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.id                              AS position_id,
    p.title                           AS position_title,
    COUNT(e.id)                       AS total_eligible,
    COUNT(e.id) FILTER (WHERE e.consumed) AS total_voted,
    ROUND(
      COUNT(e.id) FILTER (WHERE e.consumed)::numeric /
      NULLIF(COUNT(e.id), 0) * 100, 1
    )                                 AS turnout_pct
  FROM   positions           p
  JOIN   voting_entitlements e ON e.position_id = p.id
  WHERE  p.election_id = p_election_id
  GROUP  BY p.id, p.title
  ORDER  BY p.sort_order;
$$;

-- ── 7. HELPER: TALLY RESULTS (IT Coordinator only) ───────────
-- Called after election closes. Returns vote counts per candidate
-- per position. Used by IT Coordinator to verify before publishing.
-- Only callable via service-role key (Edge Function).

CREATE OR REPLACE FUNCTION tally_election_results(p_election_id uuid)
RETURNS TABLE (
  position_id    uuid,
  position_title text,
  candidate_id   uuid,
  candidate_name text,
  vote_count     bigint,
  rank           bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.id                        AS position_id,
    p.title                     AS position_title,
    c.id                        AS candidate_id,
    s.full_name                 AS candidate_name,
    COUNT(b.id)                 AS vote_count,
    RANK() OVER (
      PARTITION BY p.id
      ORDER BY COUNT(b.id) DESC
    )                           AS rank
  FROM   positions  p
  JOIN   candidates c  ON c.position_id = p.id AND c.status = 'approved'
  JOIN   students   s  ON s.id = c.student_id
  LEFT   JOIN ballots b ON b.candidate_id = c.id
  WHERE  p.election_id = p_election_id
  GROUP  BY p.id, p.title, c.id, s.full_name
  ORDER  BY p.sort_order, rank;
$$;

-- =============================================================
-- DONE. Tables: voting_entitlements, ballots, audit_events,
--               published_results
-- Functions: get_election_turnout, tally_election_results
--
-- SECURITY REMINDER:
-- - ballots has no student_id column by design
-- - Service-role key (Edge Function) handles all ballot writes
-- - Never expose service-role key to the browser client
-- =============================================================
