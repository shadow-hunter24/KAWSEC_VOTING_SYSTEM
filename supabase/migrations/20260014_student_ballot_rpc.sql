-- =============================================================
-- KAWSEC VOTING SYSTEM — Migration 0014
-- get_student_ballot_status RPC
--
-- The voting_entitlements table blocks all anon (student browser)
-- access via RLS. This RPC lets the frontend check a specific
-- student's entitlements using SECURITY DEFINER (service-role),
-- without exposing other students' data.
--
-- Returns: { has_entitlements, all_consumed, position_ids: [] }
-- =============================================================

CREATE OR REPLACE FUNCTION get_student_ballot_status(
  p_student_id uuid,
  p_election_id uuid
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total     int;
  v_consumed  int;
  v_pos_ids   uuid[];
BEGIN
  SELECT count(*) INTO v_total
  FROM voting_entitlements
  WHERE student_id = p_student_id
    AND election_id = p_election_id;

  IF v_total = 0 THEN
    RETURN json_build_object(
      'has_entitlements', false,
      'all_consumed',     false,
      'position_ids',     '[]'::json
    );
  END IF;

  SELECT count(*) INTO v_consumed
  FROM voting_entitlements
  WHERE student_id   = p_student_id
    AND election_id  = p_election_id
    AND consumed     = true;

  IF v_total = v_consumed THEN
    -- Student already voted
    RETURN json_build_object(
      'has_entitlements', true,
      'all_consumed',     true,
      'position_ids',     '[]'::json
    );
  END IF;

  -- Return unconsumed position IDs
  SELECT array_agg(position_id) INTO v_pos_ids
  FROM voting_entitlements
  WHERE student_id  = p_student_id
    AND election_id = p_election_id
    AND consumed    = false;

  RETURN json_build_object(
    'has_entitlements', true,
    'all_consumed',     false,
    'position_ids',     to_json(v_pos_ids)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_student_ballot_status(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_student_ballot_status(uuid, uuid) TO authenticated;

-- =============================================================
-- DONE. Run this in Supabase SQL Editor.
-- The BallotFlow frontend will call this RPC instead of
-- querying voting_entitlements directly.
-- =============================================================
