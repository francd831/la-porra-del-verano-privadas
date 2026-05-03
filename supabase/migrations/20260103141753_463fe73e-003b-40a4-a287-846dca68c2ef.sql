
CREATE OR REPLACE FUNCTION public.calculate_user_points(p_user_id uuid, p_tournament_id uuid)
 RETURNS TABLE(groups_points integer, playoffs_points integer, awards_points integer, total_points integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_groups_points INTEGER := 0;
  v_playoffs_points INTEGER := 0;
  v_awards_points INTEGER := 0;
  v_classification_points INTEGER := 0;
  v_champion_points INTEGER := 0;
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

  -- Calculate points for correctly predicted teams in each playoff round
  -- Points: Dieciseisavos=10, Octavos=15, Cuartos=20, Semifinales=30, Final=40
  SELECT COALESCE(SUM(
    CASE 
      WHEN m.round = 'Dieciseisavos de Final' THEN 10
      WHEN m.round = 'Octavos de Final' THEN 15
      WHEN m.round = 'Cuartos de Final' THEN 20
      WHEN m.round = 'Semifinales' THEN 30
      WHEN m.round = 'Final' THEN 40
      ELSE 0
    END
  ), 0)
  INTO v_classification_points
  FROM predictions p
  INNER JOIN matches m ON p.playoff_round = m.round AND m.tournament_id = p_tournament_id
  WHERE p.user_id = p_user_id
    AND p.playoff_round IS NOT NULL
    AND p.predicted_winner_team_id IS NOT NULL
    AND m.match_type = 'playoff'
    AND (
      m.home_team_id = p.predicted_winner_team_id 
      OR m.away_team_id = p.predicted_winner_team_id
    );

  -- Calculate points for champion prediction (50 points)
  SELECT COALESCE(SUM(
    CASE
      WHEN cp.predicted_winner_team_id = tw.winner_team_id THEN 50
      ELSE 0
    END
  ), 0)
  INTO v_champion_points
  FROM champion_predictions cp
  INNER JOIN tournament_winners tw ON cp.tournament_id = tw.tournament_id
  WHERE cp.user_id = p_user_id
    AND cp.tournament_id = p_tournament_id;

  v_playoffs_points := v_classification_points + v_champion_points;

  -- Calculate points for award predictions (30 points each)
  SELECT COALESCE(SUM(
    CASE
      WHEN LOWER(ap.player_name) = LOWER(ia.winner_name) THEN 30
      ELSE 0
    END
  ), 0)
  INTO v_awards_points
  FROM award_predictions ap
  INNER JOIN individual_awards ia ON ap.award_type = ia.award_type AND ap.tournament_id = ia.tournament_id
  WHERE ap.user_id = p_user_id
    AND ap.tournament_id = p_tournament_id
    AND ia.winner_name IS NOT NULL;

  RETURN QUERY SELECT 
    v_groups_points,
    v_playoffs_points,
    v_awards_points,
    v_groups_points + v_playoffs_points + v_awards_points;
END;
$function$;
