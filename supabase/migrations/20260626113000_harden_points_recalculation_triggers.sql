-- Keep stored scores in sync when knockout slots or official group orders change.
-- Also remove duplicate legacy triggers that were recalculating the same events twice.

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
       OLD.home_team_id IS DISTINCT FROM NEW.home_team_id OR
       OLD.away_team_id IS DISTINCT FROM NEW.away_team_id OR
       OLD.winner_team_id IS DISTINCT FROM NEW.winner_team_id
     ) THEN
    PERFORM public.update_all_user_points_internal(NEW.tournament_id, false);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS update_points_after_match_complete ON public.matches;
DROP TRIGGER IF EXISTS trigger_update_points_after_match_complete ON public.matches;

CREATE TRIGGER trigger_update_points_after_match_complete
AFTER UPDATE OF status, home_goals, away_goals, home_team_id, away_team_id, winner_team_id
ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_points_on_match_complete();

CREATE OR REPLACE FUNCTION public.trigger_update_points_on_group_standings_override()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament_id uuid;
BEGIN
  v_tournament_id := COALESCE(NEW.tournament_id, OLD.tournament_id);

  IF v_tournament_id IS NOT NULL THEN
    PERFORM public.update_all_user_points_internal(v_tournament_id, true);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trigger_update_points_after_group_standings_override ON public.group_standings_override;

CREATE TRIGGER trigger_update_points_after_group_standings_override
AFTER INSERT OR UPDATE OR DELETE
ON public.group_standings_override
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_points_on_group_standings_override();

-- Keep only one trigger for final champion changes.
DROP TRIGGER IF EXISTS update_points_after_winner_set ON public.tournament_winners;
DROP TRIGGER IF EXISTS trigger_update_points_after_winner ON public.tournament_winners;

CREATE TRIGGER trigger_update_points_after_winner
AFTER INSERT OR UPDATE
ON public.tournament_winners
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_points_on_winner();

-- Keep only one trigger for individual awards.
DROP TRIGGER IF EXISTS update_points_after_awards_set ON public.individual_awards;
DROP TRIGGER IF EXISTS trigger_update_points_after_awards ON public.individual_awards;

CREATE TRIGGER trigger_update_points_after_awards
AFTER INSERT OR UPDATE
ON public.individual_awards
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_points_on_winner();
