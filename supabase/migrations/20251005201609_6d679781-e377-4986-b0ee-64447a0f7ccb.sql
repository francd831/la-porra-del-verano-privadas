-- Hacer match_id nullable en predictions para permitir predicciones de playoffs sin matches predefinidos
ALTER TABLE public.predictions ALTER COLUMN match_id DROP NOT NULL;

-- Añadir columna para identificar la ronda de playoffs
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS playoff_round TEXT;

-- Añadir índice para mejorar búsquedas de predicciones de playoffs
CREATE INDEX IF NOT EXISTS idx_predictions_playoff_round ON public.predictions(user_id, playoff_round) WHERE playoff_round IS NOT NULL;

-- Crear comentarios para documentar el uso
COMMENT ON COLUMN public.predictions.match_id IS 'ID del partido (obligatorio para fase de grupos, nullable para playoffs)';
COMMENT ON COLUMN public.predictions.playoff_round IS 'Ronda de eliminatoria: octavos, cuartos, semifinales, final (solo para playoffs)';