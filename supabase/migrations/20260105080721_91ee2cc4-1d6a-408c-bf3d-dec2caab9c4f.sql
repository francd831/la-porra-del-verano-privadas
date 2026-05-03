-- Add columns for playoff round breakdown in user_submissions
ALTER TABLE public.user_submissions 
ADD COLUMN IF NOT EXISTS points_r32 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_r16 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_qf integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_sf integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_final integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_champion integer DEFAULT 0;

-- Drop the existing function first to change return type
DROP FUNCTION IF EXISTS public.calculate_user_points(uuid, uuid);

-- Create the new calculate_user_points function with breakdown by round
CREATE OR REPLACE FUNCTION public.calculate_user_points(p_user_id uuid, p_tournament_id uuid)
 RETURNS TABLE(groups_points integer, playoffs_points integer, awards_points integer, total_points integer, r32_points integer, r16_points integer, qf_points integer, sf_points integer, final_points integer, champion_points integer)
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

  -- R32 points: 10 points for each team the user predicted would win R32 that is in ANY actual R32 match
  SELECT COALESCE(COUNT(DISTINCT p.predicted_winner_team_id) * 10, 0)
  INTO v_r32_points
  FROM predictions p
  WHERE p.user_id = p_user_id
    AND p.match_id LIKE 'R32_%'
    AND p.predicted_winner_team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM matches m 
      WHERE m.tournament_id = p_tournament_id
        AND m.round = 'Dieciseisavos de Final'
        AND (m.home_team_id = p.predicted_winner_team_id OR m.away_team_id = p.predicted_winner_team_id)
    );

  -- R16 points: 15 points for each team the user predicted would win R32 that is in actual R16 matches
  SELECT COALESCE(COUNT(DISTINCT p.predicted_winner_team_id) * 15, 0)
  INTO v_r16_points
  FROM predictions p
  WHERE p.user_id = p_user_id
    AND p.match_id LIKE 'R32_%'
    AND p.predicted_winner_team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM matches m 
      WHERE m.tournament_id = p_tournament_id
        AND m.round = 'Octavos de Final'
        AND (m.home_team_id = p.predicted_winner_team_id OR m.away_team_id = p.predicted_winner_team_id)
    );

  -- QF points: 20 points for each team the user predicted would win R16 that is in actual QF matches
  SELECT COALESCE(COUNT(DISTINCT p.predicted_winner_team_id) * 20, 0)
  INTO v_qf_points
  FROM predictions p
  WHERE p.user_id = p_user_id
    AND p.match_id LIKE 'R16_%'
    AND p.predicted_winner_team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM matches m 
      WHERE m.tournament_id = p_tournament_id
        AND m.round = 'Cuartos de Final'
        AND (m.home_team_id = p.predicted_winner_team_id OR m.away_team_id = p.predicted_winner_team_id)
    );

  -- SF points: 30 points for each team the user predicted would win QF that is in actual SF matches
  SELECT COALESCE(COUNT(DISTINCT p.predicted_winner_team_id) * 30, 0)
  INTO v_sf_points
  FROM predictions p
  WHERE p.user_id = p_user_id
    AND p.match_id LIKE 'QF_%'
    AND p.predicted_winner_team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM matches m 
      WHERE m.tournament_id = p_tournament_id
        AND m.round = 'Semifinales'
        AND (m.home_team_id = p.predicted_winner_team_id OR m.away_team_id = p.predicted_winner_team_id)
    );

  -- Final points: 40 points for each team the user predicted would win SF that is in actual Final
  SELECT COALESCE(COUNT(DISTINCT p.predicted_winner_team_id) * 40, 0)
  INTO v_final_points
  FROM predictions p
  WHERE p.user_id = p_user_id
    AND p.match_id LIKE 'SF_%'
    AND p.predicted_winner_team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM matches m 
      WHERE m.tournament_id = p_tournament_id
        AND m.round = 'Final'
        AND (m.home_team_id = p.predicted_winner_team_id OR m.away_team_id = p.predicted_winner_team_id)
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

  v_playoffs_points := v_r32_points + v_r16_points + v_qf_points + v_sf_points + v_final_points + v_champion_points;

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
    v_groups_points + v_playoffs_points + v_awards_points,
    v_r32_points,
    v_r16_points,
    v_qf_points,
    v_sf_points,
    v_final_points,
    v_champion_points;
END;
$function$;

-- Update the update_all_user_points function to store breakdown
CREATE OR REPLACE FUNCTION public.update_all_user_points(p_tournament_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_submission RECORD;
  v_points RECORD;
BEGIN
  -- Check if user is admin - prevent unauthorized access
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  FOR v_user_submission IN 
    SELECT user_id FROM user_submissions WHERE tournament_id = p_tournament_id
  LOOP
    SELECT * INTO v_points FROM calculate_user_points(v_user_submission.user_id, p_tournament_id);
    
    UPDATE user_submissions
    SET 
      points_groups = v_points.groups_points,
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
END;
$function$;