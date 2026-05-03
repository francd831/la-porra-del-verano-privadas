-- Add policy to allow viewing all predictions when tournament is locked
CREATE POLICY "Anyone can view all predictions when locked"
ON public.predictions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.tournaments t
    LEFT JOIN public.matches m ON m.tournament_id = t.id
    WHERE (m.id = predictions.match_id OR predictions.playoff_round IS NOT NULL)
    AND t.predictions_locked = true
  )
);

-- Add policy to allow viewing all award predictions when tournament is locked
CREATE POLICY "Anyone can view all award predictions when locked"
ON public.award_predictions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.tournaments t
    WHERE t.id = award_predictions.tournament_id
    AND t.predictions_locked = true
  )
);