-- Permitir que todos los usuarios autenticados vean todas las submissions (para mostrar la clasificación)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_submissions' AND policyname = 'Authenticated users can view all submissions'
  ) THEN
    CREATE POLICY "Authenticated users can view all submissions"
    ON public.user_submissions
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;