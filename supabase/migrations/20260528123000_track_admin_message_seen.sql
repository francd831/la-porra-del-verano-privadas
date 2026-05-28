ALTER TABLE public.admin_message_reads
ADD COLUMN IF NOT EXISTS seen_at timestamptz;

UPDATE public.admin_message_reads
SET seen_at = COALESCE(seen_at, read_at)
WHERE read_at IS NOT NULL;

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
        AND read_marker.read_at IS NOT NULL
    )
  ORDER BY am.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.mark_admin_message_seen(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.admin_message_reads (message_id, user_id, seen_at)
  VALUES (p_message_id, auth.uid(), now())
  ON CONFLICT (message_id, user_id) DO UPDATE
  SET seen_at = COALESCE(public.admin_message_reads.seen_at, now());
END;
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

  INSERT INTO public.admin_message_reads (message_id, user_id, seen_at, read_at)
  VALUES (p_message_id, auth.uid(), now(), now())
  ON CONFLICT (message_id, user_id) DO UPDATE
  SET
    seen_at = COALESCE(public.admin_message_reads.seen_at, now()),
    read_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_admin_message_seen(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_admin_message_read(uuid) TO authenticated;
