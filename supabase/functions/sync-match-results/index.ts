import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-secret",
};

// football-data.org v4 — World Cup competition code is "WC"
const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";
const COMPETITION_CODE = "WC";

interface FdMatch {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, POSTPONED, SUSPENDED, CANCELLED
  homeTeam: { id: number | null; name: string | null };
  awayTeam: { id: number | null; name: string | null };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
}

function mapStatus(s: string): string {
  if (s === "FINISHED") return "completed";
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(s)) return "in_progress";
  return "scheduled";
}

function statusRank(status: string): number {
  if (status === "completed") return 2;
  if (status === "in_progress") return 1;
  return 0;
}

function hasScore(home: number | null | undefined, away: number | null | undefined): boolean {
  return typeof home === "number" && typeof away === "number";
}

async function isAuthorized(req: Request, supabaseUrl: string, serviceKey: string): Promise<boolean> {
  const syncSecret = Deno.env.get("SYNC_RESULTS_SECRET");
  const providedSecret = req.headers.get("x-sync-secret");
  if (syncSecret && providedSecret && providedSecret === syncSecret) {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;

  const supabase = createClient(supabaseUrl, serviceKey);
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return false;

  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  return !roleError && !!roleData;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!(await isAuthorized(req, supabaseUrl, serviceKey))) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FOOTBALL_DATA_API_KEY");
    if (!apiKey) throw new Error("FOOTBALL_DATA_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Completed matches are terminal. Load all remaining matches once so the
    // sync does not perform one database query per API fixture and never
    // reopens a match that has already been finalized locally.
    const { data: activeMatches, error: activeMatchesError } = await supabase
      .from("matches")
      .select("id, external_id, status, home_goals, away_goals, match_type, home_team_id, away_team_id, winner_team_id")
      .neq("status", "completed")
      .not("external_id", "is", null);

    if (activeMatchesError) {
      throw new Error(`Unable to load active matches: ${activeMatchesError.message}`);
    }

    const matchesByExternalId = new Map(
      (activeMatches ?? []).map((match) => [Number(match.external_id), match])
    );

    // Fetch matches from football-data.org
    const res = await fetch(
      `${FOOTBALL_DATA_BASE}/competitions/${COMPETITION_CODE}/matches`,
      { headers: { "X-Auth-Token": apiKey } }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`football-data.org error [${res.status}]: ${body}`);
    }

    const data = await res.json();
    const fixtures: FdMatch[] = data.matches ?? [];

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const fx of fixtures) {
      const externalId = fx.id;
      const match = matchesByExternalId.get(externalId);

      if (!match) {
        skipped++;
        continue;
      }

      const apiStatus = mapStatus(fx.status);
      const apiHomeGoals = fx.score?.fullTime?.home ?? null;
      const apiAwayGoals = fx.score?.fullTime?.away ?? null;
      const apiHasScore = hasScore(apiHomeGoals, apiAwayGoals);

      // football-data can occasionally return stale/incomplete snapshots.
      // Never downgrade a known result or clear a score we already have.
      const newStatus =
        statusRank(apiStatus) < statusRank(match.status) ? match.status : apiStatus;
      const homeGoals = apiHasScore ? apiHomeGoals : match.home_goals;
      const awayGoals = apiHasScore ? apiAwayGoals : match.away_goals;
      const winnerTeamId =
        match.match_type === "playoff" && hasScore(homeGoals, awayGoals)
          ? homeGoals > awayGoals
            ? match.home_team_id
            : awayGoals > homeGoals
              ? match.away_team_id
              : null
          : match.winner_team_id;

      if (newStatus === "completed" && (homeGoals === null || awayGoals === null)) {
        errors.push(`Skip ${externalId}: API reported completed without full-time score`);
        continue;
      }

      // Skip if nothing has changed
      if (
        match.status === newStatus &&
        match.home_goals === homeGoals &&
        match.away_goals === awayGoals &&
        match.winner_team_id === winnerTeamId
      ) {
        continue;
      }

      const { error: updErr } = await supabase
        .from("matches")
        .update({
          status: newStatus,
          home_goals: homeGoals,
          away_goals: awayGoals,
          winner_team_id: winnerTeamId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id);

      if (updErr) {
        errors.push(`Update ${match.id}: ${updErr.message}`);
      } else {
        updated++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        fetched: fixtures.length,
        updated,
        skipped_unmapped: skipped,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("sync-match-results error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
