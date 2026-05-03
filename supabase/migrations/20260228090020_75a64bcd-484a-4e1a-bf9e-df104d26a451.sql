
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS invalidated_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invalid_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS platform text DEFAULT NULL;
