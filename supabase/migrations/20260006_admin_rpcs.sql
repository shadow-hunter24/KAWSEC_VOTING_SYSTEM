-- =============================================================
-- KAWSEC VOTING SYSTEM — Migration 0006
-- Admin RPCs: generate entitlements, publish results
-- =============================================================

-- ── 1. GENERATE VOTING ENTITLEMENTS ──────────────────────────
-- Called when IT Coordinator approves an election.
-- Creates one voting_entitlements row per student per position
-- they are eligible for (school-wide or house-specific).
-- Safe to call multiple times — uses ON CONFLICT DO NOTHING.

CREATE OR REPLACE FUNCTION generate_voting_entitlements(p_election_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count  integer := 0;
  v_pos    RECORD;
  v_student RECORD;
BEGIN
  -- Loop over each position in this election
  FOR v_pos IN
    SELECT id, eligibility_scope, house_id
    FROM   positions
    WHERE  election_id = p_election_id
  LOOP
    -- School-wide: all active students
    IF v_pos.eligibility_scope = 'school_wide' THEN
      FOR v_student IN
        SELECT id FROM students WHERE is_active = true
      LOOP
        INSERT INTO voting_entitlements (election_id, student_id, position_id)
        VALUES (p_election_id, v_student.id, v_pos.id)
        ON CONFLICT (student_id, position_id) DO NOTHING;
        v_count := v_count + 1;
      END LOOP;

    -- House-only: only students in that house
    ELSIF v_pos.eligibility_scope = 'house' AND v_pos.house_id IS NOT NULL THEN
      FOR v_student IN
        SELECT id FROM students
        WHERE  is_active = true AND house_id = v_pos.house_id
      LOOP
        INSERT INTO voting_entitlements (election_id, student_id, position_id)
        VALUES (p_election_id, v_student.id, v_pos.id)
        ON CONFLICT (student_id, position_id) DO NOTHING;
        v_count := v_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  -- Update election status to approved
  UPDATE elections
  SET    status      = 'approved',
         approved_at = now(),
         updated_at  = now()
  WHERE  id = p_election_id
    AND  status = 'draft';

  RETURN jsonb_build_object(
    'success',     true,
    'entitlements_created', v_count
  );
END;
$$;

-- ── 2. OPEN / CLOSE ELECTION ──────────────────────────────────
-- Simple status transitions with guard checks.

CREATE OR REPLACE FUNCTION set_election_status(
  p_election_id uuid,
  p_status      text,
  p_actor       text DEFAULT 'IT Coordinator'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current text;
BEGIN
  SELECT status INTO v_current FROM elections WHERE id = p_election_id;
  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Election not found.');
  END IF;

  -- Allowed transitions
  IF NOT (
    (v_current = 'draft'     AND p_status = 'approved') OR
    (v_current = 'approved'  AND p_status = 'open')     OR
    (v_current = 'open'      AND p_status = 'closed')   OR
    (v_current = 'closed'    AND p_status = 'verified') OR
    (v_current = 'verified'  AND p_status = 'published') OR
    (p_status = 'cancelled')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Cannot transition from %s to %s.', v_current, p_status)
    );
  END IF;

  UPDATE elections
  SET    status     = p_status,
         updated_at = now()
  WHERE  id = p_election_id;

  -- Audit
  INSERT INTO audit_events (election_id, actor, action, details)
  VALUES (p_election_id, p_actor, 'election.' || p_status,
          jsonb_build_object('previous_status', v_current));

  RETURN jsonb_build_object('success', true, 'new_status', p_status);
END;
$$;

-- ── 3. PUBLISH RESULTS ────────────────────────────────────────
-- Called after IT Coordinator reviews tally and panel decisions.
-- Writes to published_results and marks election as published.

CREATE OR REPLACE FUNCTION publish_election_results(
  p_election_id uuid,
  p_publisher   text,
  -- JSON array: [{ position_id, candidate_id, vote_count, rank, tie_flag, panel_decision }]
  p_results     text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row      jsonb;
  v_results  jsonb := p_results::jsonb;
  v_pos_title text;
  v_cand_name text;
  v_count    integer := 0;
BEGIN
  -- Verify election is in verified state
  IF NOT EXISTS (SELECT 1 FROM elections WHERE id = p_election_id AND status = 'verified') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Election must be in verified state before publishing.');
  END IF;

  -- Clear any previous publish attempt
  DELETE FROM published_results WHERE election_id = p_election_id;

  FOR v_row IN SELECT * FROM jsonb_array_elements(v_results) LOOP
    -- Denormalise position title
    SELECT title INTO v_pos_title FROM positions WHERE id = (v_row->>'position_id')::uuid;
    -- Denormalise candidate name
    SELECT s.full_name INTO v_cand_name
    FROM candidates c JOIN students s ON s.id = c.student_id
    WHERE c.id = (v_row->>'candidate_id')::uuid;

    INSERT INTO published_results (
      election_id, position_id, position_title,
      candidate_id, candidate_name, vote_count, rank,
      tie_flag, panel_decision, published_by
    ) VALUES (
      p_election_id,
      (v_row->>'position_id')::uuid,
      COALESCE(v_pos_title, 'Unknown Position'),
      (v_row->>'candidate_id')::uuid,
      COALESCE(v_cand_name, 'Unknown Candidate'),
      (v_row->>'vote_count')::integer,
      (v_row->>'rank')::smallint,
      COALESCE((v_row->>'tie_flag')::boolean, false),
      v_row->>'panel_decision',
      p_publisher
    );
    v_count := v_count + 1;
  END LOOP;

  -- Mark election published
  UPDATE elections SET status = 'published', updated_at = now() WHERE id = p_election_id;

  -- Audit
  INSERT INTO audit_events (election_id, actor, action, details)
  VALUES (p_election_id, p_publisher, 'results.published',
          jsonb_build_object('result_rows', v_count));

  RETURN jsonb_build_object('success', true, 'rows_published', v_count);
END;
$$;

-- Grant to authenticated only (IT Coordinator is authenticated)
GRANT EXECUTE ON FUNCTION generate_voting_entitlements TO authenticated;
GRANT EXECUTE ON FUNCTION set_election_status           TO authenticated;
GRANT EXECUTE ON FUNCTION publish_election_results      TO authenticated;

-- =============================================================
-- DONE. Functions: generate_voting_entitlements,
--                  set_election_status, publish_election_results
-- =============================================================
