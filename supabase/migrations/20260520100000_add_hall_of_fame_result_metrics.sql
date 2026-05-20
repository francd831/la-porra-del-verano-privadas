-- Add Hall of Fame result accuracy metrics: correct signs and exact scores.

CREATE OR REPLACE FUNCTION public.refresh_score_result_events(p_tournament_id uuid)
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
    AND event_type = 'results';

  WITH result_metrics AS (
    SELECT
      p.user_id,
      count(*) FILTER (
        WHERE (p.home_goals > p.away_goals AND m.home_goals > m.away_goals)
           OR (p.home_goals < p.away_goals AND m.home_goals < m.away_goals)
           OR (p.home_goals = p.away_goals AND m.home_goals = m.away_goals)
      )::integer AS sign_hits,
      count(*) FILTER (
        WHERE p.home_goals = m.home_goals
          AND p.away_goals = m.away_goals
      )::integer AS exact_hits
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
    GROUP BY p.user_id
  ),
  rows AS (
    SELECT
      p_tournament_id AS tournament_id,
      user_id,
      'results' AS event_type,
      'signs_total' AS event_key,
      'Más signos acertados' AS event_label,
      sign_hits AS points,
      jsonb_build_object('metric', 'sign_hits') AS metadata
    FROM result_metrics
    WHERE sign_hits > 0
    UNION ALL
    SELECT
      p_tournament_id,
      user_id,
      'results',
      'exact_scores_total',
      'Más resultados exactos',
      exact_hits,
      jsonb_build_object('metric', 'exact_hits')
    FROM result_metrics
    WHERE exact_hits > 0
  )
  INSERT INTO public.user_score_events (
    tournament_id, user_id, event_type, event_key, event_label, points, metadata
  )
  SELECT tournament_id, user_id, event_type, event_key, event_label, points, metadata
  FROM rows;

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
END;
$$;
