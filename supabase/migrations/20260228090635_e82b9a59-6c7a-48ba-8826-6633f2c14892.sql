
ALTER TABLE public.notification_outbox DROP CONSTRAINT notification_outbox_status_check;
ALTER TABLE public.notification_outbox ADD CONSTRAINT notification_outbox_status_check 
  CHECK (status IN ('pending', 'queued', 'sent', 'failed', 'expired'));
