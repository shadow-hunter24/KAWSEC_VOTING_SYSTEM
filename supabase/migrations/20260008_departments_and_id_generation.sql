-- =============================================================
-- KAWSEC VOTING SYSTEM — Migration 0008
-- Real departments, ID generation, year group restrictions
-- =============================================================

-- ── 1. UPDATE DEPARTMENTS to real KAWSEC departments ─────────
-- First remove demo data that references old departments/classes,
-- then safely replace departments with real KAWSEC ones.

-- Remove demo voting data (cascades to entitlements, ballots etc.)
DELETE FROM voting_entitlements WHERE election_id IN (
  SELECT id FROM elections WHERE title LIKE '%MOCK%' OR title LIKE '%demo%' OR title LIKE '%Demo%'
);
DELETE FROM elections WHERE title LIKE '%MOCK%' OR title LIKE '%demo%' OR title LIKE '%Demo%';
DELETE FROM elections WHERE title = '2026 KAWSEC Prefect Elections' AND status = 'draft';

-- Remove demo students (this unblocks class/department deletion)
DELETE FROM students WHERE student_id_number LIKE 'KAWSEC/2024/%';

-- Remove demo classes and departments (now safe)
DELETE FROM classes     WHERE department_id IN (SELECT id FROM departments WHERE code IN ('SCI','ARTS','BIZ','VIS','HEC','TECH'));
DELETE FROM departments WHERE code IN ('SCI','ARTS','BIZ','VIS','HEC','TECH');

-- Insert the 6 real KAWSEC departments
INSERT INTO departments (name, code) VALUES
  ('Science',           'SCI'),
  ('General Arts',      'ART'),
  ('Business',          'BIZ'),
  ('Home Economics',    'HEC'),
  ('Visual Arts',       'VIS'),
  ('Agric Science',     'AGR')
ON CONFLICT (code) DO NOTHING;

-- ── 2. ADD YEAR GROUP RESTRICTION TO ELECTIONS ───────────────
-- Allows IT Coordinator to restrict voting to specific year groups.
-- NULL = all year groups can vote (default).
-- Array value e.g. '{3}' = only Form 3 votes.
-- '{1,2,3}' = all forms vote.

ALTER TABLE elections
  ADD COLUMN IF NOT EXISTS eligible_year_groups smallint[] DEFAULT NULL;

COMMENT ON COLUMN elections.eligible_year_groups IS
  'NULL = all year groups eligible. Set to array e.g. {3} to restrict.';

-- ── 3. AUTO STUDENT ID GENERATION FUNCTION ───────────────────
-- Generates a unique student ID in the format:
--   KAWSEC-[DEPT_CODE]-[YEAR]-[4-digit zero-padded sequence]
-- e.g. KAWSEC-SCI-2024-0001
--
-- The sequence resets per department per year, so each department
-- has its own 0001 starting point.
-- Called during bulk import if no student_id_number is provided.

CREATE OR REPLACE FUNCTION generate_student_id(
  p_department_code text,
  p_year            integer DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year        integer;
  v_prefix      text;
  v_next_seq    integer;
  v_new_id      text;
  v_dept_code   text;
BEGIN
  v_year      := COALESCE(p_year, EXTRACT(YEAR FROM now())::integer);
  v_dept_code := UPPER(TRIM(p_department_code));
  v_prefix    := 'KAWSEC-' || v_dept_code || '-' || v_year::text || '-';

  -- Find the highest existing sequence for this dept+year
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(student_id_number FROM LENGTH(v_prefix) + 1)
        AS integer
      )
    ), 0
  )
  INTO v_next_seq
  FROM students
  WHERE student_id_number LIKE v_prefix || '%'
    AND student_id_number ~ ('^' || v_prefix || '\d{4}$');

  v_next_seq := v_next_seq + 1;

  -- Safety: cap at 9999 per dept per year (upgrade to 5 digits if needed)
  IF v_next_seq > 9999 THEN
    RAISE EXCEPTION 'Student ID sequence overflow for %%. Contact IT.', v_prefix;
  END IF;

  v_new_id := v_prefix || LPAD(v_next_seq::text, 4, '0');

  -- Verify uniqueness (shouldn't collide but double-check)
  IF EXISTS (SELECT 1 FROM students WHERE student_id_number = v_new_id) THEN
    RAISE EXCEPTION 'Generated ID %% already exists. Re-run to get next sequence.', v_new_id;
  END IF;

  RETURN v_new_id;
END;
$$;

-- ── 4. BULK IMPORT FUNCTION ───────────────────────────────────
-- Accepts a JSON array of students, auto-generates IDs, and
-- inserts them. Returns a summary with generated IDs.
-- Called by the admin import UI.

CREATE OR REPLACE FUNCTION bulk_import_students(
  p_students text,  -- JSON array of student objects
  p_year     integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row         jsonb;
  v_students    jsonb := p_students::jsonb;
  v_class_id    uuid;
  v_house_id    uuid;
  v_dept_code   text;
  v_new_id      text;
  v_imported    integer := 0;
  v_skipped     integer := 0;
  v_errors      jsonb   := '[]'::jsonb;
  v_generated   jsonb   := '[]'::jsonb;
BEGIN
  FOR v_row IN SELECT * FROM jsonb_array_elements(v_students) LOOP

    -- Resolve class
    SELECT c.id INTO v_class_id
    FROM   classes c
    WHERE  LOWER(c.name) = LOWER(TRIM(v_row->>'class_name'))
    LIMIT  1;

    IF v_class_id IS NULL THEN
      v_errors  := v_errors  || jsonb_build_object('name', v_row->>'full_name', 'error', 'Class not found: ' || (v_row->>'class_name'));
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Resolve house
    SELECT id INTO v_house_id
    FROM   houses
    WHERE  LOWER(name) = LOWER(TRIM(v_row->>'house_name'))
    LIMIT  1;

    IF v_house_id IS NULL THEN
      v_errors  := v_errors  || jsonb_build_object('name', v_row->>'full_name', 'error', 'House not found: ' || (v_row->>'house_name'));
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Get department code for ID generation
    SELECT d.code INTO v_dept_code
    FROM   classes c
    JOIN   departments d ON d.id = c.department_id
    WHERE  c.id = v_class_id
    LIMIT  1;

    -- Generate unique student ID
    v_new_id := generate_student_id(COALESCE(v_dept_code, 'KWS'), p_year);

    -- Insert student
    INSERT INTO students (
      student_id_number, full_name, gender,
      class_id, house_id, year_group, is_active
    ) VALUES (
      v_new_id,
      TRIM(v_row->>'full_name'),
      LOWER(TRIM(v_row->>'gender')),
      v_class_id,
      v_house_id,
      (v_row->>'year_group')::smallint,
      true
    )
    ON CONFLICT (student_id_number) DO NOTHING;

    v_imported  := v_imported + 1;
    v_generated := v_generated || jsonb_build_object(
      'name', v_row->>'full_name',
      'id',   v_new_id,
      'class', v_row->>'class_name'
    );

  END LOOP;

  RETURN jsonb_build_object(
    'imported',   v_imported,
    'skipped',    v_skipped,
    'errors',     v_errors,
    'generated',  v_generated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION generate_student_id   TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_import_students   TO authenticated;

-- ── 5. PER-CLASS TURNOUT VIEW ─────────────────────────────────
-- Used by the class monitor dashboard.
-- Shows eligible/voted counts grouped by class.

CREATE OR REPLACE VIEW class_turnout_view AS
SELECT
  e.id                              AS election_id,
  e.title                           AS election_title,
  d.name                            AS department_name,
  d.code                            AS department_code,
  cl.name                           AS class_name,
  cl.year_group,
  COUNT(ve.id)                      AS total_eligible,
  COUNT(ve.id) FILTER (WHERE ve.consumed) AS total_voted,
  ROUND(
    COUNT(ve.id) FILTER (WHERE ve.consumed)::numeric /
    NULLIF(COUNT(ve.id), 0) * 100, 1
  )                                 AS turnout_pct
FROM   elections          e
JOIN   voting_entitlements ve ON ve.election_id = e.id
JOIN   students            s  ON s.id = ve.student_id
JOIN   classes             cl ON cl.id = s.class_id
JOIN   departments         d  ON d.id = cl.department_id
GROUP  BY e.id, e.title, d.name, d.code, cl.name, cl.year_group
ORDER  BY d.name, cl.year_group, cl.name;

-- Grant read to authenticated (IT Coordinator)
GRANT SELECT ON class_turnout_view TO authenticated;

-- =============================================================
-- DONE.
-- - Departments updated to 6 real KAWSEC departments
-- - elections.eligible_year_groups column added
-- - generate_student_id() function: KAWSEC-[DEPT]-[YEAR]-[NNNN]
-- - bulk_import_students() function: auto-IDs on import
-- - class_turnout_view: per-class voting progress
-- =============================================================
