-- Primero eliminar el check constraint existente si existe
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_match_type_check;

-- Crear un nuevo check constraint que permita 'group' y 'playoff'
ALTER TABLE public.matches ADD CONSTRAINT matches_match_type_check 
CHECK (match_type IN ('group', 'playoff'));

-- Ahora crear los partidos de eliminatorias
INSERT INTO public.matches (id, tournament_id, match_type, round, status)
VALUES 
-- Octavos de final
('R16_1', '11111111-1111-1111-1111-111111111111', 'playoff', 'Octavos de Final', 'scheduled'),
('R16_2', '11111111-1111-1111-1111-111111111111', 'playoff', 'Octavos de Final', 'scheduled'),
('R16_3', '11111111-1111-1111-1111-111111111111', 'playoff', 'Octavos de Final', 'scheduled'),
('R16_4', '11111111-1111-1111-1111-111111111111', 'playoff', 'Octavos de Final', 'scheduled'),
('R16_5', '11111111-1111-1111-1111-111111111111', 'playoff', 'Octavos de Final', 'scheduled'),
('R16_6', '11111111-1111-1111-1111-111111111111', 'playoff', 'Octavos de Final', 'scheduled'),
('R16_7', '11111111-1111-1111-1111-111111111111', 'playoff', 'Octavos de Final', 'scheduled'),
('R16_8', '11111111-1111-1111-1111-111111111111', 'playoff', 'Octavos de Final', 'scheduled'),
-- Cuartos de final
('QF_1', '11111111-1111-1111-1111-111111111111', 'playoff', 'Cuartos de Final', 'scheduled'),
('QF_2', '11111111-1111-1111-1111-111111111111', 'playoff', 'Cuartos de Final', 'scheduled'),
('QF_3', '11111111-1111-1111-1111-111111111111', 'playoff', 'Cuartos de Final', 'scheduled'),
('QF_4', '11111111-1111-1111-1111-111111111111', 'playoff', 'Cuartos de Final', 'scheduled'),
-- Semifinales
('SF_1', '11111111-1111-1111-1111-111111111111', 'playoff', 'Semifinales', 'scheduled'),
('SF_2', '11111111-1111-1111-1111-111111111111', 'playoff', 'Semifinales', 'scheduled'),
-- Final
('F_1', '11111111-1111-1111-1111-111111111111', 'playoff', 'Final', 'scheduled')
ON CONFLICT (id) DO NOTHING;