CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('sync-match-results-every-15-minutes');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'sync-match-results-every-15-minutes',
  '*/15 * * * *',
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
  ) AS request_id;
  $$
);
