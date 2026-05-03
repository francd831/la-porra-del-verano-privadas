
-- Fix: calculate_user_points uses p.match_id LIKE 'R32_%' but predictions
-- store knockout data in p.playoff_round (match_id is NULL).
-- Change all references to use playoff_round instead.

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
  -- Calculate points for group stage matches
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
    AND m.status = 'completed'
    AND p.home_goals IS NOT NULL
    AND p.away_goals IS NOT NULL
    AND m.home_goals IS NOT NULL
    AND m.away_goals IS NOT NULL;

  -- Calculate bonus for correct group order (+20 per group)
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
        WITH team_stats AS (
          SELECT COALESCE(m.home_team_id, '') as team_id,
            SUM(CASE WHEN m.home_goals > m.away_goals THEN 3 WHEN m.home_goals = m.away_goals THEN 1 ELSE 0 END) as points,
            SUM(m.home_goals - m.away_goals) as gd, SUM(m.home_goals) as gf
          FROM matches m WHERE m.tournament_id = p_tournament_id AND m.match_type = 'group' AND m.group_id = v_group_id AND m.status = 'completed' GROUP BY m.home_team_id
          UNION ALL
          SELECT COALESCE(m.away_team_id, '') as team_id,
            SUM(CASE WHEN m.away_goals > m.home_goals THEN 3 WHEN m.away_goals = m.home_goals THEN 1 ELSE 0 END) as points,
            SUM(m.away_goals - m.home_goals) as gd, SUM(m.away_goals) as gf
          FROM matches m WHERE m.tournament_id = p_tournament_id AND m.match_type = 'group' AND m.group_id = v_group_id AND m.status = 'completed' GROUP BY m.away_team_id
        ),
        aggregated_stats AS (
          SELECT team_id, SUM(points) as points, SUM(gd) as gd, SUM(gf) as gf FROM team_stats WHERE team_id != '' GROUP BY team_id ORDER BY points DESC, gd DESC, gf DESC
        )
        SELECT ARRAY(SELECT team_id FROM aggregated_stats) INTO v_admin_order;
      END IF;

      WITH user_team_stats AS (
        SELECT COALESCE(m.home_team_id, '') as team_id,
          SUM(CASE WHEN p.home_goals > p.away_goals THEN 3 WHEN p.home_goals = p.away_goals THEN 1 ELSE 0 END) as points,
          SUM(p.home_goals - p.away_goals) as gd, SUM(p.home_goals) as gf
        FROM predictions p INNER JOIN matches m ON p.match_id = m.id
        WHERE p.user_id = p_user_id AND m.tournament_id = p_tournament_id AND m.match_type = 'group' AND m.group_id = v_group_id AND p.home_goals IS NOT NULL AND p.away_goals IS NOT NULL
        GROUP BY m.home_team_id
        UNION ALL
        SELECT COALESCE(m.away_team_id, '') as team_id,
          SUM(CASE WHEN p.away_goals > p.home_goals THEN 3 WHEN p.away_goals = p.home_goals THEN 1 ELSE 0 END) as points,
          SUM(p.away_goals - p.home_goals) as gd, SUM(p.away_goals) as gf
        FROM predictions p INNER JOIN matches m ON p.match_id = m.id
        WHERE p.user_id = p_user_id AND m.tournament_id = p_tournament_id AND m.match_type = 'group' AND m.group_id = v_group_id AND p.home_goals IS NOT NULL AND p.away_goals IS NOT NULL
        GROUP BY m.away_team_id
      ),
      user_aggregated AS (
        SELECT team_id, SUM(points) as points, SUM(gd) as gd, SUM(gf) as gf FROM user_team_stats WHERE team_id != '' GROUP BY team_id ORDER BY points DESC, gd DESC, gf DESC
      )
      SELECT ARRAY(SELECT team_id FROM user_aggregated) INTO v_user_order;

      IF v_admin_order IS NOT NULL AND v_user_order IS NOT NULL AND 
         array_length(v_admin_order, 1) = array_length(v_user_order, 1) AND
         v_admin_order = v_user_order THEN
        v_group_order_bonus := v_group_order_bonus + 20;
      END IF;
    END IF;
  END LOOP;

  v_groups_points := v_groups_points + v_group_order_bonus;

  -- FIX: Use playoff_round instead of match_id for knockout predictions
  -- R32 points: 10 per team predicted that actually appears in R32 matches
  SELECT COALESCE(COUNT(DISTINCT p.predicted_winner_team_id) * 10, 0) INTO v_r32_points
  FROM predictions p WHERE p.user_id = p_user_id AND p.playoff_round LIKE 'R32_%' AND p.predicted_winner_team_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM matches m WHERE m.tournament_id = p_tournament_id AND m.round = 'Dieciseisavos de Final' AND (m.home_team_id = p.predicted_winner_team_id OR m.away_team_id = p.predicted_winner_team_id));

  -- R16 points: 15 per team predicted in R32 that advanced to R16
  SELECT COALESCE(COUNT(DISTINCT p.predicted_winner_team_id) * 15, 0) INTO v_r16_points
  FROM predictions p WHERE p.user_id = p_user_id AND p.playoff_round LIKE 'R32_%' AND p.predicted_winner_team_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM matches m WHERE m.tournament_id = p_tournament_id AND m.round = 'Octavos de Final' AND (m.home_team_id = p.predicted_winner_team_id OR m.away_team_id = p.predicted_winner_team_id));

  -- QF points: 20 per team predicted in R16 that advanced to QF
  SELECT COALESCE(COUNT(DISTINCT p.predicted_winner_team_id) * 20, 0) INTO v_qf_points
  FROM predictions p WHERE p.user_id = p_user_id AND p.playoff_round LIKE 'R16_%' AND p.predicted_winner_team_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM matches m WHERE m.tournament_id = p_tournament_id AND m.round = 'Cuartos de Final' AND (m.home_team_id = p.predicted_winner_team_id OR m.away_team_id = p.predicted_winner_team_id));

  -- SF points: 30 per team predicted in QF that advanced to SF
  SELECT COALESCE(COUNT(DISTINCT p.predicted_winner_team_id) * 30, 0) INTO v_sf_points
  FROM predictions p WHERE p.user_id = p_user_id AND p.playoff_round LIKE 'QF_%' AND p.predicted_winner_team_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM matches m WHERE m.tournament_id = p_tournament_id AND m.round = 'Semifinales' AND (m.home_team_id = p.predicted_winner_team_id OR m.away_team_id = p.predicted_winner_team_id));

  -- Final points: 40 per team predicted in SF that advanced to Final
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
