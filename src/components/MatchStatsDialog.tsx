import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp } from "lucide-react";

interface MatchStatsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
}

interface PredictionStat {
  result: string;
  count: number;
  percentage: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--gold))',
  'hsl(var(--muted-foreground))',
];

export default function MatchStatsDialog({ isOpen, onClose, matchId, homeTeam, awayTeam }: MatchStatsDialogProps) {
  const [stats, setStats] = useState<PredictionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPredictions, setTotalPredictions] = useState(0);

  useEffect(() => {
    if (isOpen && matchId) {
      fetchStats();
    }
  }, [isOpen, matchId]);

  const fetchStats = async () => {
    setLoading(true);
    try {
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

      // Filter out admin predictions
      const userPredictions = (predictions || []).filter(p => !adminIds.has(p.user_id));
      
      // Count each unique result
      const resultCounts: Record<string, number> = {};
      userPredictions.forEach(p => {
        const result = `${p.home_goals} - ${p.away_goals}`;
        resultCounts[result] = (resultCounts[result] || 0) + 1;
      });

      const total = userPredictions.length;
      setTotalPredictions(total);

      // Convert to array and calculate percentages
      const statsArray: PredictionStat[] = Object.entries(resultCounts)
        .map(([result, count]) => ({
          result,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 10); // Show top 10

      setStats(statsArray);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Estadísticas de pronósticos
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {homeTeam} vs {awayTeam}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : stats.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay pronósticos registrados para este partido
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {totalPredictions} pronósticos totales
            </p>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    type="number" 
                    domain={[0, 100]} 
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="result" 
                    width={60}
                    tick={{ fill: 'hsl(var(--foreground))', fontWeight: 600 }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [
                      `${value}% (${props.payload.count} usuarios)`,
                      'Porcentaje'
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar 
                    dataKey="percentage" 
                    radius={[0, 4, 4, 0]}
                    maxBarSize={40}
                  >
                    {stats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {stats.slice(0, 6).map((stat, index) => (
                <div 
                  key={stat.result}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <span className="font-semibold">{stat.result}</span>
                  <span className="text-muted-foreground">{stat.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
