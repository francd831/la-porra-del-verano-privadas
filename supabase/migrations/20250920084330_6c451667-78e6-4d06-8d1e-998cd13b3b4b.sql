-- Crear equipos para el Mundial 2026
INSERT INTO teams (id, name, flag, code) VALUES
-- Grupo A
('USA', 'Estados Unidos', '🇺🇸', 'USA'),
('MEX', 'México', '🇲🇽', 'MEX'),
('URU', 'Uruguay', '🇺🇾', 'URU'),
('BOL', 'Bolivia', '🇧🇴', 'BOL'),
-- Grupo B
('ESP', 'España', '🇪🇸', 'ESP'),
('ITA', 'Italia', '🇮🇹', 'ITA'),
('CRO', 'Croacia', '🇭🇷', 'CRO'),
('ALB', 'Albania', '🇦🇱', 'ALB'),
-- Grupo C
('ARG', 'Argentina', '🇦🇷', 'ARG'),
('CHI', 'Chile', '🇨🇱', 'CHI'),
('AUS', 'Australia', '🇦🇺', 'AUS'),
('IDN', 'Indonesia', '🇮🇩', 'IDN'),
-- Grupo D
('FRA', 'Francia', '🇫🇷', 'FRA'),
('DEN', 'Dinamarca', '🇩🇰', 'DEN'),
('CAN', 'Canadá', '🇨🇦', 'CAN'),
('NZL', 'Nueva Zelanda', '🇳🇿', 'NZL'),
-- Grupo E
('BRA', 'Brasil', '🇧🇷', 'BRA'),
('BEL', 'Bélgica', '🇧🇪', 'BEL'),
('JPN', 'Japón', '🇯🇵', 'JPN'),
('JAM', 'Jamaica', '🇯🇲', 'JAM'),
-- Grupo F
('POR', 'Portugal', '🇵🇹', 'POR'),
('NED', 'Países Bajos', '🇳🇱', 'NED'),
('SEN', 'Senegal', '🇸🇳', 'SEN'),
('GHA', 'Ghana', '🇬🇭', 'GHA'),
-- Grupo G
('ENG', 'Inglaterra', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'ENG'),
('POL', 'Polonia', '🇵🇱', 'POL'),
('UKR', 'Ucrania', '🇺🇦', 'UKR'),
('FIN', 'Finlandia', '🇫🇮', 'FIN'),
-- Grupo H
('GER', 'Alemania', '🇩🇪', 'GER'),
('SWE', 'Suecia', '🇸🇪', 'SWE'),
('TUN', 'Túnez', '🇹🇳', 'TUN'),
('MAR', 'Marruecos', '🇲🇦', 'MAR')
ON CONFLICT (id) DO NOTHING;

-- Crear grupos
INSERT INTO groups (id, name, tournament_id) VALUES
('A', 'Grupo A', '11111111-1111-1111-1111-111111111111'),
('B', 'Grupo B', '11111111-1111-1111-1111-111111111111'),
('C', 'Grupo C', '11111111-1111-1111-1111-111111111111'),
('D', 'Grupo D', '11111111-1111-1111-1111-111111111111'),
('E', 'Grupo E', '11111111-1111-1111-1111-111111111111'),
('F', 'Grupo F', '11111111-1111-1111-1111-111111111111'),
('G', 'Grupo G', '11111111-1111-1111-1111-111111111111'),
('H', 'Grupo H', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Asignar equipos a grupos
INSERT INTO group_teams (group_id, team_id) VALUES
-- Grupo A
('A', 'USA'), ('A', 'MEX'), ('A', 'URU'), ('A', 'BOL'),
-- Grupo B  
('B', 'ESP'), ('B', 'ITA'), ('B', 'CRO'), ('B', 'ALB'),
-- Grupo C
('C', 'ARG'), ('C', 'CHI'), ('C', 'AUS'), ('C', 'IDN'),
-- Grupo D
('D', 'FRA'), ('D', 'DEN'), ('D', 'CAN'), ('D', 'NZL'),
-- Grupo E
('E', 'BRA'), ('E', 'BEL'), ('E', 'JPN'), ('E', 'JAM'),
-- Grupo F
('F', 'POR'), ('F', 'NED'), ('F', 'SEN'), ('F', 'GHA'),
-- Grupo G
('G', 'ENG'), ('G', 'POL'), ('G', 'UKR'), ('G', 'FIN'),
-- Grupo H
('H', 'GER'), ('H', 'SWE'), ('H', 'TUN'), ('H', 'MAR');

-- Crear partidos de grupos (6 partidos por grupo)
INSERT INTO matches (id, tournament_id, home_team_id, away_team_id, match_type, group_id, round, match_date) VALUES
-- Grupo A
('A_USA_MEX', '11111111-1111-1111-1111-111111111111', 'USA', 'MEX', 'group', 'A', 'Jornada 1', '2026-06-11 21:00:00+00'),
('A_URU_BOL', '11111111-1111-1111-1111-111111111111', 'URU', 'BOL', 'group', 'A', 'Jornada 1', '2026-06-12 18:00:00+00'),
('A_USA_URU', '11111111-1111-1111-1111-111111111111', 'USA', 'URU', 'group', 'A', 'Jornada 2', '2026-06-17 21:00:00+00'),
('A_MEX_BOL', '11111111-1111-1111-1111-111111111111', 'MEX', 'BOL', 'group', 'A', 'Jornada 2', '2026-06-17 18:00:00+00'),
('A_USA_BOL', '11111111-1111-1111-1111-111111111111', 'USA', 'BOL', 'group', 'A', 'Jornada 3', '2026-06-22 21:00:00+00'),
('A_MEX_URU', '11111111-1111-1111-1111-111111111111', 'MEX', 'URU', 'group', 'A', 'Jornada 3', '2026-06-22 21:00:00+00'),

-- Grupo B
('B_ESP_ITA', '11111111-1111-1111-1111-111111111111', 'ESP', 'ITA', 'group', 'B', 'Jornada 1', '2026-06-12 21:00:00+00'),
('B_CRO_ALB', '11111111-1111-1111-1111-111111111111', 'CRO', 'ALB', 'group', 'B', 'Jornada 1', '2026-06-13 18:00:00+00'),
('B_ESP_CRO', '11111111-1111-1111-1111-111111111111', 'ESP', 'CRO', 'group', 'B', 'Jornada 2', '2026-06-18 21:00:00+00'),
('B_ITA_ALB', '11111111-1111-1111-1111-111111111111', 'ITA', 'ALB', 'group', 'B', 'Jornada 2', '2026-06-18 18:00:00+00'),
('B_ESP_ALB', '11111111-1111-1111-1111-111111111111', 'ESP', 'ALB', 'group', 'B', 'Jornada 3', '2026-06-23 21:00:00+00'),
('B_ITA_CRO', '11111111-1111-1111-1111-111111111111', 'ITA', 'CRO', 'group', 'B', 'Jornada 3', '2026-06-23 21:00:00+00'),

-- Grupo C
('C_ARG_CHI', '11111111-1111-1111-1111-111111111111', 'ARG', 'CHI', 'group', 'C', 'Jornada 1', '2026-06-13 21:00:00+00'),
('C_AUS_IDN', '11111111-1111-1111-1111-111111111111', 'AUS', 'IDN', 'group', 'C', 'Jornada 1', '2026-06-14 18:00:00+00'),
('C_ARG_AUS', '11111111-1111-1111-1111-111111111111', 'ARG', 'AUS', 'group', 'C', 'Jornada 2', '2026-06-19 21:00:00+00'),
('C_CHI_IDN', '11111111-1111-1111-1111-111111111111', 'CHI', 'IDN', 'group', 'C', 'Jornada 2', '2026-06-19 18:00:00+00'),
('C_ARG_IDN', '11111111-1111-1111-1111-111111111111', 'ARG', 'IDN', 'group', 'C', 'Jornada 3', '2026-06-24 21:00:00+00'),
('C_CHI_AUS', '11111111-1111-1111-1111-111111111111', 'CHI', 'AUS', 'group', 'C', 'Jornada 3', '2026-06-24 21:00:00+00'),

-- Grupo D
('D_FRA_DEN', '11111111-1111-1111-1111-111111111111', 'FRA', 'DEN', 'group', 'D', 'Jornada 1', '2026-06-14 21:00:00+00'),
('D_CAN_NZL', '11111111-1111-1111-1111-111111111111', 'CAN', 'NZL', 'group', 'D', 'Jornada 1', '2026-06-15 18:00:00+00'),
('D_FRA_CAN', '11111111-1111-1111-1111-111111111111', 'FRA', 'CAN', 'group', 'D', 'Jornada 2', '2026-06-20 21:00:00+00'),
('D_DEN_NZL', '11111111-1111-1111-1111-111111111111', 'DEN', 'NZL', 'group', 'D', 'Jornada 2', '2026-06-20 18:00:00+00'),
('D_FRA_NZL', '11111111-1111-1111-1111-111111111111', 'FRA', 'NZL', 'group', 'D', 'Jornada 3', '2026-06-25 21:00:00+00'),
('D_DEN_CAN', '11111111-1111-1111-1111-111111111111', 'DEN', 'CAN', 'group', 'D', 'Jornada 3', '2026-06-25 21:00:00+00'),

-- Grupo E
('E_BRA_BEL', '11111111-1111-1111-1111-111111111111', 'BRA', 'BEL', 'group', 'E', 'Jornada 1', '2026-06-15 21:00:00+00'),
('E_JPN_JAM', '11111111-1111-1111-1111-111111111111', 'JPN', 'JAM', 'group', 'E', 'Jornada 1', '2026-06-16 18:00:00+00'),
('E_BRA_JPN', '11111111-1111-1111-1111-111111111111', 'BRA', 'JPN', 'group', 'E', 'Jornada 2', '2026-06-21 21:00:00+00'),
('E_BEL_JAM', '11111111-1111-1111-1111-111111111111', 'BEL', 'JAM', 'group', 'E', 'Jornada 2', '2026-06-21 18:00:00+00'),
('E_BRA_JAM', '11111111-1111-1111-1111-111111111111', 'BRA', 'JAM', 'group', 'E', 'Jornada 3', '2026-06-26 21:00:00+00'),
('E_BEL_JPN', '11111111-1111-1111-1111-111111111111', 'BEL', 'JPN', 'group', 'E', 'Jornada 3', '2026-06-26 21:00:00+00'),

-- Grupo F
('F_POR_NED', '11111111-1111-1111-1111-111111111111', 'POR', 'NED', 'group', 'F', 'Jornada 1', '2026-06-16 21:00:00+00'),
('F_SEN_GHA', '11111111-1111-1111-1111-111111111111', 'SEN', 'GHA', 'group', 'F', 'Jornada 1', '2026-06-17 18:00:00+00'),
('F_POR_SEN', '11111111-1111-1111-1111-111111111111', 'POR', 'SEN', 'group', 'F', 'Jornada 2', '2026-06-22 21:00:00+00'),
('F_NED_GHA', '11111111-1111-1111-1111-111111111111', 'NED', 'GHA', 'group', 'F', 'Jornada 2', '2026-06-22 18:00:00+00'),
('F_POR_GHA', '11111111-1111-1111-1111-111111111111', 'POR', 'GHA', 'group', 'F', 'Jornada 3', '2026-06-27 21:00:00+00'),
('F_NED_SEN', '11111111-1111-1111-1111-111111111111', 'NED', 'SEN', 'group', 'F', 'Jornada 3', '2026-06-27 21:00:00+00'),

-- Grupo G
('G_ENG_POL', '11111111-1111-1111-1111-111111111111', 'ENG', 'POL', 'group', 'G', 'Jornada 1', '2026-06-18 21:00:00+00'),
('G_UKR_FIN', '11111111-1111-1111-1111-111111111111', 'UKR', 'FIN', 'group', 'G', 'Jornada 1', '2026-06-19 18:00:00+00'),
('G_ENG_UKR', '11111111-1111-1111-1111-111111111111', 'ENG', 'UKR', 'group', 'G', 'Jornada 2', '2026-06-23 21:00:00+00'),
('G_POL_FIN', '11111111-1111-1111-1111-111111111111', 'POL', 'FIN', 'group', 'G', 'Jornada 2', '2026-06-23 18:00:00+00'),
('G_ENG_FIN', '11111111-1111-1111-1111-111111111111', 'ENG', 'FIN', 'group', 'G', 'Jornada 3', '2026-06-28 21:00:00+00'),
('G_POL_UKR', '11111111-1111-1111-1111-111111111111', 'POL', 'UKR', 'group', 'G', 'Jornada 3', '2026-06-28 21:00:00+00'),

-- Grupo H
('H_GER_SWE', '11111111-1111-1111-1111-111111111111', 'GER', 'SWE', 'group', 'H', 'Jornada 1', '2026-06-19 21:00:00+00'),
('H_TUN_MAR', '11111111-1111-1111-1111-111111111111', 'TUN', 'MAR', 'group', 'H', 'Jornada 1', '2026-06-20 18:00:00+00'),
('H_GER_TUN', '11111111-1111-1111-1111-111111111111', 'GER', 'TUN', 'group', 'H', 'Jornada 2', '2026-06-24 21:00:00+00'),
('H_SWE_MAR', '11111111-1111-1111-1111-111111111111', 'SWE', 'MAR', 'group', 'H', 'Jornada 2', '2026-06-24 18:00:00+00'),
('H_GER_MAR', '11111111-1111-1111-1111-111111111111', 'GER', 'MAR', 'group', 'H', 'Jornada 3', '2026-06-29 21:00:00+00'),
('H_SWE_TUN', '11111111-1111-1111-1111-111111111111', 'SWE', 'TUN', 'group', 'H', 'Jornada 3', '2026-06-29 21:00:00+00');