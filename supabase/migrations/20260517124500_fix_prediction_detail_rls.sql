DROP POLICY IF EXISTS "Users can manage their own champion predictions"
ON public.champion_predictions;

CREATE POLICY "Users can manage their own champion predictions"
ON public.champion_predictions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own award predictions"
ON public.award_predictions;

CREATE POLICY "Users can manage their own award predictions"
ON public.award_predictions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
