-- Fix 1: Add public view policy for champion_predictions when tournament is locked
CREATE POLICY "Anyone can view all champion predictions when locked"
ON public.champion_predictions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.tournaments t
    WHERE t.id = champion_predictions.tournament_id
    AND t.predictions_locked = true
  )
);

-- Fix 2: Add CHECK constraints for score validation on matches and predictions tables
ALTER TABLE public.matches 
  ADD CONSTRAINT matches_home_goals_check CHECK (home_goals IS NULL OR (home_goals >= 0 AND home_goals <= 50)),
  ADD CONSTRAINT matches_away_goals_check CHECK (away_goals IS NULL OR (away_goals >= 0 AND away_goals <= 50));

ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_home_goals_check CHECK (home_goals IS NULL OR (home_goals >= 0 AND home_goals <= 50)),
  ADD CONSTRAINT predictions_away_goals_check CHECK (away_goals IS NULL OR (away_goals >= 0 AND away_goals <= 50));