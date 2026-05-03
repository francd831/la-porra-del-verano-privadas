import { useState, useEffect, useMemo } from "react";
import { Target, Users, Search, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Interfaces and types
interface Team {
  id: string;
  name: string;
  flag: string;
  code: string;
}

interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  group_id: string;
  round: string;
  match_type: string;
  home_team?: Team;
  away_team?: Team;
}

interface UserProfile {
  user_id: string;
  display_name: string;
}

interface DisplayPrediction {
  id: string;
  userName: string;
  userId: string;
  matchDisplay: string;
  roundDisplay: string;
  predictionDisplay: string;
  roundOrder: number;
  sortKey: number;
}

interface TopPrediction {
  prediction: string;
  count: number;
  percentage: number;
}

// Order for rounds
const ROUND_ORDER: { [key: string]: number } = {
  'Fase de Grupos': 1,
  'Dieciseisavos': 2,
  'Octavos': 3,
  'Cuartos': 4,
  'Semifinales': 5,
  'Final': 6,
  'Campeón': 7,
  'Premios Individuales': 8,
};

const calculateGroupStandings = (
  groupMatches: Match[],
  predictions: Map<string, { home_goals: number; away_goals: number }>,
  teamsMap: Map<string, Team>
): Team[] => {
  const stats: Record<string, { team: Team; points: number; gf: number; ga: number; gd: number }> = {};

  groupMatches.forEach(match => {
    const prediction = predictions.get(match.id);
    if (!prediction || prediction.home_goals === null || prediction.away_goals === null) return;

    const homeTeam = teamsMap.get(match.home_team_id);
    const awayTeam = teamsMap.get(match.away_team_id);
    if (!homeTeam || !awayTeam) return;

    if (!stats[homeTeam.id]) stats[homeTeam.id] = { team: homeTeam, points: 0, gf: 0, ga: 0, gd: 0 };
    if (!stats[awayTeam.id]) stats[awayTeam.id] = { team: awayTeam, points: 0, gf: 0, ga: 0, gd: 0 };

    stats[homeTeam.id].gf += prediction.home_goals;
    stats[homeTeam.id].ga += prediction.away_goals;
    stats[awayTeam.id].gf += prediction.away_goals;
    stats[awayTeam.id].ga += prediction.home_goals;

    if (prediction.home_goals > prediction.away_goals) {
      stats[homeTeam.id].points += 3;
    } else if (prediction.home_goals < prediction.away_goals) {
      stats[awayTeam.id].points += 3;
    } else {
      stats[homeTeam.id].points += 1;
      stats[awayTeam.id].points += 1;
    }
  });

  return Object.values(stats)
    .map(s => ({ ...s, gd: s.gf - s.ga }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    })
    .map(s => s.team);
};

const calculateR32Teams = (
  groupMatchesByGroup: Map<string, Match[]>,
  userPredictions: Map<string, { home_goals: number; away_goals: number }>,
  teamsMap: Map<string, Team>
): Team[] => {
  const standings: Record<string, Team[]> = {};
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  groups.forEach(group => {
    const matches = groupMatchesByGroup.get(group) || [];
    standings[group] = calculateGroupStandings(matches, userPredictions, teamsMap);
  });

  const qualified: Team[] = [];
  groups.forEach(group => {
    if (standings[group]?.[0]) qualified.push(standings[group][0]);
    if (standings[group]?.[1]) qualified.push(standings[group][1]);
  });

  const thirds: { team: Team; points: number; gd: number; gf: number }[] = [];
  groups.forEach(group => {
    const third = standings[group]?.[2];
    if (third) {
      const matches = groupMatchesByGroup.get(group) || [];
      let points = 0, gf = 0, ga = 0;
      matches.forEach(m => {
        const pred = userPredictions.get(m.id);
        if (!pred) return;
        if (m.home_team_id === third.id) {
          gf += pred.home_goals;
          ga += pred.away_goals;
          if (pred.home_goals > pred.away_goals) points += 3;
          else if (pred.home_goals === pred.away_goals) points += 1;
        } else if (m.away_team_id === third.id) {
          gf += pred.away_goals;
          ga += pred.home_goals;
          if (pred.away_goals > pred.home_goals) points += 3;
          else if (pred.away_goals === pred.home_goals) points += 1;
        }
      });
      thirds.push({ team: third, points, gd: gf - ga, gf });
    }
  });

  thirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  thirds.slice(0, 8).forEach(t => qualified.push(t.team));

  return qualified;
};

type SectionType = 'groups' | 'playoffs' | 'awards';

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const PLAYOFF_ROUNDS = [
  { key: 'Dieciseisavos', label: '1/16' },
  { key: 'Octavos', label: '1/8' },
  { key: 'Cuartos', label: '1/4' },
  { key: 'Semifinales', label: '1/2' },
  { key: 'Final', label: 'Final' },
  { key: 'Campeón', label: 'Campeón' },
];
const AWARD_TYPES = [
  { key: 'Bota de Oro', label: 'Bota de Oro' },
  { key: 'Balón de Oro', label: 'Balón de Oro' },
];

export default function Pronosticos() {
  const [displayPredictions, setDisplayPredictions] = useState<DisplayPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictionsLocked, setPredictionsLocked] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Navigation state
  const [activeSection, setActiveSection] = useState<SectionType>('groups');
  const [selectedGroup, setSelectedGroup] = useState<string>('A');
  const [selectedPlayoffRound, setSelectedPlayoffRound] = useState<string>('Dieciseisavos');
  const [selectedAward, setSelectedAward] = useState<string>('Bota de Oro');
  
  // User filter & search
  const [filterUser, setFilterUser] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('predictions_locked')
        .eq('id', '11111111-1111-1111-1111-111111111111')
        .single();

      if (!tournamentData?.predictions_locked) {
        setPredictionsLocked(false);
        setLoading(false);
        return;
      }
      setPredictionsLocked(true);

      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      const adminIds = new Set((adminRoles || []).map(r => r.user_id));

      const { data: teamsData } = await supabase.from('teams').select('*').order('name');
      const teamsMap = new Map((teamsData || []).map(t => [t.id, t]));

      const { data: matchesData } = await supabase
        .from('matches')
        .select(`*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)`)
        .eq('tournament_id', '11111111-1111-1111-1111-111111111111')
        .order('match_date');

      const groupMatchesByGroup = new Map<string, Match[]>();
      (matchesData || []).filter(m => m.match_type === 'group').forEach(m => {
        const groupLetter = m.group_id?.replace('GROUP_', '') || m.id.charAt(0);
        if (!groupMatchesByGroup.has(groupLetter)) groupMatchesByGroup.set(groupLetter, []);
        groupMatchesByGroup.get(groupLetter)!.push(m);
      });

      const { data: submissionsUsers } = await supabase
        .from('user_submissions')
        .select('user_id')
        .eq('tournament_id', '11111111-1111-1111-1111-111111111111');
      
      const allUserIds = (submissionsUsers || []).map(s => s.user_id).filter(id => !adminIds.has(id));
      const { data: profilesData } = await supabase.rpc('get_user_display_names', { p_user_ids: allUserIds });
      
      const filteredProfiles = (profilesData || []).map(p => ({
        user_id: p.user_id,
        display_name: p.display_name || 'Usuario'
      }));
      setUsers(filteredProfiles);
      const usersMap = new Map(filteredProfiles.map(u => [u.user_id, u.display_name]));

      const { data: predictionsData } = await supabase.from('predictions').select('*');
      const { data: awardPredictionsData } = await supabase
        .from('award_predictions').select('*').eq('tournament_id', '11111111-1111-1111-1111-111111111111');
      const { data: championPredictionsData } = await supabase
        .from('champion_predictions').select('*').eq('tournament_id', '11111111-1111-1111-1111-111111111111');

      const allDisplayPredictions: DisplayPrediction[] = [];
      const isGroupStageMatchId = (matchId: string) => /^[A-L]_\d+$/.test(matchId);

      const predictionsByUser = new Map<string, typeof predictionsData>();
      (predictionsData || []).filter(p => !adminIds.has(p.user_id)).forEach(p => {
        if (!predictionsByUser.has(p.user_id)) predictionsByUser.set(p.user_id, []);
        predictionsByUser.get(p.user_id)!.push(p);
      });

      predictionsByUser.forEach((userPreds, userId) => {
        const userName = usersMap.get(userId) || 'Usuario';
        const groupPreds = new Map<string, { home_goals: number; away_goals: number }>();
        const playoffWinners = new Map<string, string>();

        userPreds.forEach(p => {
          if (p.match_id && isGroupStageMatchId(p.match_id) && p.home_goals !== null && p.away_goals !== null) {
            groupPreds.set(p.match_id, { home_goals: p.home_goals, away_goals: p.away_goals });
          }
          if (p.predicted_winner_team_id && p.playoff_round) {
            playoffWinners.set(p.playoff_round, p.predicted_winner_team_id);
          }
        });

        // Group stage predictions
        userPreds.forEach(p => {
          if (p.match_id && isGroupStageMatchId(p.match_id) && p.home_goals !== null && p.away_goals !== null) {
            const match = (matchesData || []).find(m => m.id === p.match_id);
            const groupLetter = p.match_id.charAt(0);
            let predDisplay = `${p.home_goals} - ${p.away_goals}`;
            if (match && match.home_goals !== null && match.away_goals !== null) {
              predDisplay = `${p.home_goals} - ${p.away_goals} (Real: ${match.home_goals} - ${match.away_goals})`;
            }
            allDisplayPredictions.push({
              id: p.id, userName, userId,
              matchDisplay: match ? `${match.home_team?.name || match.home_team_id} vs ${match.away_team?.name || match.away_team_id}` : p.match_id,
              roundDisplay: `Grupo ${groupLetter}`,
              predictionDisplay: predDisplay,
              roundOrder: 1, sortKey: 0,
            });
          }
        });

        // R32 teams
        const r32Teams = calculateR32Teams(groupMatchesByGroup, groupPreds, teamsMap);
        r32Teams.forEach((team, index) => {
          allDisplayPredictions.push({
            id: `${userId}_r32_${index}`, userName, userId,
            matchDisplay: `Dieciseisavos ${index + 1}`,
            roundDisplay: 'Dieciseisavos',
            predictionDisplay: team.name,
            roundOrder: 2, sortKey: index + 1,
          });
        });

        // Playoff rounds
        const playoffConfig = [
          { prefix: 'R32_', count: 16, round: 'Octavos', order: 3 },
          { prefix: 'R16_', count: 8, round: 'Cuartos', order: 4 },
          { prefix: 'QF_', count: 4, round: 'Semifinales', order: 5 },
          { prefix: 'SF_', count: 2, round: 'Final', order: 6 },
        ];
        playoffConfig.forEach(({ prefix, count, round, order }) => {
          for (let i = 1; i <= count; i++) {
            const winnerId = playoffWinners.get(`${prefix}${i}`);
            if (winnerId) {
              const team = teamsMap.get(winnerId);
              allDisplayPredictions.push({
                id: `${userId}_${prefix}${i}`, userName, userId,
                matchDisplay: `${round} ${i}`,
                roundDisplay: round,
                predictionDisplay: team?.name || winnerId,
                roundOrder: order, sortKey: i,
              });
            }
          }
        });
      });

      // Champion predictions
      (championPredictionsData || []).filter(cp => !adminIds.has(cp.user_id)).forEach(cp => {
        const userName = usersMap.get(cp.user_id) || 'Usuario';
        const team = teamsMap.get(cp.predicted_winner_team_id);
        allDisplayPredictions.push({
          id: cp.id, userName, userId: cp.user_id,
          matchDisplay: 'Campeón', roundDisplay: 'Campeón',
          predictionDisplay: team?.name || cp.predicted_winner_team_id,
          roundOrder: 7, sortKey: 1,
        });
      });

      // Award predictions
      (awardPredictionsData || []).filter(ap => !adminIds.has(ap.user_id)).forEach(ap => {
        const userName = usersMap.get(ap.user_id) || 'Usuario';
        const awardName = ap.award_type === 'balon_oro' ? 'Balón de Oro' : 'Bota de Oro';
        allDisplayPredictions.push({
          id: ap.id, userName, userId: ap.user_id,
          matchDisplay: awardName, roundDisplay: 'Premios Individuales',
          predictionDisplay: ap.player_name,
          roundOrder: 8, sortKey: ap.award_type === 'balon_oro' ? 1 : 2,
        });
      });

      setDisplayPredictions(allDisplayPredictions);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Current active filter based on section + sub-selection
  const activeRoundFilter = useMemo(() => {
    if (activeSection === 'groups') return `Grupo ${selectedGroup}`;
    if (activeSection === 'playoffs') return selectedPlayoffRound;
    return 'Premios Individuales';
  }, [activeSection, selectedGroup, selectedPlayoffRound]);

  // Filtered predictions based on active selection
  const filteredPredictions = useMemo(() => {
    return displayPredictions.filter(p => {
      // Section filter
      if (activeSection === 'groups') {
        if (p.roundDisplay !== `Grupo ${selectedGroup}`) return false;
      } else if (activeSection === 'playoffs') {
        if (p.roundDisplay !== selectedPlayoffRound) return false;
      } else {
        if (p.roundDisplay !== 'Premios Individuales') return false;
        if (p.matchDisplay !== selectedAward) return false;
      }
      // User filter
      if (filterUser !== 'all' && p.userId !== filterUser) return false;
      // Search
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!p.userName.toLowerCase().includes(s) && !p.predictionDisplay.toLowerCase().includes(s) && !p.matchDisplay.toLowerCase().includes(s)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.roundOrder !== b.roundOrder) return a.roundOrder - b.roundOrder;
      return a.sortKey - b.sortKey;
    });
  }, [displayPredictions, activeSection, selectedGroup, selectedPlayoffRound, selectedAward, filterUser, searchTerm]);

  // Calculate top predictions - for groups: top 3 per match; for playoffs: aggregate all teams across the round
  const topPredictionsByMatch = useMemo(() => {
    if (activeSection === 'playoffs' || activeSection === 'awards') return new Map<string, TopPrediction[]>();
    
    // Groups: top 3 per match as before
    const relevantPreds = displayPredictions.filter(p => p.roundDisplay === `Grupo ${selectedGroup}`);
    const byMatch = new Map<string, Map<string, number>>();
    const totalByMatch = new Map<string, number>();

    relevantPreds.forEach(p => {
      if (!byMatch.has(p.matchDisplay)) {
        byMatch.set(p.matchDisplay, new Map());
        totalByMatch.set(p.matchDisplay, 0);
      }
      const predMap = byMatch.get(p.matchDisplay)!;
      const cleanPred = p.predictionDisplay.includes(' (Real:')
        ? p.predictionDisplay.split(' (Real:')[0]
        : p.predictionDisplay;
      predMap.set(cleanPred, (predMap.get(cleanPred) || 0) + 1);
      totalByMatch.set(p.matchDisplay, (totalByMatch.get(p.matchDisplay) || 0) + 1);
    });

    const result = new Map<string, TopPrediction[]>();
    byMatch.forEach((predMap, matchDisplay) => {
      const total = totalByMatch.get(matchDisplay) || 1;
      const sorted = Array.from(predMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([prediction, count]) => ({
          prediction,
          count,
          percentage: Math.round((count / total) * 100),
        }));
      result.set(matchDisplay, sorted);
    });

    return result;
  }, [displayPredictions, activeSection, selectedGroup]);

  // Aggregate playoff/award stats: count how many times each team/player appears across all slots in the round
  const aggregatedRoundStats = useMemo(() => {
    if (activeSection === 'groups') return [];

    let relevantPreds: DisplayPrediction[];
    if (activeSection === 'playoffs') {
      relevantPreds = displayPredictions.filter(p => p.roundDisplay === selectedPlayoffRound);
    } else {
      relevantPreds = displayPredictions.filter(p => p.roundDisplay === 'Premios Individuales' && p.matchDisplay === selectedAward);
    }

    // Count occurrences of each prediction value (team name or player name)
    const countMap = new Map<string, number>();
    const totalUsers = new Set(relevantPreds.map(p => p.userId)).size;

    relevantPreds.forEach(p => {
      const cleanPred = p.predictionDisplay.includes(' (Real:')
        ? p.predictionDisplay.split(' (Real:')[0]
        : p.predictionDisplay;
      countMap.set(cleanPred, (countMap.get(cleanPred) || 0) + 1);
    });

    // For playoffs, we need to know the total number of users to compute %
    // Each user can pick multiple teams per round (e.g. 32 teams in R32), so % = count / totalUsers * 100
    const sorted = Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([prediction, count]) => ({
        prediction,
        count,
        percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0,
      }));

    return sorted;
  }, [displayPredictions, activeSection, selectedPlayoffRound, selectedAward]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center">Cargando pronósticos...</div>
      </div>
    );
  }

  if (!predictionsLocked) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center shadow-glow">
              <Target className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Pronósticos</h1>
              <p className="text-muted-foreground">Ver todos los pronósticos</p>
            </div>
          </div>
        </div>
        <Card className="shadow-soft border-0 bg-gradient-card">
          <CardContent className="p-8 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Pronósticos bloqueados</h2>
            <p className="text-muted-foreground">
              Los pronósticos de todos los participantes estarán disponibles una vez que el administrador bloquee los pronósticos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center shadow-glow">
            <Target className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Pronósticos</h1>
            <p className="text-muted-foreground">Todos los pronósticos de los participantes</p>
          </div>
        </div>
      </div>

      {/* Section Selector */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={activeSection === 'groups' ? 'default' : 'outline'}
          onClick={() => setActiveSection('groups')}
          className="text-sm"
        >
          Fase de Grupos
        </Button>
        <Button
          variant={activeSection === 'playoffs' ? 'default' : 'outline'}
          onClick={() => setActiveSection('playoffs')}
          className="text-sm"
        >
          Fase Final
        </Button>
        <Button
          variant={activeSection === 'awards' ? 'default' : 'outline'}
          onClick={() => setActiveSection('awards')}
          className="text-sm"
        >
          Premios
        </Button>
      </div>

      {/* Sub-selectors */}
      <div className="mb-6">
        {activeSection === 'groups' && (
          <div className="flex flex-wrap gap-1.5">
            {GROUP_LETTERS.map(letter => (
              <Button
                key={letter}
                size="sm"
                variant={selectedGroup === letter ? 'default' : 'outline'}
                onClick={() => setSelectedGroup(letter)}
                className="w-9 h-9 p-0 text-xs font-semibold"
              >
                {letter}
              </Button>
            ))}
          </div>
        )}
        {activeSection === 'playoffs' && (
          <div className="flex flex-wrap gap-1.5">
            {PLAYOFF_ROUNDS.map(round => (
              <Button
                key={round.key}
                size="sm"
                variant={selectedPlayoffRound === round.key ? 'default' : 'outline'}
                onClick={() => setSelectedPlayoffRound(round.key)}
                className="text-xs"
              >
                {round.label}
              </Button>
            ))}
          </div>
        )}
        {activeSection === 'awards' && (
          <div className="flex flex-wrap gap-1.5">
            {AWARD_TYPES.map(award => (
              <Button
                key={award.key}
                size="sm"
                variant={selectedAward === award.key ? 'default' : 'outline'}
                onClick={() => setSelectedAward(award.key)}
                className="text-xs"
              >
                {award.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Top predictions - Groups: per match; Playoffs/Awards: aggregated */}
      {activeSection === 'groups' && topPredictionsByMatch.size > 0 && (
        <Card className="shadow-soft border-0 bg-gradient-card mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Pronósticos más repetidos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(topPredictionsByMatch.entries()).map(([matchDisplay, tops]) => (
                <div key={matchDisplay} className="bg-muted/30 rounded-lg p-3 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 truncate">{matchDisplay}</p>
                  <div className="space-y-1.5">
                    {tops.map((top, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant={idx === 0 ? 'default' : 'secondary'} className="text-[10px] px-1.5 shrink-0">
                            {idx + 1}º
                          </Badge>
                          <span className="text-sm font-medium truncate">{top.prediction}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${top.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{top.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(activeSection === 'playoffs' || activeSection === 'awards') && aggregatedRoundStats.length > 0 && (
        <Card className="shadow-soft border-0 bg-gradient-card mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>
                {activeSection === 'playoffs' 
                  ? `Equipos en ${selectedPlayoffRound}` 
                  : selectedAward}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const maxPercentage = aggregatedRoundStats.length > 0 ? aggregatedRoundStats[0].percentage : 100;
              const half = Math.ceil(aggregatedRoundStats.length / 2);
              const col1 = aggregatedRoundStats.slice(0, half);
              const col2 = aggregatedRoundStats.slice(half);

              const renderBar = (item: typeof aggregatedRoundStats[0]) => (
                <div key={item.prediction} className="flex items-center gap-2 py-1">
                  <span className="text-xs font-medium w-24 truncate shrink-0 text-right">{item.prediction}</span>
                  <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden relative">
                    <div
                      className="h-full bg-primary/80 rounded transition-all"
                      style={{ width: `${maxPercentage > 0 ? (item.percentage / maxPercentage) * 100 : 0}%` }}
                    />
                    {item.percentage > 0 && (
                      <span className="absolute inset-y-0 left-1 flex items-center text-[10px] font-semibold text-primary-foreground">
                        {item.percentage}%
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">{item.percentage}%</span>
                </div>
              );

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <div>{col1.map(renderBar)}</div>
                  <div>{col2.map(renderBar)}</div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por usuario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los usuarios</SelectItem>
            {users.map(u => (
              <SelectItem key={u.user_id} value={u.user_id}>{u.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredPredictions.length} pronósticos
        </p>
        {(filterUser !== 'all' || searchTerm) && (
          <button 
            onClick={() => { setFilterUser('all'); setSearchTerm(''); }}
            className="text-sm text-primary hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Predictions table */}
      <Card className="shadow-strong border-0 bg-gradient-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-semibold text-xs">Usuario</th>
                  <th className="text-left p-3 font-semibold text-xs">Partido</th>
                  <th className="text-center p-3 font-semibold text-xs">Pronóstico</th>
                </tr>
              </thead>
              <tbody>
                {filteredPredictions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                      No se encontraron pronósticos con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  filteredPredictions.map((item, index) => {
                    const isCurrentUser = user && item.userId === user.id;
                    const isScorePrediction = item.predictionDisplay.includes(' - ');
                    
                    return (
                      <tr
                        key={`${item.id}-${index}`}
                        className={`border-b border-border/50 transition-all hover:bg-muted/20 ${
                          isCurrentUser ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm truncate max-w-[120px]">{item.userName}</span>
                            {isCurrentUser && (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">Tú</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm">{item.matchDisplay}</span>
                        </td>
                        <td className="p-3 text-center">
                          {isScorePrediction ? (
                            <Badge className="bg-primary text-primary-foreground text-xs">{item.predictionDisplay}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">{item.predictionDisplay}</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

