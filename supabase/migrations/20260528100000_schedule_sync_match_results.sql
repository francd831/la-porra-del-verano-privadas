CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('sync-match-results-every-15-minutes');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('sync-match-results-smart');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'sync-match-results-smart',
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
  WHERE now() >= TIMESTAMPTZ '2026-06-11 19:00:00+00'
    AND (
      EXISTS (
        SELECT 1
        FROM public.matches
        WHERE tournament_id = '11111111-1111-1111-1111-111111111111'
          AND status = 'in_progress'
      )
      OR EXISTS (
        SELECT 1
        FROM public.matches
        WHERE tournament_id = '11111111-1111-1111-1111-111111111111'
          AND status = 'scheduled'
          AND match_date IS NOT NULL
          AND match_date <= now() + interval '30 seconds'
          AND match_date >= now() - interval '4 hours'
      )
      OR (
        EXTRACT(MINUTE FROM now())::int IN (0, 30)
        AND EXTRACT(SECOND FROM now())::int < 30
      )
    );
  $$
);
