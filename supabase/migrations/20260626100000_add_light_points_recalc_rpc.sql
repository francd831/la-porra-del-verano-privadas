-- Lightweight admin recalc for UI actions that only need rankings/totals updated.
-- The heavier Hall of Fame refresh remains in update_all_user_points.

CREATE OR REPLACE FUNCTION public.recalculate_user_points_light(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  PERFORM public.update_all_user_points_internal(p_tournament_id, false);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.recalculate_user_points_light(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_user_points_light(uuid) TO service_role;
