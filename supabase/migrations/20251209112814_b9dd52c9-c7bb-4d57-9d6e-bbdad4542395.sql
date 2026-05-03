-- Añadir 16 equipos adicionales para completar el Mundial 2026
INSERT INTO teams (id, name, code, flag) VALUES
  ('KOR', 'Corea del Sur', 'KOR', '🇰🇷'),
  ('SUI', 'Suiza', 'SUI', '🇨🇭'),
  ('COL', 'Colombia', 'COL', '🇨🇴'),
  ('SRB', 'Serbia', 'SRB', '🇷🇸'),
  ('ECU', 'Ecuador', 'ECU', '🇪🇨'),
  ('WAL', 'Gales', 'WAL', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'),
  ('QAT', 'Catar', 'QAT', '🇶🇦'),
  ('IRN', 'Irán', 'IRN', '🇮🇷'),
  ('SAU', 'Arabia Saudita', 'SAU', '🇸🇦'),
  ('AUT', 'Austria', 'AUT', '🇦🇹'),
  ('CZE', 'República Checa', 'CZE', '🇨🇿'),
  ('CRC', 'Costa Rica', 'CRC', '🇨🇷'),
  ('PAR', 'Paraguay', 'PAR', '🇵🇾'),
  ('NGA', 'Nigeria', 'NGA', '🇳🇬'),
  ('EGY', 'Egipto', 'EGY', '🇪🇬'),
  ('CMR', 'Camerún', 'CMR', '🇨🇲');

-- Asignar equipos a los grupos I, J, K, L
INSERT INTO group_teams (group_id, team_id) VALUES
  -- Grupo I
  ('I', 'KOR'),
  ('I', 'SUI'),
  ('I', 'COL'),
  ('I', 'SRB'),
  -- Grupo J
  ('J', 'ECU'),
  ('J', 'WAL'),
  ('J', 'QAT'),
  ('J', 'IRN'),
  -- Grupo K
  ('K', 'SAU'),
  ('K', 'AUT'),
  ('K', 'CZE'),
  ('K', 'CRC'),
  -- Grupo L
  ('L', 'PAR'),
  ('L', 'NGA'),
  ('L', 'EGY'),
  ('L', 'CMR');

-- Crear partidos para el Grupo I
INSERT INTO matches (id, home_team_id, away_team_id, group_id, match_type, tournament_id, status) VALUES
  ('I_KOR_SUI', 'KOR', 'SUI', 'I', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('I_COL_SRB', 'COL', 'SRB', 'I', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('I_KOR_COL', 'KOR', 'COL', 'I', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('I_SUI_SRB', 'SUI', 'SRB', 'I', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('I_KOR_SRB', 'KOR', 'SRB', 'I', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('I_SUI_COL', 'SUI', 'COL', 'I', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled');

-- Crear partidos para el Grupo J
INSERT INTO matches (id, home_team_id, away_team_id, group_id, match_type, tournament_id, status) VALUES
  ('J_ECU_WAL', 'ECU', 'WAL', 'J', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('J_QAT_IRN', 'QAT', 'IRN', 'J', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('J_ECU_QAT', 'ECU', 'QAT', 'J', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('J_WAL_IRN', 'WAL', 'IRN', 'J', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('J_ECU_IRN', 'ECU', 'IRN', 'J', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('J_WAL_QAT', 'WAL', 'QAT', 'J', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled');

-- Crear partidos para el Grupo K
INSERT INTO matches (id, home_team_id, away_team_id, group_id, match_type, tournament_id, status) VALUES
  ('K_SAU_AUT', 'SAU', 'AUT', 'K', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('K_CZE_CRC', 'CZE', 'CRC', 'K', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('K_SAU_CZE', 'SAU', 'CZE', 'K', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('K_AUT_CRC', 'AUT', 'CRC', 'K', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('K_SAU_CRC', 'SAU', 'CRC', 'K', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('K_AUT_CZE', 'AUT', 'CZE', 'K', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled');

-- Crear partidos para el Grupo L
INSERT INTO matches (id, home_team_id, away_team_id, group_id, match_type, tournament_id, status) VALUES
  ('L_PAR_NGA', 'PAR', 'NGA', 'L', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('L_EGY_CMR', 'EGY', 'CMR', 'L', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('L_PAR_EGY', 'PAR', 'EGY', 'L', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('L_NGA_CMR', 'NGA', 'CMR', 'L', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('L_PAR_CMR', 'PAR', 'CMR', 'L', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('L_NGA_EGY', 'NGA', 'EGY', 'L', 'group', '11111111-1111-1111-1111-111111111111', 'scheduled');