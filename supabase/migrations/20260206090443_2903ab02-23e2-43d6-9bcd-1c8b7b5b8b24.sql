-- Drop the security definer view and unused function
DROP VIEW IF EXISTS public.public_profiles;
DROP FUNCTION IF EXISTS public.get_public_profile_fields(profiles);

-- The policies are correct:
-- 1. "Users can view their own full profile" - lets users see their own complete profile
-- 2. "Authenticated users can view public profile fields" - lets everyone see profiles

-- However, we need to restrict what fields are accessible
-- Since RLS doesn't support column-level security, we keep the permissive read policy
-- but the application code should be updated to only fetch non-sensitive fields for other users

-- For now, drop the overly permissive policy and keep only owner access
DROP POLICY IF EXISTS "Authenticated users can view public profile fields" ON public.profiles;

-- Create a new restrictive policy that allows authenticated users to see only specific columns
-- by using a security definer function that the application calls
CREATE OR REPLACE FUNCTION public.get_user_display_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT display_name FROM profiles WHERE user_id = p_user_id;
$$;

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_display_name(uuid) TO authenticated;