DROP POLICY IF EXISTS "Platform admins can delete all leagues" ON public.leagues;

CREATE POLICY "Platform admins can delete all leagues"
ON public.leagues
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
