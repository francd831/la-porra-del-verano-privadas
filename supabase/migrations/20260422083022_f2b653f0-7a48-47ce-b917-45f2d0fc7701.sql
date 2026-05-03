ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS external_id BIGINT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_matches_external_id ON public.matches(external_id);