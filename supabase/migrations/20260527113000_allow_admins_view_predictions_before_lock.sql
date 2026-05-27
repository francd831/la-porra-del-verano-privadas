CREATE POLICY "Admins can view all predictions before lock"
ON public.predictions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all award predictions before lock"
ON public.award_predictions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all champion predictions before lock"
ON public.champion_predictions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
