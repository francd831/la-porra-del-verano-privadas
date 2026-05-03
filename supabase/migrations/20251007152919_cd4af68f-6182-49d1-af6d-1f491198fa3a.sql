-- Actualizar la función de cálculo de puntos con el nuevo sistema
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
  v_champion_points INTEGER := 0;
  v_champion_bonus INTEGER;
  v_award_points INTEGER;
BEGIN
  -- Get scoring rules for champion and awards
  SELECT points INTO v_champion_bonus FROM scoring_rules WHERE tournament_id = p_tournament_id AND rule_type = 'champion_correct';
  SELECT points INTO v_award_points FROM scoring_rules WHERE tournament_id = p_tournament_id AND rule_type = 'award_correct';

  -- Calculate points for group stage matches with NEW SYSTEM:
  -- - Acierta goles local: 2 puntos + número de goles del local
  -- - Acierta goles visitante: 2 puntos + número de goles del visitante
  -- - Acierta el signo (1X2): 5 puntos
  -- - Resultado exacto: 6 puntos extra
  SELECT COALESCE(SUM(
    CASE
      -- Resultado exacto: acertó todo
      WHEN p.home_goals = m.home_goals AND p.away_goals = m.away_goals THEN 
        (2 + m.home_goals) + (2 + m.away_goals) + 5 + 6
      -- No es resultado exacto, calcular por partes
      ELSE
        -- Puntos por goles local
        (CASE WHEN p.home_goals = m.home_goals THEN 2 + m.home_goals ELSE 0 END) +
        -- Puntos por goles visitante
        (CASE WHEN p.away_goals = m.away_goals THEN 2 + m.away_goals ELSE 0 END) +
        -- Puntos por signo (1X2)
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

  -- Calculate points for playoff matches (same system)
  SELECT COALESCE(SUM(
    CASE
      -- Resultado exacto
      WHEN p.home_goals = m.home_goals AND p.away_goals = m.away_goals THEN 
        (2 + m.home_goals) + (2 + m.away_goals) + 5 + 6
      -- No es resultado exacto, calcular por partes
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
  INTO v_playoffs_points
  FROM predictions p
  INNER JOIN matches m ON p.match_id = m.id
  WHERE p.user_id = p_user_id
    AND m.tournament_id = p_tournament_id
    AND m.match_type = 'playoff'
    AND m.status = 'completed'
    AND p.home_goals IS NOT NULL
    AND p.away_goals IS NOT NULL
    AND m.home_goals IS NOT NULL
    AND m.away_goals IS NOT NULL;

  -- Calculate points for champion prediction
  SELECT COALESCE(SUM(
    CASE
      WHEN cp.predicted_winner_team_id = tw.winner_team_id THEN v_champion_bonus
      ELSE 0
    END
  ), 0)
  INTO v_champion_points
  FROM champion_predictions cp
  INNER JOIN tournament_winners tw ON cp.tournament_id = tw.tournament_id
  WHERE cp.user_id = p_user_id
    AND cp.tournament_id = p_tournament_id;

  -- Calculate points for award predictions
  SELECT COALESCE(SUM(
    CASE
      WHEN LOWER(ap.player_name) = LOWER(ia.winner_name) THEN v_award_points
      ELSE 0
    END
  ), 0)
  INTO v_awards_points
  FROM award_predictions ap
  INNER JOIN individual_awards ia ON ap.award_type = ia.award_type AND ap.tournament_id = ia.tournament_id
  WHERE ap.user_id = p_user_id
    AND ap.tournament_id = p_tournament_id
    AND ia.winner_name IS NOT NULL;

  -- Return calculated points
  RETURN QUERY SELECT 
    v_groups_points,
    v_playoffs_points + v_champion_points,
    v_awards_points,
    v_groups_points + v_playoffs_points + v_champion_points + v_awards_points;
END;
$function$;