-- Fix 1: Add admin check to update_all_user_points function
-- This prevents any authenticated user from triggering expensive point recalculation

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
  -- Check if user is admin - prevent unauthorized access
  IF NOT has_role(auth.uid(), 'admin') THEN
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
      updated_at = now()
    WHERE user_id = v_user_submission.user_id
      AND tournament_id = p_tournament_id;
  END LOOP;
END;
$$;

-- Fix 2: Replace overly permissive tournament policies with admin-only policies
-- Drop the permissive policies
DROP POLICY IF EXISTS "Authenticated users can create tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Authenticated users can update tournaments" ON public.tournaments;

-- Create admin-only policies
CREATE POLICY "Admins can create tournaments" 
ON public.tournaments 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tournaments" 
ON public.tournaments 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));