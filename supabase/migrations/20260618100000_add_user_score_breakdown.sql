-- Materialized scoring breakdown by user and scoring event.
-- This keeps the current scoring rules intact while exposing enough detail
-- for future charts: points by match, group order, playoff round and awards.

CREATE TABLE IF NOT EXISTS public.user_score_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('group_match', 'group_order', 'playoff_round', 'champion', 'award')),
  event_key TEXT NOT NULL,
  event_label TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  points_home_goals INTEGER NOT NULL DEFAULT 0,
  points_away_goals INTEGER NOT NULL DEFAULT 0,
  points_sign INTEGER NOT NULL DEFAULT 0,
  points_exact_bonus INTEGER NOT NULL DEFAULT 0,
  match_id TEXT REFERENCES public.matches(id) ON DELETE CASCADE,
  match_date TIMESTAMPTZ,
  group_id TEXT,
  round TEXT,
  award_type TEXT,
  prediction JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id, event_type, event_key)
);

CREATE INDEX IF NOT EXISTS idx_user_score_breakdown_tournament_user
  ON public.user_score_breakdown(tournament_id, user_id);

CREATE INDEX IF NOT EXISTS idx_user_score_breakdown_tournament_event
  ON public.user_score_breakdown(tournament_id, event_type, event_key);

CREATE INDEX IF NOT EXISTS idx_user_score_breakdown_user_date
  ON public.user_score_breakdown(tournament_id, user_id, match_date);

DROP TRIGGER IF EXISTS update_user_score_breakdown_updated_at ON public.user_score_breakdown;
CREATE TRIGGER update_user_score_breakdown_updated_at
  BEFORE UPDATE ON public.user_score_breakdown
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_score_breakdown ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own score breakdown" ON public.user_score_breakdown;
CREATE POLICY "Users can view their own score breakdown"
  ON public.user_score_breakdown
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all score breakdowns" ON public.user_score_breakdown;
CREATE POLICY "Admins can view all score breakdowns"
  ON public.user_score_breakdown
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role can manage score breakdowns" ON public.user_score_breakdown;
CREATE POLICY "Service role can manage score breakdowns"
  ON public.user_score_breakdown
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

GRANT SELECT ON public.user_score_breakdown TO authenticated;
GRANT ALL ON public.user_score_breakdown TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_user_score_breakdown(p_tournament_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_submission RECORD;
  v_group RECORD;
  v_admin_order TEXT[];
  v_user_order TEXT[];
  v_all_completed BOOLEAN;
  v_group_points INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  DELETE FROM public.user_score_breakdown
  WHERE tournament_id = p_tournament_id;

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
      AND m.match_type = 'group'
      AND m.status IN ('in_progress', 'completed')
      AND m.home_goals IS NOT NULL
      AND m.away_goals IS NOT NULL
    LEFT JOIN public.predictions p
      ON p.user_id = us.user_id
      AND p.match_id = m.id
    LEFT JOIN public.teams ht ON ht.id = m.home_team_id
    LEFT JOIN public.teams at ON at.id = m.away_team_id
    WHERE us.tournament_id = p_tournament_id
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
  FROM match_scores;

  FOR v_user_submission IN
    SELECT user_id
    FROM public.user_submissions
    WHERE tournament_id = p_tournament_id
  LOOP
    FOR v_group IN
      SELECT group_id, max(match_date) AS match_date
      FROM public.matches
      WHERE tournament_id = p_tournament_id
        AND match_type = 'group'
        AND group_id IS NOT NULL
      GROUP BY group_id
    LOOP
      SELECT NOT EXISTS (
        SELECT 1
        FROM public.matches
        WHERE tournament_id = p_tournament_id
          AND match_type = 'group'
          AND group_id = v_group.group_id
          AND (status != 'completed' OR home_goals IS NULL OR away_goals IS NULL)
      ) INTO v_all_completed;

      IF v_all_completed THEN
        SELECT team_order
        INTO v_admin_order
        FROM public.group_standings_override
        WHERE tournament_id = p_tournament_id
          AND group_id = v_group.group_id;

        IF v_admin_order IS NULL OR array_length(v_admin_order, 1) IS NULL THEN
          v_admin_order := public.get_fifa_group_order(p_tournament_id, v_group.group_id, NULL);
        END IF;

        v_user_order := public.get_fifa_group_order(p_tournament_id, v_group.group_id, v_user_submission.user_id);
        v_group_points := CASE
          WHEN v_admin_order IS NOT NULL
            AND v_user_order IS NOT NULL
            AND array_length(v_admin_order, 1) = array_length(v_user_order, 1)
            AND v_admin_order = v_user_order
            THEN 20
          ELSE 0
        END;

        INSERT INTO public.user_score_breakdown (
          tournament_id,
          user_id,
          event_type,
          event_key,
          event_label,
          points,
          match_date,
          group_id,
          round,
          prediction,
          result,
          metadata,
          calculated_at
        )
        VALUES (
          p_tournament_id,
          v_user_submission.user_id,
          'group_order',
          'group_order_' || v_group.group_id,
          'Orden grupo ' || v_group.group_id,
          v_group_points,
          v_group.match_date,
          v_group.group_id,
          'Fase de grupos',
          jsonb_build_object('order', v_user_order),
          jsonb_build_object('order', v_admin_order),
          jsonb_build_object('source', 'group_order_bonus'),
          now()
        );
      END IF;
    END LOOP;
  END LOOP;

  WITH round_configs AS (
    SELECT *
    FROM (VALUES
      ('r32', 'Dieciseisavos', 'R32_%', 'Dieciseisavos de Final', 10),
      ('r16', 'Octavos', 'R32_%', 'Octavos de Final', 15),
      ('qf', 'Cuartos', 'R16_%', 'Cuartos de Final', 20),
      ('sf', 'Semifinales', 'QF_%', 'Semifinales', 30),
      ('final', 'Final', 'SF_%', 'Final', 40)
    ) AS config(event_key, event_label, source_prefix, target_round, points_per_team)
  ),
  available_rounds AS (
    SELECT
      rc.event_key,
      rc.event_label,
      rc.source_prefix,
      rc.target_round,
      rc.points_per_team,
      max(m.match_date) AS match_date
    FROM round_configs rc
    JOIN public.matches m
      ON m.tournament_id = p_tournament_id
      AND m.match_type = 'playoff'
      AND m.round = rc.target_round
      AND (m.home_team_id IS NOT NULL OR m.away_team_id IS NOT NULL)
    GROUP BY rc.event_key, rc.event_label, rc.source_prefix, rc.target_round, rc.points_per_team
  ),
  round_scores AS (
    SELECT
      us.user_id,
      ar.event_key,
      ar.event_label,
      ar.target_round,
      ar.points_per_team,
      ar.match_date,
      COUNT(DISTINCT p.predicted_winner_team_id) FILTER (
        WHERE p.predicted_winner_team_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.matches real_match
            WHERE real_match.tournament_id = p_tournament_id
              AND real_match.match_type = 'playoff'
              AND real_match.round = ar.target_round
              AND (
                real_match.home_team_id = p.predicted_winner_team_id OR
                real_match.away_team_id = p.predicted_winner_team_id
              )
          )
      ) AS correct_teams
    FROM public.user_submissions us
    CROSS JOIN available_rounds ar
    LEFT JOIN public.predictions p
      ON p.user_id = us.user_id
      AND p.playoff_round LIKE ar.source_prefix
      AND p.predicted_winner_team_id IS NOT NULL
    WHERE us.tournament_id = p_tournament_id
    GROUP BY us.user_id, ar.event_key, ar.event_label, ar.target_round, ar.points_per_team, ar.match_date
  )
  INSERT INTO public.user_score_breakdown (
    tournament_id,
    user_id,
    event_type,
    event_key,
    event_label,
    points,
    match_date,
    round,
    prediction,
    result,
    metadata,
    calculated_at
  )
  SELECT
    p_tournament_id,
    user_id,
    'playoff_round',
    event_key,
    event_label,
    correct_teams * points_per_team,
    match_date,
    target_round,
    jsonb_build_object('correct_teams', correct_teams),
    jsonb_build_object('points_per_team', points_per_team),
    jsonb_build_object('source', 'playoff_round_bonus'),
    now()
  FROM round_scores;

  INSERT INTO public.user_score_breakdown (
    tournament_id,
    user_id,
    event_type,
    event_key,
    event_label,
    points,
    round,
    prediction,
    result,
    metadata,
    calculated_at
  )
  SELECT
    p_tournament_id,
    us.user_id,
    'champion',
    'champion',
    'Campeón',
    CASE WHEN cp.predicted_winner_team_id = tw.winner_team_id THEN 50 ELSE 0 END,
    'Campeón',
    jsonb_build_object('winner_team_id', cp.predicted_winner_team_id),
    jsonb_build_object('winner_team_id', tw.winner_team_id),
    jsonb_build_object('source', 'champion_prediction'),
    now()
  FROM public.user_submissions us
  JOIN public.tournament_winners tw
    ON tw.tournament_id = us.tournament_id
    AND tw.winner_team_id IS NOT NULL
  LEFT JOIN public.champion_predictions cp
    ON cp.user_id = us.user_id
    AND cp.tournament_id = us.tournament_id
  WHERE us.tournament_id = p_tournament_id;

  INSERT INTO public.user_score_breakdown (
    tournament_id,
    user_id,
    event_type,
    event_key,
    event_label,
    points,
    round,
    award_type,
    prediction,
    result,
    metadata,
    calculated_at
  )
  SELECT
    p_tournament_id,
    us.user_id,
    'award',
    'award_' || ia.award_type,
    CASE
      WHEN ia.award_type = 'golden_ball' THEN 'Balón de oro'
      WHEN ia.award_type = 'golden_boot' THEN 'Bota de oro'
      ELSE ia.award_type
    END,
    CASE
      WHEN ap.player_name IS NOT NULL
        AND ia.winner_name IS NOT NULL
        AND LOWER(ap.player_name) = LOWER(ia.winner_name)
        THEN 30
      ELSE 0
    END,
    'Premios individuales',
    ia.award_type,
    jsonb_build_object('player_name', ap.player_name),
    jsonb_build_object('winner_name', ia.winner_name),
    jsonb_build_object('source', 'individual_award'),
    now()
  FROM public.user_submissions us
  JOIN public.individual_awards ia
    ON ia.tournament_id = us.tournament_id
    AND ia.winner_name IS NOT NULL
  LEFT JOIN public.award_predictions ap
    ON ap.user_id = us.user_id
    AND ap.tournament_id = us.tournament_id
    AND ap.award_type = ia.award_type
  WHERE us.tournament_id = p_tournament_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_user_score_breakdown(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_user_score_breakdown(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.update_all_user_points(p_tournament_id UUID)
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

  PERFORM public.refresh_user_score_breakdown(p_tournament_id);
  PERFORM public.refresh_score_events(p_tournament_id);
  PERFORM public.refresh_score_result_events(p_tournament_id);
  PERFORM public.refresh_score_day_events(p_tournament_id);
  PERFORM public.refresh_score_event_ranks(p_tournament_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_all_user_points(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_all_user_points(UUID) TO service_role;
