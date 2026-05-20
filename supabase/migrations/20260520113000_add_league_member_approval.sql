ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false;

ALTER TABLE public.league_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

ALTER TABLE public.league_members
  DROP CONSTRAINT IF EXISTS league_members_status_check;

ALTER TABLE public.league_members
  ADD CONSTRAINT league_members_status_check
  CHECK (status IN ('pending', 'approved'));

UPDATE public.league_members
SET status = 'approved'
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_league_members_league_status
ON public.league_members (league_id, status);

CREATE OR REPLACE FUNCTION public.add_owner_as_league_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.league_members (league_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'approved')
  ON CONFLICT (league_id, user_id) DO UPDATE
  SET role = 'owner',
      status = 'approved';

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_approved_league_member(p_league_id uuid, p_user_id uuid)
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
      AND lm.status = 'approved'
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
      AND lm.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.join_league_by_invite_code(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_league public.leagues%ROWTYPE;
  v_user_league_count integer;
  v_member_status text;
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

  v_member_status := CASE WHEN v_league.requires_approval THEN 'pending' ELSE 'approved' END;

  INSERT INTO public.league_members (league_id, user_id, role, status)
  VALUES (v_league.id, auth.uid(), 'member', v_member_status)
  ON CONFLICT (league_id, user_id) DO UPDATE
  SET status = CASE
        WHEN public.league_members.status = 'approved' THEN 'approved'
        ELSE EXCLUDED.status
      END;

  RETURN v_league.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_league_member(p_league_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_league_admin(p_league_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.league_members
  SET status = 'approved'
  WHERE league_id = p_league_id
    AND user_id = p_user_id
    AND role = 'member';
END;
$$;

DROP POLICY IF EXISTS "League members can view league members" ON public.league_members;

CREATE POLICY "League members can view league members"
ON public.league_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_league_admin(league_id, auth.uid())
  OR (
    status = 'approved'
    AND public.is_approved_league_member(league_id, auth.uid())
  )
);
