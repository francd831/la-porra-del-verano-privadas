
-- Fix events_queue policies: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Admins can manage events_queue" ON public.events_queue;
DROP POLICY IF EXISTS "Service role full access events_queue" ON public.events_queue;

CREATE POLICY "Admins can manage events_queue" ON public.events_queue
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access events_queue" ON public.events_queue
  FOR ALL USING (true) WITH CHECK (true);

-- Fix event_user_points policies
DROP POLICY IF EXISTS "Admins can view event_user_points" ON public.event_user_points;
DROP POLICY IF EXISTS "Service role full access event_user_points" ON public.event_user_points;

CREATE POLICY "Admins can view event_user_points" ON public.event_user_points
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access event_user_points" ON public.event_user_points
  FOR ALL USING (true) WITH CHECK (true);

-- Fix leaderboard_snapshot policies
DROP POLICY IF EXISTS "Admins can view leaderboard_snapshot" ON public.leaderboard_snapshot;
DROP POLICY IF EXISTS "Service role full access leaderboard_snapshot" ON public.leaderboard_snapshot;

CREATE POLICY "Admins can view leaderboard_snapshot" ON public.leaderboard_snapshot
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access leaderboard_snapshot" ON public.leaderboard_snapshot
  FOR ALL USING (true) WITH CHECK (true);

-- Fix notification_outbox policies
DROP POLICY IF EXISTS "Admins can view notification_outbox" ON public.notification_outbox;
DROP POLICY IF EXISTS "Service role full access notification_outbox" ON public.notification_outbox;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notification_outbox;

CREATE POLICY "Admins can view notification_outbox" ON public.notification_outbox
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access notification_outbox" ON public.notification_outbox
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own notifications" ON public.notification_outbox
  FOR SELECT USING (auth.uid() = user_id);
