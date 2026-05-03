-- First, add new teams that don't exist yet
INSERT INTO teams (id, name, code, flag) VALUES
  ('ZAF', 'Sudáfrica', 'ZAF', '🇿🇦'),
  ('HAI', 'Haití', 'HAI', '🇭🇹'),
  ('SCO', 'Escocia', 'SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'),
  ('CUR', 'Curazao', 'CUR', '🇨🇼'),
  ('CIV', 'Costa de Marfil', 'CIV', '🇨🇮'),
  ('CPV', 'Cabo Verde', 'CPV', '🇨🇻'),
  ('NOR', 'Noruega', 'NOR', '🇳🇴'),
  ('ALG', 'Argelia', 'ALG', '🇩🇿'),
  ('JOR', 'Jordania', 'JOR', '🇯🇴'),
  ('UZB', 'Uzbekistán', 'UZB', '🇺🇿'),
  ('PAN', 'Panamá', 'PAN', '🇵🇦'),
  ('PLY1', 'Playoff FIFA 1', 'PLY1', '🏳️'),
  ('PLY2', 'Playoff FIFA 2', 'PLY2', '🏳️'),
  ('EURA', 'Playoff Europa A', 'EURA', '🇪🇺'),
  ('EURB', 'Playoff Europa B', 'EURB', '🇪🇺'),
  ('EURC', 'Playoff Europa C', 'EURC', '🇪🇺'),
  ('EURD', 'Playoff Europa D', 'EURD', '🇪🇺')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, flag = EXCLUDED.flag;

-- Update existing teams that might have different names
UPDATE teams SET name = 'Estados Unidos', code = 'USA', flag = '🇺🇸' WHERE id = 'USA';
UPDATE teams SET name = 'México', code = 'MEX', flag = '🇲🇽' WHERE id = 'MEX';
UPDATE teams SET name = 'Canadá', code = 'CAN', flag = '🇨🇦' WHERE id = 'CAN';
UPDATE teams SET name = 'Brasil', code = 'BRA', flag = '🇧🇷' WHERE id = 'BRA';
UPDATE teams SET name = 'Marruecos', code = 'MAR', flag = '🇲🇦' WHERE id = 'MAR';
UPDATE teams SET name = 'Paraguay', code = 'PAR', flag = '🇵🇾' WHERE id = 'PAR';
UPDATE teams SET name = 'Australia', code = 'AUS', flag = '🇦🇺' WHERE id = 'AUS';
UPDATE teams SET name = 'Alemania', code = 'GER', flag = '🇩🇪' WHERE id = 'GER';
UPDATE teams SET name = 'Ecuador', code = 'ECU', flag = '🇪🇨' WHERE id = 'ECU';
UPDATE teams SET name = 'Países Bajos', code = 'NED', flag = '🇳🇱' WHERE id = 'NED';
UPDATE teams SET name = 'Japón', code = 'JPN', flag = '🇯🇵' WHERE id = 'JPN';
UPDATE teams SET name = 'Túnez', code = 'TUN', flag = '🇹🇳' WHERE id = 'TUN';
UPDATE teams SET name = 'Bélgica', code = 'BEL', flag = '🇧🇪' WHERE id = 'BEL';
UPDATE teams SET name = 'Egipto', code = 'EGY', flag = '🇪🇬' WHERE id = 'EGY';
UPDATE teams SET name = 'Irán', code = 'IRN', flag = '🇮🇷' WHERE id = 'IRN';
UPDATE teams SET name = 'Nueva Zelanda', code = 'NZL', flag = '🇳🇿' WHERE id = 'NZL';
UPDATE teams SET name = 'España', code = 'ESP', flag = '🇪🇸' WHERE id = 'ESP';
UPDATE teams SET name = 'Arabia Saudita', code = 'SAU', flag = '🇸🇦' WHERE id = 'SAU';
UPDATE teams SET name = 'Uruguay', code = 'URU', flag = '🇺🇾' WHERE id = 'URU';
UPDATE teams SET name = 'Francia', code = 'FRA', flag = '🇫🇷' WHERE id = 'FRA';
UPDATE teams SET name = 'Senegal', code = 'SEN', flag = '🇸🇳' WHERE id = 'SEN';
UPDATE teams SET name = 'Argentina', code = 'ARG', flag = '🇦🇷' WHERE id = 'ARG';
UPDATE teams SET name = 'Austria', code = 'AUT', flag = '🇦🇹' WHERE id = 'AUT';
UPDATE teams SET name = 'Portugal', code = 'POR', flag = '🇵🇹' WHERE id = 'POR';
UPDATE teams SET name = 'Colombia', code = 'COL', flag = '🇨🇴' WHERE id = 'COL';
UPDATE teams SET name = 'Inglaterra', code = 'ENG', flag = '🏴󠁧󠁢󠁥󠁮󠁧󠁿' WHERE id = 'ENG';
UPDATE teams SET name = 'Croacia', code = 'CRO', flag = '🇭🇷' WHERE id = 'CRO';
UPDATE teams SET name = 'Ghana', code = 'GHA', flag = '🇬🇭' WHERE id = 'GHA';
UPDATE teams SET name = 'Corea del Sur', code = 'KOR', flag = '🇰🇷' WHERE id = 'KOR';
UPDATE teams SET name = 'Catar', code = 'QAT', flag = '🇶🇦' WHERE id = 'QAT';
UPDATE teams SET name = 'Suiza', code = 'SUI', flag = '🇨🇭' WHERE id = 'SUI';

-- Clear old group assignments
DELETE FROM group_teams;

-- Update/Create groups (A to L for 48-team format)
INSERT INTO groups (id, name, tournament_id) VALUES
  ('A', 'Grupo A', '11111111-1111-1111-1111-111111111111'),
  ('B', 'Grupo B', '11111111-1111-1111-1111-111111111111'),
  ('C', 'Grupo C', '11111111-1111-1111-1111-111111111111'),
  ('D', 'Grupo D', '11111111-1111-1111-1111-111111111111'),
  ('E', 'Grupo E', '11111111-1111-1111-1111-111111111111'),
  ('F', 'Grupo F', '11111111-1111-1111-1111-111111111111'),
  ('G', 'Grupo G', '11111111-1111-1111-1111-111111111111'),
  ('H', 'Grupo H', '11111111-1111-1111-1111-111111111111'),
  ('I', 'Grupo I', '11111111-1111-1111-1111-111111111111'),
  ('J', 'Grupo J', '11111111-1111-1111-1111-111111111111'),
  ('K', 'Grupo K', '11111111-1111-1111-1111-111111111111'),
  ('L', 'Grupo L', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Assign teams to official FIFA World Cup 2026 groups
-- Group A: Mexico, South Africa, South Korea, Euro Playoff D
INSERT INTO group_teams (group_id, team_id) VALUES
  ('A', 'MEX'),
  ('A', 'ZAF'),
  ('A', 'KOR'),
  ('A', 'EURD');

-- Group B: Canada, Euro Playoff A, Qatar, Switzerland
INSERT INTO group_teams (group_id, team_id) VALUES
  ('B', 'CAN'),
  ('B', 'EURA'),
  ('B', 'QAT'),
  ('B', 'SUI');

-- Group C: Brazil, Morocco, Haiti, Scotland
INSERT INTO group_teams (group_id, team_id) VALUES
  ('C', 'BRA'),
  ('C', 'MAR'),
  ('C', 'HAI'),
  ('C', 'SCO');

-- Group D: USA, Paraguay, Australia, Euro Playoff C
INSERT INTO group_teams (group_id, team_id) VALUES
  ('D', 'USA'),
  ('D', 'PAR'),
  ('D', 'AUS'),
  ('D', 'EURC');

-- Group E: Germany, Curacao, Ivory Coast, Ecuador
INSERT INTO group_teams (group_id, team_id) VALUES
  ('E', 'GER'),
  ('E', 'CUR'),
  ('E', 'CIV'),
  ('E', 'ECU');

-- Group F: Netherlands, Japan, Euro Playoff B, Tunisia
INSERT INTO group_teams (group_id, team_id) VALUES
  ('F', 'NED'),
  ('F', 'JPN'),
  ('F', 'EURB'),
  ('F', 'TUN');

-- Group G: Belgium, Egypt, Iran, New Zealand
INSERT INTO group_teams (group_id, team_id) VALUES
  ('G', 'BEL'),
  ('G', 'EGY'),
  ('G', 'IRN'),
  ('G', 'NZL');

-- Group H: Spain, Cape Verde, Saudi Arabia, Uruguay
INSERT INTO group_teams (group_id, team_id) VALUES
  ('H', 'ESP'),
  ('H', 'CPV'),
  ('H', 'SAU'),
  ('H', 'URU');

-- Group I: France, Senegal, FIFA Playoff 2, Norway
INSERT INTO group_teams (group_id, team_id) VALUES
  ('I', 'FRA'),
  ('I', 'SEN'),
  ('I', 'PLY2'),
  ('I', 'NOR');

-- Group J: Argentina, Algeria, Austria, Jordan
INSERT INTO group_teams (group_id, team_id) VALUES
  ('J', 'ARG'),
  ('J', 'ALG'),
  ('J', 'AUT'),
  ('J', 'JOR');

-- Group K: Portugal, FIFA Playoff 1, Uzbekistan, Colombia
INSERT INTO group_teams (group_id, team_id) VALUES
  ('K', 'POR'),
  ('K', 'PLY1'),
  ('K', 'UZB'),
  ('K', 'COL');

-- Group L: England, Croatia, Ghana, Panama
INSERT INTO group_teams (group_id, team_id) VALUES
  ('L', 'ENG'),
  ('L', 'CRO'),
  ('L', 'GHA'),
  ('L', 'PAN');