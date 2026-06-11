CREATE TABLE IF NOT EXISTS public.user_feature_acknowledgements (
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature_key)
);

ALTER TABLE public.user_feature_acknowledgements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feature acknowledgements" ON public.user_feature_acknowledgements;
DROP POLICY IF EXISTS "Users can create own feature acknowledgements" ON public.user_feature_acknowledgements;
DROP POLICY IF EXISTS "Users can update own feature acknowledgements" ON public.user_feature_acknowledgements;
DROP POLICY IF EXISTS "Users can delete own feature acknowledgements" ON public.user_feature_acknowledgements;

CREATE POLICY "Users can view own feature acknowledgements"
ON public.user_feature_acknowledgements
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own feature acknowledgements"
ON public.user_feature_acknowledgements
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own feature acknowledgements"
ON public.user_feature_acknowledgements
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own feature acknowledgements"
ON public.user_feature_acknowledgements
FOR DELETE
USING (user_id = auth.uid());
