-- =============================================================
-- KAWSEC VOTING SYSTEM — Migration 0003
-- Elections: lifecycle, positions, candidates
-- =============================================================

-- ── 1. ELECTIONS ─────────────────────────────────────────────
-- An election is the top-level container. Each academic year
-- typically has one election. Status follows the lifecycle:
-- draft → approved → open → closed → verified → published
--                                            └→ cancelled (any stage)

CREATE TABLE IF NOT EXISTS elections (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text    NOT NULL,              -- e.g. '2026 KAWSEC Prefect Elections'
  status            text    NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','open','closed','verified','published','cancelled')),
  voting_opens_at   timestamptz,                  -- auto-open at this time
  voting_closes_at  timestamptz,                  -- auto-close at this time
  description       text,
  created_by        text,                          -- IT Coordinator identifier
  approved_by       text,
  approved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- Guard: close time must be after open time
  CONSTRAINT chk_election_dates CHECK (
    voting_closes_at IS NULL OR voting_opens_at IS NULL OR
    voting_closes_at > voting_opens_at
  )
);

DROP TRIGGER IF EXISTS trg_elections_updated_at ON elections;
CREATE TRIGGER trg_elections_updated_at
  BEFORE UPDATE ON elections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. NOW ADD ELECTION FK TO CREDENTIAL_VERIFIERS ───────────
-- Migration 0002 created credential_verifiers without the FK
-- because elections table didn't exist yet. Add it now.

ALTER TABLE credential_verifiers
  ADD CONSTRAINT fk_cred_election
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE;

-- ── 3. POSITIONS ─────────────────────────────────────────────
-- Each election has positions. Every role has two positions:
-- one male, one female. House Captain positions reference a house.
-- eligibility_scope = 'school_wide' → all active students vote
-- eligibility_scope = 'house'       → only students of house_id vote

CREATE TABLE IF NOT EXISTS positions (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id       uuid    NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  title             text    NOT NULL,     -- e.g. 'Head Boy', 'Head Girl', 'Sports Prefect (Male)'
  role_group        text    NOT NULL,     -- e.g. 'School Prefect', 'Sports Prefect' (for display grouping)
  gender_scope      text    NOT NULL
    CHECK (gender_scope IN ('male', 'female', 'all')),
  eligibility_scope text    NOT NULL DEFAULT 'school_wide'
    CHECK (eligibility_scope IN ('school_wide', 'house')),
  house_id          uuid    REFERENCES houses(id) ON DELETE SET NULL,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_house_scope CHECK (
    eligibility_scope != 'house' OR house_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_positions_election ON positions (election_id);
CREATE INDEX IF NOT EXISTS idx_positions_house    ON positions (house_id);

-- ── 4. CANDIDATES ─────────────────────────────────────────────
-- A candidate is a student approved for a specific position.
-- status: pending → approved | rejected
-- photo_url: stored in Supabase Storage (path, not full URL)
-- Only approved candidates are shown on the ballot.

CREATE TABLE IF NOT EXISTS candidates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id    uuid NOT NULL REFERENCES positions(id)  ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES students(id)   ON DELETE CASCADE,
  photo_url      text,           -- Supabase Storage path
  manifesto_text text,           -- candidate's plans/speech
  status         text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by    text,
  approved_at    timestamptz,
  rejected_reason text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (position_id, student_id)  -- student can only be a candidate once per position
);

CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates (position_id);
CREATE INDEX IF NOT EXISTS idx_candidates_student  ON candidates (student_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status   ON candidates (status);

-- ── 5. ROW LEVEL SECURITY ─────────────────────────────────────

ALTER TABLE elections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Elections: public can read published + open elections only
DROP POLICY IF EXISTS "Public read open elections" ON elections;
CREATE POLICY "Public read open elections"
  ON elections FOR SELECT TO anon
  USING (status IN ('open', 'published'));

DROP POLICY IF EXISTS "Auth manage elections" ON elections;
CREATE POLICY "Auth manage elections"
  ON elections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Positions: public can read positions of open/published elections
DROP POLICY IF EXISTS "Public read positions" ON positions;
CREATE POLICY "Public read positions"
  ON positions FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM elections e
      WHERE e.id = election_id
        AND e.status IN ('open', 'published')
    )
  );

DROP POLICY IF EXISTS "Auth manage positions" ON positions;
CREATE POLICY "Auth manage positions"
  ON positions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Candidates: public can read approved candidates of open/published elections
DROP POLICY IF EXISTS "Public read approved candidates" ON candidates;
CREATE POLICY "Public read approved candidates"
  ON candidates FOR SELECT TO anon
  USING (
    status = 'approved' AND
    EXISTS (
      SELECT 1 FROM positions p
      JOIN   elections e ON e.id = p.election_id
      WHERE  p.id = position_id
        AND  e.status IN ('open', 'published')
    )
  );

DROP POLICY IF EXISTS "Auth manage candidates" ON candidates;
CREATE POLICY "Auth manage candidates"
  ON candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 6. SEED — DEMO ELECTION & POSITIONS ──────────────────────
-- Creates one demo election in 'draft' status with all 14 positions.
-- Positions reference houses for House Captain roles.
-- FICTITIOUS data — safe to delete before the real election.

DO $$
DECLARE
  v_election_id uuid;
  v_house_id    uuid;
  v_houses      RECORD;
  v_sort        integer := 1;
BEGIN
  -- Create demo election
  INSERT INTO elections (title, status, description, created_by)
  VALUES (
    '2026 KAWSEC Prefect Elections',
    'draft',
    'Official prefectorial elections for Nkawkaw Senior High School — 2026 academic year.',
    'IT Coordinator'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_election_id;

  -- If already exists, fetch it
  IF v_election_id IS NULL THEN
    SELECT id INTO v_election_id FROM elections
    WHERE title = '2026 KAWSEC Prefect Elections' LIMIT 1;
  END IF;

  IF v_election_id IS NULL THEN RETURN; END IF;

  -- School-wide positions (7 roles × 2 genders = 14 positions)
  INSERT INTO positions (election_id, title, role_group, gender_scope, eligibility_scope, sort_order) VALUES
    (v_election_id, 'Head Boy',                    'School Prefect',        'male',   'school_wide', 1),
    (v_election_id, 'Head Girl',                   'School Prefect',        'female', 'school_wide', 2),
    (v_election_id, 'Compound Prefect (Male)',      'Compound Prefect',      'male',   'school_wide', 3),
    (v_election_id, 'Compound Prefect (Female)',    'Compound Prefect',      'female', 'school_wide', 4),
    (v_election_id, 'Sports Prefect (Male)',        'Sports Prefect',        'male',   'school_wide', 5),
    (v_election_id, 'Sports Prefect (Female)',      'Sports Prefect',        'female', 'school_wide', 6),
    (v_election_id, 'School Chaplain (Male)',       'School Chaplain',       'male',   'school_wide', 7),
    (v_election_id, 'School Chaplain (Female)',     'School Chaplain',       'female', 'school_wide', 8),
    (v_election_id, 'Entertainment Prefect (Male)', 'Entertainment Prefect', 'male',   'school_wide', 9),
    (v_election_id, 'Entertainment Prefect (Female)','Entertainment Prefect','female', 'school_wide', 10),
    (v_election_id, 'Dining Hall Prefect (Male)',   'Dining Hall Prefect',   'male',   'school_wide', 11),
    (v_election_id, 'Dining Hall Prefect (Female)', 'Dining Hall Prefect',   'female', 'school_wide', 12)
  ON CONFLICT DO NOTHING;

  -- House Captain positions — one male + one female per house
  v_sort := 13;
  FOR v_houses IN SELECT id, name FROM houses ORDER BY name LOOP
    INSERT INTO positions (election_id, title, role_group, gender_scope, eligibility_scope, house_id, sort_order)
    VALUES
      (v_election_id, v_houses.name || ' House Captain (Male)',   'House Captain', 'male',   'house', v_houses.id, v_sort),
      (v_election_id, v_houses.name || ' House Captain (Female)', 'House Captain', 'female', 'house', v_houses.id, v_sort + 1)
    ON CONFLICT DO NOTHING;
    v_sort := v_sort + 2;
  END LOOP;

END $$;

-- =============================================================
-- DONE. Tables: elections, positions, candidates
-- 1 demo election + 12 school-wide + house captain positions seeded.
-- Status = 'draft' — safe, no live voting possible.
-- =============================================================
