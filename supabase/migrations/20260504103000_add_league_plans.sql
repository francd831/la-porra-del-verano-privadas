-- League plans without real billing.
-- Stripe will update the plan through a server-side path later; for now owners can change it for testing.

CREATE OR REPLACE FUNCTION public.league_plan_member_limit(p_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'free' THEN 10
    WHEN 'pro' THEN 50
    WHEN 'max' THEN 150
    WHEN 'business' THEN 500
    ELSE NULL
  END;
$$;

ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS max_members integer NOT NULL DEFAULT 10;

ALTER TABLE public.leagues
  DROP CONSTRAINT IF EXISTS leagues_plan_check,
  DROP CONSTRAINT IF EXISTS leagues_max_members_check,
  ADD CONSTRAINT leagues_plan_check CHECK (plan IN ('free', 'pro', 'max', 'business'));

CREATE OR REPLACE FUNCTION public.sync_league_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.max_members = public.league_plan_member_limit(NEW.plan);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_league_plan_limit ON public.leagues;
CREATE TRIGGER sync_league_plan_limit
BEFORE INSERT OR UPDATE OF plan, max_members ON public.leagues
FOR EACH ROW
EXECUTE FUNCTION public.sync_league_plan_limit();

UPDATE public.leagues
SET max_members = public.league_plan_member_limit(plan)
WHERE max_members IS DISTINCT FROM public.league_plan_member_limit(plan);

ALTER TABLE public.leagues
  ADD CONSTRAINT leagues_max_members_check CHECK (max_members = public.league_plan_member_limit(plan));

CREATE OR REPLACE FUNCTION public.join_league_by_invite_code(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_league public.leagues%ROWTYPE;
  v_member_count integer;
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
  INTO v_member_count
  FROM public.league_members
  WHERE league_id = v_league.id;

  IF v_member_count >= v_league.max_members
     AND NOT public.is_league_member(v_league.id, auth.uid()) THEN
    RAISE EXCEPTION 'League member limit reached. Upgrade required.';
  END IF;

  INSERT INTO public.league_members (league_id, user_id, role)
  VALUES (v_league.id, auth.uid(), 'member')
  ON CONFLICT (league_id, user_id) DO NOTHING;

  RETURN v_league.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_league_plan_for_testing(p_league_id uuid, p_plan text)
RETURNS public.leagues
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_league public.leagues%ROWTYPE;
  v_limit integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_limit := public.league_plan_member_limit(p_plan);
  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'Invalid league plan';
  END IF;

  SELECT *
  INTO v_league
  FROM public.leagues
  WHERE id = p_league_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'League not found';
  END IF;

  IF v_league.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the league owner can change the plan';
  END IF;

  UPDATE public.leagues
  SET plan = p_plan,
      max_members = v_limit
  WHERE id = p_league_id
  RETURNING * INTO v_league;

  RETURN v_league;
END;
$$;

DROP POLICY IF EXISTS "League admins can update leagues" ON public.leagues;
DROP POLICY IF EXISTS "League owners can update leagues" ON public.leagues;
DROP POLICY IF EXISTS "Authenticated users can create owned leagues" ON public.leagues;
CREATE POLICY "Authenticated users can create free owned leagues"
ON public.leagues
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND plan = 'free'
  AND max_members = 10
);

CREATE POLICY "League owners can update leagues"
ON public.leagues
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());
