-- =============================================================
-- KAWSEC VOTING SYSTEM — Migration 0009
-- Replace placeholder houses with real KAWSEC houses
-- =============================================================
-- Safe to run even if old houses are already gone.
-- Only deletes rows with the old placeholder codes.
-- =============================================================

-- Remove old placeholder houses (only if they still exist)
DELETE FROM houses WHERE code IN ('NKR','AGG','DAN','BUS','OLY','LUT');

-- Insert the 4 real KAWSEC houses
INSERT INTO houses (name, code, colour) VALUES
  ('Akuamoah', 'AKU', '#1a4d2e'),
  ('Opaniman', 'OPA', '#2d7a4f'),
  ('Akroko',   'AKR', '#0f2d1a'),
  ('Tokoli',   'TOK', '#3d8f5f')
ON CONFLICT (code) DO NOTHING;

-- Verify
SELECT name, code FROM houses ORDER BY name;

-- =============================================================
-- DONE. Houses: Akuamoah, Opaniman, Akroko, Tokoli
-- =============================================================
