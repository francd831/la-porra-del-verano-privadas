-- Remove flags from all teams (set to empty string)
UPDATE teams SET flag = '' WHERE flag IS NOT NULL;

-- Delete all existing matches to recreate with correct teams
DELETE FROM matches WHERE tournament_id = '11111111-1111-1111-1111-111111111111';

-- Delete all existing predictions since matches will change
DELETE FROM predictions;

-- Delete all existing champion predictions 
DELETE FROM champion_predictions;

-- Delete all award predictions
DELETE FROM award_predictions;

-- Delete all user submissions to reset
DELETE FROM user_submissions;

-- Now insert all official World Cup 2026 group stage matches with correct dates
-- Dates are in UTC (Eastern Time + 4/5 hours depending on daylight saving)
-- Group A: Mexico, South Africa, South Korea, UEFA Playoff D
INSERT INTO matches (id, tournament_id, match_type, group_id, home_team_id, away_team_id, match_date, status, round) VALUES
  ('A_1', '11111111-1111-1111-1111-111111111111', 'group', 'A', 'MEX', 'ZAF', '2026-06-11 19:00:00+00', 'scheduled', 'Jornada 1'),
  ('A_2', '11111111-1111-1111-1111-111111111111', 'group', 'A', 'KOR', 'EURD', '2026-06-12 16:00:00+00', 'scheduled', 'Jornada 1'),
  ('A_3', '11111111-1111-1111-1111-111111111111', 'group', 'A', 'MEX', 'KOR', '2026-06-17 01:00:00+00', 'scheduled', 'Jornada 2'),
  ('A_4', '11111111-1111-1111-1111-111111111111', 'group', 'A', 'EURD', 'ZAF', '2026-06-17 22:00:00+00', 'scheduled', 'Jornada 2'),
  ('A_5', '11111111-1111-1111-1111-111111111111', 'group', 'A', 'ZAF', 'KOR', '2026-06-22 01:00:00+00', 'scheduled', 'Jornada 3'),
  ('A_6', '11111111-1111-1111-1111-111111111111', 'group', 'A', 'EURD', 'MEX', '2026-06-22 01:00:00+00', 'scheduled', 'Jornada 3');

-- Group B: Canada, UEFA Playoff A, Qatar, Switzerland
INSERT INTO matches (id, tournament_id, match_type, group_id, home_team_id, away_team_id, match_date, status, round) VALUES
  ('B_1', '11111111-1111-1111-1111-111111111111', 'group', 'B', 'CAN', 'EURA', '2026-06-12 19:00:00+00', 'scheduled', 'Jornada 1'),
  ('B_2', '11111111-1111-1111-1111-111111111111', 'group', 'B', 'QAT', 'SUI', '2026-06-13 19:00:00+00', 'scheduled', 'Jornada 1'),
  ('B_3', '11111111-1111-1111-1111-111111111111', 'group', 'B', 'CAN', 'QAT', '2026-06-17 22:00:00+00', 'scheduled', 'Jornada 2'),
  ('B_4', '11111111-1111-1111-1111-111111111111', 'group', 'B', 'SUI', 'EURA', '2026-06-18 19:00:00+00', 'scheduled', 'Jornada 2'),
  ('B_5', '11111111-1111-1111-1111-111111111111', 'group', 'B', 'SUI', 'CAN', '2026-06-22 19:00:00+00', 'scheduled', 'Jornada 3'),
  ('B_6', '11111111-1111-1111-1111-111111111111', 'group', 'B', 'EURA', 'QAT', '2026-06-22 19:00:00+00', 'scheduled', 'Jornada 3');

-- Group C: Brazil, Morocco, Haiti, Scotland
INSERT INTO matches (id, tournament_id, match_type, group_id, home_team_id, away_team_id, match_date, status, round) VALUES
  ('C_1', '11111111-1111-1111-1111-111111111111', 'group', 'C', 'HAI', 'SCO', '2026-06-12 01:00:00+00', 'scheduled', 'Jornada 1'),
  ('C_2', '11111111-1111-1111-1111-111111111111', 'group', 'C', 'BRA', 'MAR', '2026-06-13 22:00:00+00', 'scheduled', 'Jornada 1'),
  ('C_3', '11111111-1111-1111-1111-111111111111', 'group', 'C', 'BRA', 'HAI', '2026-06-18 01:00:00+00', 'scheduled', 'Jornada 2'),
  ('C_4', '11111111-1111-1111-1111-111111111111', 'group', 'C', 'SCO', 'MAR', '2026-06-18 22:00:00+00', 'scheduled', 'Jornada 2'),
  ('C_5', '11111111-1111-1111-1111-111111111111', 'group', 'C', 'MAR', 'HAI', '2026-06-23 22:00:00+00', 'scheduled', 'Jornada 3'),
  ('C_6', '11111111-1111-1111-1111-111111111111', 'group', 'C', 'SCO', 'BRA', '2026-06-23 22:00:00+00', 'scheduled', 'Jornada 3');

-- Group D: USA, Paraguay, Australia, UEFA Playoff C
INSERT INTO matches (id, tournament_id, match_type, group_id, home_team_id, away_team_id, match_date, status, round) VALUES
  ('D_1', '11111111-1111-1111-1111-111111111111', 'group', 'D', 'USA', 'PAR', '2026-06-13 01:00:00+00', 'scheduled', 'Jornada 1'),
  ('D_2', '11111111-1111-1111-1111-111111111111', 'group', 'D', 'AUS', 'EURC', '2026-06-13 04:00:00+00', 'scheduled', 'Jornada 1'),
  ('D_3', '11111111-1111-1111-1111-111111111111', 'group', 'D', 'USA', 'AUS', '2026-06-18 19:00:00+00', 'scheduled', 'Jornada 2'),
  ('D_4', '11111111-1111-1111-1111-111111111111', 'group', 'D', 'EURC', 'PAR', '2026-06-19 04:00:00+00', 'scheduled', 'Jornada 2'),
  ('D_5', '11111111-1111-1111-1111-111111111111', 'group', 'D', 'PAR', 'AUS', '2026-06-24 02:00:00+00', 'scheduled', 'Jornada 3'),
  ('D_6', '11111111-1111-1111-1111-111111111111', 'group', 'D', 'EURC', 'USA', '2026-06-24 02:00:00+00', 'scheduled', 'Jornada 3');

-- Group E: Germany, Curacao, Ivory Coast, Ecuador
INSERT INTO matches (id, tournament_id, match_type, group_id, home_team_id, away_team_id, match_date, status, round) VALUES
  ('E_1', '11111111-1111-1111-1111-111111111111', 'group', 'E', 'GER', 'CUR', '2026-06-14 17:00:00+00', 'scheduled', 'Jornada 1'),
  ('E_2', '11111111-1111-1111-1111-111111111111', 'group', 'E', 'CIV', 'ECU', '2026-06-14 23:00:00+00', 'scheduled', 'Jornada 1'),
  ('E_3', '11111111-1111-1111-1111-111111111111', 'group', 'E', 'GER', 'CIV', '2026-06-19 20:00:00+00', 'scheduled', 'Jornada 2'),
  ('E_4', '11111111-1111-1111-1111-111111111111', 'group', 'E', 'ECU', 'CUR', '2026-06-20 00:00:00+00', 'scheduled', 'Jornada 2'),
  ('E_5', '11111111-1111-1111-1111-111111111111', 'group', 'E', 'ECU', 'GER', '2026-06-24 20:00:00+00', 'scheduled', 'Jornada 3'),
  ('E_6', '11111111-1111-1111-1111-111111111111', 'group', 'E', 'CUR', 'CIV', '2026-06-24 20:00:00+00', 'scheduled', 'Jornada 3');

-- Group F: Netherlands, Japan, UEFA Playoff B, Tunisia
INSERT INTO matches (id, tournament_id, match_type, group_id, home_team_id, away_team_id, match_date, status, round) VALUES
  ('F_1', '11111111-1111-1111-1111-111111111111', 'group', 'F', 'NED', 'JPN', '2026-06-14 20:00:00+00', 'scheduled', 'Jornada 1'),
  ('F_2', '11111111-1111-1111-1111-111111111111', 'group', 'F', 'EURB', 'TUN', '2026-06-15 02:00:00+00', 'scheduled', 'Jornada 1'),
  ('F_3', '11111111-1111-1111-1111-111111111111', 'group', 'F', 'NED', 'EURB', '2026-06-20 04:00:00+00', 'scheduled', 'Jornada 2'),
  ('F_4', '11111111-1111-1111-1111-111111111111', 'group', 'F', 'TUN', 'JPN', '2026-06-20 04:00:00+00', 'scheduled', 'Jornada 2'),
  ('F_5', '11111111-1111-1111-1111-111111111111', 'group', 'F', 'TUN', 'NED', '2026-06-24 23:00:00+00', 'scheduled', 'Jornada 3'),
  ('F_6', '11111111-1111-1111-1111-111111111111', 'group', 'F', 'JPN', 'EURB', '2026-06-24 23:00:00+00', 'scheduled', 'Jornada 3');

-- Group G: Belgium, Egypt, Iran, New Zealand
INSERT INTO matches (id, tournament_id, match_type, group_id, home_team_id, away_team_id, match_date, status, round) VALUES
  ('G_1', '11111111-1111-1111-1111-111111111111', 'group', 'G', 'BEL', 'EGY', '2026-06-16 19:00:00+00', 'scheduled', 'Jornada 1'),
  ('G_2', '11111111-1111-1111-1111-111111111111', 'group', 'G', 'IRN', 'NZL', '2026-06-16 01:00:00+00', 'scheduled', 'Jornada 1'),
  ('G_3', '11111111-1111-1111-1111-111111111111', 'group', 'G', 'BEL', 'IRN', '2026-06-21 19:00:00+00', 'scheduled', 'Jornada 2'),
  ('G_4', '11111111-1111-1111-1111-111111111111', 'group', 'G', 'NZL', 'EGY', '2026-06-22 01:00:00+00', 'scheduled', 'Jornada 2'),
  ('G_5', '11111111-1111-1111-1111-111111111111', 'group', 'G', 'NZL', 'BEL', '2026-06-26 03:00:00+00', 'scheduled', 'Jornada 3'),
  ('G_6', '11111111-1111-1111-1111-111111111111', 'group', 'G', 'EGY', 'IRN', '2026-06-26 03:00:00+00', 'scheduled', 'Jornada 3');

-- Group H: Spain, Cape Verde, Saudi Arabia, Uruguay
INSERT INTO matches (id, tournament_id, match_type, group_id, home_team_id, away_team_id, match_date, status, round) VALUES
  ('H_1', '11111111-1111-1111-1111-111111111111', 'group', 'H', 'ESP', 'CPV', '2026-06-15 16:00:00+00', 'scheduled', 'Jornada 1'),
  ('H_2', '11111111-1111-1111-1111-111111111111', 'group', 'H', 'SAU', 'URU', '2026-06-15 22:00:00+00', 'scheduled', 'Jornada 1'),
  ('H_3', '11111111-1111-1111-1111-111111111111', 'group', 'H', 'ESP', 'SAU', '2026-06-20 16:00:00+00', 'scheduled', 'Jornada 2'),
  ('H_4', '11111111-1111-1111-1111-111111111111', 'group', 'H', 'URU', 'CPV', '2026-06-20 22:00:00+00', 'scheduled', 'Jornada 2'),
  ('H_5', '11111111-1111-1111-1111-111111111111', 'group', 'H', 'CPV', 'SAU', '2026-06-25 00:00:00+00', 'scheduled', 'Jornada 3'),
  ('H_6', '11111111-1111-1111-1111-111111111111', 'group', 'H', 'URU', 'ESP', '2026-06-25 00:00:00+00', 'scheduled', 'Jornada 3');

-- Group I: France, Senegal, FIFA Playoff 2, Norway
INSERT INTO matches (id, tournament_id, match_type, group_id, home_team_id, away_team_id, match_date, status, round) VALUES
  ('I_1', '11111111-1111-1111-1111-111111111111', 'group', 'I', 'FRA', 'SEN', '2026-06-16 19:00:00+00', 'scheduled', 'Jornada 1'),
  ('I_2', '11111111-1111-1111-1111-111111111111', 'group', 'I', 'PLY2', 'NOR', '2026-06-16 22:00:00+00', 'scheduled', 'Jornada 1'),
  ('I_3', '11111111-1111-1111-1111-111111111111', 'group', 'I', 'FRA', 'PLY2', '2026-06-21 22:00:00+00', 'scheduled', 'Jornada 2'),
  ('I_4', '11111111-1111-1111-1111-111111111111', 'group', 'I', 'NOR', 'SEN', '2026-06-22 00:00:00+00', 'scheduled', 'Jornada 2'),
  ('I_5', '11111111-1111-1111-1111-111111111111', 'group', 'I', 'SEN', 'PLY2', '2026-06-26 21:00:00+00', 'scheduled', 'Jornada 3'),
  ('I_6', '11111111-1111-1111-1111-111111111111', 'group', 'I', 'NOR', 'FRA', '2026-06-26 19:00:00+00', 'scheduled', 'Jornada 3');

-- Group J: Argentina, Algeria, Austria, Jordan
INSERT INTO matches (id, tournament_id, match_type, group_id, home_team_id, away_team_id, match_date, status, round) VALUES
  ('J_1', '11111111-1111-1111-1111-111111111111', 'group', 'J', 'ARG', 'ALG', '2026-06-17 01:00:00+00', 'scheduled', 'Jornada 1'),
  ('J_2', '11111111-1111-1111-1111-111111111111', 'group', 'J', 'AUT', 'JOR', '2026-06-17 04:00:00+00', 'scheduled', 'Jornada 1'),
  ('J_3', '11111111-1111-1111-1111-111111111111', 'group', 'J', 'ARG', 'AUT', '2026-06-22 17:00:00+00', 'scheduled', 'Jornada 2'),
  ('J_4', '11111111-1111-1111-1111-111111111111', 'group', 'J', 'JOR', 'ALG', '2026-06-22 03:00:00+00', 'scheduled', 'Jornada 2'),
  ('J_5', '11111111-1111-1111-1111-111111111111', 'group', 'J', 'ALG', 'AUT', '2026-06-27 02:00:00+00', 'scheduled', 'Jornada 3'),
  ('J_6', '11111111-1111-1111-1111-111111111111', 'group', 'J', 'JOR', 'ARG', '2026-06-27 02:00:00+00', 'scheduled', 'Jornada 3');

-- Group K: Portugal, FIFA Playoff 1, Uzbekistan, Colombia
INSERT INTO matches (id, tournament_id, match_type, group_id, home_team_id, away_team_id, match_date, status, round) VALUES
  ('K_1', '11111111-1111-1111-1111-111111111111', 'group', 'K', 'POR', 'PLY1', '2026-06-17 17:00:00+00', 'scheduled', 'Jornada 1'),
  ('K_2', '11111111-1111-1111-1111-111111111111', 'group', 'K', 'UZB', 'COL', '2026-06-18 02:00:00+00', 'scheduled', 'Jornada 1'),
  ('K_3', '11111111-1111-1111-1111-111111111111', 'group', 'K', 'POR', 'UZB', '2026-06-23 17:00:00+00', 'scheduled', 'Jornada 2'),
  ('K_4', '11111111-1111-1111-1111-111111111111', 'group', 'K', 'COL', 'PLY1', '2026-06-23 17:00:00+00', 'scheduled', 'Jornada 2'),
  ('K_5', '11111111-1111-1111-1111-111111111111', 'group', 'K', 'COL', 'POR', '2026-06-27 23:30:00+00', 'scheduled', 'Jornada 3'),
  ('K_6', '11111111-1111-1111-1111-111111111111', 'group', 'K', 'PLY1', 'UZB', '2026-06-27 23:30:00+00', 'scheduled', 'Jornada 3');

-- Group L: England, Croatia, Ghana, Panama
INSERT INTO matches (id, tournament_id, match_type, group_id, home_team_id, away_team_id, match_date, status, round) VALUES
  ('L_1', '11111111-1111-1111-1111-111111111111', 'group', 'L', 'ENG', 'CRO', '2026-06-17 20:00:00+00', 'scheduled', 'Jornada 1'),
  ('L_2', '11111111-1111-1111-1111-111111111111', 'group', 'L', 'GHA', 'PAN', '2026-06-17 23:00:00+00', 'scheduled', 'Jornada 1'),
  ('L_3', '11111111-1111-1111-1111-111111111111', 'group', 'L', 'ENG', 'GHA', '2026-06-23 20:00:00+00', 'scheduled', 'Jornada 2'),
  ('L_4', '11111111-1111-1111-1111-111111111111', 'group', 'L', 'PAN', 'CRO', '2026-06-23 23:00:00+00', 'scheduled', 'Jornada 2'),
  ('L_5', '11111111-1111-1111-1111-111111111111', 'group', 'L', 'PAN', 'ENG', '2026-06-27 21:00:00+00', 'scheduled', 'Jornada 3'),
  ('L_6', '11111111-1111-1111-1111-111111111111', 'group', 'L', 'CRO', 'GHA', '2026-06-27 21:00:00+00', 'scheduled', 'Jornada 3');