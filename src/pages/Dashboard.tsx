import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, ArrowRight, Medal, TrendingUp, ChevronDown, ChevronUp, Trophy, Target, Award, BarChart3, Loader2, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import CountdownTimer from "@/components/CountdownTimer";
import MatchStatsDialog from "@/components/MatchStatsDialog";
import AllMatchesDialog from "@/components/AllMatchesDialog";
import { isPrivateLeaguesApp } from "@/lib/appMode";
import { sortStandingsByFifaCriteria } from "@/lib/fifaStandings";

interface UserStats {
  displayName: string;
  totalPoints: number;
  rank: number;
  totalParticipants: number;
  pointsGroups: number;
  pointsPlayoffs: number;
  pointsAwards: number;
  pointsR32: number;
  pointsR16: number;
  pointsQF: number;
  pointsSF: number;
  pointsFinal: number;
  pointsChampion: number;
}
interface GroupPoints {
  groupName: string;
  points: number;
  bonusOrder: number;
}
interface MatchWithPoints {
  id: string;
  match_date: string;
  match_type: string;
  round: string | null;
  home_team: {
    name: string;
  } | null;
  away_team: {
    name: string;
  } | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
  winner_team_id: string | null;
  userPrediction?: {
    home_goals: number | null;
    away_goals: number | null;
  };
  userPlayoffPredictionTeamId?: string | null;
  pointsEarned?: number;
  group_id?: string | null;
  playoffDistribution?: { points: number; participants: number }[];
}
interface UpcomingMatch {
  id: string;
  match_date: string;
  status: string;
  match_type: string;
  round: string | null;
  home_team: {
    name: string;
  } | null;
  away_team: {
    name: string;
  } | null;
  home_team_id: string | null;
  away_team_id: string | null;
  winner_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
  userPrediction?: {
    home_goals: number | null;
    away_goals: number | null;
  };
  playoffStats?: {
    homeAdvances: number;
    awayAdvances: number;
    neitherAdvances: number;
    userHasHome: boolean;
    userHasAway: boolean;
  };
}
interface AwardPoints {
  botaDeOro: number;
  balonDeOro: number;
}
interface PodiumBadge {
  eventLabel: string;
  rank: number;
  points: number;
}

const adminDemoPodiumBadges: PodiumBadge[] = [
  { eventLabel: "Mejor general", rank: 1, points: 124 },
  { eventLabel: "Rey del dia", rank: 1, points: 38 },
  { eventLabel: "Mas signos acertados", rank: 2, points: 16 },
  { eventLabel: "Grupo A", rank: 2, points: 42 },
  { eventLabel: "Mas resultados exactos", rank: 3, points: 7 },
  { eventLabel: "Premios Individuales", rank: 3, points: 30 },
];

const podiumBadgeImages = [
  "/badges/podium-gold.png",
  "/badges/podium-silver.png",
  "/badges/podium-bronze.png",
];

// Helper function to calculate points for a single match
function calculateMatchPoints(prediction: {
  home_goals: number | null;
  away_goals: number | null;
} | undefined, actualHome: number | null, actualAway: number | null): number {
  if (!prediction || prediction.home_goals === null || prediction.away_goals === null) return 0;
  if (actualHome === null || actualAway === null) return 0;
  let points = 0;
  const predHome = prediction.home_goals;
  const predAway = prediction.away_goals;

  // Determine signs
  const actualSign = actualHome > actualAway ? '1' : actualHome < actualAway ? '2' : 'X';
  const predSign = predHome > predAway ? '1' : predHome < predAway ? '2' : 'X';

  // Exact result (all correct)
  const exactResult = predHome === actualHome && predAway === actualAway;
  if (exactResult) {
    // 5 (sign) + 2 + homeGoals (home) + 2 + awayGoals (away) + 6 (bonus)
    points = 5 + 2 + actualHome + 2 + actualAway + 6;
  } else {
    // Check sign
    if (actualSign === predSign) {
      points += 5;
    }
    // Check home goals
    if (predHome === actualHome) {
      points += 2 + actualHome;
    }
    // Check away goals
    if (predAway === actualAway) {
      points += 2 + actualAway;
    }
  }
  return points;
}

function getTeamName(team: { name: string } | null | undefined) {
  return team?.name || "TBD";
}

function getPlayoffAdvancePoints(round: string | null): number {
  switch (round) {
    case "Dieciseisavos de Final":
      return 15;
    case "Octavos de Final":
      return 20;
    case "Cuartos de Final":
      return 30;
    case "Semifinales":
      return 40;
    case "Final":
      return 50;
    default:
      return 0;
  }
}

function getShortRound(round: string | null) {
  switch (round) {
    case "Dieciseisavos de Final":
      return "1/16";
    case "Octavos de Final":
      return "1/8";
    case "Cuartos de Final":
      return "1/4";
    case "Semifinales":
      return "1/2";
    case "Final":
      return "Final";
    default:
      return "Grupo";
  }
}

function getUpcomingRoundSeparator(match: UpcomingMatch) {
  if (match.match_type !== "playoff") {
    return "Fase de grupos";
  }
  return getShortRound(match.round);
}

function getPlayoffAdvancementPrefixes(round: string | null) {
  switch (round) {
    case "Dieciseisavos de Final":
      return ["R32_", "R16_", "QF_", "SF_"];
    case "Octavos de Final":
      return ["R16_", "QF_", "SF_"];
    case "Cuartos de Final":
      return ["QF_", "SF_"];
    case "Semifinales":
      return ["SF_"];
    default:
      return [];
  }
}

async function fetchAllPlayoffPredictions() {
  const pageSize = 1000;
  let from = 0;
  const allPredictions: {
    playoff_round: string | null;
    predicted_winner_team_id: string | null;
    user_id: string;
  }[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('predictions')
      .select('playoff_round, predicted_winner_team_id, user_id')
      .not('playoff_round', 'is', null)
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const page = data || [];
    allPredictions.push(...page);

    if (page.length < pageSize) break;
    from += pageSize;
  }

  return allPredictions;
}
export default function Dashboard() {
  const {
    user
  } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<MatchWithPoints[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [groupPoints, setGroupPoints] = useState<GroupPoints[]>([]);
  const [awardPoints, setAwardPoints] = useState<AwardPoints>({
    botaDeOro: 0,
    balonDeOro: 0
  });
  const [loading, setLoading] = useState(true);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [selectedMatchForStats, setSelectedMatchForStats] = useState<{
    id: string;
    homeTeam: string;
    awayTeam: string;
  } | null>(null);
  const [allMatchesOpen, setAllMatchesOpen] = useState(false);
  const [distributionMatchId, setDistributionMatchId] = useState<string | null>(null);
  const [distributionData, setDistributionData] = useState<{ points: number; participants: number }[]>([]);
  const [distributionLoading, setDistributionLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [predictionsLocked, setPredictionsLocked] = useState(false);
  const [podiumBadges, setPodiumBadges] = useState<PodiumBadge[]>([]);
  const privateLeaguesEnabled = isPrivateLeaguesApp();
  

  const loadDistribution = async (matchId: string, actualHome: number, actualAway: number) => {
    if (distributionMatchId === matchId) { setDistributionMatchId(null); return; }
    setDistributionMatchId(matchId);
    if (!predictionsLocked) {
      setDistributionData([]);
      return;
    }
    setDistributionLoading(true);
    try {
      const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
      const adminIds = new Set((adminRoles || []).map(r => r.user_id));
      const { data: predictions } = await supabase.from('predictions').select('home_goals, away_goals, user_id').eq('match_id', matchId).not('home_goals', 'is', null).not('away_goals', 'is', null);
      const userPreds = (predictions || []).filter(p => !adminIds.has(p.user_id));
      const pointsCounts: Record<number, number> = {};
      userPreds.forEach(p => {
        const pts = calculateMatchPoints({ home_goals: p.home_goals, away_goals: p.away_goals }, actualHome, actualAway);
        pointsCounts[pts] = (pointsCounts[pts] || 0) + 1;
      });
      const maxPts = Math.max(0, ...Object.keys(pointsCounts).map(Number));
      const dist: { points: number; participants: number }[] = [];
      for (let i = 0; i <= maxPts; i++) {
        if (pointsCounts[i]) dist.push({ points: i, participants: pointsCounts[i] });
      }
      if (!pointsCounts[0] && dist.length > 0) dist.unshift({ points: 0, participants: 0 });
      setDistributionData(dist);
    } catch (e) { console.error(e); } finally { setDistributionLoading(false); }
  };


  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      try {
        // Load user profile
        const {
          data: profileData
        } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).single();

        // Load user submission with all points
        const {
          data: submissionData
        } = await supabase.from('user_submissions').select('*').eq('user_id', user.id).eq('tournament_id', '11111111-1111-1111-1111-111111111111').single();

        const { data: tournamentData } = await supabase
          .from('tournaments')
          .select('predictions_locked')
          .eq('id', '11111111-1111-1111-1111-111111111111')
          .single();

        setPredictionsLocked(!!tournamentData?.predictions_locked);

        // Load all submissions for ranking (excluding admins)
        const {
          data: allSubmissions
        } = await supabase.from('user_submissions').select('user_id, points_total').eq('tournament_id', '11111111-1111-1111-1111-111111111111').order('points_total', {
          ascending: false
        });
        const {
          data: admins
        } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
        const adminIds = new Set(admins?.map((a) => a.user_id) || []);
        const isAdminUser = adminIds.has(user.id);
        if (isAdminUser) {
          setPodiumBadges(adminDemoPodiumBadges);
        } else {
          const { data: userPodiumEvents, error: userPodiumError } = await supabase
            .from('user_score_events')
            .select('event_label, points, rank, event_type')
            .eq('tournament_id', '11111111-1111-1111-1111-111111111111')
            .eq('user_id', user.id)
            .lte('rank', 3)
            .gt('points', 0)
            .neq('event_type', 'match')
            .order('rank', { ascending: true })
            .order('event_label', { ascending: true });

          if (userPodiumError) {
            console.error('Error loading podium badges:', userPodiumError);
            setPodiumBadges([]);
          } else {
            setPodiumBadges((userPodiumEvents || [])
              .filter((event) => event.rank !== null)
              .map((event) => ({
                eventLabel: event.event_label,
                rank: event.rank || 0,
                points: event.points || 0,
              })));
          }
        }
        const nonAdminSubmissions = allSubmissions?.filter((s) => !adminIds.has(s.user_id)) || [];
        const userPoints = submissionData?.points_total || 0;
        const userHasSubmission = nonAdminSubmissions.some((s) => s.user_id === user.id);
        const userRank = userHasSubmission
          ? nonAdminSubmissions.filter((s) => (s.points_total || 0) > userPoints).length + 1
          : 0;
        const totalParticipants = nonAdminSubmissions.length;
        setStats({
          displayName: profileData?.display_name || user.email?.split('@')[0] || 'Usuario',
          totalPoints: userPoints,
          rank: userRank || 0,
          totalParticipants,
          pointsGroups: submissionData?.points_groups || 0,
          pointsPlayoffs: submissionData?.points_playoffs || 0,
          pointsAwards: submissionData?.points_awards || 0,
          pointsR32: submissionData?.points_r32 || 0,
          pointsR16: submissionData?.points_r16 || 0,
          pointsQF: submissionData?.points_qf || 0,
          pointsSF: submissionData?.points_sf || 0,
          pointsFinal: submissionData?.points_final || 0,
          pointsChampion: submissionData?.points_champion || 0
        });

        setIsComplete(submissionData?.is_complete || false);
        const {
          data: finishedMatchesData
        } = await supabase.from('matches').select(`
            id,
            match_date,
            match_type,
            round,
            home_goals,
            away_goals,
            winner_team_id,
            home_team_id,
            away_team_id,
            group_id,
            home_team:teams!matches_home_team_id_fkey(name),
            away_team:teams!matches_away_team_id_fkey(name)
          `).eq('tournament_id', '11111111-1111-1111-1111-111111111111').eq('status', 'completed').not('match_date', 'is', null).order('match_date', {
          ascending: false
        }).limit(5);
        if (finishedMatchesData && finishedMatchesData.length > 0) {
          const matchIds = finishedMatchesData.map((m) => m.id);
          const {
            data: predictionsData
          } = await supabase.from('predictions').select('match_id, home_goals, away_goals').eq('user_id', user.id).in('match_id', matchIds);
          const predictionsMap = new Map(predictionsData?.map((p) => [p.match_id, {
            home_goals: p.home_goals,
            away_goals: p.away_goals
          }]) || []);
          const matchesWithPoints: MatchWithPoints[] = finishedMatchesData.map((match) => {
            const prediction = predictionsMap.get(match.id);
            const pointsEarned = calculateMatchPoints(prediction, match.home_goals, match.away_goals);
            return {
              id: match.id,
              match_date: match.match_date || '',
              match_type: match.match_type || 'group',
              round: match.round,
              home_team: match.home_team as {
                name: string;
                flag: string;
              },
              away_team: match.away_team as {
                name: string;
                flag: string;
              },
              home_team_id: match.home_team_id,
              away_team_id: match.away_team_id,
              home_goals: match.home_goals,
              away_goals: match.away_goals,
              winner_team_id: match.winner_team_id,
              group_id: match.group_id,
              userPrediction: prediction,
              pointsEarned
            };
          });
          const playoffMatches = matchesWithPoints.filter((match) => match.match_type === 'playoff');
          if (playoffMatches.length > 0) {
            const shouldLoadPlayoffPredictions = playoffMatches.some((match) => match.id !== 'FINAL_1');
            const playoffPredictions = shouldLoadPlayoffPredictions
              ? await fetchAllPlayoffPredictions()
              : [];
            const { data: championPredictions } = await supabase
              .from('champion_predictions')
              .select('predicted_winner_team_id, user_id')
              .eq('tournament_id', '11111111-1111-1111-1111-111111111111');

            matchesWithPoints.forEach((match) => {
              if (match.match_type !== 'playoff' || !match.winner_team_id) return;
              const winnerTeamId = match.winner_team_id;
              const pointsForWinner = getPlayoffAdvancePoints(match.round);
              const distributionCounts: Record<number, number> = { 0: 0, [pointsForWinner]: 0 };

              if (match.id === 'FINAL_1') {
                (championPredictions || [])
                  .filter((prediction) => !adminIds.has(prediction.user_id))
                  .forEach((prediction) => {
                    const points = prediction.predicted_winner_team_id === winnerTeamId ? pointsForWinner : 0;
                    distributionCounts[points] = (distributionCounts[points] || 0) + 1;
                    if (prediction.user_id === user.id) {
                      match.userPlayoffPredictionTeamId = prediction.predicted_winner_team_id;
                      match.pointsEarned = points;
                    }
                  });
              } else {
                const advancementPrefixes = getPlayoffAdvancementPrefixes(match.round);
                const picksByUser = new Map<string, Set<string>>();

                playoffPredictions
                  .filter((prediction) => (
                    !adminIds.has(prediction.user_id) &&
                    advancementPrefixes.some((prefix) => prediction.playoff_round?.startsWith(prefix)) &&
                    prediction.predicted_winner_team_id
                  ))
                  .forEach((prediction) => {
                    const picks = picksByUser.get(prediction.user_id) || new Set<string>();
                    picks.add(prediction.predicted_winner_team_id);
                    picksByUser.set(prediction.user_id, picks);
                  });
                (championPredictions || [])
                  .filter((prediction) => !adminIds.has(prediction.user_id) && prediction.predicted_winner_team_id)
                  .forEach((prediction) => {
                    const picks = picksByUser.get(prediction.user_id) || new Set<string>();
                    picks.add(prediction.predicted_winner_team_id);
                    picksByUser.set(prediction.user_id, picks);
                  });

                const usersWithWinner = Array.from(picksByUser.values()).filter((picks) => picks.has(winnerTeamId)).length;
                distributionCounts[pointsForWinner] = usersWithWinner;
                const userPicks = picksByUser.get(user.id);
                if (userPicks) {
                  match.userPlayoffPredictionTeamId = userPicks.has(winnerTeamId) ? winnerTeamId : Array.from(userPicks)[0];
                  match.pointsEarned = userPicks.has(winnerTeamId) ? pointsForWinner : 0;
                }
              }

              distributionCounts[0] = Math.max(0, totalParticipants - (distributionCounts[pointsForWinner] || 0));
              match.playoffDistribution = Object.entries(distributionCounts)
                .map(([points, participants]) => ({ points: Number(points), participants }))
                .sort((a, b) => a.points - b.points);
            });
          }
          setRecentMatches(matchesWithPoints);
        }

        // Load upcoming matches plus matches currently in progress.
        const now = new Date().toISOString();
        const {
          data: upcomingMatchesData
        } = await supabase.from('matches').select(`
            id,
            match_date,
            status,
            match_type,
            round,
            home_goals,
            away_goals,
            winner_team_id,
            home_team_id,
            away_team_id,
            home_team:teams!matches_home_team_id_fkey(name),
            away_team:teams!matches_away_team_id_fkey(name)
          `).eq('tournament_id', '11111111-1111-1111-1111-111111111111').neq('status', 'completed').or(`status.eq.in_progress,match_date.gte.${now}`).not('match_date', 'is', null).order('match_date', {
          ascending: true
        });
        if (upcomingMatchesData && upcomingMatchesData.length > 0) {
          const matchIds = upcomingMatchesData.map((m) => m.id);
          const {
            data: predictionsData
          } = await supabase.from('predictions').select('match_id, home_goals, away_goals').eq('user_id', user.id).in('match_id', matchIds);
          const predictionsMap = new Map(predictionsData?.map((p) => [p.match_id, {
            home_goals: p.home_goals,
            away_goals: p.away_goals
          }]) || []);
          const upcoming: UpcomingMatch[] = upcomingMatchesData.map((match) => ({
            id: match.id,
            match_date: match.match_date || '',
            status: match.status || 'scheduled',
            match_type: match.match_type || 'group',
            round: match.round,
            home_team: match.home_team as {
              name: string;
            },
            away_team: match.away_team as {
              name: string;
            },
            home_team_id: match.home_team_id,
            away_team_id: match.away_team_id,
            winner_team_id: match.winner_team_id,
            home_goals: match.home_goals,
            away_goals: match.away_goals,
            userPrediction: predictionsMap.get(match.id)
          }));
          const playoffUpcoming = upcoming.filter((match) => match.match_type === 'playoff');
          if (playoffUpcoming.length > 0) {
            const shouldLoadPlayoffPredictions = playoffUpcoming.some((match) => match.id !== 'FINAL_1');
            const playoffPredictions = shouldLoadPlayoffPredictions
              ? await fetchAllPlayoffPredictions()
              : [];
            const { data: championPredictions } = await supabase
              .from('champion_predictions')
              .select('predicted_winner_team_id, user_id')
              .eq('tournament_id', '11111111-1111-1111-1111-111111111111');

            playoffUpcoming.forEach((match) => {
              let homeAdvances = 0;
              let awayAdvances = 0;
              let usersWithEitherTeam = 0;
              let userHasHome = false;
              let userHasAway = false;

              if (match.id === 'FINAL_1') {
                const picksByUser = new Map<string, string>();
                (championPredictions || [])
                  .filter((prediction) => !adminIds.has(prediction.user_id))
                  .forEach((prediction) => {
                    picksByUser.set(prediction.user_id, prediction.predicted_winner_team_id);
                  });

                homeAdvances = match.home_team_id
                  ? Array.from(picksByUser.values()).filter((teamId) => teamId === match.home_team_id).length
                  : 0;
                awayAdvances = match.away_team_id
                  ? Array.from(picksByUser.values()).filter((teamId) => teamId === match.away_team_id).length
                  : 0;
                usersWithEitherTeam = homeAdvances + awayAdvances;
                userHasHome = !!match.home_team_id && picksByUser.get(user.id) === match.home_team_id;
                userHasAway = !!match.away_team_id && picksByUser.get(user.id) === match.away_team_id;
              } else {
                const advancementPrefixes = getPlayoffAdvancementPrefixes(match.round);
                const picksByUser = new Map<string, Set<string>>();

                playoffPredictions
                  .filter((prediction) => (
                    !adminIds.has(prediction.user_id) &&
                    advancementPrefixes.some((prefix) => prediction.playoff_round?.startsWith(prefix)) &&
                    prediction.predicted_winner_team_id
                  ))
                  .forEach((prediction) => {
                    const picks = picksByUser.get(prediction.user_id) || new Set<string>();
                    picks.add(prediction.predicted_winner_team_id);
                    picksByUser.set(prediction.user_id, picks);
                  });
                (championPredictions || [])
                  .filter((prediction) => !adminIds.has(prediction.user_id) && prediction.predicted_winner_team_id)
                  .forEach((prediction) => {
                    const picks = picksByUser.get(prediction.user_id) || new Set<string>();
                    picks.add(prediction.predicted_winner_team_id);
                    picksByUser.set(prediction.user_id, picks);
                  });

                homeAdvances = match.home_team_id
                  ? Array.from(picksByUser.values()).filter((picks) => picks.has(match.home_team_id!)).length
                  : 0;
                awayAdvances = match.away_team_id
                  ? Array.from(picksByUser.values()).filter((picks) => picks.has(match.away_team_id!)).length
                  : 0;
                usersWithEitherTeam = Array.from(picksByUser.values()).filter((picks) => (
                  (!!match.home_team_id && picks.has(match.home_team_id)) ||
                  (!!match.away_team_id && picks.has(match.away_team_id))
                )).length;
                userHasHome = !!match.home_team_id && !!picksByUser.get(user.id)?.has(match.home_team_id);
                userHasAway = !!match.away_team_id && !!picksByUser.get(user.id)?.has(match.away_team_id);
              }

              match.playoffStats = {
                homeAdvances,
                awayAdvances,
                neitherAdvances: Math.max(0, totalParticipants - usersWithEitherTeam),
                userHasHome,
                userHasAway,
              };
            });
          }
          setUpcomingMatches(upcoming);
        } else {
          setUpcomingMatches([]);
        }

        // Calculate points by group (including +20 bonus for exact order)
        const {
          data: groupsData
        } = await supabase.from('groups').select('id, name').eq('tournament_id', '11111111-1111-1111-1111-111111111111').order('name');

        // Load group standings overrides for bonus calculation
        const { data: standingsOverrides } = await supabase.
        from('group_standings_override').
        select('group_id, team_order').
        eq('tournament_id', '11111111-1111-1111-1111-111111111111');

        const overrideMap = new Map(standingsOverrides?.map((s) => [s.group_id, s.team_order]) || []);

        // Load user's playoff predictions to infer group order (positions 1-4 from R32 predictions)
        const { data: userPlayoffPredictions } = await supabase.
        from('predictions').
        select('playoff_round, predicted_winner_team_id').
        eq('user_id', user.id).
        like('playoff_round', 'R32_%');

        // Build user's predicted group standings from R32 predictions
        // R32_1 = A1 vs B3, R32_2 = C1 vs D3, etc. - we need to infer the order
        const userGroupOrder: Map<string, string[]> = new Map();

        if (groupsData) {
          // Get group teams to determine user's predicted order
          const { data: groupTeamsData } = await supabase.
          from('group_teams').
          select('group_id, team_id');

          const groupTeamsMap = new Map<string, string[]>();
          groupTeamsData?.forEach((gt) => {
            const teams = groupTeamsMap.get(gt.group_id) || [];
            teams.push(gt.team_id);
            groupTeamsMap.set(gt.group_id, teams);
          });

          // Get user's match predictions for group matches to calculate standings
          const { data: allGroupMatches } = await supabase.
          from('matches').
          select('id, group_id, home_team_id, away_team_id').
          eq('tournament_id', '11111111-1111-1111-1111-111111111111').
          eq('match_type', 'group');

          const matchIds = allGroupMatches?.map((m) => m.id) || [];
          const { data: userMatchPredictions } = await supabase.
          from('predictions').
          select('match_id, home_goals, away_goals').
          eq('user_id', user.id).
          in('match_id', matchIds);

          const predMap = new Map(userMatchPredictions?.map((p) => [p.match_id, p]) || []);

          // Calculate standings per group based on user predictions
          for (const group of groupsData) {
            const teams = groupTeamsMap.get(group.id) || [];
            const teamStats: Map<string, {points: number;gd: number;gf: number;}> = new Map();
            teams.forEach((t) => teamStats.set(t, { points: 0, gd: 0, gf: 0 }));

            const groupMatches = allGroupMatches?.filter((m) => m.group_id === group.id) || [];
            for (const match of groupMatches) {
              const pred = predMap.get(match.id);
              if (pred && pred.home_goals !== null && pred.away_goals !== null && match.home_team_id && match.away_team_id) {
                const homeStats = teamStats.get(match.home_team_id);
                const awayStats = teamStats.get(match.away_team_id);
                if (homeStats && awayStats) {
                  homeStats.gf += pred.home_goals;
                  homeStats.gd += pred.home_goals - pred.away_goals;
                  awayStats.gf += pred.away_goals;
                  awayStats.gd += pred.away_goals - pred.home_goals;
                  if (pred.home_goals > pred.away_goals) {
                    homeStats.points += 3;
                  } else if (pred.home_goals < pred.away_goals) {
                    awayStats.points += 3;
                  } else {
                    homeStats.points += 1;
                    awayStats.points += 1;
                  }
                }
              }
            }

            const sortedTeams = sortStandingsByFifaCriteria(
              Array.from(teamStats.entries()).map(([teamId, stats]) => ({
                equipo: teamId,
                puntos: stats.points,
                golesFavor: stats.gf,
                diferencia: stats.gd,
              })),
              groupMatches,
              (match) => match.home_team_id,
              (match) => match.away_team_id,
              (match) => {
                const pred = predMap.get(match.id);
                return pred ? { home: pred.home_goals, away: pred.away_goals } : null;
              }
            ).map((team) => team.equipo);

            userGroupOrder.set(group.id, sortedTeams);
          }

          const {
            data: allFinishedMatches
          } = await supabase.from('matches').select('id, group_id, home_goals, away_goals, home_team_id, away_team_id').eq('tournament_id', '11111111-1111-1111-1111-111111111111').eq('status', 'completed').eq('match_type', 'group').not('home_goals', 'is', null).not('away_goals', 'is', null);

          if (allFinishedMatches) {
            const finishedMatchIds = allFinishedMatches.map((m) => m.id);
            const {
              data: userPredictions
            } = await supabase.from('predictions').select('match_id, home_goals, away_goals').eq('user_id', user.id).in('match_id', finishedMatchIds);
            const predictionsMap = new Map(userPredictions?.map((p) => [p.match_id, {
              home_goals: p.home_goals,
              away_goals: p.away_goals
            }]) || []);

            // Count completed matches per group to know if group is fully completed
            const completedMatchesPerGroup = new Map<string, number>();
            allFinishedMatches.forEach((m) => {
              if (m.group_id) {
                completedMatchesPerGroup.set(m.group_id, (completedMatchesPerGroup.get(m.group_id) || 0) + 1);
              }
            });

            // Calculate actual group standings from match results (for groups without override)
            const actualGroupOrder: Map<string, string[]> = new Map();
            for (const group of groupsData) {
              // If there's an override, use that
              if (overrideMap.has(group.id)) {
                actualGroupOrder.set(group.id, overrideMap.get(group.id)!);
                continue;
              }

              // Calculate from match results
              const groupMatches = allFinishedMatches.filter((m) => m.group_id === group.id);
              const teamStats: Map<string, {points: number;gd: number;gf: number;}> = new Map();

              for (const match of groupMatches) {
                if (match.home_team_id && match.away_team_id && match.home_goals !== null && match.away_goals !== null) {
                  if (!teamStats.has(match.home_team_id)) {
                    teamStats.set(match.home_team_id, { points: 0, gd: 0, gf: 0 });
                  }
                  if (!teamStats.has(match.away_team_id)) {
                    teamStats.set(match.away_team_id, { points: 0, gd: 0, gf: 0 });
                  }

                  const homeStats = teamStats.get(match.home_team_id)!;
                  const awayStats = teamStats.get(match.away_team_id)!;

                  homeStats.gf += match.home_goals;
                  homeStats.gd += match.home_goals - match.away_goals;
                  awayStats.gf += match.away_goals;
                  awayStats.gd += match.away_goals - match.home_goals;

                  if (match.home_goals > match.away_goals) {
                    homeStats.points += 3;
                  } else if (match.home_goals < match.away_goals) {
                    awayStats.points += 3;
                  } else {
                    homeStats.points += 1;
                    awayStats.points += 1;
                  }
                }
              }

              const sortedTeams = sortStandingsByFifaCriteria(
                Array.from(teamStats.entries()).map(([teamId, stats]) => ({
                  equipo: teamId,
                  puntos: stats.points,
                  golesFavor: stats.gf,
                  diferencia: stats.gd,
                })),
                groupMatches,
                (match) => match.home_team_id,
                (match) => match.away_team_id,
                (match) => ({ home: match.home_goals, away: match.away_goals })
              ).map((team) => team.equipo);

              actualGroupOrder.set(group.id, sortedTeams);
            }

            const pointsByGroup: GroupPoints[] = groupsData.map((group) => {
              const groupMatches = allFinishedMatches.filter((m) => m.group_id === group.id);
              let totalPoints = 0;
              for (const match of groupMatches) {
                const prediction = predictionsMap.get(match.id);
                totalPoints += calculateMatchPoints(prediction, match.home_goals, match.away_goals);
              }

              // Check for +20 bonus if group is complete (6 matches)
              let bonusOrder = 0;
              const completedMatches = completedMatchesPerGroup.get(group.id) || 0;
              if (completedMatches === 6) {
                const actualOrder = actualGroupOrder.get(group.id);
                const userOrder = userGroupOrder.get(group.id);
                if (actualOrder && userOrder && actualOrder.length === 4 && userOrder.length === 4) {
                  const isExactMatch = actualOrder.every((team, idx) => team === userOrder[idx]);
                  if (isExactMatch) {
                    bonusOrder = 20;
                  }
                }
              }

              return {
                groupName: group.name,
                points: totalPoints + bonusOrder,
                bonusOrder
              };
            });
            setGroupPoints(pointsByGroup);
          }
        }

        // Calculate individual awards points
        const {
          data: awardsPredictions
        } = await supabase.from('award_predictions').select('award_type, player_name').eq('user_id', user.id).eq('tournament_id', '11111111-1111-1111-1111-111111111111');
        const {
          data: actualAwards
        } = await supabase.from('individual_awards').select('award_type, winner_name').eq('tournament_id', '11111111-1111-1111-1111-111111111111');
        let botaPoints = 0;
        let balonPoints = 0;
        if (awardsPredictions && actualAwards) {
          for (const pred of awardsPredictions) {
            const actual = actualAwards.find((a) => a.award_type === pred.award_type);
            if (actual && actual.winner_name && pred.player_name.toLowerCase().trim() === actual.winner_name.toLowerCase().trim()) {
              if (pred.award_type === 'bota_oro') {
                botaPoints = 30;
              } else if (pred.award_type === 'balon_oro') {
                balonPoints = 30;
              }
            }
          }
        }
        setAwardPoints({
          botaDeOro: botaPoints,
          balonDeOro: balonPoints
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
    const intervalId = window.setInterval(loadDashboardData, 30000);
    return () => window.clearInterval(intervalId);
  }, [user]);
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-muted-foreground">Cargando dashboard...</span>
        </div>
      </div>;
  }
  return <div className="min-h-screen">
      {/* Countdown Timer */}
      <CountdownTimer />

      {/* Hero Section */}
      <section className="px-4 pt-6 pb-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                ¡Hola, {stats?.displayName}!
              </h1>
              {podiumBadges.length > 0 && (
                <div className="mt-4 flex flex-wrap items-start gap-x-5 gap-y-4">
                  {podiumBadges.map((badge) => {
                    const badgeIndex = Math.max(0, Math.min(2, badge.rank - 1));
                    const badgeImage = podiumBadgeImages[badgeIndex];

                    return (
                      <div
                        key={`${badge.eventLabel}-${badge.rank}-${badge.points}`}
                        className="flex w-28 flex-col items-center gap-2 text-center sm:w-32"
                        title={`${badge.eventLabel}: #${badge.rank} con ${badge.points} puntos`}
                      >
                        <img
                          src={badgeImage}
                          alt={`Puesto ${badge.rank}`}
                          className="h-16 w-16 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)] sm:h-[72px] sm:w-[72px]"
                          loading="lazy"
                        />
                        <span className="w-full whitespace-normal break-words text-[11px] font-semibold leading-tight text-muted-foreground sm:text-xs">
                          {badge.eventLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Compact Position and Score Cards */}
            <div className="flex gap-3">
              <div className="glass px-4 py-2 flex items-center gap-3">
                <Medal className="w-5 h-5 text-gold" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Posición</p>
                  <p className="text-xl font-bold text-gold">
                    {stats?.rank ? `#${stats.rank}` : '-'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">de {stats?.totalParticipants || 0}</p>
                </div>
              </div>
              <div className="glass px-4 py-2 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Puntos</p>
                  <p className="text-xl font-bold text-primary">
                    {stats?.totalPoints || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">totales</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
        {privateLeaguesEnabled && (
          <Card className="border-0 bg-gradient-card shadow-soft">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Ligas privadas</h2>
                  <p className="text-sm text-muted-foreground">
                    Crea una nueva liga o únete con código desde la clasificación.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                  <Link to="/clasificacion">Ir a Clasificación</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Points Breakdown - Always expanded, compact */}
        <div className="grid grid-cols-1 md:grid-cols-[5fr_3fr_2fr] gap-4">
          {/* Fase de Grupos */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-sm">Fase de Grupos</span>
                </div>
              <Badge className="bg-primary text-primary-foreground text-base px-3">
                  {groupPoints.reduce((sum, g) => sum + g.points, 0)}
                </Badge>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {groupPoints.map((group) => <div key={group.groupName} className="flex min-h-12 items-center justify-between gap-2 rounded bg-muted/40 p-2 text-xs">
                    <span className="self-start text-muted-foreground">{group.groupName.replace('Grupo ', '')}</span>
                    <span className="text-lg font-black leading-none">{group.points}</span>
                  </div>)}
              </div>
            </CardContent>
          </Card>

          {/* Fase Final */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-secondary" />
                  <span className="font-semibold text-sm">Fase Final</span>
                </div>
                <Badge className="bg-secondary text-secondary-foreground text-base px-3">
                  {stats?.pointsPlayoffs || 0}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex min-h-12 items-center justify-between gap-2 rounded bg-muted/40 p-2 text-xs">
                  <span className="self-start text-muted-foreground">1/16</span>
                  <span className="text-lg font-black leading-none">{stats?.pointsR32 || 0}</span>
                </div>
                <div className="flex min-h-12 items-center justify-between gap-2 rounded bg-muted/40 p-2 text-xs">
                  <span className="self-start text-muted-foreground">1/8</span>
                  <span className="text-lg font-black leading-none">{stats?.pointsR16 || 0}</span>
                </div>
                <div className="flex min-h-12 items-center justify-between gap-2 rounded bg-muted/40 p-2 text-xs">
                  <span className="self-start text-muted-foreground">1/4</span>
                  <span className="text-lg font-black leading-none">{stats?.pointsQF || 0}</span>
                </div>
                <div className="flex min-h-12 items-center justify-between gap-2 rounded bg-muted/40 p-2 text-xs">
                  <span className="self-start text-muted-foreground">1/2</span>
                  <span className="text-lg font-black leading-none">{stats?.pointsSF || 0}</span>
                </div>
                <div className="flex min-h-12 items-center justify-between gap-2 rounded bg-muted/40 p-2 text-xs">
                  <span className="self-start text-muted-foreground">Final</span>
                  <span className="text-lg font-black leading-none">{stats?.pointsFinal || 0}</span>
                </div>
                <div className="flex min-h-12 items-center justify-between gap-2 rounded bg-muted/40 p-2 text-xs">
                  <span className="self-start text-muted-foreground">Campeón</span>
                  <span className="text-lg font-black leading-none">{stats?.pointsChampion || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Premios Individuales */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-gold" />
                  <span className="font-semibold text-sm">Premios</span>
                </div>
                <Badge className="bg-gold text-gold-foreground text-base px-3">
                  {stats?.pointsAwards || 0}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <div className="flex min-h-12 items-center justify-between gap-2 rounded bg-muted/40 p-2 text-xs">
                  <span className="self-start text-muted-foreground">Bota de Oro</span>
                  <span className="text-lg font-black leading-none">{awardPoints.botaDeOro}</span>
                </div>
                <div className="flex min-h-12 items-center justify-between gap-2 rounded bg-muted/40 p-2 text-xs">
                  <span className="self-start text-muted-foreground">Balón de Oro</span>
                  <span className="text-lg font-black leading-none">{awardPoints.balonDeOro}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent and Upcoming Matches Grid */}
        <div className="grid w-full max-w-full grid-cols-1 gap-6 overflow-hidden lg:grid-cols-2">
          {/* Upcoming Matches */}
          <Card className="min-w-0 max-w-full overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="flex min-w-0 items-center gap-2 text-base sm:text-lg">
                <Calendar className="h-5 w-5 shrink-0 text-primary" />
                Próximos Partidos
              </CardTitle>
              {upcomingMatches.length > 0 && (
                <Badge variant="secondary" className="shrink-0">{upcomingMatches.length}</Badge>
              )}
            </CardHeader>
            <CardContent className="min-w-0 overflow-hidden px-3 sm:px-6">
              {upcomingMatches.length > 0 ? <ScrollArea className="h-[460px] w-full max-w-full overflow-hidden">
                <div className="w-full max-w-full space-y-3 pr-1 sm:pr-2">
                  {upcomingMatches.map((match, index) => {
                    const roundSeparator = getUpcomingRoundSeparator(match);
                    const previousMatch = upcomingMatches[index - 1];
                    const previousRoundSeparator = previousMatch ? getUpcomingRoundSeparator(previousMatch) : null;
                    const showSeparator = index === 0 || roundSeparator !== previousRoundSeparator;

                    return (
                    <div key={match.id} className="w-full max-w-full space-y-2 overflow-hidden">
                      {showSeparator && (
                        <div className="flex items-center gap-2 pt-1">
                          <div className="h-px flex-1 bg-border/70" />
                          <span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {roundSeparator}
                          </span>
                          <div className="h-px flex-1 bg-border/70" />
                        </div>
                      )}
                      <div className="w-full max-w-full min-w-0 overflow-hidden rounded-lg border bg-muted/30 p-2.5 sm:p-3">
                      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[11px] px-1.5">
                            {match.match_date && format(new Date(match.match_date), "d MMM, HH:mm", {
                        locale: es
                      })}
                          </Badge>
                          {match.match_type === 'playoff' && (
                            <Badge variant="secondary" className="text-[11px] px-1.5">
                              {getShortRound(match.round)}
                            </Badge>
                          )}
                          {match.status === 'in_progress' && (
                            <Badge className="bg-success/20 text-success border-success/30 text-[11px] px-1.5">
                              En juego
                            </Badge>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center">
                          {match.match_type === 'group' && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => {
                      setSelectedMatchForStats({
                        id: match.id,
                        homeTeam: getTeamName(match.home_team),
                        awayTeam: getTeamName(match.away_team)
                      });
                      setStatsDialogOpen(true);
                    }} title={predictionsLocked ? "Ver estadisticas globales" : "Disponible cuando se cierren los pronosticos"}>
                            <BarChart3 className="w-3 h-3 mr-1" />
                            Estad.
                          </Button>}
                        </div>
                      </div>
                      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="font-medium text-sm truncate">{getTeamName(match.home_team)}</span>
                        </div>
                        <div className="w-[68px] rounded bg-background px-1.5 py-1 text-center sm:w-[78px] sm:px-2">
                          {match.status === 'in_progress' && match.home_goals !== null && match.away_goals !== null ? (
                            <div className="leading-tight">
                              <span className="block font-bold text-sm text-success">
                                {match.home_goals} - {match.away_goals}
                              </span>
                              {match.userPrediction && match.userPrediction.home_goals !== null && (
                                <span className="block text-[10px] text-muted-foreground">
                                  Tu porra: {match.userPrediction.home_goals} - {match.userPrediction.away_goals}
                                </span>
                              )}
                            </div>
                          ) : match.userPrediction && match.userPrediction.home_goals !== null ? <span className="font-bold text-sm">
                              {match.userPrediction.home_goals} - {match.userPrediction.away_goals}
                            </span> : <span className="text-muted-foreground text-sm">vs</span>}
                        </div>
                        <div className="flex min-w-0 items-center justify-end gap-2">
                          <span className="font-medium text-sm truncate">{getTeamName(match.away_team)}</span>
                        </div>
                      </div>
                      {match.match_type === 'playoff' && match.playoffStats && (
                        <div className="mt-2 grid w-full min-w-0 grid-cols-1 gap-1 rounded-md bg-background/60 p-2 text-[11px] text-muted-foreground">
                          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                            <span className="flex min-w-0 flex-1 items-center gap-1.5">
                              <span className="truncate">{getTeamName(match.home_team)} pasa</span>
                              {match.playoffStats.userHasHome && (
                                <Badge className="h-4 bg-success px-1.5 text-[9px] leading-none text-success-foreground">Tú</Badge>
                              )}
                            </span>
                            <span className="shrink-0 font-semibold text-foreground">{match.playoffStats.homeAdvances} pers.</span>
                          </div>
                          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                            <span className="flex min-w-0 flex-1 items-center gap-1.5">
                              <span className="truncate">{getTeamName(match.away_team)} pasa</span>
                              {match.playoffStats.userHasAway && (
                                <Badge className="h-4 bg-success px-1.5 text-[9px] leading-none text-success-foreground">Tú</Badge>
                              )}
                            </span>
                            <span className="shrink-0 font-semibold text-foreground">{match.playoffStats.awayAdvances} pers.</span>
                          </div>
                          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                            <span className="truncate">Ninguno de los dos</span>
                            <span className="shrink-0 font-semibold text-foreground">{match.playoffStats.neitherAdvances} pers.</span>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </ScrollArea> : <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay próximos partidos programados</p>
                </div>}
            </CardContent>
          </Card>

          {/* Last 5 Finished Matches */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-success" />
                Últimos Partidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentMatches.length > 0 ? <div className="space-y-2">
                  {recentMatches.map((match) => <div key={match.id}>
                      <div className="p-2.5 bg-muted/30 rounded-lg border">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {match.match_date && format(new Date(match.match_date), "d MMM", { locale: es })}
                            </Badge>
                            {match.userPrediction && match.userPrediction.home_goals !== null && (
                              <span className="text-[10px] text-muted-foreground">
                                ({match.userPrediction.home_goals}-{match.userPrediction.away_goals})
                              </span>
                            )}
                            {match.match_type === 'playoff' && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {getShortRound(match.round)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {match.match_type === 'group' && <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => loadDistribution(match.id, match.home_goals!, match.away_goals!)} title={predictionsLocked ? "Ver distribucion global" : "Disponible cuando se cierren los pronosticos"}>
                              <BarChart3 className="w-3 h-3 mr-0.5" />
                              Dist.
                            </Button>}
                            <Badge className={(match.pointsEarned || 0) > 10 ? "bg-success/80 text-white text-[10px] px-1.5" : (match.pointsEarned || 0) > 0 ? "bg-primary/80 text-white text-[10px] px-1.5" : "bg-muted/70 text-white text-[10px] px-1.5"}>
                              +{match.pointsEarned || 0}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs truncate flex-1">{getTeamName(match.home_team)}</span>
                          <div className="px-2 py-0.5 bg-background rounded text-center min-w-[55px]">
                            <span className="font-bold text-xs">{match.home_goals} - {match.away_goals}</span>
                          </div>
                          <span className="font-medium text-xs truncate flex-1 text-right">{getTeamName(match.away_team)}</span>
                        </div>
                        {match.match_type === 'playoff' && match.playoffDistribution && (
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                            {match.playoffDistribution.map((item) => (
                              <span key={`${match.id}-${item.points}`} className="rounded bg-background px-2 py-1 text-muted-foreground">
                                <span className="font-semibold text-foreground">{item.participants}</span> usuarios con {item.points} pts
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {distributionMatchId === match.id && (
                        <div className="mt-1 p-3 rounded-lg border bg-muted/20">
                          {!predictionsLocked ? (
                            <div className="py-4 text-center text-xs text-muted-foreground">
                              La distribucion global estara disponible cuando el administrador cierre los pronosticos.
                            </div>
                          ) : distributionLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                          ) : (
                            <div className="h-[160px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={distributionData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                  <XAxis dataKey="points" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} label={{ value: 'Puntos', position: 'insideBottom', offset: -2, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 } }} />
                                  <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                                  <Tooltip formatter={(value: number) => [`${value}`, 'Participantes']} labelFormatter={(l) => `${l} pts`} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                                  <Bar dataKey="participants" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={30} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      )}
                    </div>)}
                </div> : <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aún no hay partidos finalizados</p>
                </div>}
              {recentMatches.length > 0 && (
                <div className="mt-3 text-center">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setAllMatchesOpen(true)}>
                    Ver todos los partidos
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Match Stats Dialog */}
      {selectedMatchForStats && <MatchStatsDialog isOpen={statsDialogOpen} onClose={() => setStatsDialogOpen(false)} matchId={selectedMatchForStats.id} homeTeam={selectedMatchForStats.homeTeam} awayTeam={selectedMatchForStats.awayTeam} predictionsLocked={predictionsLocked} />}
      <AllMatchesDialog isOpen={allMatchesOpen} onClose={() => setAllMatchesOpen(false)} />
    </div>;
}

