import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Calculate points for a single match prediction vs actual result.
 * Mirrors the logic in calculate_user_points SQL function.
 */
function calcMatchPoints(
  predHome: number | null,
  predAway: number | null,
  realHome: number | null,
  realAway: number | null
): number {
  if (predHome == null || predAway == null || realHome == null || realAway == null) return 0;

  const exactMatch = predHome === realHome && predAway === realAway;
  if (exactMatch) {
    // exact: (2+homeGoals) + (2+awayGoals) + 5 sign + 6 exact bonus
    return (2 + realHome) + (2 + realAway) + 5 + 6;
  }

  let pts = 0;
  // Home goals match
  if (predHome === realHome) pts += 2 + realHome;
  // Away goals match
  if (predAway === realAway) pts += 2 + realAway;
  // Sign match (1X2)
  const predSign = Math.sign(predHome - predAway);
  const realSign = Math.sign(realHome - realAway);
  if (predSign === realSign) pts += 5;

  return pts;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth guard: only allow calls with the service role key
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey
  );

  const tournamentId = "11111111-1111-1111-1111-111111111111";

  try {
    // Step 1: Lock a pending event using update + returning
    const { data: events, error: lockError } = await supabase
      .from("events_queue")
      .update({ status: "calculating", updated_at: new Date().toISOString() })
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .select();

    if (lockError) throw lockError;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "No pending events" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = events[0];
    console.log(`Processing event ${event.id} type=${event.type}`);

    try {
      // Step 2: CALCULATE - recalculate all user points
      const { error: calcError } = await supabase.rpc("update_all_user_points", {
        p_tournament_id: tournamentId,
      });
      if (calcError) throw new Error(`Points calculation failed: ${calcError.message}`);

      // Step 3: Get all submissions with updated points
      const { data: submissions, error: subError } = await supabase
        .from("user_submissions")
        .select("user_id, points_total, points_groups, points_playoffs, points_awards, points_r32, points_r16, points_qf, points_sf, points_final, points_champion, points_group_order")
        .eq("tournament_id", tournamentId)
        .order("points_total", { ascending: false });

      if (subError) throw new Error(`Fetch submissions failed: ${subError.message}`);

      // Filter out admins for ranking
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const adminIds = new Set((admins || []).map((a: any) => a.user_id));
      const nonAdminSubs = (submissions || []).filter((s: any) => !adminIds.has(s.user_id));

      // Step 3b: For match_result events, fetch per-user predictions for the specific match
      const payload = event.payload || {};
      let userPredictions: Map<string, { home_goals: number | null; away_goals: number | null }> | null = null;
      let knockoutPredictions: Map<string, Set<string>> | null = null;

      if (event.type === "match_result" && payload.match_id) {
        const { data: preds } = await supabase
          .from("predictions")
          .select("user_id, home_goals, away_goals")
          .eq("match_id", payload.match_id);

        userPredictions = new Map();
        for (const p of (preds || [])) {
          userPredictions.set(p.user_id, {
            home_goals: p.home_goals,
            away_goals: p.away_goals,
          });
        }
        console.log(`Loaded ${userPredictions.size} predictions for match ${payload.match_id}`);
      }

      // For knockout_result events, fetch ALL predictions for the round prefix
      // e.g. match_id "R32_3" → prefix "R32" → fetch all R32_* predictions
      if (event.type === "knockout_result" && payload.match_id) {
        const roundPrefix = String(payload.match_id).split("_")[0];
        const { data: preds } = await supabase
          .from("predictions")
          .select("user_id, predicted_winner_team_id")
          .like("playoff_round", `${roundPrefix}_%`);

        knockoutPredictions = new Map();
        for (const p of (preds || [])) {
          if (!p.predicted_winner_team_id) continue;
          const existing = knockoutPredictions.get(p.user_id) || new Set();
          existing.add(p.predicted_winner_team_id);
          knockoutPredictions.set(p.user_id, existing);
        }
        console.log(`Loaded ${(preds || []).length} knockout predictions for prefix ${roundPrefix}_*`);
      }

      // For award_result events, fetch user award predictions
      let awardPredictions: Map<string, string> | null = null;
      if (event.type === "award_result" && event.entity_id) {
        // entity_id is the award_type (e.g. 'balon_oro', 'bota_oro')
        const { data: awardPreds } = await supabase
          .from("award_predictions")
          .select("user_id, player_name")
          .eq("award_type", event.entity_id)
          .eq("tournament_id", tournamentId);

        awardPredictions = new Map();
        for (const ap of (awardPreds || [])) {
          awardPredictions.set(ap.user_id, ap.player_name);
        }
        console.log(`Loaded ${awardPredictions.size} award predictions for ${event.entity_id}`);
      }

      // Step 4: Insert event_user_points with enriched details
      const eventUserPoints = (submissions || []).map((s: any) => {
        const baseDetails: Record<string, any> = {
          groups: s.points_groups,
          playoffs: s.points_playoffs,
          awards: s.points_awards,
          r32: s.points_r32,
          r16: s.points_r16,
          qf: s.points_qf,
          sf: s.points_sf,
          final: s.points_final,
          champion: s.points_champion,
          group_order: s.points_group_order,
        };

        // Enrich with per-match prediction data for match_result events
        if (event.type === "match_result" && userPredictions) {
          const pred = userPredictions.get(s.user_id);
          baseDetails.user_pred_home = pred?.home_goals ?? null;
          baseDetails.user_pred_away = pred?.away_goals ?? null;
          // Calculate points for THIS specific match
          baseDetails.match_points = calcMatchPoints(
            pred?.home_goals ?? null,
            pred?.away_goals ?? null,
            payload.home_goals ?? null,
            payload.away_goals ?? null
          );
        }

        // Enrich with knockout prediction data — check if user had this team
        // in ANY slot of the round (e.g. any R32_* slot, not just the specific one)
        if (event.type === "knockout_result" && knockoutPredictions) {
          const userPicks = knockoutPredictions.get(s.user_id);
          const isCorrect = userPicks ? userPicks.has(payload.team_id) : false;
          baseDetails.knockout_correct = isCorrect;
          baseDetails.user_pick_team_id = userPicks ? Array.from(userPicks).join(",") : null;
          // Calculate points for THIS specific round advancement
          const roundPointsMap: Record<string, number> = {
            "Dieciseisavos de Final": 10,
            "Octavos de Final": 15,
            "Cuartos de Final": 20,
            "Semifinales": 30,
            "Final": 40,
          };
          baseDetails.knockout_points = isCorrect ? (roundPointsMap[payload.round_name] || 0) : 0;
        }

        // Enrich with user's award prediction for award_result events
        if (event.type === "award_result" && awardPredictions) {
          baseDetails.user_pick = awardPredictions.get(s.user_id) || null;
        }

        return {
          event_id: event.id,
          user_id: s.user_id,
          points: s.points_total || 0,
          details: baseDetails,
        };
      });

      if (eventUserPoints.length > 0) {
        const { error: eupError } = await supabase
          .from("event_user_points")
          .upsert(eventUserPoints, { onConflict: "event_id,user_id" });
        if (eupError) throw new Error(`Insert event_user_points failed: ${eupError.message}`);
      }

      // Step 5: Insert leaderboard_snapshot (excluding admins)
      const leaderboardEntries = nonAdminSubs.map((s: any, index: number) => ({
        event_id: event.id,
        user_id: s.user_id,
        rank: index + 1,
        total_points: s.points_total || 0,
      }));

      if (leaderboardEntries.length > 0) {
        const { error: lbError } = await supabase
          .from("leaderboard_snapshot")
          .upsert(leaderboardEntries, { onConflict: "event_id,user_id" });
        if (lbError) throw new Error(`Insert leaderboard_snapshot failed: ${lbError.message}`);
      }

      // Mark as calculated
      await supabase
        .from("events_queue")
        .update({ status: "calculated", updated_at: new Date().toISOString() })
        .eq("id", event.id);

      // Step 6: PUBLISH - change to publishing and send notifications
      await supabase
        .from("events_queue")
        .update({ status: "publishing", updated_at: new Date().toISOString() })
        .eq("id", event.id);

      // Call send-push-notifications edge function
      const pushUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notifications`;
      const pushResponse = await fetch(pushUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ event_id: event.id }),
      });

      const pushResultText = await pushResponse.text();
      let pushResult: any = null;
      try {
        pushResult = JSON.parse(pushResultText);
      } catch {
        throw new Error(`send-push-notifications returned non-JSON response: ${pushResultText}`);
      }

      if (!pushResponse.ok || !pushResult?.success) {
        throw new Error(
          `Push publish failed (status=${pushResponse.status}): ${JSON.stringify(pushResult)}`
        );
      }

      if ((pushResult?.sent ?? 0) === 0) {
        console.warn(`Push publish completed without deliveries for event ${event.id}: ${JSON.stringify(pushResult)}`);
      }

      console.log("Push result:", pushResult);

      // Mark as done
      await supabase
        .from("events_queue")
        .update({ status: "done", updated_at: new Date().toISOString(), error: null })
        .eq("id", event.id);

      return new Response(
        JSON.stringify({ success: true, event_id: event.id, status: "done" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (processingError) {
      // Increment attempts, mark failed if > 5
      const newAttempts = (event.attempts || 0) + 1;
      const newStatus = newAttempts > 5 ? "failed" : "pending";

      await supabase
        .from("events_queue")
        .update({
          status: newStatus,
          attempts: newAttempts,
          error: String(processingError),
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id);

      throw processingError;
    }
  } catch (error) {
    console.error("Process events error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
