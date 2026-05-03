-- Fix RLS policies for tournaments table to allow authenticated users to create tournaments
DROP POLICY IF EXISTS "Anyone can view tournaments" ON public.tournaments;

-- Create new policies for tournaments
CREATE POLICY "Anyone can view tournaments" 
ON public.tournaments 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create tournaments" 
ON public.tournaments 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tournaments" 
ON public.tournaments 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);