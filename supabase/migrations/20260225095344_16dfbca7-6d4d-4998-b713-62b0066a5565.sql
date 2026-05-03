
-- Fix events_queue: drop RESTRICTIVE policies, recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can manage events_queue" ON public.events_queue;
DROP POLICY IF EXISTS "Service role full access events_queue" ON public.events_queue;

CREATE POLICY "Admins can manage events_queue"
  ON public.events_queue FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access events_queue"
  ON public.events_queue FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix notification_outbox: drop RESTRICTIVE policies, recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can view notification_outbox" ON public.notification_outbox;
DROP POLICY IF EXISTS "Service role full access notification_outbox" ON public.notification_outbox;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notification_outbox;

CREATE POLICY "Admins can view notification_outbox"
  ON public.notification_outbox FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access notification_outbox"
  ON public.notification_outbox FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own notifications"
  ON public.notification_outbox FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Fix event_user_points
DROP POLICY IF EXISTS "Admins can view event_user_points" ON public.event_user_points;
DROP POLICY IF EXISTS "Service role full access event_user_points" ON public.event_user_points;

CREATE POLICY "Admins can view event_user_points"
  ON public.event_user_points FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access event_user_points"
  ON public.event_user_points FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix leaderboard_snapshot
DROP POLICY IF EXISTS "Admins can view leaderboard_snapshot" ON public.leaderboard_snapshot;
DROP POLICY IF EXISTS "Service role full access leaderboard_snapshot" ON public.leaderboard_snapshot;

CREATE POLICY "Admins can view leaderboard_snapshot"
  ON public.leaderboard_snapshot FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access leaderboard_snapshot"
  ON public.leaderboard_snapshot FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
