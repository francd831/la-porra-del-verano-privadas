CREATE OR REPLACE FUNCTION public.simulate_what_if_rankings(
  p_tournament_id uuid,
  p_selected_winners jsonb,
  p_user_ids uuid[] DEFAULT NULL,
  p_award_winners jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(user_id uuid, simulated_delta integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH selected_matches AS (
    SELECT
      m.id AS match_id,
      selected.value AS winner_team_id,
      CASE m.round
        WHEN 'Dieciseisavos de Final' THEN 'R32'
        WHEN 'Octavos de Final' THEN 'R16'
        WHEN 'Cuartos de Final' THEN 'QF'
        WHEN 'Semifinales' THEN 'SF'
        ELSE NULL
      END AS prediction_prefix,
      CASE m.round
        WHEN 'Dieciseisavos de Final' THEN 15
        WHEN 'Octavos de Final' THEN 20
        WHEN 'Cuartos de Final' THEN 30
        WHEN 'Semifinales' THEN 40
        ELSE 0
      END AS points
    FROM jsonb_each_text(coalesce(p_selected_winners, '{}'::jsonb)) AS selected(key, value)
    INNER JOIN public.matches m ON m.id = selected.key
    WHERE m.tournament_id = p_tournament_id
      AND m.match_type = 'playoff'
      AND m.round <> 'Final'
      AND coalesce(m.status, '') NOT IN ('completed', 'finished')
  ),
  selected_final AS (
    SELECT selected.value AS winner_team_id
    FROM jsonb_each_text(coalesce(p_selected_winners, '{}'::jsonb)) AS selected(key, value)
    INNER JOIN public.matches m ON m.id = selected.key
    WHERE m.tournament_id = p_tournament_id
      AND m.match_type = 'playoff'
      AND m.round = 'Final'
      AND coalesce(m.status, '') NOT IN ('completed', 'finished')
  ),
  selected_awards AS (
    SELECT selected.key AS award_type, selected.value AS winner_name
    FROM jsonb_each_text(coalesce(p_award_winners, '{}'::jsonb)) AS selected(key, value)
    WHERE nullif(trim(selected.value), '') IS NOT NULL
  ),
  playoff_awards AS (
    SELECT DISTINCT
      p.user_id,
      selected_matches.prediction_prefix AS source_key,
      selected_matches.winner_team_id AS winner_key,
      selected_matches.points
    FROM selected_matches
    INNER JOIN public.predictions p
      ON p.predicted_winner_team_id = selected_matches.winner_team_id
      AND p.playoff_round LIKE selected_matches.prediction_prefix || '\_%' ESCAPE '\'
    WHERE selected_matches.prediction_prefix IS NOT NULL
      AND selected_matches.points > 0
      AND (p_user_ids IS NULL OR p.user_id = ANY(p_user_ids))
  ),
  champion_awards AS (
    SELECT DISTINCT
      cp.user_id,
      'CHAMPION'::text AS source_key,
      selected_final.winner_team_id AS winner_key,
      50 AS points
    FROM selected_final
    INNER JOIN public.champion_predictions cp
      ON cp.predicted_winner_team_id = selected_final.winner_team_id
      AND cp.tournament_id = p_tournament_id
    WHERE (p_user_ids IS NULL OR cp.user_id = ANY(p_user_ids))
  ),
  individual_awards AS (
    SELECT DISTINCT
      ap.user_id,
      selected_awards.award_type AS source_key,
      selected_awards.winner_name AS winner_key,
      30 AS points
    FROM selected_awards
    INNER JOIN public.award_predictions ap
      ON ap.award_type = selected_awards.award_type
      AND ap.tournament_id = p_tournament_id
      AND lower(trim(ap.player_name)) = lower(trim(selected_awards.winner_name))
    WHERE (p_user_ids IS NULL OR ap.user_id = ANY(p_user_ids))
  ),
  all_awards AS (
    SELECT * FROM playoff_awards
    UNION ALL
    SELECT * FROM champion_awards
    UNION ALL
    SELECT * FROM individual_awards
  )
  SELECT
    all_awards.user_id,
    coalesce(sum(all_awards.points), 0)::integer AS simulated_delta
  FROM all_awards
  GROUP BY all_awards.user_id;
$function$;

GRANT EXECUTE ON FUNCTION public.simulate_what_if_rankings(uuid, jsonb, uuid[], jsonb) TO authenticated;
