-- Dates/external ids for the 2026 World Cup knockout stage and live winner propagation.

UPDATE public.matches SET match_date='2026-06-28T19:00:00Z', external_id=537417 WHERE id='R32_1';
UPDATE public.matches SET match_date='2026-06-29T20:30:00Z', external_id=537415 WHERE id='R32_2';
UPDATE public.matches SET match_date='2026-06-30T01:00:00Z', external_id=537418 WHERE id='R32_3';
UPDATE public.matches SET match_date='2026-06-29T17:00:00Z', external_id=537423 WHERE id='R32_4';
UPDATE public.matches SET match_date='2026-06-30T21:00:00Z', external_id=537416 WHERE id='R32_5';
UPDATE public.matches SET match_date='2026-06-30T17:00:00Z', external_id=537424 WHERE id='R32_6';
UPDATE public.matches SET match_date='2026-07-01T01:00:00Z', external_id=537425 WHERE id='R32_7';
UPDATE public.matches SET match_date='2026-07-01T16:00:00Z', external_id=537426 WHERE id='R32_8';
UPDATE public.matches SET match_date='2026-07-02T00:00:00Z', external_id=537421 WHERE id='R32_9';
UPDATE public.matches SET match_date='2026-07-01T20:00:00Z', external_id=537422 WHERE id='R32_10';
UPDATE public.matches SET match_date='2026-07-02T23:00:00Z', external_id=537419 WHERE id='R32_11';
UPDATE public.matches SET match_date='2026-07-02T19:00:00Z', external_id=537420 WHERE id='R32_12';
UPDATE public.matches SET match_date='2026-07-03T03:00:00Z', external_id=537429 WHERE id='R32_13';
UPDATE public.matches SET match_date='2026-07-03T22:00:00Z', external_id=537427 WHERE id='R32_14';
UPDATE public.matches SET match_date='2026-07-04T01:30:00Z', external_id=537430 WHERE id='R32_15';
UPDATE public.matches SET match_date='2026-07-03T18:00:00Z', external_id=537428 WHERE id='R32_16';

UPDATE public.matches SET match_date='2026-07-04T21:00:00Z', external_id=537375 WHERE id='R16_1';
UPDATE public.matches SET match_date='2026-07-04T17:00:00Z', external_id=537376 WHERE id='R16_2';
UPDATE public.matches SET match_date='2026-07-05T20:00:00Z', external_id=537377 WHERE id='R16_3';
UPDATE public.matches SET match_date='2026-07-06T00:00:00Z', external_id=537378 WHERE id='R16_4';
UPDATE public.matches SET match_date='2026-07-06T19:00:00Z', external_id=537379 WHERE id='R16_5';
UPDATE public.matches SET match_date='2026-07-07T00:00:00Z', external_id=537380 WHERE id='R16_6';
UPDATE public.matches SET match_date='2026-07-07T16:00:00Z', external_id=537381 WHERE id='R16_7';
UPDATE public.matches SET match_date='2026-07-07T20:00:00Z', external_id=537382 WHERE id='R16_8';

UPDATE public.matches SET match_date='2026-07-09T20:00:00Z', external_id=537383 WHERE id='QF_1';
UPDATE public.matches SET match_date='2026-07-10T19:00:00Z', external_id=537384 WHERE id='QF_2';
UPDATE public.matches SET match_date='2026-07-11T21:00:00Z', external_id=537385 WHERE id='QF_3';
UPDATE public.matches SET match_date='2026-07-12T01:00:00Z', external_id=537386 WHERE id='QF_4';

UPDATE public.matches SET match_date='2026-07-14T19:00:00Z', external_id=537387 WHERE id='SF_1';
UPDATE public.matches SET match_date='2026-07-15T19:00:00Z', external_id=537388 WHERE id='SF_2';
UPDATE public.matches SET match_date='2026-07-19T19:00:00Z', external_id=537390 WHERE id='FINAL_1';

CREATE OR REPLACE FUNCTION public.get_playoff_next_slot(p_match_id text)
RETURNS TABLE(target_match_id text, target_column text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT target_match_id, target_column
  FROM (VALUES
    ('R32_1', 'R16_2', 'home_team_id'),
    ('R32_2', 'R16_1', 'home_team_id'),
    ('R32_3', 'R16_2', 'away_team_id'),
    ('R32_4', 'R16_3', 'home_team_id'),
    ('R32_5', 'R16_1', 'away_team_id'),
    ('R32_6', 'R16_3', 'away_team_id'),
    ('R32_7', 'R16_4', 'home_team_id'),
    ('R32_8', 'R16_4', 'away_team_id'),
    ('R32_9', 'R16_6', 'home_team_id'),
    ('R32_10', 'R16_6', 'away_team_id'),
    ('R32_11', 'R16_5', 'home_team_id'),
    ('R32_12', 'R16_5', 'away_team_id'),
    ('R32_13', 'R16_8', 'home_team_id'),
    ('R32_14', 'R16_7', 'home_team_id'),
    ('R32_15', 'R16_8', 'away_team_id'),
    ('R32_16', 'R16_7', 'away_team_id'),
    ('R16_1', 'QF_1', 'home_team_id'),
    ('R16_2', 'QF_1', 'away_team_id'),
    ('R16_3', 'QF_3', 'home_team_id'),
    ('R16_4', 'QF_3', 'away_team_id'),
    ('R16_5', 'QF_2', 'home_team_id'),
    ('R16_6', 'QF_2', 'away_team_id'),
    ('R16_7', 'QF_4', 'home_team_id'),
    ('R16_8', 'QF_4', 'away_team_id'),
    ('QF_1', 'SF_1', 'home_team_id'),
    ('QF_2', 'SF_1', 'away_team_id'),
    ('QF_3', 'SF_2', 'home_team_id'),
    ('QF_4', 'SF_2', 'away_team_id'),
    ('SF_1', 'FINAL_1', 'home_team_id'),
    ('SF_2', 'FINAL_1', 'away_team_id')
  ) AS mapping(source_match_id, target_match_id, target_column)
  WHERE source_match_id = p_match_id;
$function$;

CREATE OR REPLACE FUNCTION public.apply_playoff_live_advancement(
  p_match_id text,
  p_winner_team_id text,
  p_previous_winner_team_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_target_match_id text;
  v_target_column text;
BEGIN
  SELECT target_match_id, target_column
  INTO v_target_match_id, v_target_column
  FROM public.get_playoff_next_slot(p_match_id)
  LIMIT 1;

  IF v_target_match_id IS NULL THEN
    RETURN;
  END IF;

  IF v_target_column = 'home_team_id' THEN
    UPDATE public.matches
    SET home_team_id = p_winner_team_id,
        updated_at = now()
    WHERE id = v_target_match_id
      AND (
        p_winner_team_id IS NOT NULL
        OR home_team_id IS NULL
        OR home_team_id = p_previous_winner_team_id
      );
  ELSE
    UPDATE public.matches
    SET away_team_id = p_winner_team_id,
        updated_at = now()
    WHERE id = v_target_match_id
      AND (
        p_winner_team_id IS NOT NULL
        OR away_team_id IS NULL
        OR away_team_id = p_previous_winner_team_id
      );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_update_points_on_match_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.match_type = 'group'
     AND NEW.status IN ('in_progress', 'completed')
     AND (
       OLD.status IS DISTINCT FROM NEW.status OR
       OLD.home_goals IS DISTINCT FROM NEW.home_goals OR
       OLD.away_goals IS DISTINCT FROM NEW.away_goals
     ) THEN
    PERFORM public.update_all_user_points_internal(NEW.tournament_id, false);
    PERFORM public.refresh_match_score_breakdown(NEW.id);
  ELSIF NEW.match_type = 'playoff'
     AND (
       OLD.status IS DISTINCT FROM NEW.status OR
       OLD.home_goals IS DISTINCT FROM NEW.home_goals OR
       OLD.away_goals IS DISTINCT FROM NEW.away_goals OR
       OLD.home_team_id IS DISTINCT FROM NEW.home_team_id OR
       OLD.away_team_id IS DISTINCT FROM NEW.away_team_id OR
       OLD.winner_team_id IS DISTINCT FROM NEW.winner_team_id
     ) THEN
    PERFORM public.apply_playoff_live_advancement(NEW.id, NEW.winner_team_id, OLD.winner_team_id);

    IF NEW.round = 'Final'
       AND NEW.status = 'completed'
       AND NEW.winner_team_id IS NOT NULL THEN
      INSERT INTO public.tournament_winners (tournament_id, winner_team_id)
      VALUES (NEW.tournament_id, NEW.winner_team_id)
      ON CONFLICT (tournament_id)
      DO UPDATE SET winner_team_id = EXCLUDED.winner_team_id;
    END IF;

    PERFORM public.update_all_user_points_internal(NEW.tournament_id, false);
  END IF;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_playoff_next_slot(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_playoff_next_slot(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_playoff_live_advancement(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_playoff_live_advancement(text, text, text) TO service_role;
