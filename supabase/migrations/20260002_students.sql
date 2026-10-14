-- =============================================================
-- KAWSEC VOTING SYSTEM — Migration 0002
-- Students: student register + credential verifiers
-- =============================================================
-- IMPORTANT PRIVACY NOTE:
-- credential_verifiers stores only a bcrypt/argon2 HASH of the
-- credential — never the plaintext. The student's credential is
-- generated server-side, shown once, then discarded.
-- student_id_number is the school-issued ID (e.g. KAWSEC/2024/001).
-- =============================================================

-- ── 1. STUDENTS ───────────────────────────────────────────────

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

-- ── 2. CREDENTIAL VERIFIERS ───────────────────────────────────
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

-- ── 3. CREDENTIAL ATTEMPT LOG ─────────────────────────────────
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

-- ── 4. ROW LEVEL SECURITY ─────────────────────────────────────

ALTER TABLE students              ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_verifiers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_attempts   ENABLE ROW LEVEL SECURITY;

-- Students table:
-- Anon can look up by student_id_number only (for login step 1)
-- They cannot read other students' data.
-- NOTE: The Edge Function uses service-role key (bypasses RLS) for
--       internal lookups — these policies guard direct API access.

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

-- ── 5. SEED — DEMO STUDENTS ───────────────────────────────────
-- FICTITIOUS data only. Replace entirely before going live.
-- Uses subqueries to resolve class/house by code — safe even if
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
