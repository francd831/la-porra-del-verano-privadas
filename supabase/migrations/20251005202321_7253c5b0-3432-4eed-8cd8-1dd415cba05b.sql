-- Eliminar check constraints existentes en award_predictions si existen
ALTER TABLE public.award_predictions DROP CONSTRAINT IF EXISTS award_predictions_award_type_check;

-- Crear check constraint para permitir los valores correctos
ALTER TABLE public.award_predictions ADD CONSTRAINT award_predictions_award_type_check 
CHECK (award_type IN ('balon_oro', 'bota_oro'));

-- Hacer lo mismo para individual_awards
ALTER TABLE public.individual_awards DROP CONSTRAINT IF EXISTS individual_awards_award_type_check;

ALTER TABLE public.individual_awards ADD CONSTRAINT individual_awards_award_type_check 
CHECK (award_type IN ('balon_oro', 'bota_oro'));