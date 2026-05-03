-- Crear trigger para actualizar puntos cuando un partido se completa
CREATE TRIGGER trigger_update_points_after_match_complete
  AFTER UPDATE ON public.matches
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND (OLD.status != 'completed' OR OLD.home_goals IS DISTINCT FROM NEW.home_goals OR OLD.away_goals IS DISTINCT FROM NEW.away_goals))
  EXECUTE FUNCTION public.trigger_update_points_on_match_complete();

-- Crear trigger para actualizar puntos cuando se define el ganador del torneo
CREATE TRIGGER trigger_update_points_after_winner
  AFTER INSERT OR UPDATE ON public.tournament_winners
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_points_on_winner();