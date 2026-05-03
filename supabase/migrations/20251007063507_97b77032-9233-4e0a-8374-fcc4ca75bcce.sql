-- Backfill perfiles faltantes para users con submissions
INSERT INTO public.profiles (user_id, email, display_name)
SELECT DISTINCT us.user_id, NULL::text, NULL::text
FROM public.user_submissions us
LEFT JOIN public.profiles p ON p.user_id = us.user_id
WHERE p.user_id IS NULL;

-- Asegurar unicidad en profiles.user_id para poder crear FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_user_id_unique'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- Crear FK de user_submissions.user_id -> profiles.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_submissions_user_id_fkey'
      AND table_name = 'user_submissions'
  ) THEN
    ALTER TABLE public.user_submissions
    ADD CONSTRAINT user_submissions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(user_id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Índice para mejorar joins por user_id
CREATE INDEX IF NOT EXISTS idx_user_submissions_user_id ON public.user_submissions(user_id);