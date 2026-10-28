-- =============================================================
-- KAWSEC VOTING SYSTEM — Migration 0015
-- Class-based student import with class-scoped index numbers
-- =============================================================
-- New ID format: KAWSEC-[CLASSCODE]-[YEAR]-[NNNN]
-- e.g. KAWSEC-SCI3A-2026-0001 for first student in Science 3A
--
-- Sequence restarts per class per year:
--   Science 3A:  KAWSEC-SCI3A-2026-0001, 0002, 0003...
--   Arts 2B:     KAWSEC-ART2B-2026-0001, 0002, 0003...
--   Business 1C: KAWSEC-BIZ1C-2026-0001, 0002, 0003...
-- =============================================================

-- ── 1. CLASS CODE GENERATOR ───────────────────────────────────
-- Derives a compact class code from dept code + class name.
-- e.g. dept='SCI', class='Science 3A' → 'SCI3A'
--      dept='ART', class='General Arts 2B' → 'ART2B'

CREATE OR REPLACE FUNCTION get_class_code(
  p_dept_code  text,
  p_class_name text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_suffix text;
BEGIN
  -- Extract trailing alphanumeric suffix from class name
  -- e.g. 'Science 3A' → '3A', 'Business 1C' → '1C', 'Arts 2' → '2'
  v_suffix := REGEXP_REPLACE(UPPER(TRIM(p_class_name)), '^.*?([0-9]+[A-Z]?)$', '\1');

  -- If no suffix found, use the dept code alone
  IF v_suffix = UPPER(TRIM(p_class_name)) THEN
    v_suffix := '';
  END IF;

  RETURN UPPER(TRIM(p_dept_code)) || v_suffix;
END;
$$;

-- ── 2. CLASS-BASED ID GENERATOR ──────────────────────────────
-- Generates KAWSEC-[CLASSCODE]-[YEAR]-[NNNN]
-- Sequence is per class per year.

CREATE OR REPLACE FUNCTION generate_student_id_by_class(
  p_class_id uuid,
  p_year     integer DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year       integer;
  v_class_code text;
  v_prefix     text;
  v_next_seq   integer;
  v_new_id     text;
  v_dept_code  text;
  v_class_name text;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM now())::integer);

  -- Get dept code + class name
  SELECT d.code, c.name
    INTO v_dept_code, v_class_name
  FROM classes c
  JOIN departments d ON d.id = c.department_id
  WHERE c.id = p_class_id
  LIMIT 1;

  IF v_dept_code IS NULL THEN
    RAISE EXCEPTION 'Class % not found or has no department.', p_class_id;
  END IF;

  v_class_code := get_class_code(v_dept_code, v_class_name);
  v_prefix     := 'KAWSEC-' || v_class_code || '-' || v_year::text || '-';

  -- Find highest existing sequence for this class+year
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

  IF v_next_seq > 9999 THEN
    RAISE EXCEPTION 'Student ID sequence overflow for %. Contact IT.', v_prefix;
  END IF;

  v_new_id := v_prefix || LPAD(v_next_seq::text, 4, '0');

  IF EXISTS (SELECT 1 FROM students WHERE student_id_number = v_new_id) THEN
    RAISE EXCEPTION 'Generated ID % already exists.', v_new_id;
  END IF;

  RETURN v_new_id;
END;
$$;

-- ── 3. CLASS-BASED BULK IMPORT ───────────────────────────────
-- Accepts class_id directly — no class_name needed in CSV.
-- CSV only needs: full_name, gender, house_name
-- Year group comes from the class record.

CREATE OR REPLACE FUNCTION bulk_import_students_by_class(
  p_class_id uuid,
  p_students text,    -- JSON: [{full_name, gender, house_name}]
  p_year     integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row        jsonb;
  v_students   jsonb := p_students::jsonb;
  v_house_id   uuid;
  v_new_id     text;
  v_year_group smallint;
  v_imported   integer := 0;
  v_skipped    integer := 0;
  v_errors     jsonb   := '[]'::jsonb;
  v_generated  jsonb   := '[]'::jsonb;
  v_class_name text;
  v_dept_code  text;
BEGIN
  -- Validate class exists and get year_group
  SELECT c.year_group, c.name, d.code
    INTO v_year_group, v_class_name, v_dept_code
  FROM classes c
  JOIN departments d ON d.id = c.department_id
  WHERE c.id = p_class_id
  LIMIT 1;

  IF v_year_group IS NULL THEN
    RETURN jsonb_build_object(
      'imported', 0, 'skipped', 0,
      'errors', jsonb_build_array(jsonb_build_object('name', 'ALL', 'error', 'Class not found.')),
      'generated', '[]'::jsonb
    );
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(v_students) LOOP

    -- Resolve house by name
    SELECT id INTO v_house_id
    FROM   houses
    WHERE  LOWER(TRIM(name)) = LOWER(TRIM(v_row->>'house_name'))
    LIMIT  1;

    IF v_house_id IS NULL THEN
      v_errors  := v_errors || jsonb_build_object(
        'name',  v_row->>'full_name',
        'error', 'House not found: ' || COALESCE(v_row->>'house_name', '(blank)')
      );
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Generate class-based student ID
    BEGIN
      v_new_id := generate_student_id_by_class(p_class_id, p_year);
    EXCEPTION WHEN OTHERS THEN
      v_errors  := v_errors || jsonb_build_object(
        'name',  v_row->>'full_name',
        'error', SQLERRM
      );
      v_skipped := v_skipped + 1;
      CONTINUE;
    END;

    -- Insert student
    INSERT INTO students (
      student_id_number, full_name, gender,
      class_id, house_id, year_group, is_active
    ) VALUES (
      v_new_id,
      TRIM(v_row->>'full_name'),
      LOWER(TRIM(v_row->>'gender')),
      p_class_id,
      v_house_id,
      v_year_group,
      true
    )
    ON CONFLICT (student_id_number) DO NOTHING;

    v_imported  := v_imported + 1;
    v_generated := v_generated || jsonb_build_object(
      'name',  TRIM(v_row->>'full_name'),
      'id',    v_new_id,
      'class', v_class_name,
      'house', v_row->>'house_name',
      'gender', LOWER(TRIM(v_row->>'gender'))
    );

  END LOOP;

  RETURN jsonb_build_object(
    'imported',   v_imported,
    'skipped',    v_skipped,
    'errors',     v_errors,
    'generated',  v_generated,
    'class_name', v_class_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_class_code(text, text)                    TO authenticated;
GRANT EXECUTE ON FUNCTION generate_student_id_by_class(uuid, integer)   TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_import_students_by_class(uuid, text, integer) TO authenticated;

-- =============================================================
-- DONE.
-- - get_class_code(): extracts compact class code from name
-- - generate_student_id_by_class(): per-class sequence IDs
-- - bulk_import_students_by_class(): class-first import flow
--
-- Run in Supabase SQL Editor after migration 0014.
-- =============================================================
