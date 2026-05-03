-- Create the 16 Round of 32 (Dieciseisavos de Final) matches
-- These will be populated with teams once groups are complete
-- Match dates: June 28-July 1, 2026

INSERT INTO public.matches (id, tournament_id, match_type, round, status, match_date, home_team_id, away_team_id) VALUES
-- June 28, 2026 - 4 matches
('R32-1', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-06-28 13:00:00+00', NULL, NULL),
('R32-2', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-06-28 16:00:00+00', NULL, NULL),
('R32-3', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-06-28 19:00:00+00', NULL, NULL),
('R32-4', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-06-28 22:00:00+00', NULL, NULL),

-- June 29, 2026 - 4 matches
('R32-5', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-06-29 13:00:00+00', NULL, NULL),
('R32-6', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-06-29 16:00:00+00', NULL, NULL),
('R32-7', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-06-29 19:00:00+00', NULL, NULL),
('R32-8', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-06-29 22:00:00+00', NULL, NULL),

-- June 30, 2026 - 4 matches
('R32-9', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-06-30 13:00:00+00', NULL, NULL),
('R32-10', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-06-30 16:00:00+00', NULL, NULL),
('R32-11', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-06-30 19:00:00+00', NULL, NULL),
('R32-12', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-06-30 22:00:00+00', NULL, NULL),

-- July 1, 2026 - 4 matches
('R32-13', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-07-01 13:00:00+00', NULL, NULL),
('R32-14', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-07-01 16:00:00+00', NULL, NULL),
('R32-15', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-07-01 19:00:00+00', NULL, NULL),
('R32-16', '11111111-1111-1111-1111-111111111111', 'playoff', 'round_of_32', 'scheduled', '2026-07-01 22:00:00+00', NULL, NULL);