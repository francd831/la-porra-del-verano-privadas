-- Hall of Fame scoring events.
-- This table is derived from existing predictions/results and does not replace user_submissions.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS matchday integer;

WITH numbered_group_matches AS (
  SELECT
    id,
    ceil(row_number() OVER (
      PARTITION BY tournament_id, group_id
      ORDER BY match_date NULLS LAST, id
    ) / 2.0)::integer AS calculated_matchday
  FROM public.matches
  WHERE match_type = 'group'
    AND group_id IS NOT NULL
)
UPDATE public.matches m
SET matchday = ngm.calculated_matchday
FROM numbered_group_matches ngm
WHERE m.id = ngm.id
  AND m.matchday IS DISTINCT FROM ngm.calculated_matchday;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_matchday_check,
  ADD CONSTRAINT matches_matchday_check CHECK (matchday IS NULL OR matchday BETWEEN 1 AND 3);

CREATE TABLE IF NOT EXISTS public.user_score_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  event_key text NOT NULL,
  event_label text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  rank integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id, event_type, event_key)
);

CREATE INDEX IF NOT EXISTS idx_user_score_events_tournament_event
  ON public.user_score_events(tournament_id, event_type, event_key, rank, points DESC);

CREATE INDEX IF NOT EXISTS idx_user_score_events_user
  ON public.user_score_events(user_id);

ALTER TABLE public.user_score_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view score events" ON public.user_score_events;
CREATE POLICY "Authenticated users can view score events"
ON public.user_score_events
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage score events" ON public.user_score_events;
CREATE POLICY "Admins can manage score events"
ON public.user_score_events
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.refresh_score_events(p_tournament_id uuid)
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
  WHERE tournament_id = p_tournament_id;

  -- Individual completed group matches.
  WITH match_points AS (
    SELECT
      p.user_id,
      m.id AS match_id,
      concat(coalesce(home.name, 'Equipo local'), ' - ', coalesce(away.name, 'Equipo visitante')) AS match_label,
      m.group_id,
      m.matchday,
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
    INNER JOIN public.matches m ON p.match_id = m.id
    LEFT JOIN public.teams home ON home.id = m.home_team_id
    LEFT JOIN public.teams away ON away.id = m.away_team_id
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
  )
  INSERT INTO public.user_score_events (
    tournament_id, user_id, event_type, event_key, event_label, points, metadata
  )
  SELECT
    p_tournament_id,
    user_id,
    'match',
    match_id,
    match_label,
    points,
    jsonb_build_object('group_id', group_id, 'matchday', matchday)
  FROM match_points
  WHERE points > 0;

  -- Matchdays in group stage.
  WITH match_points AS (
    SELECT
      p.user_id,
      m.matchday,
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
    INNER JOIN public.matches m ON p.match_id = m.id
    INNER JOIN public.user_submissions us
      ON us.user_id = p.user_id
      AND us.tournament_id = p_tournament_id
    WHERE m.tournament_id = p_tournament_id
      AND m.match_type = 'group'
      AND m.status = 'completed'
      AND m.matchday IS NOT NULL
      AND p.home_goals IS NOT NULL
      AND p.away_goals IS NOT NULL
      AND m.home_goals IS NOT NULL
      AND m.away_goals IS NOT NULL
  )
  INSERT INTO public.user_score_events (
    tournament_id, user_id, event_type, event_key, event_label, points, metadata
  )
  SELECT
    p_tournament_id,
    user_id,
    'matchday',
    'group_md_' || matchday::text,
    'Jornada ' || matchday::text,
    sum(points)::integer,
    jsonb_build_object('matchday', matchday)
  FROM match_points
  GROUP BY user_id, matchday
  HAVING sum(points) > 0;

  -- Groups: match points plus exact final group order bonus.
  WITH match_points AS (
    SELECT
      p.user_id,
      m.group_id,
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
    INNER JOIN public.matches m ON p.match_id = m.id
    INNER JOIN public.user_submissions us
      ON us.user_id = p.user_id
      AND us.tournament_id = p_tournament_id
    WHERE m.tournament_id = p_tournament_id
      AND m.match_type = 'group'
      AND m.status = 'completed'
      AND m.group_id IS NOT NULL
      AND p.home_goals IS NOT NULL
      AND p.away_goals IS NOT NULL
      AND m.home_goals IS NOT NULL
      AND m.away_goals IS NOT NULL
  ),
  group_match_points AS (
    SELECT user_id, group_id, sum(points)::integer AS points
    FROM match_points
    GROUP BY user_id, group_id
  ),
  completed_groups AS (
    SELECT group_id
    FROM public.matches
    WHERE tournament_id = p_tournament_id
      AND match_type = 'group'
      AND group_id IS NOT NULL
    GROUP BY group_id
    HAVING bool_and(status = 'completed' AND home_goals IS NOT NULL AND away_goals IS NOT NULL)
  ),
  actual_team_stats AS (
    SELECT m.group_id, m.home_team_id AS team_id,
      sum(CASE WHEN m.home_goals > m.away_goals THEN 3 WHEN m.home_goals = m.away_goals THEN 1 ELSE 0 END) AS points,
      sum(m.home_goals - m.away_goals) AS gd,
      sum(m.home_goals) AS gf
    FROM public.matches m
    INNER JOIN completed_groups cg ON cg.group_id = m.group_id
    WHERE m.tournament_id = p_tournament_id AND m.match_type = 'group'
    GROUP BY m.group_id, m.home_team_id
    UNION ALL
    SELECT m.group_id, m.away_team_id AS team_id,
      sum(CASE WHEN m.away_goals > m.home_goals THEN 3 WHEN m.away_goals = m.home_goals THEN 1 ELSE 0 END) AS points,
      sum(m.away_goals - m.home_goals) AS gd,
      sum(m.away_goals) AS gf
    FROM public.matches m
    INNER JOIN completed_groups cg ON cg.group_id = m.group_id
    WHERE m.tournament_id = p_tournament_id AND m.match_type = 'group'
    GROUP BY m.group_id, m.away_team_id
  ),
  actual_order_calculated AS (
    SELECT group_id, array_agg(team_id ORDER BY points DESC, gd DESC, gf DESC) AS team_order
    FROM (
      SELECT group_id, team_id, sum(points) AS points, sum(gd) AS gd, sum(gf) AS gf
      FROM actual_team_stats
      WHERE team_id IS NOT NULL
      GROUP BY group_id, team_id
    ) s
    GROUP BY group_id
  ),
  actual_order AS (
    SELECT cg.group_id, coalesce(gso.team_order, aoc.team_order) AS team_order
    FROM completed_groups cg
    LEFT JOIN public.group_standings_override gso
      ON gso.group_id = cg.group_id
      AND gso.tournament_id = p_tournament_id
    LEFT JOIN actual_order_calculated aoc ON aoc.group_id = cg.group_id
  ),
  user_team_stats AS (
    SELECT p.user_id, m.group_id, m.home_team_id AS team_id,
      sum(CASE WHEN p.home_goals > p.away_goals THEN 3 WHEN p.home_goals = p.away_goals THEN 1 ELSE 0 END) AS points,
      sum(p.home_goals - p.away_goals) AS gd,
      sum(p.home_goals) AS gf
    FROM public.predictions p
    INNER JOIN public.matches m ON p.match_id = m.id
    INNER JOIN completed_groups cg ON cg.group_id = m.group_id
    WHERE m.tournament_id = p_tournament_id
      AND m.match_type = 'group'
      AND p.home_goals IS NOT NULL
      AND p.away_goals IS NOT NULL
    GROUP BY p.user_id, m.group_id, m.home_team_id
    UNION ALL
    SELECT p.user_id, m.group_id, m.away_team_id AS team_id,
      sum(CASE WHEN p.away_goals > p.home_goals THEN 3 WHEN p.away_goals = p.home_goals THEN 1 ELSE 0 END) AS points,
      sum(p.away_goals - p.home_goals) AS gd,
      sum(p.away_goals) AS gf
    FROM public.predictions p
    INNER JOIN public.matches m ON p.match_id = m.id
    INNER JOIN completed_groups cg ON cg.group_id = m.group_id
    WHERE m.tournament_id = p_tournament_id
      AND m.match_type = 'group'
      AND p.home_goals IS NOT NULL
      AND p.away_goals IS NOT NULL
    GROUP BY p.user_id, m.group_id, m.away_team_id
  ),
  user_order AS (
    SELECT user_id, group_id, array_agg(team_id ORDER BY points DESC, gd DESC, gf DESC) AS team_order
    FROM (
      SELECT user_id, group_id, team_id, sum(points) AS points, sum(gd) AS gd, sum(gf) AS gf
      FROM user_team_stats
      WHERE team_id IS NOT NULL
      GROUP BY user_id, group_id, team_id
    ) s
    GROUP BY user_id, group_id
  ),
  group_bonus AS (
    SELECT uo.user_id, uo.group_id, 20 AS points
    FROM user_order uo
    INNER JOIN actual_order ao ON ao.group_id = uo.group_id
    INNER JOIN public.user_submissions us
      ON us.user_id = uo.user_id
      AND us.tournament_id = p_tournament_id
    WHERE ao.team_order IS NOT NULL
      AND uo.team_order IS NOT NULL
      AND array_length(ao.team_order, 1) = array_length(uo.team_order, 1)
      AND ao.team_order = uo.team_order
  ),
  group_totals AS (
    SELECT
      coalesce(gmp.user_id, gb.user_id) AS user_id,
      coalesce(gmp.group_id, gb.group_id) AS group_id,
      coalesce(gmp.points, 0) + coalesce(gb.points, 0) AS points,
      coalesce(gb.points, 0) AS order_bonus
    FROM group_match_points gmp
    FULL JOIN group_bonus gb
      ON gb.user_id = gmp.user_id
      AND gb.group_id = gmp.group_id
  )
  INSERT INTO public.user_score_events (
    tournament_id, user_id, event_type, event_key, event_label, points, metadata
  )
  SELECT
    p_tournament_id,
    gt.user_id,
    'group',
    gt.group_id,
    coalesce(g.name, 'Grupo ' || gt.group_id),
    gt.points,
    jsonb_build_object('group_id', gt.group_id, 'order_bonus', gt.order_bonus)
  FROM group_totals gt
  LEFT JOIN public.groups g ON g.id = gt.group_id
  WHERE gt.points > 0;

  -- Round and overall summaries from the canonical user_submissions totals.
  INSERT INTO public.user_score_events (
    tournament_id, user_id, event_type, event_key, event_label, points, metadata
  )
  SELECT tournament_id, user_id, event_type, event_key, event_label, points, '{}'::jsonb
  FROM (
    SELECT p_tournament_id AS tournament_id, user_id, 'round' AS event_type, 'r32' AS event_key, 'Dieciseisavos' AS event_label, coalesce(points_r32, 0) AS points FROM public.user_submissions WHERE tournament_id = p_tournament_id
    UNION ALL
    SELECT p_tournament_id, user_id, 'round', 'r16', 'Octavos', coalesce(points_r16, 0) FROM public.user_submissions WHERE tournament_id = p_tournament_id
    UNION ALL
    SELECT p_tournament_id, user_id, 'round', 'qf', 'Cuartos', coalesce(points_qf, 0) FROM public.user_submissions WHERE tournament_id = p_tournament_id
    UNION ALL
    SELECT p_tournament_id, user_id, 'round', 'sf', 'Semifinales', coalesce(points_sf, 0) FROM public.user_submissions WHERE tournament_id = p_tournament_id
    UNION ALL
    SELECT p_tournament_id, user_id, 'round', 'final', 'Final', coalesce(points_final, 0) FROM public.user_submissions WHERE tournament_id = p_tournament_id
    UNION ALL
    SELECT p_tournament_id, user_id, 'round', 'champion', 'Campeón', coalesce(points_champion, 0) FROM public.user_submissions WHERE tournament_id = p_tournament_id
    UNION ALL
    SELECT p_tournament_id, user_id, 'overall', 'total', 'Mejor general', coalesce(points_total, 0) FROM public.user_submissions WHERE tournament_id = p_tournament_id
    UNION ALL
    SELECT p_tournament_id, user_id, 'overall', 'groups', 'Mejor fase de grupos', coalesce(points_groups, 0) FROM public.user_submissions WHERE tournament_id = p_tournament_id
    UNION ALL
    SELECT p_tournament_id, user_id, 'overall', 'playoffs', 'Mejor fase eliminatoria', coalesce(points_playoffs, 0) FROM public.user_submissions WHERE tournament_id = p_tournament_id
    UNION ALL
    SELECT p_tournament_id, user_id, 'overall', 'awards', 'Mejor en premios', coalesce(points_awards, 0) FROM public.user_submissions WHERE tournament_id = p_tournament_id
    UNION ALL
    SELECT p_tournament_id, user_id, 'overall', 'group_order', 'Maestro de grupos', coalesce(points_group_order, 0) FROM public.user_submissions WHERE tournament_id = p_tournament_id
  ) rows
  WHERE points > 0;

  -- Individual awards.
  INSERT INTO public.user_score_events (
    tournament_id, user_id, event_type, event_key, event_label, points, metadata
  )
  SELECT
    p_tournament_id,
    ap.user_id,
    'award',
    ap.award_type,
    CASE ap.award_type WHEN 'balon_oro' THEN 'Balón de Oro' ELSE 'Bota de Oro' END,
    30,
    jsonb_build_object('winner', ia.winner_name)
  FROM public.award_predictions ap
  INNER JOIN public.individual_awards ia
    ON ia.tournament_id = ap.tournament_id
    AND ia.award_type = ap.award_type
  INNER JOIN public.user_submissions us
    ON us.user_id = ap.user_id
    AND us.tournament_id = p_tournament_id
  WHERE ap.tournament_id = p_tournament_id
    AND ia.winner_name IS NOT NULL
    AND lower(ap.player_name) = lower(ia.winner_name);

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
END;
$$;
