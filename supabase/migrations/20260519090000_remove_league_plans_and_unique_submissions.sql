-- Remove league plans and member caps from the active private-league model.

DROP POLICY IF EXISTS "Authenticated users can create free owned leagues" ON public.leagues;
DROP POLICY IF EXISTS "Authenticated users can create owned leagues" ON public.leagues;

CREATE POLICY "Authenticated users can create owned leagues"
ON public.leagues
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

ALTER TABLE public.leagues
  DROP CONSTRAINT IF EXISTS leagues_max_members_check,
  DROP CONSTRAINT IF EXISTS leagues_plan_check;

DROP TRIGGER IF EXISTS sync_league_plan_limit ON public.leagues;
DROP FUNCTION IF EXISTS public.sync_league_plan_limit();
DROP FUNCTION IF EXISTS public.update_league_plan_for_testing(uuid, text);
DROP FUNCTION IF EXISTS public.league_plan_member_limit(text);

ALTER TABLE public.leagues
  DROP COLUMN IF EXISTS max_members,
  DROP COLUMN IF EXISTS plan;

CREATE OR REPLACE FUNCTION public.join_league_by_invite_code(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_league public.leagues%ROWTYPE;
  v_user_league_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_league
  FROM public.leagues
  WHERE invite_code = upper(trim(p_invite_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT count(*)
  INTO v_user_league_count
  FROM public.league_members
  WHERE user_id = auth.uid();

  IF v_user_league_count >= 5
     AND NOT public.is_league_member(v_league.id, auth.uid()) THEN
    RAISE EXCEPTION 'User league limit reached';
  END IF;

  INSERT INTO public.league_members (league_id, user_id, role)
  VALUES (v_league.id, auth.uid(), 'member')
  ON CONFLICT (league_id, user_id) DO NOTHING;

  RETURN v_league.id;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS user_submissions_user_tournament_unique_idx
ON public.user_submissions (user_id, tournament_id);
