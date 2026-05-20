DROP POLICY IF EXISTS "Platform admins can view all leagues" ON public.leagues;

CREATE POLICY "Platform admins can view all leagues"
ON public.leagues
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "League members can view league members" ON public.league_members;

CREATE POLICY "League members can view league members"
ON public.league_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_league_admin(league_id, auth.uid())
  OR (
    status = 'approved'
    AND public.is_approved_league_member(league_id, auth.uid())
  )
);
