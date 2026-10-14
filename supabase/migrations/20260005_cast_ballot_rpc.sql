-- =============================================================
-- KAWSEC VOTING SYSTEM — Migration 0005
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
  -- ── 1. Lock and verify each entitlement (serialises concurrent requests)
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

  -- ── 2. All checks passed — consume entitlements and insert ballots
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

    -- Insert ballot — deliberately NO student_id (ballot secrecy)
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
