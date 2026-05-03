import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  if (["IN_PLAY", "PAUSED"].includes(s)) return "in_progress";
  return "scheduled";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("FOOTBALL_DATA_API_KEY");
    if (!apiKey) throw new Error("FOOTBALL_DATA_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

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

      // Find match by external_id
      const { data: match, error: findErr } = await supabase
        .from("matches")
        .select("id, status, home_goals, away_goals")
        .eq("external_id", externalId)
        .maybeSingle();

      if (findErr) {
        errors.push(`Find ${externalId}: ${findErr.message}`);
        continue;
      }
      if (!match) {
        skipped++;
        continue;
      }

      const newStatus = mapStatus(fx.status);
      const homeGoals = fx.score?.fullTime?.home ?? null;
      const awayGoals = fx.score?.fullTime?.away ?? null;

      // Skip if nothing has changed
      if (
        match.status === newStatus &&
        match.home_goals === homeGoals &&
        match.away_goals === awayGoals
      ) {
        continue;
      }

      const { error: updErr } = await supabase
        .from("matches")
        .update({
          status: newStatus,
          home_goals: homeGoals,
          away_goals: awayGoals,
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