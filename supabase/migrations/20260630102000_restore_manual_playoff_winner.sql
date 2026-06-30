-- Knockout winners must remain controllable independently from the score.
-- Some feeds or manual entries can represent the qualified team separately
-- from the raw goals, so do not derive winner_team_id blindly from goals.

DROP TRIGGER IF EXISTS set_playoff_winner_from_score_trigger ON public.matches;
DROP FUNCTION IF EXISTS public.set_playoff_winner_from_score();

UPDATE public.matches
SET home_goals = 1,
    away_goals = 1,
    winner_team_id = 'PAR',
    updated_at = now()
WHERE id = 'R32_2';

UPDATE public.matches
SET home_team_id = 'PAR',
    updated_at = now()
WHERE id = 'R16_1';

SELECT public.update_all_user_points('11111111-1111-1111-1111-111111111111'::uuid);
