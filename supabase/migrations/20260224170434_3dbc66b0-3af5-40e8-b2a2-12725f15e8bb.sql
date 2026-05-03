
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Cron job: process events every minute
SELECT cron.schedule(
  'process-events-every-minute',
  '* * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://qtqxhnlndbypwontwxit.supabase.co/functions/v1/process-events',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cXhobmxuZGJ5cHdvbnR3eGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMTg3NjUsImV4cCI6MjA3Mjg5NDc2NX0.3ZjhG1IliF4RrBAQwlNc-gZKGsglwdoxECaK3DpGJLA"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
