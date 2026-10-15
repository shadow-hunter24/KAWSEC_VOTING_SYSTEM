-- =============================================================
-- KAWSEC VOTING SYSTEM — Migration 0011
-- Add ranks_to_publish to positions
-- =============================================================
-- ranks_to_publish controls how many top candidates are
-- officially recognised per position:
--   1 = Main Prefect only
--   2 = Main + 1st Assistant
--   3 = Main + 1st + 2nd Assistant (default for KAWSEC)
--
-- The IT Coordinator can change this per position before
-- publishing results.
-- =============================================================

ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS ranks_to_publish smallint NOT NULL DEFAULT 3
    CHECK (ranks_to_publish BETWEEN 1 AND 10);

COMMENT ON COLUMN positions.ranks_to_publish IS
  'How many top-ranked candidates to include in published results. Default 3 (Main + 1st + 2nd Assistant).';

-- Update existing positions to default of 3
UPDATE positions SET ranks_to_publish = 3 WHERE ranks_to_publish IS NULL;

-- Labels used in the results display
-- rank 1 = Main Prefect / House Captain
-- rank 2 = 1st Assistant
-- rank 3 = 2nd Assistant
-- rank 4+ = reserved

-- =============================================================
-- DONE. Column: positions.ranks_to_publish (default 3)
-- =============================================================
