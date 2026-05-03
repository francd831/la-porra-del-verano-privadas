CREATE TABLE public.pdf_template_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  config jsonb NOT NULL DEFAULT '{
    "sections": [
      {"id": "header", "name": "Cabecera", "enabled": true, "order": 0},
      {"id": "groups", "name": "Fase de Grupos", "enabled": true, "order": 1},
      {"id": "playoffs", "name": "Fase Eliminatoria", "enabled": true, "order": 2},
      {"id": "awards", "name": "Premios Individuales", "enabled": true, "order": 3}
    ],
    "colors": {
      "primary": "#6366f1",
      "secondary": "#1e293b",
      "accent": "#00ff88",
      "background": "#0f1729",
      "text": "#ffffff",
      "gold": "#daa520"
    },
    "texts": {
      "title": "Porra Mundial 2026",
      "subtitle": "laporradelverano.lovable.app"
    }
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tournament_id)
);

ALTER TABLE public.pdf_template_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pdf template config"
ON public.pdf_template_config FOR SELECT TO public
USING (true);

CREATE POLICY "Admins can manage pdf template config"
ON public.pdf_template_config FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));