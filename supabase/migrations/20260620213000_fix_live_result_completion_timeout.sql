-- Keep match updates fast: live scoring is recalculated in the row trigger,
-- while the heavier Hall of Fame refresh runs separately via pg_cron.

CREATE OR REPLACE FUNCTION public.trigger_update_points_on_match_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('in_progress', 'completed')
     AND (
       OLD.status IS DISTINCT FROM NEW.status OR
       OLD.home_goals IS DISTINCT FROM NEW.home_goals OR
       OLD.away_goals IS DISTINCT FROM NEW.away_goals
     ) THEN
    PERFORM public.update_all_user_points_internal(NEW.tournament_id, false);
    PERFORM public.refresh_match_score_breakdown(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.scoring_refresh_state (
  tournament_id UUID PRIMARY KEY REFERENCES public.tournaments(id) ON DELETE CASCADE,
  last_hall_refresh TIMESTAMPTZ NOT NULL DEFAULT '-infinity'::timestamptz,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scoring_refresh_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view scoring refresh state" ON public.scoring_refresh_state;
CREATE POLICY "Admins can view scoring refresh state"
  ON public.scoring_refresh_state
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.refresh_hall_of_fame_if_needed(p_tournament_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_refresh TIMESTAMPTZ;
  v_latest_completed_update TIMESTAMPTZ;
BEGIN
  INSERT INTO public.scoring_refresh_state (tournament_id)
  VALUES (p_tournament_id)
  ON CONFLICT (tournament_id) DO NOTHING;

  SELECT last_hall_refresh
  INTO v_last_refresh
  FROM public.scoring_refresh_state
  WHERE tournament_id = p_tournament_id
  FOR UPDATE;

  SELECT max(updated_at)
  INTO v_latest_completed_update
  FROM public.matches
  WHERE tournament_id = p_tournament_id
    AND status = 'completed';

  IF v_latest_completed_update IS NULL OR v_latest_completed_update <= v_last_refresh THEN
    RETURN;
  END IF;

  PERFORM public.update_all_user_points_internal(p_tournament_id, true);

  UPDATE public.scoring_refresh_state
  SET last_hall_refresh = v_latest_completed_update,
      updated_at = now()
  WHERE tournament_id = p_tournament_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_hall_of_fame_if_needed(UUID) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('sync-match-results-live');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'sync-match-results-live',
  '30 seconds',
  $$
  SELECT net.http_post(
    url := 'https://jiwkapljlilerezmhsyc.supabase.co/functions/v1/sync-match-results',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', coalesce((
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'sync_results_secret'
        LIMIT 1
      ), '')
    ),
    body := '{}'::jsonb
  ) AS request_id
  WHERE EXISTS (
    SELECT 1
    FROM public.matches
    WHERE tournament_id = '11111111-1111-1111-1111-111111111111'
      AND (
        status = 'in_progress'
        OR (
          status = 'scheduled'
          AND match_date IS NOT NULL
          AND match_date <= now() + interval '30 seconds'
          AND match_date >= now() - interval '4 hours'
        )
      )
  );
  $$
);

DO $$
BEGIN
  PERFORM cron.unschedule('refresh-hall-of-fame-after-results');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'refresh-hall-of-fame-after-results',
  '*/5 * * * *',
  $$
  SELECT public.refresh_hall_of_fame_if_needed(
    '11111111-1111-1111-1111-111111111111'::uuid
  );
  $$
);
