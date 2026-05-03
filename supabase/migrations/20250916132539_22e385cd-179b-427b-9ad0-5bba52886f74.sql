-- Harden RLS for sensitive personal data in prediction_submissions
-- 1) Ensure RLS is enabled
ALTER TABLE public.prediction_submissions ENABLE ROW LEVEL SECURITY;

-- 2) Replace existing broad policies with authenticated-only policies
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.prediction_submissions;
DROP POLICY IF EXISTS "Users can create their own submissions" ON public.prediction_submissions;
DROP POLICY IF EXISTS "Users can update their own submissions" ON public.prediction_submissions;

-- 3) Authenticated users only, and limited to their own rows
CREATE POLICY "Authenticated users can view their own submissions"
ON public.prediction_submissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create their own submissions"
ON public.prediction_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own submissions"
ON public.prediction_submissions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Intentionally no DELETE policy (keeps deletes disallowed)