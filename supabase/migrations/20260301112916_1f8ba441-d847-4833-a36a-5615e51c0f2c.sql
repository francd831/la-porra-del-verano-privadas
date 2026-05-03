-- Insert missing playoff matches (R16, QF, SF, Final)
INSERT INTO matches (id, round, match_type, tournament_id, status)
VALUES
  ('R16_1', 'Octavos de Final', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('R16_2', 'Octavos de Final', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('R16_3', 'Octavos de Final', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('R16_4', 'Octavos de Final', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('R16_5', 'Octavos de Final', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('R16_6', 'Octavos de Final', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('R16_7', 'Octavos de Final', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('R16_8', 'Octavos de Final', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('QF_1', 'Cuartos de Final', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('QF_2', 'Cuartos de Final', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('QF_3', 'Cuartos de Final', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('QF_4', 'Cuartos de Final', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('SF_1', 'Semifinales', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('SF_2', 'Semifinales', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled'),
  ('F_1', 'Final', 'playoff', '11111111-1111-1111-1111-111111111111', 'scheduled')
ON CONFLICT (id) DO NOTHING;