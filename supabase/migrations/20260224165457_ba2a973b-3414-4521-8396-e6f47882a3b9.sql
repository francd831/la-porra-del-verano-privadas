
-- =============================================
-- PUSH SUBSCRIPTIONS (multi-device per user)
-- =============================================
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Service role needs to read all active subscriptions for sending
CREATE POLICY "Service role can read all subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- USER NOTIFICATION SETTINGS
-- =============================================
CREATE TABLE public.user_notification_settings (
  user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON public.user_notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- NOTIFICATION TEMPLATES (admin editable)
-- =============================================
CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notification templates"
  ON public.notification_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert notification templates"
  ON public.notification_templates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notification templates"
  ON public.notification_templates FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete notification templates"
  ON public.notification_templates FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- SEED TEMPLATES
-- =============================================
INSERT INTO public.notification_templates (key, title, body) VALUES
  ('match_result_base', 'Resultado del partido', 'El partido {HOME_TEAM} - {AWAY_TEAM} ha quedado {REAL_SCORE_HOME}-{REAL_SCORE_AWAY} y tú tenías {USER_PRED_HOME}-{USER_PRED_AWAY}. Has ganado {POINTS} puntos y estás en el puesto {RANK} de la clasificación'),
  ('match_suffix_gt10', 'Sufijo +10 puntos', ' ¡Enhorabuena!!'),
  ('match_suffix_lt3', 'Sufijo <3 puntos', ' Suerte en el próximo partido'),
  ('knockout_correct', 'Eliminatoria acertada', 'Enhorabuena, has acertado el pase a la ronda de {ROUND_NAME} de {TEAM}. Has obtenido {POINTS} puntos y estás en el puesto {RANK} de la clasificación'),
  ('knockout_wrong', 'Eliminatoria fallada', 'Se ha clasificado {TEAM} y no lo tenías en tu pronóstico. Ahora estás en la posición {RANK} de la clasificación'),
  ('award_result', 'Resultado premio individual', 'El ganador de la {AWARD_NAME} ha sido {WINNER} y tú tenías {USER_PICK}, has ganado {POINTS} puntos y estás en la posición {RANK} de la clasificación'),
  ('reminder_7', 'Recordatorio 7 días', '¡Quedan 7 días para el cierre de pronósticos ({DEADLINE_DATE})! Completa tu porra antes de que sea tarde.'),
  ('reminder_3', 'Recordatorio 3 días', '¡Solo quedan 3 días para cerrar pronósticos ({DEADLINE_DATE})! No te quedes fuera.'),
  ('reminder_1', 'Recordatorio último día', '¡ÚLTIMO DÍA! Los pronósticos se cierran mañana ({DEADLINE_DATE}). ¡Date prisa!');
