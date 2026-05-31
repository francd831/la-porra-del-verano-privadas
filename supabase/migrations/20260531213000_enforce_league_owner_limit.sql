CREATE OR REPLACE FUNCTION public.enforce_owner_private_league_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_league_count integer;
BEGIN
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*)
  INTO v_user_league_count
  FROM public.league_members
  WHERE user_id = NEW.owner_id;

  IF v_user_league_count >= 3 THEN
    RAISE EXCEPTION 'User league limit reached';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_owner_private_league_limit ON public.leagues;
CREATE TRIGGER enforce_owner_private_league_limit
BEFORE INSERT ON public.leagues
FOR EACH ROW
EXECUTE FUNCTION public.enforce_owner_private_league_limit();
