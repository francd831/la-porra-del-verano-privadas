
-- =============================================
-- EVENTS QUEUE (central event processing)
-- =============================================
CREATE TABLE public.events_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  entity_id text,
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','calculating','calculated','publishing','done','failed')),
  attempts int NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage events_queue"
  ON public.events_queue FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access events_queue"
  ON public.events_queue FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE INDEX idx_events_queue_status ON public.events_queue(status);

CREATE TRIGGER update_events_queue_updated_at
  BEFORE UPDATE ON public.events_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- EVENT USER POINTS (per-event point calculations)
-- =============================================
CREATE TABLE public.event_user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events_queue(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  points int NOT NULL DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access event_user_points"
  ON public.event_user_points FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admins can view event_user_points"
  ON public.event_user_points FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- LEADERBOARD SNAPSHOT (stable ranking per event)
-- =============================================
CREATE TABLE public.leaderboard_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events_queue(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rank int NOT NULL,
  total_points int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.leaderboard_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access leaderboard_snapshot"
  ON public.leaderboard_snapshot FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admins can view leaderboard_snapshot"
  ON public.leaderboard_snapshot FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- NOTIFICATION OUTBOX (delivery tracking)
-- =============================================
CREATE TABLE public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events_queue(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE(event_id, user_id, type)
);

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access notification_outbox"
  ON public.notification_outbox FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admins can view notification_outbox"
  ON public.notification_outbox FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own notifications"
  ON public.notification_outbox FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_notification_outbox_status ON public.notification_outbox(status);
