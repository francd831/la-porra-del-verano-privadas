-- Añadir los nuevos grupos I, J, K, L para el formato del Mundial 2026
-- El torneo ahora tiene 12 grupos en lugar de 8

-- Insertar los nuevos grupos I, J, K, L
INSERT INTO groups (id, name, tournament_id, created_at) VALUES
('group-i', 'I', '11111111-1111-1111-1111-111111111111', now()),
('group-j', 'J', '11111111-1111-1111-1111-111111111111', now()),
('group-k', 'K', '11111111-1111-1111-1111-111111111111', now()),
('group-l', 'L', '11111111-1111-1111-1111-111111111111', now())
ON CONFLICT (id) DO NOTHING;

-- Actualizar la columna match_type en matches para incluir 'round_of_32' (dieciseisavos)
-- Primero verificamos que no hay constraint que lo impida
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_match_type_check;

-- Añadir un comentario para documentar los tipos de partido válidos
COMMENT ON COLUMN matches.match_type IS 'Tipos válidos: group, round_of_32, round_of_16, quarter_final, semi_final, third_place, final';

-- Insertar los 16 partidos de dieciseisavos de final (M73 a M88)
-- Estos se crearán sin equipos asignados inicialmente
INSERT INTO matches (id, tournament_id, match_type, round, status, created_at, updated_at) VALUES
('match-73', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 1', 'scheduled', now(), now()),
('match-74', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 2', 'scheduled', now(), now()),
('match-75', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 3', 'scheduled', now(), now()),
('match-76', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 4', 'scheduled', now(), now()),
('match-77', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 5', 'scheduled', now(), now()),
('match-78', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 6', 'scheduled', now(), now()),
('match-79', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 7', 'scheduled', now(), now()),
('match-80', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 8', 'scheduled', now(), now()),
('match-81', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 9', 'scheduled', now(), now()),
('match-82', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 10', 'scheduled', now(), now()),
('match-83', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 11', 'scheduled', now(), now()),
('match-84', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 12', 'scheduled', now(), now()),
('match-85', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 13', 'scheduled', now(), now()),
('match-86', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 14', 'scheduled', now(), now()),
('match-87', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 15', 'scheduled', now(), now()),
('match-88', '11111111-1111-1111-1111-111111111111', 'round_of_32', 'Dieciseisavos 16', 'scheduled', now(), now())
ON CONFLICT (id) DO NOTHING;