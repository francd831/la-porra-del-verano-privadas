-- Stop full-table scoring refreshes on every live score update.
-- Match breakdowns are updated incrementally, unchanged submissions are not
-- rewritten, and Hall of Fame aggregates refresh only on completed results.

CREATE OR REPLACE FUNCTION public.refresh_match_score_breakdown(p_match_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament_id UUID;
  v_is_scoreable BOOLEAN;
BEGIN
  SELECT
    tournament_id,
    match_type = 'group'
      AND status IN ('in_progress', 'completed')
      AND home_goals IS NOT NULL
      AND away_goals IS NOT NULL
  INTO v_tournament_id, v_is_scoreable
  FROM public.matches
  WHERE id = p_match_id;

  IF v_tournament_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT COALESCE(v_is_scoreable, false) THEN
    DELETE FROM public.user_score_breakdown
    WHERE match_id = p_match_id
      AND event_type = 'group_match';
    RETURN;
  END IF;

  WITH match_scores AS (
    SELECT
      us.user_id,
      m.tournament_id,
      m.id AS match_id,
      m.match_date,
      m.group_id,
      COALESCE(ht.name, m.home_team_id, 'TBD') || ' - ' || COALESCE(at.name, m.away_team_id, 'TBD') AS event_label,
      p.home_goals AS predicted_home_goals,
      p.away_goals AS predicted_away_goals,
      m.home_goals AS result_home_goals,
      m.away_goals AS result_away_goals,
      CASE
        WHEN p.home_goals IS NOT NULL AND p.away_goals IS NOT NULL AND p.home_goals = m.home_goals
          THEN 2 + m.home_goals
        ELSE 0
      END AS points_home_goals,
      CASE
        WHEN p.home_goals IS NOT NULL AND p.away_goals IS NOT NULL AND p.away_goals = m.away_goals
          THEN 2 + m.away_goals
        ELSE 0
      END AS points_away_goals,
      CASE
        WHEN p.home_goals IS NOT NULL AND p.away_goals IS NOT NULL
          AND (
            (p.home_goals > p.away_goals AND m.home_goals > m.away_goals) OR
            (p.home_goals = p.away_goals AND m.home_goals = m.away_goals) OR
            (p.home_goals < p.away_goals AND m.home_goals < m.away_goals)
          )
          THEN 5
        ELSE 0
      END AS points_sign,
      CASE
        WHEN p.home_goals IS NOT NULL AND p.away_goals IS NOT NULL
          AND p.home_goals = m.home_goals
          AND p.away_goals = m.away_goals
          THEN 6
        ELSE 0
      END AS points_exact_bonus
    FROM public.user_submissions us
    JOIN public.matches m
      ON m.tournament_id = us.tournament_id
      AND m.id = p_match_id
    LEFT JOIN public.predictions p
      ON p.user_id = us.user_id
      AND p.match_id = m.id
    LEFT JOIN public.teams ht ON ht.id = m.home_team_id
    LEFT JOIN public.teams at ON at.id = m.away_team_id
  )
  INSERT INTO public.user_score_breakdown (
    tournament_id,
    user_id,
    event_type,
    event_key,
    event_label,
    points,
    points_home_goals,
    points_away_goals,
    points_sign,
    points_exact_bonus,
    match_id,
    match_date,
    group_id,
    round,
    prediction,
    result,
    metadata,
    calculated_at
  )
  SELECT
    tournament_id,
    user_id,
    'group_match',
    match_id,
    event_label,
    points_home_goals + points_away_goals + points_sign + points_exact_bonus,
    points_home_goals,
    points_away_goals,
    points_sign,
    points_exact_bonus,
    match_id,
    match_date,
    group_id,
    'Fase de grupos',
    jsonb_build_object('home_goals', predicted_home_goals, 'away_goals', predicted_away_goals),
    jsonb_build_object('home_goals', result_home_goals, 'away_goals', result_away_goals),
    jsonb_build_object('source', 'match_result'),
    now()
  FROM match_scores
  ON CONFLICT (tournament_id, user_id, event_type, event_key)
  DO UPDATE SET
    event_label = EXCLUDED.event_label,
    points = EXCLUDED.points,
    points_home_goals = EXCLUDED.points_home_goals,
    points_away_goals = EXCLUDED.points_away_goals,
    points_sign = EXCLUDED.points_sign,
    points_exact_bonus = EXCLUDED.points_exact_bonus,
    match_date = EXCLUDED.match_date,
    group_id = EXCLUDED.group_id,
    prediction = EXCLUDED.prediction,
    result = EXCLUDED.result,
    metadata = EXCLUDED.metadata,
    calculated_at = EXCLUDED.calculated_at,
    updated_at = now()
  WHERE ROW(
    public.user_score_breakdown.event_label,
    public.user_score_breakdown.points,
    public.user_score_breakdown.points_home_goals,
    public.user_score_breakdown.points_away_goals,
    public.user_score_breakdown.points_sign,
    public.user_score_breakdown.points_exact_bonus,
    public.user_score_breakdown.match_date,
    public.user_score_breakdown.group_id,
    public.user_score_breakdown.prediction,
    public.user_score_breakdown.result
  ) IS DISTINCT FROM ROW(
    EXCLUDED.event_label,
    EXCLUDED.points,
    EXCLUDED.points_home_goals,
    EXCLUDED.points_away_goals,
    EXCLUDED.points_sign,
    EXCLUDED.points_exact_bonus,
    EXCLUDED.match_date,
    EXCLUDED.group_id,
    EXCLUDED.prediction,
    EXCLUDED.result
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_all_user_points_internal(
  p_tournament_id UUID,
  p_refresh_hall BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_submission RECORD;
  v_points RECORD;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  FOR v_user_submission IN
    SELECT user_id
    FROM public.user_submissions
    WHERE tournament_id = p_tournament_id
  LOOP
    SELECT *
    INTO v_points
    FROM public.calculate_user_points(v_user_submission.user_id, p_tournament_id);

    UPDATE public.user_submissions
    SET
      points_groups = v_points.groups_points,
      points_group_order = v_points.group_order_bonus,
      points_playoffs = v_points.playoffs_points,
      points_awards = v_points.awards_points,
      points_total = v_points.total_points,
      points_r32 = v_points.r32_points,
      points_r16 = v_points.r16_points,
      points_qf = v_points.qf_points,
      points_sf = v_points.sf_points,
      points_final = v_points.final_points,
      points_champion = v_points.champion_points,
      updated_at = now()
    WHERE user_id = v_user_submission.user_id
      AND tournament_id = p_tournament_id
      AND ROW(
        points_groups,
        points_group_order,
        points_playoffs,
        points_awards,
        points_total,
        points_r32,
        points_r16,
        points_qf,
        points_sf,
        points_final,
        points_champion
      ) IS DISTINCT FROM ROW(
        v_points.groups_points,
        v_points.group_order_bonus,
        v_points.playoffs_points,
        v_points.awards_points,
        v_points.total_points,
        v_points.r32_points,
        v_points.r16_points,
        v_points.qf_points,
        v_points.sf_points,
        v_points.final_points,
        v_points.champion_points
      );
  END LOOP;

  IF p_refresh_hall THEN
    PERFORM public.refresh_score_events(p_tournament_id);
    PERFORM public.refresh_score_result_events(p_tournament_id);
    PERFORM public.refresh_score_day_events(p_tournament_id);
    PERFORM public.refresh_score_event_ranks(p_tournament_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_all_user_points(p_tournament_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.update_all_user_points_internal(p_tournament_id, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_update_points_on_match_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('in_progress', 'completed')
     AND (
       OLD.status IS DISTINCT FROM NEW.status OR
       OLD.home_goals IS DISTINCT FROM NEW.home_goals OR
       OLD.away_goals IS DISTINCT FROM NEW.away_goals
     ) THEN
    PERFORM public.update_all_user_points_internal(
      NEW.tournament_id,
      NEW.status = 'completed'
    );
    PERFORM public.refresh_match_score_breakdown(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_match_score_breakdown(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_match_score_breakdown(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_all_user_points_internal(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_all_user_points_internal(UUID, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_all_user_points(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_all_user_points(UUID) TO service_role;
