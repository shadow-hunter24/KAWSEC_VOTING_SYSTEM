-- =============================================================
-- KAWSEC VOTING SYSTEM — Migration 0010
-- Fix generate_voting_entitlements — gender filter for house
-- captain positions only
-- =============================================================
-- KAWSEC rules:
--   School-wide positions (Head Boy, Head Girl, Sports Prefect,
--   Chaplain, Entertainment, Dining Hall, Compound):
--     → The WHOLE school votes for ALL of them.
--       Males and females vote for both the male and female
--       versions of each position.
--
--   House Captain positions (eligibility_scope = 'house'):
--     → Only students IN that house vote.
--     → Male students vote ONLY for the Male Captain.
--     → Female students vote ONLY for the Female Captain.
--       Gender filter applies HERE only.
-- =============================================================

CREATE OR REPLACE FUNCTION generate_voting_entitlements(p_election_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count   integer := 0;
  v_pos     RECORD;
  v_student RECORD;
BEGIN
  FOR v_pos IN
    SELECT id, eligibility_scope, house_id, gender_scope
    FROM   positions
    WHERE  election_id = p_election_id
  LOOP

    -- ── School-wide: ALL active students vote regardless of gender
    IF v_pos.eligibility_scope = 'school_wide' THEN
      FOR v_student IN
        SELECT id FROM students WHERE is_active = true
      LOOP
        INSERT INTO voting_entitlements (election_id, student_id, position_id)
        VALUES (p_election_id, v_student.id, v_pos.id)
        ON CONFLICT (student_id, position_id) DO NOTHING;
        v_count := v_count + 1;
      END LOOP;

    -- ── House Captain: only house members, gender-matched
    ELSIF v_pos.eligibility_scope = 'house' AND v_pos.house_id IS NOT NULL THEN
      FOR v_student IN
        SELECT id FROM students
        WHERE  is_active = true
          AND  house_id  = v_pos.house_id
          AND (
            v_pos.gender_scope = 'all'        -- safety fallback
            OR gender = v_pos.gender_scope    -- male→male, female→female
          )
      LOOP
        INSERT INTO voting_entitlements (election_id, student_id, position_id)
        VALUES (p_election_id, v_student.id, v_pos.id)
        ON CONFLICT (student_id, position_id) DO NOTHING;
        v_count := v_count + 1;
      END LOOP;

    END IF;
  END LOOP;

  -- Mark election as approved
  UPDATE elections
  SET    status      = 'approved',
         approved_at = now(),
         updated_at  = now()
  WHERE  id = p_election_id
    AND  status = 'draft';

  RETURN jsonb_build_object(
    'success',              true,
    'entitlements_created', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION generate_voting_entitlements TO authenticated;

-- =============================================================
-- What each student gets:
--
-- Male student in Akuamoah:
--   ✓ All 12 school-wide positions (both M and F versions)
--   ✓ Akuamoah House Captain (Male)
--   ✗ Akuamoah House Captain (Female)  ← gender filtered
--   ✗ Any other house's captain positions ← house filtered
--
-- Female student in Akuamoah:
--   ✓ All 12 school-wide positions (both M and F versions)
--   ✓ Akuamoah House Captain (Female)
--   ✗ Akuamoah House Captain (Male)    ← gender filtered
--   ✗ Any other house's captain positions ← house filtered
--
-- Total ballot positions per student = 13
--   (12 school-wide + 1 house captain)
-- =============================================================
