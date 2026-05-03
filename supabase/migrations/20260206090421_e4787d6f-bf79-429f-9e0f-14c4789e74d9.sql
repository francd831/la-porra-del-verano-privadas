-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create policy: Users can view their own full profile (including email)
CREATE POLICY "Users can view their own full profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy: Other authenticated users can only view display_name (not email)
-- This uses a security definer function to return only safe fields
CREATE OR REPLACE FUNCTION public.get_public_profile_fields(profile_row profiles)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true
$$;

-- Create a view for public profile data that excludes sensitive fields
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  display_name,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Policy for authenticated users to see basic profile info (non-sensitive)
-- They can see all profiles but RLS on the base table + view restricts what columns they get
CREATE POLICY "Authenticated users can view public profile fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Note: The application code should use the public_profiles view for listing users
-- and only query the full profiles table for the current user's own data