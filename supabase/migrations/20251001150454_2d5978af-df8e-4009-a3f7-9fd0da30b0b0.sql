-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has a role (security definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create scoring_rules table
CREATE TABLE public.scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL,
  rule_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on scoring_rules
ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;

-- Anyone can view scoring rules
CREATE POLICY "Anyone can view scoring rules"
ON public.scoring_rules
FOR SELECT
USING (true);

-- Admins can manage scoring rules
CREATE POLICY "Admins can insert scoring rules"
ON public.scoring_rules
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update scoring rules"
ON public.scoring_rules
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete scoring rules"
ON public.scoring_rules
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add points columns to user_submissions
ALTER TABLE public.user_submissions
ADD COLUMN points_groups INTEGER DEFAULT 0,
ADD COLUMN points_playoffs INTEGER DEFAULT 0,
ADD COLUMN points_awards INTEGER DEFAULT 0,
ADD COLUMN points_total INTEGER DEFAULT 0;

-- Insert default scoring rules for the default tournament
INSERT INTO public.scoring_rules (tournament_id, rule_type, points, description) VALUES
('11111111-1111-1111-1111-111111111111', 'exact_score', 5, 'Resultado exacto (goles y ganador)'),
('11111111-1111-1111-1111-111111111111', 'correct_winner', 3, 'Ganador correcto'),
('11111111-1111-1111-1111-111111111111', 'correct_goal_difference', 2, 'Diferencia de goles correcta'),
('11111111-1111-1111-1111-111111111111', 'champion_correct', 30, 'Campeón correcto'),
('11111111-1111-1111-1111-111111111111', 'award_correct', 10, 'Premio individual correcto');

-- Create function to calculate points for a user
CREATE OR REPLACE FUNCTION public.calculate_user_points(
  p_user_id UUID,
  p_tournament_id UUID
)
RETURNS TABLE (
  groups_points INTEGER,
  playoffs_points INTEGER,
  awards_points INTEGER,
  total_points INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_groups_points INTEGER := 0;
  v_playoffs_points INTEGER := 0;
  v_awards_points INTEGER := 0;
  v_exact_score_points INTEGER;
  v_correct_winner_points INTEGER;
  v_correct_diff_points INTEGER;
  v_champion_points INTEGER;
  v_award_points INTEGER;
BEGIN
  -- Get scoring rules
  SELECT points INTO v_exact_score_points FROM scoring_rules WHERE tournament_id = p_tournament_id AND rule_type = 'exact_score';
  SELECT points INTO v_correct_winner_points FROM scoring_rules WHERE tournament_id = p_tournament_id AND rule_type = 'correct_winner';
  SELECT points INTO v_correct_diff_points FROM scoring_rules WHERE tournament_id = p_tournament_id AND rule_type = 'correct_goal_difference';
  SELECT points INTO v_champion_points FROM scoring_rules WHERE tournament_id = p_tournament_id AND rule_type = 'champion_correct';
  SELECT points INTO v_award_points FROM scoring_rules WHERE tournament_id = p_tournament_id AND rule_type = 'award_correct';

  -- Calculate points for group stage matches
  SELECT COALESCE(SUM(
    CASE
      -- Exact score
      WHEN p.home_goals = m.home_goals AND p.away_goals = m.away_goals THEN v_exact_score_points
      -- Correct winner
      WHEN p.predicted_winner_team_id = m.winner_team_id THEN v_correct_winner_points
      -- Correct goal difference
      WHEN (p.home_goals - p.away_goals) = (m.home_goals - m.away_goals) THEN v_correct_diff_points
      ELSE 0
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

  -- Calculate points for playoff matches
  SELECT COALESCE(SUM(
    CASE
      -- Exact score
      WHEN p.home_goals = m.home_goals AND p.away_goals = m.away_goals THEN v_exact_score_points
      -- Correct winner
      WHEN p.predicted_winner_team_id = m.winner_team_id THEN v_correct_winner_points
      -- Correct goal difference
      WHEN (p.home_goals - p.away_goals) = (m.home_goals - m.away_goals) THEN v_correct_diff_points
      ELSE 0
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
      WHEN cp.predicted_winner_team_id = tw.winner_team_id THEN v_champion_points
      ELSE 0
    END
  ), 0)
  INTO v_playoffs_points
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
    v_playoffs_points + COALESCE((SELECT SUM(CASE WHEN cp.predicted_winner_team_id = tw.winner_team_id THEN v_champion_points ELSE 0 END) FROM champion_predictions cp INNER JOIN tournament_winners tw ON cp.tournament_id = tw.tournament_id WHERE cp.user_id = p_user_id AND cp.tournament_id = p_tournament_id), 0),
    v_awards_points,
    v_groups_points + v_playoffs_points + v_awards_points + COALESCE((SELECT SUM(CASE WHEN cp.predicted_winner_team_id = tw.winner_team_id THEN v_champion_points ELSE 0 END) FROM champion_predictions cp INNER JOIN tournament_winners tw ON cp.tournament_id = tw.tournament_id WHERE cp.user_id = p_user_id AND cp.tournament_id = p_tournament_id), 0);
END;
$$;

-- Create function to update all user points
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
      updated_at = now()
    WHERE user_id = v_user_submission.user_id
      AND tournament_id = p_tournament_id;
  END LOOP;
END;
$$;

-- Create trigger to update points when match results are updated
CREATE OR REPLACE FUNCTION public.trigger_update_points_on_match_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status != 'completed' OR OLD.home_goals IS DISTINCT FROM NEW.home_goals OR OLD.away_goals IS DISTINCT FROM NEW.away_goals) THEN
    PERFORM update_all_user_points(NEW.tournament_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_points_after_match_complete
AFTER UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION trigger_update_points_on_match_complete();

-- Create trigger to update points when tournament winner is set
CREATE OR REPLACE FUNCTION public.trigger_update_points_on_winner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM update_all_user_points(NEW.tournament_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_points_after_winner_set
AFTER INSERT OR UPDATE ON tournament_winners
FOR EACH ROW
EXECUTE FUNCTION trigger_update_points_on_winner();

-- Create trigger to update points when individual awards are set
CREATE TRIGGER update_points_after_awards_set
AFTER INSERT OR UPDATE ON individual_awards
FOR EACH ROW
EXECUTE FUNCTION trigger_update_points_on_winner();

-- Admins can update matches (for entering results)
CREATE POLICY "Admins can update matches"
ON public.matches
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert/update tournament winners
CREATE POLICY "Admins can insert tournament winners"
ON public.tournament_winners
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tournament winners"
ON public.tournament_winners
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update individual awards
CREATE POLICY "Admins can update individual awards"
ON public.individual_awards
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert individual awards"
ON public.individual_awards
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));