-- Repair the six partial group predictions found after predictions were locked.
UPDATE public.predictions
SET
  home_goals = COALESCE(home_goals, 0),
  away_goals = COALESCE(away_goals, 0)
WHERE match_id IS NOT NULL
  AND (home_goals IS NULL OR away_goals IS NULL);

-- Group predictions are stored with match_id. Knockout selections use
-- playoff_round and intentionally have no score, so they remain unaffected.
ALTER TABLE public.predictions
  DROP CONSTRAINT IF EXISTS predictions_match_score_complete;

ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_match_score_complete
  CHECK (
    match_id IS NULL
    OR (home_goals IS NOT NULL AND away_goals IS NOT NULL)
  ) NOT VALID;

ALTER TABLE public.predictions
  VALIDATE CONSTRAINT predictions_match_score_complete;

CREATE OR REPLACE FUNCTION public.reconcile_submission_completion_internal(
  p_user_id UUID,
  p_tournament_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected_group_matches INTEGER;
  v_completed_group_matches INTEGER;
  v_completed_playoff_matches INTEGER;
  v_has_champion BOOLEAN;
  v_completed_awards INTEGER;
  v_is_complete BOOLEAN;
  v_expected_playoff_keys CONSTANT TEXT[] := ARRAY[
    'R32_1', 'R32_2', 'R32_3', 'R32_4', 'R32_5', 'R32_6', 'R32_7', 'R32_8',
    'R32_9', 'R32_10', 'R32_11', 'R32_12', 'R32_13', 'R32_14', 'R32_15', 'R32_16',
    'R16_1', 'R16_2', 'R16_3', 'R16_4', 'R16_5', 'R16_6', 'R16_7', 'R16_8',
    'QF_1', 'QF_2', 'QF_3', 'QF_4',
    'SF_1', 'SF_2',
    'FINAL_1'
  ];
BEGIN
  SELECT COUNT(*)
  INTO v_expected_group_matches
  FROM public.matches
  WHERE tournament_id = p_tournament_id
    AND match_type = 'group';

  SELECT COUNT(DISTINCT p.match_id)
  INTO v_completed_group_matches
  FROM public.predictions p
  INNER JOIN public.matches m ON m.id = p.match_id
  WHERE p.user_id = p_user_id
    AND m.tournament_id = p_tournament_id
    AND m.match_type = 'group'
    AND p.home_goals IS NOT NULL
    AND p.away_goals IS NOT NULL;

  SELECT COUNT(*)
  INTO v_completed_playoff_matches
  FROM unnest(v_expected_playoff_keys) AS expected(playoff_key)
  WHERE EXISTS (
    SELECT 1
    FROM public.predictions p
    WHERE p.user_id = p_user_id
      AND p.playoff_round = expected.playoff_key
      AND p.predicted_winner_team_id IS NOT NULL
  );

  SELECT EXISTS (
    SELECT 1
    FROM public.champion_predictions cp
    WHERE cp.user_id = p_user_id
      AND cp.tournament_id = p_tournament_id
      AND cp.predicted_winner_team_id IS NOT NULL
  )
  INTO v_has_champion;

  SELECT COUNT(DISTINCT ap.award_type)
  INTO v_completed_awards
  FROM public.award_predictions ap
  WHERE ap.user_id = p_user_id
    AND ap.tournament_id = p_tournament_id
    AND ap.award_type IN ('balon_oro', 'bota_oro')
    AND NULLIF(BTRIM(ap.player_name), '') IS NOT NULL;

  v_is_complete :=
    v_expected_group_matches > 0
    AND v_completed_group_matches = v_expected_group_matches
    AND v_completed_playoff_matches = CARDINALITY(v_expected_playoff_keys)
    AND v_has_champion
    AND v_completed_awards = 2;

  UPDATE public.user_submissions
  SET
    total_predictions = v_completed_group_matches,
    champion_predicted = v_has_champion,
    awards_predicted = (v_completed_awards = 2),
    is_complete = v_is_complete,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND tournament_id = p_tournament_id
    AND ROW(
      total_predictions,
      champion_predicted,
      awards_predicted,
      is_complete
    ) IS DISTINCT FROM ROW(
      v_completed_group_matches,
      v_has_champion,
      v_completed_awards = 2,
      v_is_complete
    );

  RETURN v_is_complete;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_my_submission_completion(
  p_tournament_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN public.reconcile_submission_completion_internal(
    auth.uid(),
    p_tournament_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_submission_completion_internal(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_submission_completion_internal(UUID, UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.reconcile_my_submission_completion(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_my_submission_completion(UUID)
  TO authenticated, service_role;

-- Reconcile every existing submission using persisted data rather than the
-- former client-side completion flag.
DO $$
DECLARE
  v_submission RECORD;
BEGIN
  FOR v_submission IN
    SELECT user_id, tournament_id
    FROM public.user_submissions
  LOOP
    PERFORM public.reconcile_submission_completion_internal(
      v_submission.user_id,
      v_submission.tournament_id
    );
  END LOOP;
END;
$$;

-- Recalculate only changed point totals (the function uses IS DISTINCT FROM)
-- and refresh the affected score breakdowns and Hall of Fame once.
SELECT public.refresh_match_score_breakdown(match_id)
FROM (
  VALUES ('I_1'::TEXT), ('B_2'::TEXT), ('B_6'::TEXT),
         ('C_5'::TEXT), ('G_3'::TEXT), ('I_5'::TEXT)
) AS repaired(match_id);

SELECT public.update_all_user_points_internal(
  '11111111-1111-1111-1111-111111111111'::UUID,
  TRUE
);
