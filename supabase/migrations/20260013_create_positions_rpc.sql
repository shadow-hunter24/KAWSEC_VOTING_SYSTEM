-- =============================================================
-- KAWSEC VOTING SYSTEM — Migration 0013
-- create_election_positions RPC
--
-- When a new election is created via the admin UI, this RPC
-- generates the standard 12 school-wide positions + 2 house
-- captain positions per house (Male + Female). Idempotent —
-- safe to call multiple times (ON CONFLICT DO NOTHING).
-- =============================================================

CREATE OR REPLACE FUNCTION create_election_positions(p_election_id uuid)
RETURNS TABLE(positions_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count_before integer;
  v_house        RECORD;
  v_sort         integer := 13;
BEGIN
  SELECT count(*) INTO v_count_before
  FROM positions WHERE election_id = p_election_id;

  -- 12 school-wide positions (6 roles × 2 genders)
  INSERT INTO positions (election_id, title, role_group, gender_scope, eligibility_scope, sort_order) VALUES
    (p_election_id, 'Head Boy',                     'School Prefect',        'male',   'school_wide', 1),
    (p_election_id, 'Head Girl',                    'School Prefect',        'female', 'school_wide', 2),
    (p_election_id, 'Compound Prefect (Male)',       'Compound Prefect',      'male',   'school_wide', 3),
    (p_election_id, 'Compound Prefect (Female)',     'Compound Prefect',      'female', 'school_wide', 4),
    (p_election_id, 'Sports Prefect (Male)',         'Sports Prefect',        'male',   'school_wide', 5),
    (p_election_id, 'Sports Prefect (Female)',       'Sports Prefect',        'female', 'school_wide', 6),
    (p_election_id, 'School Chaplain (Male)',        'School Chaplain',      'male',   'school_wide', 7),
    (p_election_id, 'School Chaplain (Female)',      'School Chaplain',      'female', 'school_wide', 8),
    (p_election_id, 'Entertainment Prefect (Male)',  'Entertainment Prefect','male',   'school_wide', 9),
    (p_election_id, 'Entertainment Prefect (Female)','Entertainment Prefect','female', 'school_wide', 10),
    (p_election_id, 'Dining Hall Prefect (Male)',    'Dining Hall Prefect',   'male',   'school_wide', 11),
    (p_election_id, 'Dining Hall Prefect (Female)',  'Dining Hall Prefect',   'female', 'school_wide', 12)
  ON CONFLICT DO NOTHING;

  -- House Captain positions — one male + one female per house
  FOR v_house IN SELECT id, name FROM houses ORDER BY name LOOP
    INSERT INTO positions (election_id, title, role_group, gender_scope, eligibility_scope, house_id, sort_order)
    VALUES
      (p_election_id, v_house.name || ' House Captain (Male)',   'House Captain', 'male',   'house', v_house.id, v_sort),
      (p_election_id, v_house.name || ' House Captain (Female)', 'House Captain', 'female', 'house', v_house.id, v_sort + 1)
    ON CONFLICT DO NOTHING;
    v_sort := v_sort + 2;
  END LOOP;

  -- Return how many new positions were created
  RETURN (SELECT count(*) - v_count_before FROM positions WHERE election_id = p_election_id);
END;
$$;

-- Grant execute to authenticated (IT Coordinator) and anon (for RPC calls)
GRANT EXECUTE ON FUNCTION create_election_positions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_election_positions(uuid) TO anon;

-- =============================================================
-- DONE. Run this in Supabase SQL Editor.
-- After running, new elections created via the UI will
-- automatically get all standard positions.
-- For existing elections with no positions, the admin UI
-- has a "Generate Positions" button on draft elections.
-- =============================================================
