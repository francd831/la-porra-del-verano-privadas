-- Keep Hall of Fame day events aligned with the canonical scoring rules.

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
  playoff_round_configs AS (
    SELECT *
    FROM (VALUES
      ('R32_%', 'Dieciseisavos de Final', 15),
      ('R16_%', 'Octavos de Final', 20),
      ('QF_%', 'Cuartos de Final', 30),
      ('SF_%', 'Semifinales', 40)
    ) AS config(source_prefix, source_round, points_per_team)
  ),
  completed_playoff_winners AS (
    SELECT DISTINCT
      (timezone('Europe/Madrid', m.match_date))::date AS match_day,
      m.winner_team_id,
      prc.source_prefix,
      prc.points_per_team
    FROM public.matches m
    INNER JOIN playoff_round_configs prc
      ON prc.source_round = m.round
    WHERE m.tournament_id = p_tournament_id
      AND m.match_type = 'playoff'
      AND m.status = 'completed'
      AND m.winner_team_id IS NOT NULL
      AND m.match_date IS NOT NULL
  ),
  playoff_match_points AS (
    SELECT
      p.user_id,
      cpw.match_day,
      cpw.points_per_team AS points
    FROM completed_playoff_winners cpw
    INNER JOIN public.predictions p
      ON p.playoff_round LIKE cpw.source_prefix
      AND p.predicted_winner_team_id = cpw.winner_team_id
    INNER JOIN public.user_submissions us
      ON us.user_id = p.user_id
      AND us.tournament_id = p_tournament_id
    GROUP BY p.user_id, cpw.match_day, cpw.winner_team_id, cpw.points_per_team
  ),
  final_champion_points AS (
    SELECT
      cp.user_id,
      (timezone('Europe/Madrid', m.match_date))::date AS match_day,
      50 AS points
    FROM public.matches m
    INNER JOIN public.tournament_winners tw
      ON tw.tournament_id = m.tournament_id
      AND tw.winner_team_id = m.winner_team_id
    INNER JOIN public.champion_predictions cp
      ON cp.tournament_id = tw.tournament_id
      AND cp.predicted_winner_team_id = tw.winner_team_id
    INNER JOIN public.user_submissions us
      ON us.user_id = cp.user_id
      AND us.tournament_id = p_tournament_id
    WHERE m.tournament_id = p_tournament_id
      AND m.match_type = 'playoff'
      AND m.round = 'Final'
      AND m.status = 'completed'
      AND m.winner_team_id IS NOT NULL
      AND m.match_date IS NOT NULL
  ),
  day_points AS (
    SELECT user_id, match_day, points FROM group_match_points
    UNION ALL
    SELECT user_id, match_day, points FROM playoff_match_points
    UNION ALL
    SELECT user_id, match_day, points FROM final_champion_points
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

  PERFORM public.refresh_score_event_ranks(p_tournament_id);
END;
$$;

SELECT public.update_all_user_points('11111111-1111-1111-1111-111111111111'::uuid);
