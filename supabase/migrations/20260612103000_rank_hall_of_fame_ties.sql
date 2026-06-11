CREATE OR REPLACE FUNCTION public.refresh_score_event_ranks(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  WITH ranked AS (
    SELECT
      id,
      rank() OVER (
        PARTITION BY tournament_id, event_type, event_key
        ORDER BY points DESC
      ) AS calculated_rank
    FROM public.user_score_events
    WHERE tournament_id = p_tournament_id
  )
  UPDATE public.user_score_events e
  SET rank = ranked.calculated_rank
  FROM ranked
  WHERE e.id = ranked.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_all_user_points(p_tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_submission RECORD;
  v_points RECORD;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  FOR v_user_submission IN SELECT user_id FROM public.user_submissions WHERE tournament_id = p_tournament_id
  LOOP
    SELECT * INTO v_points FROM public.calculate_user_points(v_user_submission.user_id, p_tournament_id);

    UPDATE public.user_submissions SET
      points_groups = v_points.groups_points,
      points_group_order = v_points.group_order_bonus,
      points_playoffs = v_points.playoffs_points,
      points_awards = v_points.awards_points,
      points_total = v_points.total_points,
      points_r32 = v_points.r32_points,
      points_r16 = v_points.r16_points,
      points_qf = v_points.qf_points,
      points_sf = v_points.sf_points,
      points_final = v_points.final_points,
      points_champion = v_points.champion_points,
      updated_at = now()
    WHERE user_id = v_user_submission.user_id
      AND tournament_id = p_tournament_id;
  END LOOP;

  PERFORM public.refresh_score_events(p_tournament_id);
  PERFORM public.refresh_score_result_events(p_tournament_id);
  PERFORM public.refresh_score_day_events(p_tournament_id);
  PERFORM public.refresh_score_event_ranks(p_tournament_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_score_event_ranks(uuid) TO authenticated;

SELECT public.refresh_score_event_ranks('11111111-1111-1111-1111-111111111111'::uuid);
