CREATE OR REPLACE FUNCTION public.join_league_by_invite_code(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_league public.leagues%ROWTYPE;
  v_member_count integer;
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
