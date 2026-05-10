-- Align fresh bootstrap tables with historical seed data.
-- Teams, groups and matches use readable text identifiers such as USA, A and A_USA_MEX.

ALTER TABLE public.group_teams
  DROP CONSTRAINT IF EXISTS group_teams_group_id_fkey,
  DROP CONSTRAINT IF EXISTS group_teams_team_id_fkey;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_group_id_fkey,
  DROP CONSTRAINT IF EXISTS matches_home_team_id_fkey,
  DROP CONSTRAINT IF EXISTS matches_away_team_id_fkey,
  DROP CONSTRAINT IF EXISTS matches_winner_team_id_fkey;

ALTER TABLE public.predictions
  DROP CONSTRAINT IF EXISTS predictions_match_id_fkey,
  DROP CONSTRAINT IF EXISTS predictions_predicted_winner_team_id_fkey;

ALTER TABLE public.champion_predictions
  DROP CONSTRAINT IF EXISTS champion_predictions_predicted_winner_team_id_fkey;

ALTER TABLE public.tournament_winners
  DROP CONSTRAINT IF EXISTS tournament_winners_winner_team_id_fkey;

ALTER TABLE public.group_teams
  ALTER COLUMN group_id TYPE text USING group_id::text,
  ALTER COLUMN team_id TYPE text USING team_id::text;

ALTER TABLE public.matches
  ALTER COLUMN id TYPE text USING id::text,
  ALTER COLUMN group_id TYPE text USING group_id::text,
  ALTER COLUMN home_team_id TYPE text USING home_team_id::text,
  ALTER COLUMN away_team_id TYPE text USING away_team_id::text,
  ALTER COLUMN winner_team_id TYPE text USING winner_team_id::text;

ALTER TABLE public.predictions
  ALTER COLUMN match_id TYPE text USING match_id::text,
  ALTER COLUMN predicted_winner_team_id TYPE text USING predicted_winner_team_id::text;

ALTER TABLE public.champion_predictions
  ALTER COLUMN predicted_winner_team_id TYPE text USING predicted_winner_team_id::text;

ALTER TABLE public.tournament_winners
  ALTER COLUMN winner_team_id TYPE text USING winner_team_id::text;

ALTER TABLE public.groups
  ALTER COLUMN id TYPE text USING id::text;

ALTER TABLE public.teams
  ALTER COLUMN id TYPE text USING id::text;

ALTER TABLE public.group_teams
  ADD CONSTRAINT group_teams_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE,
  ADD CONSTRAINT group_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL,
  ADD CONSTRAINT matches_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD CONSTRAINT matches_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD CONSTRAINT matches_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE,
  ADD CONSTRAINT predictions_predicted_winner_team_id_fkey FOREIGN KEY (predicted_winner_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

ALTER TABLE public.champion_predictions
  ADD CONSTRAINT champion_predictions_predicted_winner_team_id_fkey FOREIGN KEY (predicted_winner_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

ALTER TABLE public.tournament_winners
  ADD CONSTRAINT tournament_winners_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
