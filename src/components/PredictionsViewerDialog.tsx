import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserPrediction {
  userId: string;
  displayName: string;
  position: number;
  totalPoints: number;
  prediction: string;
}

interface PredictionsViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId?: string;
  awardType?: string;
  type: 'group' | 'playoff' | 'award';
  homeTeam?: string;
  awayTeam?: string;
  title: string;
}

type SortField = 'position' | 'displayName' | 'prediction';
type SortDirection = 'asc' | 'desc';

export default function PredictionsViewerDialog({
  open,
  onOpenChange,
  matchId,
  awardType,
  type,
  homeTeam,
  awayTeam,
  title
}: PredictionsViewerDialogProps) {
  const [predictions, setPredictions] = useState<UserPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('position');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadPredictions();
    }
  }, [open, matchId, awardType, type]);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      if (type === 'group' && matchId) {
        // Cargar pronósticos de fase de grupos
        const { data: predictionsData, error: predError } = await supabase
          .from('predictions')
          .select(`
            user_id,
            home_goals,
            away_goals
          `)
          .eq('match_id', matchId)
          .not('home_goals', 'is', null)
          .not('away_goals', 'is', null);

        if (predError) throw predError;

        // Obtener información de usuarios
        const userIds = predictionsData?.map(p => p.user_id) || [];
        if (userIds.length === 0) {
          setPredictions([]);
          return;
        }

        // Fetch display names using secure RPC function
        const { data: profiles, error: profileError } = await supabase
          .rpc('get_user_display_names', { p_user_ids: userIds });

        if (profileError) throw profileError;

        const { data: submissions, error: submissionsError } = await supabase
          .from('user_submissions')
          .select('user_id, points_total')
          .in('user_id', userIds)
          .eq('tournament_id', '11111111-1111-1111-1111-111111111111');

        if (submissionsError) throw submissionsError;

        // Crear ranking por puntos
        const rankedUsers = (submissions || [])
          .sort((a, b) => (b.points_total || 0) - (a.points_total || 0))
          .map((sub, index) => ({ userId: sub.user_id, position: index + 1, points: sub.points_total || 0 }));

        const userMap = new Map(predictionsData?.map(p => [p.user_id, p]) || []);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name || 'Usuario']) || []);
        const rankingMap = new Map(rankedUsers.map(u => [u.userId, { position: u.position, points: u.points }]));

        const formattedPredictions: UserPrediction[] = Array.from(userMap.entries()).map(([userId, pred]) => ({
          userId,
          displayName: profileMap.get(userId) || 'Usuario',
          position: rankingMap.get(userId)?.position || 0,
          totalPoints: rankingMap.get(userId)?.points || 0,
          prediction: `${pred.home_goals} - ${pred.away_goals}`
        }));

        setPredictions(formattedPredictions);
      } else if (type === 'playoff' && matchId) {
        // Cargar pronósticos de playoffs
        const { data: predictionsData, error: predError } = await supabase
          .from('predictions')
          .select(`
            user_id,
            predicted_winner_team_id
          `)
          .eq('match_id', matchId)
          .not('predicted_winner_team_id', 'is', null);

        if (predError) throw predError;

        const userIds = predictionsData?.map(p => p.user_id) || [];
        if (userIds.length === 0) {
          setPredictions([]);
          return;
        }

        // Obtener nombres de equipos
        const teamIds = [...new Set(predictionsData?.map(p => p.predicted_winner_team_id).filter(Boolean) || [])];
        const { data: teams } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', teamIds);

        const teamMap = new Map(teams?.map(t => [t.id, t.name]) || []);

        // Fetch display names using secure RPC function
        const { data: profiles } = await supabase
          .rpc('get_user_display_names', { p_user_ids: userIds });

        const { data: submissions } = await supabase
          .from('user_submissions')
          .select('user_id, points_total')
          .in('user_id', userIds)
          .eq('tournament_id', '11111111-1111-1111-1111-111111111111');

        const rankedUsers = (submissions || [])
          .sort((a, b) => (b.points_total || 0) - (a.points_total || 0))
          .map((sub, index) => ({ userId: sub.user_id, position: index + 1, points: sub.points_total || 0 }));

        const userMap = new Map(predictionsData?.map(p => [p.user_id, p]) || []);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name || 'Usuario']) || []);
        const rankingMap = new Map(rankedUsers.map(u => [u.userId, { position: u.position, points: u.points }]));

        const formattedPredictions: UserPrediction[] = Array.from(userMap.entries()).map(([userId, pred]) => ({
          userId,
          displayName: profileMap.get(userId) || 'Usuario',
          position: rankingMap.get(userId)?.position || 0,
          totalPoints: rankingMap.get(userId)?.points || 0,
          prediction: teamMap.get(pred.predicted_winner_team_id) || 'Equipo desconocido'
        }));

        setPredictions(formattedPredictions);
      } else if (type === 'award' && awardType) {
        // Cargar pronósticos de premios
        const { data: predictionsData, error: predError } = await supabase
          .from('award_predictions')
          .select(`
            user_id,
            player_name
          `)
          .eq('award_type', awardType)
          .eq('tournament_id', '11111111-1111-1111-1111-111111111111');

        if (predError) throw predError;

        const userIds = predictionsData?.map(p => p.user_id) || [];
        if (userIds.length === 0) {
          setPredictions([]);
          return;
        }

        // Fetch display names using secure RPC function
        const { data: profiles } = await supabase
          .rpc('get_user_display_names', { p_user_ids: userIds });

        const { data: submissions } = await supabase
          .from('user_submissions')
          .select('user_id, points_total')
          .in('user_id', userIds)
          .eq('tournament_id', '11111111-1111-1111-1111-111111111111');

        const rankedUsers = (submissions || [])
          .sort((a, b) => (b.points_total || 0) - (a.points_total || 0))
          .map((sub, index) => ({ userId: sub.user_id, position: index + 1, points: sub.points_total || 0 }));

        const userMap = new Map(predictionsData?.map(p => [p.user_id, p]) || []);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name || 'Usuario']) || []);
        const rankingMap = new Map(rankedUsers.map(u => [u.userId, { position: u.position, points: u.points }]));

        const formattedPredictions: UserPrediction[] = Array.from(userMap.entries()).map(([userId, pred]) => ({
          userId,
          displayName: profileMap.get(userId) || 'Usuario',
          position: rankingMap.get(userId)?.position || 0,
          totalPoints: rankingMap.get(userId)?.points || 0,
          prediction: pred.player_name
        }));

        setPredictions(formattedPredictions);
      }
    } catch (error) {
      console.error('Error loading predictions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al cargar los pronósticos de los participantes.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPredictions = [...predictions].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'position') {
      comparison = a.position - b.position;
    } else if (sortField === 'displayName') {
      comparison = a.displayName.localeCompare(b.displayName);
    } else if (sortField === 'prediction') {
      comparison = a.prediction.localeCompare(b.prediction);
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>{title}</span>
          </DialogTitle>
          {(homeTeam || awayTeam) && (
            <p className="text-sm text-muted-foreground">
              {homeTeam} vs {awayTeam}
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay pronósticos para este partido/premio.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('position')}
                      className="hover:bg-transparent"
                    >
                      Posición
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('displayName')}
                      className="hover:bg-transparent"
                    >
                      Usuario
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Puntos</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('prediction')}
                      className="hover:bg-transparent"
                    >
                      {type === 'group' ? 'Resultado' : type === 'playoff' ? 'Ganador' : 'Jugador'}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPredictions.map((pred) => (
                  <TableRow key={pred.userId}>
                    <TableCell className="font-medium">#{pred.position}</TableCell>
                    <TableCell>{pred.displayName}</TableCell>
                    <TableCell>{pred.totalPoints} pts</TableCell>
                    <TableCell className="font-semibold">{pred.prediction}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
