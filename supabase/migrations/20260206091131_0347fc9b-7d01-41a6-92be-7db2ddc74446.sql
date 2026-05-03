-- Fix Issue 1: Database triggers broken by admin check
-- Modify update_all_user_points to allow execution when auth.uid() is NULL (trigger context)
CREATE OR REPLACE FUNCTION public.update_all_user_points(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_submission RECORD;
  v_points RECORD;
BEGIN
  -- Only check admin when called directly via RPC (not from triggers)
  -- In triggers, auth.uid() is NULL, so we allow it
  IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  FOR v_user_submission IN 
    SELECT user_id FROM user_submissions WHERE tournament_id = p_tournament_id
  LOOP
    SELECT * INTO v_points FROM calculate_user_points(v_user_submission.user_id, p_tournament_id);
    
    UPDATE user_submissions
    SET 
      points_groups = v_points.groups_points,
      points_playoffs = v_points.playoffs_points,
      points_awards = v_points.awards_points,
      points_total = v_points.total_points,
      points_r32 = v_points.r32_points,
      points_r16 = v_points.r16_points,
      points_qf = v_points.qf_points,
      points_sf = v_points.sf_points,
      points_final = v_points.final_points,
      points_champion = v_points.champion_points,
      updated_at = now()
    WHERE user_id = v_user_submission.user_id
      AND tournament_id = p_tournament_id;
  END LOOP;
END;
$$;

-- Fix Issue 2: Profile queries need safe RPC functions

-- Create batch function to get multiple display names at once (more efficient)
CREATE OR REPLACE FUNCTION public.get_user_display_names(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT profiles.user_id, profiles.display_name 
  FROM profiles 
  WHERE profiles.user_id = ANY(p_user_ids);
$$;

-- Grant execute on the batch function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_display_names(uuid[]) TO authenticated;

-- Create function to check if display name is available (for registration)
CREATE OR REPLACE FUNCTION public.is_display_name_available(p_display_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS(
    SELECT 1 FROM profiles 
    WHERE LOWER(display_name) = LOWER(p_display_name)
  );
$$;

-- Grant execute on the availability function to anon (needed for registration before auth)
GRANT EXECUTE ON FUNCTION public.is_display_name_available(text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_display_name_available(text) TO authenticated;