CREATE TABLE IF NOT EXISTS public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  sender_id uuid NOT NULL,
  target_all boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_message_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.admin_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.admin_message_reads (
  message_id uuid NOT NULL REFERENCES public.admin_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage admin messages" ON public.admin_messages;
CREATE POLICY "Admins can manage admin messages"
ON public.admin_messages
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their active admin messages" ON public.admin_messages;
CREATE POLICY "Users can view their active admin messages"
ON public.admin_messages
FOR SELECT
USING (
  is_active
  AND auth.uid() IS NOT NULL
  AND (
    target_all
    OR EXISTS (
      SELECT 1
      FROM public.admin_message_recipients amr
      WHERE amr.message_id = admin_messages.id
        AND amr.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Admins can manage admin message recipients" ON public.admin_message_recipients;
CREATE POLICY "Admins can manage admin message recipients"
ON public.admin_message_recipients
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own admin message recipients" ON public.admin_message_recipients;
CREATE POLICY "Users can view own admin message recipients"
ON public.admin_message_recipients
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view admin message reads" ON public.admin_message_reads;
CREATE POLICY "Admins can view admin message reads"
ON public.admin_message_reads
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can manage own admin message reads" ON public.admin_message_reads;
CREATE POLICY "Users can manage own admin message reads"
ON public.admin_message_reads
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_admin_message_users()
RETURNS TABLE(user_id uuid, display_name text, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.display_name, p.email
  FROM public.profiles p
  ORDER BY lower(coalesce(p.display_name, p.email, p.user_id::text));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_admin_message(
  p_title text,
  p_body text,
  p_target_all boolean,
  p_user_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  IF length(trim(coalesce(p_title, ''))) = 0 THEN
    RAISE EXCEPTION 'Message title is required';
  END IF;

  IF length(trim(coalesce(p_body, ''))) = 0 THEN
    RAISE EXCEPTION 'Message body is required';
  END IF;

  IF NOT p_target_all AND coalesce(array_length(p_user_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one recipient';
  END IF;

  INSERT INTO public.admin_messages (title, body, sender_id, target_all)
  VALUES (trim(p_title), trim(p_body), auth.uid(), p_target_all)
  RETURNING id INTO v_message_id;

  IF NOT p_target_all THEN
    INSERT INTO public.admin_message_recipients (message_id, user_id)
    SELECT v_message_id, distinct_user_id
    FROM (
      SELECT DISTINCT unnest(p_user_ids) AS distinct_user_id
    ) recipients
    WHERE distinct_user_id IS NOT NULL;
  END IF;

  RETURN v_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_admin_messages()
RETURNS TABLE(id uuid, title text, body text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT am.id, am.title, am.body, am.created_at
  FROM public.admin_messages am
  WHERE auth.uid() IS NOT NULL
    AND am.is_active = true
    AND (
      am.target_all = true
      OR EXISTS (
        SELECT 1
        FROM public.admin_message_recipients amr
        WHERE amr.message_id = am.id
          AND amr.user_id = auth.uid()
      )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.admin_message_reads read_marker
      WHERE read_marker.message_id = am.id
        AND read_marker.user_id = auth.uid()
    )
  ORDER BY am.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.mark_admin_message_read(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.admin_message_reads (message_id, user_id)
  VALUES (p_message_id, auth.uid())
  ON CONFLICT (message_id, user_id) DO UPDATE
  SET read_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_message_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_message(text, text, boolean, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_admin_messages() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_admin_message_read(uuid) TO authenticated;
