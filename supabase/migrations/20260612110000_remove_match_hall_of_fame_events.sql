DELETE FROM public.user_score_events
WHERE event_type = 'match';

CREATE OR REPLACE FUNCTION public.prevent_match_score_events()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.event_type = 'match' THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_match_score_events_trigger ON public.user_score_events;

CREATE TRIGGER prevent_match_score_events_trigger
BEFORE INSERT OR UPDATE ON public.user_score_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_match_score_events();
