-- =============================================================
-- KAWSEC VOTING SYSTEM — Migration 0007
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

  -- ── 1. Create mock election ───────────────────────────────
  INSERT INTO elections (title, status, description, created_by,
                         voting_opens_at, voting_closes_at)
  VALUES (
    'MOCK ELECTION — Phase 6 Test',
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
    WHERE title = 'MOCK ELECTION — Phase 6 Test' LIMIT 1;
  END IF;

  IF v_election_id IS NULL THEN
    RAISE EXCEPTION 'Could not create or find mock election.';
  END IF;

  -- ── 2. Create 4 test positions ────────────────────────────
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

  -- ── 3. Add candidates using existing demo students ────────
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

  -- ── 4. Generate entitlements for all active students ──────
  PERFORM generate_voting_entitlements(v_election_id);

  -- Mark election as approved (generate_voting_entitlements sets draft→approved)
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
