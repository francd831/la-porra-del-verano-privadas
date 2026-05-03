import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, ArrowRight, Medal, TrendingUp, ChevronDown, ChevronUp, Trophy, Target, Award, BarChart3, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import CountdownTimer from "@/components/CountdownTimer";
import MatchStatsDialog from "@/components/MatchStatsDialog";
import AllMatchesDialog from "@/components/AllMatchesDialog";

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
  home_team: {
    name: string;
  };
  away_team: {
    name: string;
  };
  home_goals: number | null;
  away_goals: number | null;
  userPrediction?: {
    home_goals: number | null;
    away_goals: number | null;
  };
  pointsEarned?: number;
  group_id?: string | null;
}
interface UpcomingMatch {
  id: string;
  match_date: string;
  home_team: {
    name: string;
  };
  away_team: {
    name: string;
  };
  userPrediction?: {
    home_goals: number | null;
    away_goals: number | null;
  };
}
interface AwardPoints {
  botaDeOro: number;
  balonDeOro: number;
}

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
  

  const loadDistribution = async (matchId: string, actualHome: number, actualAway: number) => {
    if (distributionMatchId === matchId) { setDistributionMatchId(null); return; }
    setDistributionMatchId(matchId);
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
        const nonAdminSubmissions = allSubmissions?.filter((s) => !adminIds.has(s.user_id)) || [];
        const userRank = nonAdminSubmissions.findIndex((s) => s.user_id === user.id) + 1;
        const totalParticipants = nonAdminSubmissions.length;
        setStats({
          displayName: profileData?.display_name || user.email?.split('@')[0] || 'Usuario',
          totalPoints: submissionData?.points_total || 0,
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
            home_goals,
            away_goals,
            group_id,
            home_team:teams!matches_home_team_id_fkey(name),
            away_team:teams!matches_away_team_id_fkey(name)
          `).eq('tournament_id', '11111111-1111-1111-1111-111111111111').eq('status', 'completed').eq('match_type', 'group').not('home_goals', 'is', null).not('away_goals', 'is', null).order('match_date', {
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
              home_team: match.home_team as {
                name: string;
                flag: string;
              },
              away_team: match.away_team as {
                name: string;
                flag: string;
              },
              home_goals: match.home_goals,
              away_goals: match.away_goals,
              group_id: match.group_id,
              userPrediction: prediction,
              pointsEarned
            };
          });
          setRecentMatches(matchesWithPoints);
        }

        // Load next 5 upcoming matches from current date
        const now = new Date().toISOString();
        const {
          data: upcomingMatchesData
        } = await supabase.from('matches').select(`
            id,
            match_date,
            home_team:teams!matches_home_team_id_fkey(name),
            away_team:teams!matches_away_team_id_fkey(name)
          `).eq('tournament_id', '11111111-1111-1111-1111-111111111111').neq('status', 'completed').gte('match_date', now).not('match_date', 'is', null).order('match_date', {
          ascending: true
        }).limit(5);
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
            home_team: match.home_team as {
              name: string;
              flag: string;
            },
            away_team: match.away_team as {
              name: string;
              flag: string;
            },
            userPrediction: predictionsMap.get(match.id)
          }));
          setUpcomingMatches(upcoming);
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

            // Sort teams by points, then GD, then GF
            const sortedTeams = Array.from(teamStats.entries()).
            sort((a, b) => {
              if (b[1].points !== a[1].points) return b[1].points - a[1].points;
              if (b[1].gd !== a[1].gd) return b[1].gd - a[1].gd;
              return b[1].gf - a[1].gf;
            }).
            map(([teamId]) => teamId);

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

              const sortedTeams = Array.from(teamStats.entries()).
              sort((a, b) => {
                if (b[1].points !== a[1].points) return b[1].points - a[1].points;
                if (b[1].gd !== a[1].gd) return b[1].gd - a[1].gd;
                return b[1].gf - a[1].gf;
              }).
              map(([teamId]) => teamId);

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
                {groupPoints.map((group) => <div key={group.groupName} className="flex flex-col items-center p-1.5 bg-muted/40 rounded text-xs relative">
                    <span className="text-muted-foreground">{group.groupName.replace('Grupo ', '')}</span>
                    <span className="font-semibold">{group.points}</span>
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
                <div className="flex flex-col items-center p-1.5 bg-muted/40 rounded text-xs">
                  <span className="text-muted-foreground">1/16</span>
                  <span className="font-semibold">{stats?.pointsR32 || 0}</span>
                </div>
                <div className="flex flex-col items-center p-1.5 bg-muted/40 rounded text-xs">
                  <span className="text-muted-foreground">1/8</span>
                  <span className="font-semibold">{stats?.pointsR16 || 0}</span>
                </div>
                <div className="flex flex-col items-center p-1.5 bg-muted/40 rounded text-xs">
                  <span className="text-muted-foreground">1/4</span>
                  <span className="font-semibold">{stats?.pointsQF || 0}</span>
                </div>
                <div className="flex flex-col items-center p-1.5 bg-muted/40 rounded text-xs">
                  <span className="text-muted-foreground">1/2</span>
                  <span className="font-semibold">{stats?.pointsSF || 0}</span>
                </div>
                <div className="flex flex-col items-center p-1.5 bg-muted/40 rounded text-xs">
                  <span className="text-muted-foreground">Final</span>
                  <span className="font-semibold">{stats?.pointsFinal || 0}</span>
                </div>
                <div className="flex flex-col items-center p-1.5 bg-muted/40 rounded text-xs">
                  <span className="text-muted-foreground">Campeón</span>
                  <span className="font-semibold">{stats?.pointsChampion || 0}</span>
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
                <div className="flex flex-col items-center p-3 bg-muted/40 rounded text-sm">
                  <span className="text-muted-foreground text-xs">Bota de Oro</span>
                  <span className="font-semibold text-base">{awardPoints.botaDeOro}</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-muted/40 rounded text-sm">
                  <span className="text-muted-foreground text-xs">Balón de Oro</span>
                  <span className="font-semibold text-base">{awardPoints.balonDeOro}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent and Upcoming Matches Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Next 5 Upcoming Matches */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Próximos Partidos
              </CardTitle>
              <Link to="/mi-porra">
                
              </Link>
            </CardHeader>
            <CardContent>
              {upcomingMatches.length > 0 ? <div className="space-y-3">
                  {upcomingMatches.map((match) => <div key={match.id} className="p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {match.match_date && format(new Date(match.match_date), "d MMM, HH:mm", {
                      locale: es
                    })}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => {
                      setSelectedMatchForStats({
                        id: match.id,
                        homeTeam: match.home_team?.name || '',
                        awayTeam: match.away_team?.name || ''
                      });
                      setStatsDialogOpen(true);
                    }}>
                            <BarChart3 className="w-3 h-3 mr-1" />
                            Estadísticas
                          </Button>
                          {match.userPrediction && match.userPrediction.home_goals !== null ? <Badge className="bg-success/20 text-success border-success/30">
                            Pronosticado
                          </Badge> : <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            Sin pronóstico
                          </Badge>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-medium text-sm truncate">{match.home_team?.name}</span>
                        </div>
                        <div className="px-3 py-1 bg-background rounded text-center min-w-[70px]">
                          {match.userPrediction && match.userPrediction.home_goals !== null ? <span className="font-bold text-sm">
                              {match.userPrediction.home_goals} - {match.userPrediction.away_goals}
                            </span> : <span className="text-muted-foreground text-sm">vs</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="font-medium text-sm truncate">{match.away_team?.name}</span>
                        </div>
                      </div>
                    </div>)}
                </div> : <div className="text-center py-8 text-muted-foreground">
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
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => loadDistribution(match.id, match.home_goals!, match.away_goals!)}>
                              <BarChart3 className="w-3 h-3 mr-0.5" />
                              Dist.
                            </Button>
                            <Badge className={(match.pointsEarned || 0) > 10 ? "bg-success text-success-foreground text-[10px] px-1.5" : (match.pointsEarned || 0) > 0 ? "bg-primary/20 text-primary text-[10px] px-1.5" : "bg-muted text-muted-foreground text-[10px] px-1.5"}>
                              +{match.pointsEarned || 0}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs truncate flex-1">{match.home_team?.name}</span>
                          <div className="px-2 py-0.5 bg-background rounded text-center min-w-[55px]">
                            <span className="font-bold text-xs">{match.home_goals} - {match.away_goals}</span>
                          </div>
                          <span className="font-medium text-xs truncate flex-1 text-right">{match.away_team?.name}</span>
                        </div>
                      </div>
                      {distributionMatchId === match.id && (
                        <div className="mt-1 p-3 rounded-lg border bg-muted/20">
                          {distributionLoading ? (
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
      {selectedMatchForStats && <MatchStatsDialog isOpen={statsDialogOpen} onClose={() => setStatsDialogOpen(false)} matchId={selectedMatchForStats.id} homeTeam={selectedMatchForStats.homeTeam} awayTeam={selectedMatchForStats.awayTeam} />}
      <AllMatchesDialog isOpen={allMatchesOpen} onClose={() => setAllMatchesOpen(false)} />
    </div>;
}
