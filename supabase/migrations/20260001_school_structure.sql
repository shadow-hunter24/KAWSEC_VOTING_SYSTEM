-- =============================================================
-- KAWSEC VOTING SYSTEM — Migration 0001
-- School Structure: departments, classes, houses
-- =============================================================
-- Run in Supabase → SQL Editor in numbered order.
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- =============================================================

-- ── 1. DEPARTMENTS ───────────────────────────────────────────
-- e.g. Science, General Arts, Business, Visual Arts, Home Economics

CREATE TABLE IF NOT EXISTS departments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  code       text NOT NULL UNIQUE,  -- e.g. 'SCI', 'ARTS', 'BIZ'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 2. CLASSES ────────────────────────────────────────────────
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

-- ── 3. HOUSES ─────────────────────────────────────────────────
-- School boarding/day houses. House Captains are elected per house.

CREATE TABLE IF NOT EXISTS houses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,  -- e.g. 'Nkrumah', 'Aggrey'
  code       text NOT NULL UNIQUE,  -- e.g. 'NKR', 'AGG'
  colour     text,                  -- optional hex colour for UI
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 4. ROW LEVEL SECURITY ─────────────────────────────────────

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses      ENABLE ROW LEVEL SECURITY;

-- Public (anon) can read — needed for student registration & voting UI
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

-- ── 5. SEED — DEMO DEPARTMENTS ────────────────────────────────
-- Replace/extend with actual KAWSEC departments before going live.

INSERT INTO departments (name, code) VALUES
  ('General Science',   'SCI'),
  ('General Arts',      'ARTS'),
  ('Business',          'BIZ'),
  ('Visual Arts',       'VIS'),
  ('Home Economics',    'HEC'),
  ('Technical',         'TECH')
ON CONFLICT (code) DO NOTHING;

-- ── 6. SEED — DEMO HOUSES ─────────────────────────────────────
-- Replace with actual KAWSEC house names before going live.

INSERT INTO houses (name, code, colour) VALUES
  ('Nkrumah',   'NKR', '#1a4d2e'),
  ('Aggrey',    'AGG', '#2d7a4f'),
  ('Danquah',   'DAN', '#0f2d1a'),
  ('Busia',     'BUS', '#3d8f5f'),
  ('Olympio',   'OLY', '#4aaa72'),
  ('Luthuli',   'LUT', '#1e5c35')
ON CONFLICT (code) DO NOTHING;

-- =============================================================
-- DONE. Tables: departments, classes, houses
-- =============================================================
