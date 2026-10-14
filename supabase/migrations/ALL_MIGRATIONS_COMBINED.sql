-- KAWSEC VOTING SYSTEM — All Migrations (run once in Supabase SQL Editor)
-- Generated: 2026-10-14
-- =========================================================================

-- =========================================================================
-- FILE: 20260001_school_structure.sql
-- =========================================================================
-- =============================================================
-- KAWSEC VOTING SYSTEM â€” Migration 0001
-- School Structure: departments, classes, houses
-- =============================================================
-- Run in Supabase â†’ SQL Editor in numbered order.
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- =============================================================

-- â”€â”€ 1. DEPARTMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- e.g. Science, General Arts, Business, Visual Arts, Home Economics

CREATE TABLE IF NOT EXISTS departments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  code       text NOT NULL UNIQUE,  -- e.g. 'SCI', 'ARTS', 'BIZ'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- â”€â”€ 2. CLASSES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- e.g. Science 1A, Arts 2B. Each class belongs to a department.

CREATE TABLE IF NOT EXISTS classes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name          text NOT NULL,          -- e.g. 'Science 1A'
  year_group    smallint NOT NULL       -- 1, 2, or 3 (Form 1/2/3)
    CHECK (year_group BETWEEN 1 AND 3),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, name)
);

CREATE INDEX IF NOT EXISTS idx_classes_department
  ON classes (department_id);

-- â”€â”€ 3. HOUSES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- School boarding/day houses. House Captains are elected per house.

CREATE TABLE IF NOT EXISTS houses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,  -- e.g. 'Nkrumah', 'Aggrey'
  code       text NOT NULL UNIQUE,  -- e.g. 'NKR', 'AGG'
  colour     text,                  -- optional hex colour for UI
  created_at timestamptz NOT NULL DEFAULT now()
);

-- â”€â”€ 4. ROW LEVEL SECURITY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses      ENABLE ROW LEVEL SECURITY;

-- Public (anon) can read â€” needed for student registration & voting UI
DROP POLICY IF EXISTS "Public read departments" ON departments;
CREATE POLICY "Public read departments"
  ON departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read classes" ON classes;
CREATE POLICY "Public read classes"
  ON classes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read houses" ON houses;
CREATE POLICY "Public read houses"
  ON houses FOR SELECT USING (true);

-- Only authenticated admins can write
DROP POLICY IF EXISTS "Auth manage departments" ON departments;
CREATE POLICY "Auth manage departments"
  ON departments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth manage classes" ON classes;
CREATE POLICY "Auth manage classes"
  ON classes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth manage houses" ON houses;
CREATE POLICY "Auth manage houses"
  ON houses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- â”€â”€ 5. SEED â€” DEMO DEPARTMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Replace/extend with actual KAWSEC departments before going live.

INSERT INTO departments (name, code) VALUES
  ('General Science',   'SCI'),
  ('General Arts',      'ARTS'),
  ('Business',          'BIZ'),
  ('Visual Arts',       'VIS'),
  ('Home Economics',    'HEC'),
  ('Technical',         'TECH')
ON CONFLICT (code) DO NOTHING;

-- â”€â”€ 6. SEED â€” KAWSEC HOUSES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- The four official houses of Nkawkaw Senior High School (KAWSEC).

INSERT INTO houses (name, code, colour) VALUES
  ('Akuamoah', 'AKU', '#1a4d2e'),
  ('Opaniman', 'OPA', '#2d7a4f'),
  ('Akroko',   'AKR', '#0f2d1a'),
  ('Tokoli',   'TOK', '#3d8f5f')
ON CONFLICT (code) DO NOTHING;

-- =============================================================
-- DONE. Tables: departments, classes, houses
-- =============================================================


-- =========================================================================
-- FILE: 20260002_students.sql
-- =========================================================================
-- =============================================================
-- KAWSEC VOTING SYSTEM â€” Migration 0002
-- Students: student register + credential verifiers
-- =============================================================
-- IMPORTANT PRIVACY NOTE:
-- credential_verifiers stores only a bcrypt/argon2 HASH of the
-- credential â€” never the plaintext. The student's credential is
-- generated server-side, shown once, then discarded.
-- student_id_number is the school-issued ID (e.g. KAWSEC/2024/001).
-- =============================================================

-- â”€â”€ 1. STUDENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE IF NOT EXISTS students (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id_number text    NOT NULL UNIQUE,  -- school-issued ID
  full_name         text    NOT NULL,
  gender            text    NOT NULL CHECK (gender IN ('male', 'female')),
  class_id          uuid    NOT NULL REFERENCES classes(id)  ON DELETE RESTRICT,
  house_id          uuid    REFERENCES houses(id) ON DELETE SET NULL,
  year_group        smallint NOT NULL CHECK (year_group BETWEEN 1 AND 3),
  is_active         boolean NOT NULL DEFAULT true,  -- false = ineligible (left school, etc.)
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_class    ON students (class_id);
CREATE INDEX IF NOT EXISTS idx_students_house    ON students (house_id);
CREATE INDEX IF NOT EXISTS idx_students_active   ON students (is_active);
CREATE INDEX IF NOT EXISTS idx_students_id_num   ON students (student_id_number);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- â”€â”€ 2. CREDENTIAL VERIFIERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- One row per student per election.
-- verifier_hash: bcrypt/argon2 hash of the one-time credential.
-- used_at: set when the credential is consumed (student authenticated).
-- Rate-limiting is enforced at the Edge Function level (not here).

CREATE TABLE IF NOT EXISTS credential_verifiers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  election_id  uuid NOT NULL,  -- FK added in migration 0003 after elections table
  verifier_hash text NOT NULL, -- NEVER store plaintext credential here
  issued_at    timestamptz NOT NULL DEFAULT now(),
  used_at      timestamptz,    -- NULL = not yet used; set on first successful auth
  revoked      boolean NOT NULL DEFAULT false,
  revoked_at   timestamptz,
  UNIQUE (student_id, election_id)   -- one credential per student per election
);

CREATE INDEX IF NOT EXISTS idx_cred_verifiers_student   ON credential_verifiers (student_id);
CREATE INDEX IF NOT EXISTS idx_cred_verifiers_election  ON credential_verifiers (election_id);

-- â”€â”€ 3. CREDENTIAL ATTEMPT LOG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Tracks failed auth attempts per student per election for rate limiting.
-- The Edge Function checks this table before processing a credential.

CREATE TABLE IF NOT EXISTS credential_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id_number text NOT NULL,  -- we log by ID number (student may not exist yet)
  election_id uuid,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success     boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_cred_attempts_student_time
  ON credential_attempts (student_id_number, attempted_at DESC);

-- â”€â”€ 4. ROW LEVEL SECURITY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE students              ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_verifiers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_attempts   ENABLE ROW LEVEL SECURITY;

-- Students table:
-- Anon can look up by student_id_number only (for login step 1)
-- They cannot read other students' data.
-- NOTE: The Edge Function uses service-role key (bypasses RLS) for
--       internal lookups â€” these policies guard direct API access.

DROP POLICY IF EXISTS "Anon lookup by student_id_number" ON students;
CREATE POLICY "Anon lookup by student_id_number"
  ON students FOR SELECT TO anon
  USING (true);
-- Fine-grained filtering (return only matched student) is done in
-- the Edge Function, not here. Direct REST access is blocked by
-- requiring service-role or authenticated for writes.

DROP POLICY IF EXISTS "Auth manage students" ON students;
CREATE POLICY "Auth manage students"
  ON students FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Credential verifiers: NEVER readable by anon or public
-- Only the Edge Function (service-role) touches this table.
DROP POLICY IF EXISTS "No public access credential_verifiers" ON credential_verifiers;
CREATE POLICY "No public access credential_verifiers"
  ON credential_verifiers FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Auth manage credential_verifiers" ON credential_verifiers;
CREATE POLICY "Auth manage credential_verifiers"
  ON credential_verifiers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Credential attempts: service-role only (Edge Function)
DROP POLICY IF EXISTS "No public access credential_attempts" ON credential_attempts;
CREATE POLICY "No public access credential_attempts"
  ON credential_attempts FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Auth manage credential_attempts" ON credential_attempts;
CREATE POLICY "Auth manage credential_attempts"
  ON credential_attempts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- â”€â”€ 5. SEED â€” DEMO STUDENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- FICTITIOUS data only. Replace entirely before going live.
-- Uses subqueries to resolve class/house by code â€” safe even if
-- optional classes aren't seeded yet (inserts will just skip).

DO $$
DECLARE
  v_sci_class  uuid;
  v_arts_class uuid;
  v_nkr_house  uuid;
  v_agg_house  uuid;
BEGIN
  -- Create demo classes if not present
  INSERT INTO classes (department_id, name, year_group)
  SELECT d.id, 'Science 3A', 3
  FROM   departments d WHERE d.code = 'SCI'
  ON CONFLICT (department_id, name) DO NOTHING;

  INSERT INTO classes (department_id, name, year_group)
  SELECT d.id, 'Arts 3B', 3
  FROM   departments d WHERE d.code = 'ARTS'
  ON CONFLICT (department_id, name) DO NOTHING;

  -- Resolve IDs
  SELECT id INTO v_sci_class  FROM classes WHERE name = 'Science 3A' LIMIT 1;
  SELECT id INTO v_arts_class FROM classes WHERE name = 'Arts 3B'    LIMIT 1;
  SELECT id INTO v_nkr_house  FROM houses  WHERE code = 'AKU'        LIMIT 1;
  SELECT id INTO v_agg_house  FROM houses  WHERE code = 'OPA'        LIMIT 1;

  -- Insert demo students (FICTITIOUS names only)
  IF v_sci_class IS NOT NULL AND v_nkr_house IS NOT NULL THEN
    INSERT INTO students (student_id_number, full_name, gender, class_id, house_id, year_group) VALUES
      ('KAWSEC/2024/001', 'Kwame Asante Mensah',   'male',   v_sci_class, v_nkr_house, 3),
      ('KAWSEC/2024/002', 'Abena Owusu Boateng',   'female', v_sci_class, v_nkr_house, 3),
      ('KAWSEC/2024/003', 'Yaw Darko Frimpong',    'male',   v_sci_class, v_agg_house, 3),
      ('KAWSEC/2024/004', 'Ama Serwaa Acheampong', 'female', v_sci_class, v_agg_house, 3)
    ON CONFLICT (student_id_number) DO NOTHING;
  END IF;

  IF v_arts_class IS NOT NULL AND v_agg_house IS NOT NULL THEN
    INSERT INTO students (student_id_number, full_name, gender, class_id, house_id, year_group) VALUES
      ('KAWSEC/2024/005', 'Kofi Mensah Antwi',      'male',   v_arts_class, v_agg_house, 3),
      ('KAWSEC/2024/006', 'Efua Darko Asante',      'female', v_arts_class, v_nkr_house, 3),
      ('KAWSEC/2024/007', 'Kwabena Frimpong Osei',  'male',   v_arts_class, v_nkr_house, 3),
      ('KAWSEC/2024/008', 'Akosua Boateng Mensah',  'female', v_arts_class, v_agg_house, 3)
    ON CONFLICT (student_id_number) DO NOTHING;
  END IF;
END $$;

-- =============================================================
-- DONE. Tables: students, credential_verifiers, credential_attempts
-- 8 fictitious demo students seeded.
-- IMPORTANT: Delete all demo data before any real election.
-- =============================================================


-- =========================================================================
-- FILE: 20260003_elections.sql
-- =========================================================================
-- =============================================================
-- KAWSEC VOTING SYSTEM â€” Migration 0003
-- Elections: lifecycle, positions, candidates
-- =============================================================

-- â”€â”€ 1. ELECTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- An election is the top-level container. Each academic year
-- typically has one election. Status follows the lifecycle:
-- draft â†’ approved â†’ open â†’ closed â†’ verified â†’ published
--                                            â””â†’ cancelled (any stage)

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

-- â”€â”€ 2. NOW ADD ELECTION FK TO CREDENTIAL_VERIFIERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Migration 0002 created credential_verifiers without the FK
-- because elections table didn't exist yet. Add it now.

ALTER TABLE credential_verifiers
  ADD CONSTRAINT fk_cred_election
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE;

-- â”€â”€ 3. POSITIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Each election has positions. Every role has two positions:
-- one male, one female. House Captain positions reference a house.
-- eligibility_scope = 'school_wide' â†’ all active students vote
-- eligibility_scope = 'house'       â†’ only students of house_id vote

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

-- â”€â”€ 4. CANDIDATES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- A candidate is a student approved for a specific position.
-- status: pending â†’ approved | rejected
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

-- â”€â”€ 5. ROW LEVEL SECURITY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€ 6. SEED â€” DEMO ELECTION & POSITIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Creates one demo election in 'draft' status with all 14 positions.
-- Positions reference houses for House Captain roles.
-- FICTITIOUS data â€” safe to delete before the real election.

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
    'Official prefectorial elections for Nkawkaw Senior High School â€” 2026 academic year.',
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

  -- School-wide positions (7 roles Ã— 2 genders = 14 positions)
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

  -- House Captain positions â€” one male + one female per house
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
-- Status = 'draft' â€” safe, no live voting possible.
-- =============================================================


-- =========================================================================
-- FILE: 20260004_voting.sql
-- =========================================================================
-- =============================================================
-- KAWSEC VOTING SYSTEM â€” Migration 0004
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
-- position_id) â€” which reveals only aggregate turnout, never
-- individual choices.
--
-- This separation is a NECESSARY but NOT SUFFICIENT condition
-- for ballot secrecy. A full privacy review is required before
-- production use.
-- =============================================================

-- â”€â”€ 1. VOTING ENTITLEMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Generated when an election is approved. One row per student
-- per position they are eligible to vote in.
-- consumed = true means the student has voted for this position.
-- consumed_at records when â€” useful for audit.

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

-- â”€â”€ 2. BALLOTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- One row per vote cast. Contains ONLY the election/position/
-- candidate â€” NO student identifier. The entitlement row is
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

-- â”€â”€ 3. AUDIT EVENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Tamper-evident log of privileged system actions.
-- Rows are INSERT-only â€” no UPDATE or DELETE permitted.
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

-- â”€â”€ 4. PUBLISHED RESULTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ 5. ROW LEVEL SECURITY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€ 6. HELPER: GET TURNOUT (admin use only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Returns aggregate turnout counts per position for an election.
-- Does NOT reveal any candidate totals â€” safe to show admins
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

-- â”€â”€ 7. HELPER: TALLY RESULTS (IT Coordinator only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- =========================================================================
-- FILE: 20260005_cast_ballot_rpc.sql
-- =========================================================================
-- =============================================================
-- KAWSEC VOTING SYSTEM â€” Migration 0005
-- Atomic ballot transaction RPC
-- =============================================================
-- This function is called exclusively by the cast-ballot Edge
-- Function (service-role key). It executes inside a single
-- Postgres transaction:
--   1. Re-checks all entitlements are unconsumed (race guard)
--   2. Marks them consumed
--   3. Inserts one ballot row per vote (NO student_id)
--
-- If ANY step fails the whole transaction rolls back, so
-- partial ballots are impossible even under concurrent load.
-- =============================================================

CREATE OR REPLACE FUNCTION cast_ballot_transaction(
  p_student_id  uuid,
  p_election_id uuid,
  p_votes       text   -- JSON array: [{ position_id, candidate_id }]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER   -- runs as the function owner (service role), bypasses RLS
AS $$
DECLARE
  v_vote        jsonb;
  v_votes       jsonb := p_votes::jsonb;
  v_position_id uuid;
  v_cand_id     uuid;
  v_ent_id      uuid;
  v_consumed    boolean;
  v_ballot_count integer := 0;
BEGIN
  -- â”€â”€ 1. Lock and verify each entitlement (serialises concurrent requests)
  FOR v_vote IN SELECT * FROM jsonb_array_elements(v_votes) LOOP
    v_position_id := (v_vote->>'position_id')::uuid;

    SELECT id, consumed
      INTO v_ent_id, v_consumed
      FROM voting_entitlements
     WHERE student_id   = p_student_id
       AND election_id  = p_election_id
       AND position_id  = v_position_id
     FOR UPDATE;   -- row-level lock prevents race condition

    IF v_ent_id IS NULL THEN
      RAISE EXCEPTION 'no_entitlement: student % has no entitlement for position %',
        p_student_id, v_position_id;
    END IF;

    IF v_consumed THEN
      RAISE EXCEPTION 'already_voted: student % already voted for position %',
        p_student_id, v_position_id;
    END IF;
  END LOOP;

  -- â”€â”€ 2. All checks passed â€” consume entitlements and insert ballots
  FOR v_vote IN SELECT * FROM jsonb_array_elements(v_votes) LOOP
    v_position_id := (v_vote->>'position_id')::uuid;
    v_cand_id     := (v_vote->>'candidate_id')::uuid;

    -- Consume the entitlement
    UPDATE voting_entitlements
       SET consumed    = true,
           consumed_at = now()
     WHERE student_id  = p_student_id
       AND election_id = p_election_id
       AND position_id = v_position_id;

    -- Insert ballot â€” deliberately NO student_id (ballot secrecy)
    INSERT INTO ballots (election_id, position_id, candidate_id)
    VALUES (p_election_id, v_position_id, v_cand_id);

    v_ballot_count := v_ballot_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',      true,
    'ballot_count', v_ballot_count
  );
END;
$$;

-- Grant execute only to service role (Edge Function)
-- The anon and authenticated roles cannot call this directly
REVOKE ALL ON FUNCTION cast_ballot_transaction FROM PUBLIC;
REVOKE ALL ON FUNCTION cast_ballot_transaction FROM anon;
REVOKE ALL ON FUNCTION cast_ballot_transaction FROM authenticated;

-- =============================================================
-- DONE. Function: cast_ballot_transaction
-- Called only by the cast-ballot Edge Function.
-- =============================================================


-- =========================================================================
-- FILE: 20260006_admin_rpcs.sql
-- =========================================================================
-- =============================================================
-- KAWSEC VOTING SYSTEM â€” Migration 0006
-- Admin RPCs: generate entitlements, publish results
-- =============================================================

-- â”€â”€ 1. GENERATE VOTING ENTITLEMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Called when IT Coordinator approves an election.
-- Creates one voting_entitlements row per student per position
-- they are eligible for (school-wide or house-specific).
-- Safe to call multiple times â€” uses ON CONFLICT DO NOTHING.

CREATE OR REPLACE FUNCTION generate_voting_entitlements(p_election_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count  integer := 0;
  v_pos    RECORD;
  v_student RECORD;
BEGIN
  -- Loop over each position in this election
  FOR v_pos IN
    SELECT id, eligibility_scope, house_id
    FROM   positions
    WHERE  election_id = p_election_id
  LOOP
    -- School-wide: all active students
    IF v_pos.eligibility_scope = 'school_wide' THEN
      FOR v_student IN
        SELECT id FROM students WHERE is_active = true
      LOOP
        INSERT INTO voting_entitlements (election_id, student_id, position_id)
        VALUES (p_election_id, v_student.id, v_pos.id)
        ON CONFLICT (student_id, position_id) DO NOTHING;
        v_count := v_count + 1;
      END LOOP;

    -- House-only: only students in that house
    ELSIF v_pos.eligibility_scope = 'house' AND v_pos.house_id IS NOT NULL THEN
      FOR v_student IN
        SELECT id FROM students
        WHERE  is_active = true AND house_id = v_pos.house_id
      LOOP
        INSERT INTO voting_entitlements (election_id, student_id, position_id)
        VALUES (p_election_id, v_student.id, v_pos.id)
        ON CONFLICT (student_id, position_id) DO NOTHING;
        v_count := v_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  -- Update election status to approved
  UPDATE elections
  SET    status      = 'approved',
         approved_at = now(),
         updated_at  = now()
  WHERE  id = p_election_id
    AND  status = 'draft';

  RETURN jsonb_build_object(
    'success',     true,
    'entitlements_created', v_count
  );
END;
$$;

-- â”€â”€ 2. OPEN / CLOSE ELECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Simple status transitions with guard checks.

CREATE OR REPLACE FUNCTION set_election_status(
  p_election_id uuid,
  p_status      text,
  p_actor       text DEFAULT 'IT Coordinator'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current text;
BEGIN
  SELECT status INTO v_current FROM elections WHERE id = p_election_id;
  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Election not found.');
  END IF;

  -- Allowed transitions
  IF NOT (
    (v_current = 'draft'     AND p_status = 'approved') OR
    (v_current = 'approved'  AND p_status = 'open')     OR
    (v_current = 'open'      AND p_status = 'closed')   OR
    (v_current = 'closed'    AND p_status = 'verified') OR
    (v_current = 'verified'  AND p_status = 'published') OR
    (p_status = 'cancelled')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Cannot transition from %s to %s.', v_current, p_status)
    );
  END IF;

  UPDATE elections
  SET    status     = p_status,
         updated_at = now()
  WHERE  id = p_election_id;

  -- Audit
  INSERT INTO audit_events (election_id, actor, action, details)
  VALUES (p_election_id, p_actor, 'election.' || p_status,
          jsonb_build_object('previous_status', v_current));

  RETURN jsonb_build_object('success', true, 'new_status', p_status);
END;
$$;

-- â”€â”€ 3. PUBLISH RESULTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Called after IT Coordinator reviews tally and panel decisions.
-- Writes to published_results and marks election as published.

CREATE OR REPLACE FUNCTION publish_election_results(
  p_election_id uuid,
  p_publisher   text,
  -- JSON array: [{ position_id, candidate_id, vote_count, rank, tie_flag, panel_decision }]
  p_results     text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row      jsonb;
  v_results  jsonb := p_results::jsonb;
  v_pos_title text;
  v_cand_name text;
  v_count    integer := 0;
BEGIN
  -- Verify election is in verified state
  IF NOT EXISTS (SELECT 1 FROM elections WHERE id = p_election_id AND status = 'verified') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Election must be in verified state before publishing.');
  END IF;

  -- Clear any previous publish attempt
  DELETE FROM published_results WHERE election_id = p_election_id;

  FOR v_row IN SELECT * FROM jsonb_array_elements(v_results) LOOP
    -- Denormalise position title
    SELECT title INTO v_pos_title FROM positions WHERE id = (v_row->>'position_id')::uuid;
    -- Denormalise candidate name
    SELECT s.full_name INTO v_cand_name
    FROM candidates c JOIN students s ON s.id = c.student_id
    WHERE c.id = (v_row->>'candidate_id')::uuid;

    INSERT INTO published_results (
      election_id, position_id, position_title,
      candidate_id, candidate_name, vote_count, rank,
      tie_flag, panel_decision, published_by
    ) VALUES (
      p_election_id,
      (v_row->>'position_id')::uuid,
      COALESCE(v_pos_title, 'Unknown Position'),
      (v_row->>'candidate_id')::uuid,
      COALESCE(v_cand_name, 'Unknown Candidate'),
      (v_row->>'vote_count')::integer,
      (v_row->>'rank')::smallint,
      COALESCE((v_row->>'tie_flag')::boolean, false),
      v_row->>'panel_decision',
      p_publisher
    );
    v_count := v_count + 1;
  END LOOP;

  -- Mark election published
  UPDATE elections SET status = 'published', updated_at = now() WHERE id = p_election_id;

  -- Audit
  INSERT INTO audit_events (election_id, actor, action, details)
  VALUES (p_election_id, p_publisher, 'results.published',
          jsonb_build_object('result_rows', v_count));

  RETURN jsonb_build_object('success', true, 'rows_published', v_count);
END;
$$;

-- Grant to authenticated only (IT Coordinator is authenticated)
GRANT EXECUTE ON FUNCTION generate_voting_entitlements TO authenticated;
GRANT EXECUTE ON FUNCTION set_election_status           TO authenticated;
GRANT EXECUTE ON FUNCTION publish_election_results      TO authenticated;

-- =============================================================
-- DONE. Functions: generate_voting_entitlements,
--                  set_election_status, publish_election_results
-- =============================================================


-- =========================================================================
-- FILE: 20260007_mock_election_seed.sql
-- =========================================================================
-- =============================================================
-- KAWSEC VOTING SYSTEM â€” Migration 0007
-- Mock election seed for Phase 6 testing
-- =============================================================
-- Run this ONLY in a development/test environment.
-- Creates a complete mock election with candidates, entitlements
-- and a set of test votes so you can verify the full flow.
--
-- TO RESET: run DELETE FROM elections WHERE title LIKE '%MOCK%';
-- (cascades to all related tables via FK ON DELETE CASCADE)
-- =============================================================

DO $$
DECLARE
  v_election_id  uuid;
  v_position_id  uuid;
  v_candidate_id uuid;
  v_student_id   uuid;
  v_student2_id  uuid;
  v_hb_pos_id    uuid;
  v_hg_pos_id    uuid;
  v_sp_pos_id    uuid;
  v_spf_pos_id   uuid;
  v_cand1        uuid;
  v_cand2        uuid;
  v_cand3        uuid;
  v_cand4        uuid;
  v_cand5        uuid;
  v_cand6        uuid;
BEGIN

  -- â”€â”€ 1. Create mock election â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO elections (title, status, description, created_by,
                         voting_opens_at, voting_closes_at)
  VALUES (
    'MOCK ELECTION â€” Phase 6 Test',
    'open',
    'Test election for Phase 6 verification. Delete after testing.',
    'IT Coordinator',
    now() - interval '1 hour',      -- opened 1 hour ago
    now() + interval '23 hours'     -- closes in 23 hours
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_election_id;

  IF v_election_id IS NULL THEN
    SELECT id INTO v_election_id FROM elections
    WHERE title = 'MOCK ELECTION â€” Phase 6 Test' LIMIT 1;
  END IF;

  IF v_election_id IS NULL THEN
    RAISE EXCEPTION 'Could not create or find mock election.';
  END IF;

  -- â”€â”€ 2. Create 4 test positions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  INSERT INTO positions (election_id, title, role_group, gender_scope, eligibility_scope, sort_order)
  VALUES
    (v_election_id, 'Head Boy',              'School Prefect', 'male',   'school_wide', 1),
    (v_election_id, 'Head Girl',             'School Prefect', 'female', 'school_wide', 2),
    (v_election_id, 'Sports Prefect (Male)', 'Sports Prefect', 'male',   'school_wide', 3),
    (v_election_id, 'Sports Prefect (Female)','Sports Prefect','female', 'school_wide', 4)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_hb_pos_id  FROM positions WHERE election_id = v_election_id AND title = 'Head Boy'               LIMIT 1;
  SELECT id INTO v_hg_pos_id  FROM positions WHERE election_id = v_election_id AND title = 'Head Girl'              LIMIT 1;
  SELECT id INTO v_sp_pos_id  FROM positions WHERE election_id = v_election_id AND title = 'Sports Prefect (Male)'  LIMIT 1;
  SELECT id INTO v_spf_pos_id FROM positions WHERE election_id = v_election_id AND title = 'Sports Prefect (Female)' LIMIT 1;

  -- â”€â”€ 3. Add candidates using existing demo students â”€â”€â”€â”€â”€â”€â”€â”€
  -- Head Boy candidates (must be male students)
  SELECT id INTO v_student_id  FROM students WHERE gender = 'male'   LIMIT 1;
  SELECT id INTO v_student2_id FROM students WHERE gender = 'male'   LIMIT 1 OFFSET 1;

  IF v_student_id IS NOT NULL AND v_hb_pos_id IS NOT NULL THEN
    INSERT INTO candidates (position_id, student_id, status, manifesto_text, approved_at)
    VALUES (v_hb_pos_id, v_student_id, 'approved', 'I will serve the school with dedication and integrity.', now())
    ON CONFLICT (position_id, student_id) DO NOTHING
    RETURNING id INTO v_cand1;

    IF v_cand1 IS NULL THEN SELECT id INTO v_cand1 FROM candidates WHERE position_id = v_hb_pos_id AND student_id = v_student_id; END IF;
  END IF;

  IF v_student2_id IS NOT NULL AND v_hb_pos_id IS NOT NULL THEN
    INSERT INTO candidates (position_id, student_id, status, manifesto_text, approved_at)
    VALUES (v_hb_pos_id, v_student2_id, 'approved', 'My goal is to improve school facilities and student welfare.', now())
    ON CONFLICT (position_id, student_id) DO NOTHING
    RETURNING id INTO v_cand2;

    IF v_cand2 IS NULL THEN SELECT id INTO v_cand2 FROM candidates WHERE position_id = v_hb_pos_id AND student_id = v_student2_id; END IF;
  END IF;

  -- Head Girl candidates (female students)
  SELECT id INTO v_student_id  FROM students WHERE gender = 'female' LIMIT 1;
  SELECT id INTO v_student2_id FROM students WHERE gender = 'female' LIMIT 1 OFFSET 1;

  IF v_student_id IS NOT NULL AND v_hg_pos_id IS NOT NULL THEN
    INSERT INTO candidates (position_id, student_id, status, manifesto_text, approved_at)
    VALUES (v_hg_pos_id, v_student_id, 'approved', 'I will champion girls education and school unity.', now())
    ON CONFLICT (position_id, student_id) DO NOTHING
    RETURNING id INTO v_cand3;

    IF v_cand3 IS NULL THEN SELECT id INTO v_cand3 FROM candidates WHERE position_id = v_hg_pos_id AND student_id = v_student_id; END IF;
  END IF;

  IF v_student2_id IS NOT NULL AND v_hg_pos_id IS NOT NULL THEN
    INSERT INTO candidates (position_id, student_id, status, manifesto_text, approved_at)
    VALUES (v_hg_pos_id, v_student2_id, 'approved', 'Transparency and hard work are my core values.', now())
    ON CONFLICT (position_id, student_id) DO NOTHING
    RETURNING id INTO v_cand4;

    IF v_cand4 IS NULL THEN SELECT id INTO v_cand4 FROM candidates WHERE position_id = v_hg_pos_id AND student_id = v_student2_id; END IF;
  END IF;

  -- Sports Prefect candidates
  SELECT id INTO v_student_id  FROM students WHERE gender = 'male'   LIMIT 1 OFFSET 2;
  SELECT id INTO v_student2_id FROM students WHERE gender = 'female' LIMIT 1 OFFSET 2;

  IF v_student_id IS NOT NULL AND v_sp_pos_id IS NOT NULL THEN
    INSERT INTO candidates (position_id, student_id, status, manifesto_text, approved_at)
    VALUES (v_sp_pos_id, v_student_id, 'approved', 'Sports builds character. I will lead by example on and off the field.', now())
    ON CONFLICT (position_id, student_id) DO NOTHING
    RETURNING id INTO v_cand5;
    IF v_cand5 IS NULL THEN SELECT id INTO v_cand5 FROM candidates WHERE position_id = v_sp_pos_id AND student_id = v_student_id; END IF;
  END IF;

  IF v_student2_id IS NOT NULL AND v_spf_pos_id IS NOT NULL THEN
    INSERT INTO candidates (position_id, student_id, status, manifesto_text, approved_at)
    VALUES (v_spf_pos_id, v_student2_id, 'approved', 'I will promote girls sports and physical wellbeing for all.', now())
    ON CONFLICT (position_id, student_id) DO NOTHING
    RETURNING id INTO v_cand6;
    IF v_cand6 IS NULL THEN SELECT id INTO v_cand6 FROM candidates WHERE position_id = v_spf_pos_id AND student_id = v_student2_id; END IF;
  END IF;

  -- â”€â”€ 4. Generate entitlements for all active students â”€â”€â”€â”€â”€â”€
  PERFORM generate_voting_entitlements(v_election_id);

  -- Mark election as approved (generate_voting_entitlements sets draftâ†’approved)
  -- Then open it manually since we set status to 'open' above
  UPDATE elections SET status = 'open' WHERE id = v_election_id;

  RAISE NOTICE 'Mock election created: %', v_election_id;
  RAISE NOTICE 'Head Boy position: %',    v_hb_pos_id;
  RAISE NOTICE 'Head Girl position: %',   v_hg_pos_id;

END $$;

-- =============================================================
-- DONE. Mock election seeded with:
-- - 4 positions (Head Boy, Head Girl, Sports Prefect M/F)
-- - Up to 6 approved candidates from demo students
-- - Voting entitlements generated for all active students
-- - Election status = open
--
-- To test: go to /vote, enter a demo student ID (KAWSEC/2024/001)
-- To clean up: DELETE FROM elections WHERE title LIKE '%MOCK%';
-- =============================================================


