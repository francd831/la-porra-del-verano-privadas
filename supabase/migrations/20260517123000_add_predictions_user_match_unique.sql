WITH ranked_predictions AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, match_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_number
  FROM public.predictions
  WHERE match_id IS NOT NULL
)
DELETE FROM public.predictions p
USING ranked_predictions rp
WHERE p.id = rp.id
  AND rp.row_number > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'predictions_user_id_match_id_key'
      AND conrelid = 'public.predictions'::regclass
  ) THEN
    ALTER TABLE public.predictions
      ADD CONSTRAINT predictions_user_id_match_id_key UNIQUE (user_id, match_id);
  END IF;
END;
$$;
