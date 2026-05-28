CREATE OR REPLACE FUNCTION public.get_general_participation_stats(p_tournament_id uuid)
RETURNS TABLE(registered integer, not_started integer, incomplete integer, complete integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH admin_users AS (
    SELECT user_id
    FROM public.user_roles
    WHERE role = 'admin'
  ),
  registered_users AS (
    SELECT p.user_id
    FROM public.profiles p
    WHERE p.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM admin_users au
        WHERE au.user_id = p.user_id
      )
  ),
  submissions AS (
    SELECT us.user_id, bool_or(us.is_complete) AS is_complete
    FROM public.user_submissions us
    WHERE us.tournament_id = p_tournament_id
    GROUP BY us.user_id
  )
  SELECT
    COUNT(*)::integer AS registered,
    COUNT(*) FILTER (WHERE s.user_id IS NULL)::integer AS not_started,
    COUNT(*) FILTER (WHERE s.user_id IS NOT NULL AND s.is_complete = false)::integer AS incomplete,
    COUNT(*) FILTER (WHERE s.is_complete = true)::integer AS complete
  FROM registered_users ru
  LEFT JOIN submissions s ON s.user_id = ru.user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_general_participation_stats(uuid) TO authenticated;
