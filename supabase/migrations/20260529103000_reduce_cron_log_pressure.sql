CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('process-events-every-minute');
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

DO $$
BEGIN
  PERFORM cron.unschedule('sync-match-results-live');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('activate-live-result-sync-at-kickoff');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-cron-http-logs');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'sync-match-results-smart',
  '*/30 * * * *',
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
  WHERE now() >= TIMESTAMPTZ '2026-06-11 19:00:00+00';
  $$
);

SELECT cron.schedule(
  'activate-live-result-sync-at-kickoff',
  '*/30 * * * *',
  $$
  DO $activate$
  BEGIN
    IF now() >= TIMESTAMPTZ '2026-06-11 19:00:00+00' THEN
      BEGIN
        PERFORM cron.unschedule('sync-match-results-live');
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END;

      PERFORM cron.schedule(
        'sync-match-results-live',
        '30 seconds',
        $live$
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
          );
        $live$
      );

      PERFORM cron.unschedule('activate-live-result-sync-at-kickoff');
    END IF;
  END
  $activate$;
  $$
);

SELECT cron.schedule(
  'cleanup-cron-http-logs',
  '0 * * * *',
  $$
  DELETE FROM net._http_response
  WHERE created < now() - interval '24 hours';

  DELETE FROM cron.job_run_details
  WHERE start_time < now() - interval '24 hours';
  $$
);

DELETE FROM net._http_response
WHERE created < now() - interval '24 hours';

DELETE FROM cron.job_run_details
WHERE start_time < now() - interval '24 hours';
