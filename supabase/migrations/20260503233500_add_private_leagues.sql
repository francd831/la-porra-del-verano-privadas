-- Basic private leagues support.
-- Predictions remain scoped to users/tournaments; leagues only group users for rankings.

CREATE TABLE IF NOT EXISTS public.leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 3 AND 80),
  invite_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  owner_id uuid NOT NULL,
  tournament_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free')),
  max_members integer NOT NULL DEFAULT 10 CHECK (max_members > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.league_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_leagues_owner_id ON public.leagues(owner_id);
CREATE INDEX IF NOT EXISTS idx_leagues_invite_code ON public.leagues(invite_code);
CREATE INDEX IF NOT EXISTS idx_league_members_user_id ON public.league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_league_members_league_id ON public.league_members(league_id);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_leagues_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_leagues_updated_at ON public.leagues;
CREATE TRIGGER update_leagues_updated_at
BEFORE UPDATE ON public.leagues
FOR EACH ROW
EXECUTE FUNCTION public.update_leagues_updated_at();

CREATE OR REPLACE FUNCTION public.is_league_member(p_league_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members lm
    WHERE lm.league_id = p_league_id
      AND lm.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_league_admin(p_league_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members lm
    WHERE lm.league_id = p_league_id
      AND lm.user_id = p_user_id
      AND lm.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.add_owner_as_league_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.league_members (league_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (league_id, user_id) DO UPDATE SET role = 'owner';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS add_owner_as_league_member ON public.leagues;
CREATE TRIGGER add_owner_as_league_member
AFTER INSERT ON public.leagues
FOR EACH ROW
EXECUTE FUNCTION public.add_owner_as_league_member();

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
    RAISE EXCEPTION 'League member limit reached';
  END IF;

  INSERT INTO public.league_members (league_id, user_id, role)
  VALUES (v_league.id, auth.uid(), 'member')
  ON CONFLICT (league_id, user_id) DO NOTHING;

  RETURN v_league.id;
END;
$$;

CREATE POLICY "League members can view their leagues"
ON public.leagues
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_league_member(id, auth.uid())
);

CREATE POLICY "Authenticated users can create owned leagues"
ON public.leagues
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "League admins can update leagues"
ON public.leagues
FOR UPDATE
TO authenticated
USING (public.is_league_admin(id, auth.uid()))
WITH CHECK (public.is_league_admin(id, auth.uid()));

CREATE POLICY "League owners can delete leagues"
ON public.leagues
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "League members can view league members"
ON public.league_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_league_member(league_id, auth.uid())
);

CREATE POLICY "League admins can manage members"
ON public.league_members
FOR UPDATE
TO authenticated
USING (public.is_league_admin(league_id, auth.uid()))
WITH CHECK (public.is_league_admin(league_id, auth.uid()));

CREATE POLICY "League admins can remove members"
ON public.league_members
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_league_admin(league_id, auth.uid())
);
