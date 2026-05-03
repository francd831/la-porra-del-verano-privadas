import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Trophy, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AllMatchesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MatchWithPoints {
  id: string;
  match_date: string;
  home_team: { name: string };
  away_team: { name: string };
  home_goals: number;
  away_goals: number;
  userPoints: number;
  group_id: string | null;
}

interface PointsDistribution {
  points: number;
  participants: number;
}

function calculateMatchPoints(
  prediction: { home_goals: number | null; away_goals: number | null } | undefined,
  actualHome: number,
  actualAway: number
): number {
  if (!prediction || prediction.home_goals === null || prediction.away_goals === null) return 0;
  let points = 0;
  const predHome = prediction.home_goals;
  const predAway = prediction.away_goals;
  const actualSign = actualHome > actualAway ? '1' : actualHome < actualAway ? '2' : 'X';
  const predSign = predHome > predAway ? '1' : predHome < predAway ? '2' : 'X';
  const exactResult = predHome === actualHome && predAway === actualAway;
  if (exactResult) {
    points = 5 + 2 + actualHome + 2 + actualAway + 6;
  } else {
    if (actualSign === predSign) points += 5;
    if (predHome === actualHome) points += 2 + actualHome;
    if (predAway === actualAway) points += 2 + actualAway;
  }
  return points;
}

export default function AllMatchesDialog({ isOpen, onClose }: AllMatchesDialogProps) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchWithPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [distributionData, setDistributionData] = useState<PointsDistribution[]>([]);
  const [distributionLoading, setDistributionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) fetchAllMatches();
  }, [isOpen, user]);

  const fetchAllMatches = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          id, match_date, home_goals, away_goals, group_id,
          home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name)
        `)
        .eq('tournament_id', '11111111-1111-1111-1111-111111111111')
        .eq('status', 'completed')
        .eq('match_type', 'group')
        .not('home_goals', 'is', null)
        .not('away_goals', 'is', null)
        .order('match_date', { ascending: false });

      if (!matchesData?.length) { setMatches([]); return; }

      const matchIds = matchesData.map(m => m.id);
      const { data: predictionsData } = await supabase
        .from('predictions')
        .select('match_id, home_goals, away_goals')
        .eq('user_id', user.id)
        .in('match_id', matchIds);

      const predMap = new Map(predictionsData?.map(p => [p.match_id, p]) || []);

      setMatches(matchesData.map(m => ({
        id: m.id,
        match_date: m.match_date || '',
        home_team: m.home_team as { name: string },
        away_team: m.away_team as { name: string },
        home_goals: m.home_goals!,
        away_goals: m.away_goals!,
        group_id: m.group_id,
        userPoints: calculateMatchPoints(predMap.get(m.id), m.home_goals!, m.away_goals!),
      })));
    } catch (e) {
      console.error('Error loading all matches:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadDistribution = async (matchId: string) => {
    setDistributionLoading(true);
    setSelectedMatchId(matchId);
    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      // Get admin IDs to exclude
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      const adminIds = new Set((adminRoles || []).map(r => r.user_id));

      // Get all predictions for this match
      const { data: predictions } = await supabase
        .from('predictions')
        .select('home_goals, away_goals, user_id')
        .eq('match_id', matchId)
        .not('home_goals', 'is', null)
        .not('away_goals', 'is', null);

      const userPredictions = (predictions || []).filter(p => !adminIds.has(p.user_id));

      // Calculate points for each user
      const pointsCounts: Record<number, number> = {};
      userPredictions.forEach(p => {
        const pts = calculateMatchPoints(
          { home_goals: p.home_goals, away_goals: p.away_goals },
          match.home_goals,
          match.away_goals
        );
        pointsCounts[pts] = (pointsCounts[pts] || 0) + 1;
      });

      // Find max points to fill in gaps
      const maxPts = Math.max(0, ...Object.keys(pointsCounts).map(Number));
      const distribution: PointsDistribution[] = [];
      for (let i = 0; i <= maxPts; i++) {
        if (pointsCounts[i]) {
          distribution.push({ points: i, participants: pointsCounts[i] });
        }
      }
      // Always include 0 if not present
      if (!pointsCounts[0] && distribution.length > 0) {
        distribution.unshift({ points: 0, participants: 0 });
      }

      setDistributionData(distribution);
    } catch (e) {
      console.error('Error loading distribution:', e);
    } finally {
      setDistributionLoading(false);
    }
  };

  

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-success" />
            Todos los partidos jugados
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay partidos finalizados
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map(match => (
              <div key={match.id}>
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {match.match_date && format(new Date(match.match_date), "d MMM", { locale: es })}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => selectedMatchId === match.id ? setSelectedMatchId(null) : loadDistribution(match.id)}
                      >
                        <BarChart3 className="w-3 h-3 mr-1" />
                        Distribución
                      </Button>
                      <Badge className={
                        match.userPoints > 10
                          ? "bg-success text-success-foreground"
                          : match.userPoints > 0
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                      }>
                        +{match.userPoints} pts
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate flex-1">{match.home_team.name}</span>
                    <div className="px-3 py-1 bg-background rounded text-center min-w-[70px]">
                      <span className="font-bold text-sm">{match.home_goals} - {match.away_goals}</span>
                    </div>
                    <span className="font-medium text-sm truncate flex-1 text-right">{match.away_team.name}</span>
                  </div>
                </div>
                {selectedMatchId === match.id && (
                  <div className="p-3 rounded-b-lg border border-t-0 bg-muted/10">
                    {distributionLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="h-[180px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={distributionData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis
                              dataKey="points"
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              label={{ value: 'Puntos', position: 'insideBottom', offset: -2, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 } }}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              label={{ value: 'Participantes', angle: -90, position: 'insideLeft', offset: 10, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 } }}
                            />
                            <Tooltip
                              formatter={(value: number) => [`${value} participantes`, 'Cantidad']}
                              labelFormatter={(label) => `${label} puntos`}
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Bar dataKey="participants" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
