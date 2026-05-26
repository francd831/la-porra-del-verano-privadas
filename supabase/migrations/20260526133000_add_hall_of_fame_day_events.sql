CREATE OR REPLACE FUNCTION public.refresh_score_day_events(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  DELETE FROM public.user_score_events
  WHERE tournament_id = p_tournament_id
    AND event_type = 'day';

  WITH group_match_points AS (
    SELECT
      p.user_id,
      (timezone('Europe/Madrid', m.match_date))::date AS match_day,
      CASE
        WHEN p.home_goals = m.home_goals AND p.away_goals = m.away_goals THEN
          (2 + m.home_goals) + (2 + m.away_goals) + 5 + 6
        ELSE
          (CASE WHEN p.home_goals = m.home_goals THEN 2 + m.home_goals ELSE 0 END) +
          (CASE WHEN p.away_goals = m.away_goals THEN 2 + m.away_goals ELSE 0 END) +
          (CASE
            WHEN (p.home_goals > p.away_goals AND m.home_goals > m.away_goals) OR
                 (p.home_goals < p.away_goals AND m.home_goals < m.away_goals) OR
                 (p.home_goals = p.away_goals AND m.home_goals = m.away_goals)
            THEN 5
            ELSE 0
          END)
      END AS points
    FROM public.predictions p
    INNER JOIN public.matches m ON m.id = p.match_id
    INNER JOIN public.user_submissions us
      ON us.user_id = p.user_id
      AND us.tournament_id = p_tournament_id
    WHERE m.tournament_id = p_tournament_id
      AND m.match_type = 'group'
      AND m.status = 'completed'
      AND p.home_goals IS NOT NULL
      AND p.away_goals IS NOT NULL
      AND m.home_goals IS NOT NULL
      AND m.away_goals IS NOT NULL
      AND m.match_date IS NOT NULL
  ),
  playoff_match_points AS (
    SELECT
      p.user_id,
      (timezone('Europe/Madrid', m.match_date))::date AS match_day,
      CASE m.round
        WHEN 'Dieciseisavos de Final' THEN 10
        WHEN 'Octavos de Final' THEN 15
        WHEN 'Cuartos de Final' THEN 20
        WHEN 'Semifinales' THEN 30
        WHEN 'Final' THEN 40
        ELSE 0
      END AS points
    FROM public.predictions p
    INNER JOIN public.matches m ON m.id::text = p.playoff_round
    INNER JOIN public.user_submissions us
      ON us.user_id = p.user_id
      AND us.tournament_id = p_tournament_id
    WHERE m.tournament_id = p_tournament_id
      AND m.match_type = 'playoff'
      AND m.status = 'completed'
      AND p.predicted_winner_team_id IS NOT NULL
      AND m.home_goals IS NOT NULL
      AND m.away_goals IS NOT NULL
      AND m.match_date IS NOT NULL
      AND p.predicted_winner_team_id = CASE
        WHEN m.home_goals > m.away_goals THEN m.home_team_id
        WHEN m.away_goals > m.home_goals THEN m.away_team_id
        ELSE NULL
      END
  ),
  day_points AS (
    SELECT user_id, match_day, points FROM group_match_points
    UNION ALL
    SELECT user_id, match_day, points FROM playoff_match_points
  ),
  day_totals AS (
    SELECT user_id, match_day, sum(points)::integer AS points
    FROM day_points
    GROUP BY user_id, match_day
    HAVING sum(points) > 0
  )
  INSERT INTO public.user_score_events (
    tournament_id, user_id, event_type, event_key, event_label, points, metadata
  )
  SELECT
    p_tournament_id,
    user_id,
    'day',
    match_day::text,
    'Rey del dia - ' || to_char(match_day, 'DD/MM'),
    points,
    jsonb_build_object('match_day', match_day)
  FROM day_totals;

  WITH ranked AS (
    SELECT
      id,
      rank() OVER (
        PARTITION BY tournament_id, event_type, event_key
        ORDER BY points DESC, user_id ASC
      ) AS calculated_rank
    FROM public.user_score_events
    WHERE tournament_id = p_tournament_id
  )
  UPDATE public.user_score_events e
  SET rank = ranked.calculated_rank
  FROM ranked
  WHERE e.id = ranked.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_all_user_points(p_tournament_id uuid)
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

  FOR v_user_submission IN SELECT user_id FROM public.user_submissions WHERE tournament_id = p_tournament_id
  LOOP
    SELECT * INTO v_points FROM public.calculate_user_points(v_user_submission.user_id, p_tournament_id);

    UPDATE public.user_submissions SET
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
      AND tournament_id = p_tournament_id;
  END LOOP;

  PERFORM public.refresh_score_events(p_tournament_id);
  PERFORM public.refresh_score_result_events(p_tournament_id);
  PERFORM public.refresh_score_day_events(p_tournament_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_score_day_events(uuid) TO authenticated;
