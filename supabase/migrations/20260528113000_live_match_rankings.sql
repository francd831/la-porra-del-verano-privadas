CREATE OR REPLACE FUNCTION public.calculate_user_points(p_user_id uuid, p_tournament_id uuid)
 RETURNS TABLE(groups_points integer, playoffs_points integer, awards_points integer, total_points integer, r32_points integer, r16_points integer, qf_points integer, sf_points integer, final_points integer, champion_points integer, group_order_bonus integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_groups_points INTEGER := 0;
  v_playoffs_points INTEGER := 0;
  v_awards_points INTEGER := 0;
  v_r32_points INTEGER := 0;
  v_r16_points INTEGER := 0;
  v_qf_points INTEGER := 0;
  v_sf_points INTEGER := 0;
  v_final_points INTEGER := 0;
  v_champion_points INTEGER := 0;
  v_group_order_bonus INTEGER := 0;
  v_group_id TEXT;
  v_admin_order TEXT[];
  v_user_order TEXT[];
  v_all_group_matches_completed BOOLEAN;
BEGIN
  SELECT COALESCE(SUM(
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
    END
  ), 0)
  INTO v_groups_points
  FROM predictions p
  INNER JOIN matches m ON p.match_id = m.id
  WHERE p.user_id = p_user_id
    AND m.tournament_id = p_tournament_id
    AND m.match_type = 'group'
    AND m.status IN ('in_progress', 'completed')
    AND p.home_goals IS NOT NULL
    AND p.away_goals IS NOT NULL
    AND m.home_goals IS NOT NULL
    AND m.away_goals IS NOT NULL;

  FOR v_group_id IN SELECT DISTINCT group_id FROM matches WHERE tournament_id = p_tournament_id AND match_type = 'group'
  LOOP
    SELECT NOT EXISTS (
      SELECT 1 FROM matches
      WHERE tournament_id = p_tournament_id
      AND match_type = 'group'
      AND group_id = v_group_id
      AND (status != 'completed' OR home_goals IS NULL OR away_goals IS NULL)
    ) INTO v_all_group_matches_completed;

    IF v_all_group_matches_completed THEN
      SELECT team_order INTO v_admin_order
      FROM group_standings_override
      WHERE group_id = v_group_id AND tournament_id = p_tournament_id;

      IF v_admin_order IS NULL THEN
        v_admin_order := public.get_fifa_group_order(p_tournament_id, v_group_id, NULL);
      END IF;

      v_user_order := public.get_fifa_group_order(p_tournament_id, v_group_id, p_user_id);

      IF v_admin_order IS NOT NULL AND v_user_order IS NOT NULL AND
         array_length(v_admin_order, 1) = array_length(v_user_order, 1) AND
         v_admin_order = v_user_order THEN
        v_group_order_bonus := v_group_order_bonus + 20;
      END IF;
    END IF;
  END LOOP;

  v_groups_points := v_groups_points + v_group_order_bonus;

  SELECT COALESCE(COUNT(DISTINCT p.predicted_winner_team_id) * 10, 0) INTO v_r32_points
  FROM predictions p WHERE p.user_id = p_user_id AND p.playoff_round LIKE 'R32_%' AND p.predicted_winner_team_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM matches m WHERE m.tournament_id = p_tournament_id AND m.round = 'Dieciseisavos de Final' AND (m.home_team_id = p.predicted_winner_team_id OR m.away_team_id = p.predicted_winner_team_id));

  SELECT COALESCE(COUNT(DISTINCT p.predicted_winner_team_id) * 15, 0) INTO v_r16_points
  FROM predictions p WHERE p.user_id = p_user_id AND p.playoff_round LIKE 'R32_%' AND p.predicted_winner_team_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM matches m WHERE m.tournament_id = p_tournament_id AND m.round = 'Octavos de Final' AND (m.home_team_id = p.predicted_winner_team_id OR m.away_team_id = p.predicted_winner_team_id));

  SELECT COALESCE(COUNT(DISTINCT p.predicted_winner_team_id) * 20, 0) INTO v_qf_points
  FROM predictions p WHERE p.user_id = p_user_id AND p.playoff_round LIKE 'R16_%' AND p.predicted_winner_team_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM matches m WHERE m.tournament_id = p_tournament_id AND m.round = 'Cuartos de Final' AND (m.home_team_id = p.predicted_winner_team_id OR m.away_team_id = p.predicted_winner_team_id));

  SELECT COALESCE(COUNT(DISTINCT p.predicted_winner_team_id) * 30, 0) INTO v_sf_points
  FROM predictions p WHERE p.user_id = p_user_id AND p.playoff_round LIKE 'QF_%' AND p.predicted_winner_team_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM matches m WHERE m.tournament_id = p_tournament_id AND m.round = 'Semifinales' AND (m.home_team_id = p.predicted_winner_team_id OR m.away_team_id = p.predicted_winner_team_id));

  SELECT COALESCE(COUNT(DISTINCT p.predicted_winner_team_id) * 40, 0) INTO v_final_points
  FROM predictions p WHERE p.user_id = p_user_id AND p.playoff_round LIKE 'SF_%' AND p.predicted_winner_team_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM matches m WHERE m.tournament_id = p_tournament_id AND m.round = 'Final' AND (m.home_team_id = p.predicted_winner_team_id OR m.away_team_id = p.predicted_winner_team_id));

  SELECT COALESCE(SUM(CASE WHEN cp.predicted_winner_team_id = tw.winner_team_id THEN 50 ELSE 0 END), 0) INTO v_champion_points
  FROM champion_predictions cp INNER JOIN tournament_winners tw ON cp.tournament_id = tw.tournament_id
  WHERE cp.user_id = p_user_id AND cp.tournament_id = p_tournament_id;

  v_playoffs_points := v_r32_points + v_r16_points + v_qf_points + v_sf_points + v_final_points + v_champion_points;

  SELECT COALESCE(SUM(CASE WHEN LOWER(ap.player_name) = LOWER(ia.winner_name) THEN 30 ELSE 0 END), 0) INTO v_awards_points
  FROM award_predictions ap INNER JOIN individual_awards ia ON ap.award_type = ia.award_type AND ap.tournament_id = ia.tournament_id
  WHERE ap.user_id = p_user_id AND ap.tournament_id = p_tournament_id AND ia.winner_name IS NOT NULL;

  RETURN QUERY SELECT v_groups_points, v_playoffs_points, v_awards_points, v_groups_points + v_playoffs_points + v_awards_points,
    v_r32_points, v_r16_points, v_qf_points, v_sf_points, v_final_points, v_champion_points, v_group_order_bonus;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_update_points_on_match_complete()
RETURNS TRIGGER
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
    PERFORM public.update_all_user_points(NEW.tournament_id);
  END IF;
  RETURN NEW;
END;
$$;
