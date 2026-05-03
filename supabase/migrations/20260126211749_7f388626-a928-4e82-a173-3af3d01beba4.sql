-- Agregar columna para orden manual de equipos por grupo (admin override)
-- Permite almacenar un array ordenado de team_ids por grupo

-- Crear tabla para almacenar el orden manual de equipos por grupo (usado cuando hay empates)
CREATE TABLE IF NOT EXISTS public.group_standings_override (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id TEXT NOT NULL,
  tournament_id UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  team_order TEXT[] NOT NULL, -- Array de team_ids en orden
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (group_id, tournament_id)
);

-- Habilitar RLS
ALTER TABLE public.group_standings_override ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo admins pueden gestionar, todos pueden ver
CREATE POLICY "Admins can manage group standings override"
ON public.group_standings_override
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view group standings override"
ON public.group_standings_override
FOR SELECT
USING (true);

-- Agregar columna para bonus de orden de grupo en user_submissions
ALTER TABLE public.user_submissions 
ADD COLUMN IF NOT EXISTS points_group_order INTEGER DEFAULT 0;