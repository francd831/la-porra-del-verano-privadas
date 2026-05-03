import { useState, useEffect } from "react";
import { Trophy, Save, Target, Users, Zap, Lock, LockOpen, Loader2, AlertCircle, Trash2, ChevronUp, ChevronDown, Bell, RefreshCw } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import PlayoffBracket from "@/components/PlayoffBracket";

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
  home_goals: number | null;
  away_goals: number | null;
  match_date: string | null;
  status: string;
  match_type: string;
  group_id: string | null;
  round: string | null;
  external_id: number | null;
  home_team?: Team;
  away_team?: Team;
}

interface PartidoResultado {
  local: number | null;
  visitante: number | null;
}

interface EstadisticasEquipo {
  equipo: string;
  puntos: number;
  partidosJugados: number;
  partidosGanados: number;
  partidosEmpatados: number;
  partidosPerdidos: number;
  golesFavor: number;
  golesContra: number;
  diferencia: number;
}

const jugadores = [
  "Lionel Messi", "Kylian Mbappé", "Erling Haaland", "Karim Benzema",
  "Vinicius Jr.", "Kevin De Bruyne", "Sadio Mané", "Harry Kane",
  "Pedri", "Jamal Musiala", "Bukayo Saka", "Rafael Leão"
];

// Función para asegurar que existen todos los partidos de eliminatorias en la BD (helper estático)
const ensurePlayoffMatchesExistStatic = async () => {
  const tournamentId = '11111111-1111-1111-1111-111111111111';
  
  // Definir todos los partidos necesarios
  const allPlayoffMatches = [
    // Dieciseisavos (R32) - 16 partidos
    ...Array.from({ length: 16 }, (_, i) => ({
      id: `R32_${i + 1}`,
      round: 'Dieciseisavos de Final',
    })),
    // Octavos (R16) - 8 partidos
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `R16_${i + 1}`,
      round: 'Octavos de Final',
    })),
    // Cuartos (QF) - 4 partidos
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `QF_${i + 1}`,
      round: 'Cuartos de Final',
    })),
    // Semifinales (SF) - 2 partidos
    ...Array.from({ length: 2 }, (_, i) => ({
      id: `SF_${i + 1}`,
      round: 'Semifinales',
    })),
    // Final - 1 partido
    { id: 'FINAL_1', round: 'Final' },
  ];

  // Verificar qué partidos ya existen
  const { data: existingMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('match_type', 'playoff')
    .eq('tournament_id', tournamentId);

  const existingIds = new Set((existingMatches || []).map(m => m.id));

  // Insertar los partidos que faltan
  const missingMatches = allPlayoffMatches.filter(m => !existingIds.has(m.id));
  
  if (missingMatches.length > 0) {
    const matchesToInsert = missingMatches.map(m => ({
      id: m.id,
      round: m.round,
      match_type: 'playoff',
      tournament_id: tournamentId,
      status: 'scheduled',
      home_team_id: null,
      away_team_id: null,
    }));

    const { error } = await supabase
      .from('matches')
      .insert(matchesToInsert);

    if (error) {
      console.error('Error creating playoff matches:', error);
    }
  }
};

export default function Resultados() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groupMatches, setGroupMatches] = useState<Record<string, Match[]>>({});
  const [playoffMatches, setPlayoffMatches] = useState<Record<string, Match[]>>({});
  const [resultadosGrupos, setResultadosGrupos] = useState<Record<string, PartidoResultado>>({});
  const [campeon, setCampeon] = useState("");
  const [balonOro, setBalonOro] = useState("");
  const [botaOro, setBotaOro] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [predictionsLocked, setPredictionsLocked] = useState(false);
  const [updatingLock, setUpdatingLock] = useState(false);
  const [syncingResults, setSyncingResults] = useState(false);
  const [rankingsVisible, setRankingsVisible] = useState(false);
  const [updatingRankingsVisibility, setUpdatingRankingsVisibility] = useState(false);
  const [externalIds, setExternalIds] = useState<Record<string, string>>({});
  const [savingExternalId, setSavingExternalId] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("grupos");
  const [playoffWinners, setPlayoffWinners] = useState<Record<string, string>>({});
  const [deletingResults, setDeletingResults] = useState(false);
  const [manualGroupOrders, setManualGroupOrders] = useState<Record<string, string[]>>({});
  const [pendingOrderChanges, setPendingOrderChanges] = useState<Record<string, EstadisticasEquipo[]>>({});
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(!!data);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const queueNotificationEvent = async (event: { type: string; entity_id: string; payload: Record<string, unknown> }) => {
    const { error: queueError } = await supabase
      .from('events_queue')
      .insert(event as any);

    if (queueError) {
      throw queueError;
    }

    // Intento inmediato (el cron sigue como respaldo)
    const { error: processError } = await supabase.functions.invoke('process-events', {
      body: {},
    });

    if (processError) {
      console.error('Error invoking process-events:', processError);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar equipos
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Cargar partidos de fase de grupos
      const { data: groupMatchesData, error: groupMatchesError } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*)
        `)
        .eq('match_type', 'group')
        .order('match_date');

      if (groupMatchesError) throw groupMatchesError;

      const processedGroupMatches = groupMatchesData || [];
      
      // Agrupar partidos por grupo
      const groupedMatches: Record<string, Match[]> = {};
      const groupResults: Record<string, PartidoResultado> = {};
      
      processedGroupMatches.forEach(match => {
        if (!groupedMatches[match.group_id]) {
          groupedMatches[match.group_id] = [];
        }
        groupedMatches[match.group_id].push(match);
        
        // Cargar resultados existentes
        groupResults[match.id] = {
          local: match.home_goals,
          visitante: match.away_goals
        };
      });
      
      setGroupMatches(groupedMatches);
      setResultadosGrupos(groupResults);

      // Asegurar que existen todos los partidos de playoff antes de cargarlos
      await ensurePlayoffMatchesExistStatic();

      // Cargar partidos de fase eliminatoria
      const { data: playoffMatchesData, error: playoffMatchesError } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*)
        `)
        .eq('match_type', 'playoff')
        .order('id');

      if (playoffMatchesError) throw playoffMatchesError;

      // Agrupar partidos de playoff por ronda
      const groupedPlayoffs: Record<string, Match[]> = {};
      const playoffResults: Record<string, PartidoResultado> = {};
      const playoffWinnersMap: Record<string, string> = {};
      
      (playoffMatchesData || []).forEach(match => {
        const round = match.round || 'Dieciseisavos de Final';
        if (!groupedPlayoffs[round]) {
          groupedPlayoffs[round] = [];
        }
        groupedPlayoffs[round].push(match);
        
        // Cargar resultados existentes
        playoffResults[match.id] = {
          local: match.home_goals,
          visitante: match.away_goals
        };
        
        // Cargar ganador existente
        if (match.winner_team_id) {
          playoffWinnersMap[match.id] = match.winner_team_id;
        }
      });
      
      setPlayoffMatches(groupedPlayoffs);
      setPlayoffWinners(playoffWinnersMap);

      // Cargar estado de bloqueo de pronósticos
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('predictions_locked')
        .eq('id', '11111111-1111-1111-1111-111111111111')
        .single();

      if (tournamentData) {
        setPredictionsLocked(tournamentData.predictions_locked || false);
      }

      // Cargar estado de visibilidad de clasificación
      const { data: tournamentVisData } = await supabase
        .from('tournaments')
        .select('rankings_visible')
        .eq('id', '11111111-1111-1111-1111-111111111111')
        .single();

      if (tournamentVisData) {
        setRankingsVisible((tournamentVisData as any).rankings_visible || false);
      }

      // Cargar ganador del torneo
      const { data: winnerData } = await supabase
        .from('tournament_winners')
        .select('winner_team_id')
        .eq('tournament_id', '11111111-1111-1111-1111-111111111111')
        .maybeSingle();

      if (winnerData && teamsData) {
        const winnerTeam = teamsData.find(t => t.id === winnerData.winner_team_id);
        if (winnerTeam) setCampeon(winnerTeam.name);
      }

      // Cargar premios individuales
      const { data: awards } = await supabase
        .from('individual_awards')
        .select('award_type, winner_name')
        .eq('tournament_id', '11111111-1111-1111-1111-111111111111');

      awards?.forEach(award => {
        if (award.award_type === 'balon_oro') setBalonOro(award.winner_name || '');
        if (award.award_type === 'bota_oro') setBotaOro(award.winner_name || '');
      });

      // Cargar órdenes manuales de grupos
      const { data: overridesData } = await supabase
        .from('group_standings_override')
        .select('group_id, team_order')
        .eq('tournament_id', '11111111-1111-1111-1111-111111111111');

      if (overridesData) {
        const overridesMap: Record<string, string[]> = {};
        overridesData.forEach(o => {
          overridesMap[o.group_id] = o.team_order;
        });
        setManualGroupOrders(overridesMap);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResultadoChange = (matchId: string, tipo: 'local' | 'visitante', valor: string) => {
    let numeroValor: number | null = null;
    if (valor !== '') {
      const parsed = parseInt(valor, 10);
      if (isNaN(parsed) || parsed < 0 || parsed > 50) return;
      numeroValor = parsed;
    }
    
    setResultadosGrupos(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [tipo]: numeroValor
      }
    }));
  };

  const handleSaveMatch = async (matchId: string, showToast: boolean = true) => {
    const resultado = resultadosGrupos[matchId];
    
    if (!resultado || resultado.local === null || resultado.visitante === null) {
      if (showToast) {
        toast({
          title: "Error",
          description: "Debes ingresar ambos resultados",
          variant: "destructive",
        });
      }
      return false;
    }

    try {
      const winner_team_id = 
        resultado.local > resultado.visitante ? groupMatches[Object.keys(groupMatches).find(group => groupMatches[group].find(m => m.id === matchId)) || '']?.find(m => m.id === matchId)?.home_team_id :
        resultado.visitante > resultado.local ? groupMatches[Object.keys(groupMatches).find(group => groupMatches[group].find(m => m.id === matchId)) || '']?.find(m => m.id === matchId)?.away_team_id :
        null;

      const { error } = await supabase
        .from('matches')
        .update({
          home_goals: resultado.local,
          away_goals: resultado.visitante,
          winner_team_id,
          status: 'completed',
        })
        .eq('id', matchId);

      if (error) throw error;

      // Find the match and its group
      const allMatches = Object.values(groupMatches).flat();
      const match = allMatches.find(m => m.id === matchId);
      const matchGroup = Object.keys(groupMatches).find(g =>
        groupMatches[g].some(m => m.id === matchId));

      // ── STEP 1: Auto-sort group standings BEFORE notifications ──
      if (matchGroup) {
        const autoClasificacion = (() => {
          const estadisticas: Record<string, EstadisticasEquipo> = {};
          const partidosGrupo = groupMatches[matchGroup] || [];
          partidosGrupo.forEach(m => {
            const homeTeam = m.home_team?.name || m.home_team_id;
            const awayTeam = m.away_team?.name || m.away_team_id;
            if (!estadisticas[homeTeam]) estadisticas[homeTeam] = { equipo: homeTeam, puntos: 0, partidosJugados: 0, partidosGanados: 0, partidosEmpatados: 0, partidosPerdidos: 0, golesFavor: 0, golesContra: 0, diferencia: 0 };
            if (!estadisticas[awayTeam]) estadisticas[awayTeam] = { equipo: awayTeam, puntos: 0, partidosJugados: 0, partidosGanados: 0, partidosEmpatados: 0, partidosPerdidos: 0, golesFavor: 0, golesContra: 0, diferencia: 0 };
          });
          partidosGrupo.forEach(m => {
            const res = resultadosGrupos[m.id];
            if (res && res.local !== null && res.visitante !== null) {
              const homeTeam = m.home_team?.name || m.home_team_id;
              const awayTeam = m.away_team?.name || m.away_team_id;
              estadisticas[homeTeam].partidosJugados++; estadisticas[homeTeam].golesFavor += res.local; estadisticas[homeTeam].golesContra += res.visitante;
              estadisticas[awayTeam].partidosJugados++; estadisticas[awayTeam].golesFavor += res.visitante; estadisticas[awayTeam].golesContra += res.local;
              if (res.local > res.visitante) { estadisticas[homeTeam].partidosGanados++; estadisticas[homeTeam].puntos += 3; estadisticas[awayTeam].partidosPerdidos++; }
              else if (res.local < res.visitante) { estadisticas[awayTeam].partidosGanados++; estadisticas[awayTeam].puntos += 3; estadisticas[homeTeam].partidosPerdidos++; }
              else { estadisticas[homeTeam].partidosEmpatados++; estadisticas[awayTeam].partidosEmpatados++; estadisticas[homeTeam].puntos += 1; estadisticas[awayTeam].puntos += 1; }
            }
          });
          return Object.values(estadisticas).map(e => ({ ...e, diferencia: e.golesFavor - e.golesContra })).sort((a, b) => { if (b.puntos !== a.puntos) return b.puntos - a.puntos; if (b.diferencia !== a.diferencia) return b.diferencia - a.diferencia; return b.golesFavor - a.golesFavor; });
        })();
        const partidosGrupoAuto = groupMatches[matchGroup] || [];
        const teamOrder = autoClasificacion.map(equipo => {
          const mg = partidosGrupoAuto.find(m => 
            m.home_team?.name === equipo.equipo || m.away_team?.name === equipo.equipo
          );
          return mg?.home_team?.name === equipo.equipo ? mg.home_team_id : mg?.away_team_id;
        }).filter(Boolean) as string[];

        if (teamOrder.length > 0) {
          await supabase
            .from('group_standings_override')
            .upsert({
              group_id: matchGroup,
              tournament_id: '11111111-1111-1111-1111-111111111111',
              team_order: teamOrder,
              updated_at: new Date().toISOString()
            }, { onConflict: 'group_id,tournament_id' });
          
          setManualGroupOrders(prev => ({
            ...prev,
            [matchGroup]: teamOrder
          }));
        }
      }

      // ── STEP 2: Update R32 teams ──
      await updateRoundOf32Teams();

      // ── STEP 3: Queue match_result notification (after sorting) ──
      await queueNotificationEvent({
        type: 'match_result',
        entity_id: matchId,
        payload: {
          match_id: matchId,
          home_team_id: match?.home_team_id ?? null,
          away_team_id: match?.away_team_id ?? null,
          home_goals: resultado.local,
          away_goals: resultado.visitante,
        },
      });

      if (showToast) {
        // Recalcular puntos
        const { error: recalcError } = await supabase.rpc('update_all_user_points', {
          p_tournament_id: '11111111-1111-1111-1111-111111111111'
        });

        if (recalcError) {
          console.error('Error recalculating points:', recalcError);
        }

        toast({
          title: "Resultado guardado",
          description: "Puntos recalculados. Notificaciones en cola.",
        });
      }

      // ── STEP 4: Queue R32 qualification notifications if group complete ──
      if (matchGroup && isGroupComplete(matchGroup)) {
        const clasificacion = calcularClasificacionGrupo(matchGroup);
        const partidosGrupo = groupMatches[matchGroup] || [];
        
        for (let i = 0; i < 2 && i < clasificacion.length; i++) {
          const tName = clasificacion[i].equipo;
          let qualTeam: Team | null = null;
          for (const m of partidosGrupo) {
            if (m.home_team?.name === tName) { qualTeam = m.home_team; break; }
            if (m.away_team?.name === tName) { qualTeam = m.away_team; break; }
          }
          if (qualTeam) {
            await queueNotificationEvent({
              type: 'knockout_result',
              entity_id: `GROUP_${matchGroup}_${qualTeam.id}`,
              payload: {
                match_id: `R32_qual_${matchGroup}_${i + 1}`,
                team_id: qualTeam.id,
                team_name: qualTeam.name,
                round_name: 'Dieciseisavos de Final',
              },
            });
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving result:', error);
      if (showToast) {
        toast({
          title: "Error",
          description: "No se pudo guardar el resultado",
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const handleSaveAllGroupResults = async () => {
    // Obtener todos los partidos que tienen resultados completos pero no están guardados
    const matchesToSave: string[] = [];
    
    Object.entries(resultadosGrupos).forEach(([matchId, resultado]) => {
      if (resultado.local !== null && resultado.visitante !== null) {
        // Verificar si el partido en la base de datos tiene resultados diferentes
        const allMatches = Object.values(groupMatches).flat();
        const match = allMatches.find(m => m.id === matchId);
        if (match && (match.home_goals !== resultado.local || match.away_goals !== resultado.visitante)) {
          matchesToSave.push(matchId);
        }
      }
    });

    if (matchesToSave.length === 0) return;

    let savedCount = 0;
    for (const matchId of matchesToSave) {
      const success = await handleSaveMatch(matchId, false);
      if (success) savedCount++;
    }

    if (savedCount > 0) {
      // Recalcular puntos una sola vez al final
      await supabase.rpc('update_all_user_points', {
        p_tournament_id: '11111111-1111-1111-1111-111111111111'
      });

      toast({
        title: "Resultados guardados",
        description: `Se guardaron ${savedCount} resultado(s) automáticamente`,
      });
    }
  };

  const handleDeleteAllResults = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar TODOS los resultados? Esto incluye fase de grupos, fase final y premios individuales. Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingResults(true);
    try {
      const tournamentId = '11111111-1111-1111-1111-111111111111';

      // 1. Resetear partidos de grupos
      const { error: groupError } = await supabase
        .from('matches')
        .update({
          home_goals: null,
          away_goals: null,
          winner_team_id: null,
          status: 'scheduled'
        })
        .eq('tournament_id', tournamentId)
        .eq('match_type', 'group');

      if (groupError) throw groupError;

      // 2. Resetear partidos de playoffs
      const { error: playoffError } = await supabase
        .from('matches')
        .update({
          home_goals: null,
          away_goals: null,
          home_team_id: null,
          away_team_id: null,
          winner_team_id: null,
          status: 'scheduled'
        })
        .eq('tournament_id', tournamentId)
        .eq('match_type', 'playoff');

      if (playoffError) throw playoffError;

      // 3. Eliminar campeón del torneo
      const { error: winnerError } = await supabase
        .from('tournament_winners')
        .delete()
        .eq('tournament_id', tournamentId);

      if (winnerError) throw winnerError;

      // 4. Resetear premios individuales
      const { error: awardsError } = await supabase
        .from('individual_awards')
        .update({ winner_name: null })
        .eq('tournament_id', tournamentId);

      if (awardsError) throw awardsError;

      // 5. Recalcular puntos de todos los usuarios
      await supabase.rpc('update_all_user_points', {
        p_tournament_id: tournamentId
      });

      // Resetear estado local
      setResultadosGrupos({});
      setPlayoffWinners({});
      setCampeon('');
      setBalonOro('');
      setBotaOro('');

      // Recargar datos
      await fetchData();

      toast({
        title: "Resultados eliminados",
        description: "Se han eliminado todos los resultados del torneo correctamente.",
      });
    } catch (error) {
      console.error('Error deleting results:', error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar los resultados",
        variant: "destructive",
      });
    } finally {
      setDeletingResults(false);
    }
  };

  const handleTabChange = async (newTab: string) => {
    // Si estamos saliendo de la pestaña de grupos, guardar todos los resultados pendientes
    if (activeTab === "grupos" && newTab !== "grupos") {
      await handleSaveAllGroupResults();
    }
    setActiveTab(newTab);
  };

  const calcularClasificacionGrupo = (groupId: string): EstadisticasEquipo[] => {
    const estadisticas: Record<string, EstadisticasEquipo> = {};
    const partidosGrupo = groupMatches[groupId] || [];
    
    // Inicializar estadísticas
    partidosGrupo.forEach(match => {
      const homeTeam = match.home_team?.name || match.home_team_id;
      const awayTeam = match.away_team?.name || match.away_team_id;
      
      if (!estadisticas[homeTeam]) {
        estadisticas[homeTeam] = {
          equipo: homeTeam,
          puntos: 0,
          partidosJugados: 0,
          partidosGanados: 0,
          partidosEmpatados: 0,
          partidosPerdidos: 0,
          golesFavor: 0,
          golesContra: 0,
          diferencia: 0
        };
      }
      
      if (!estadisticas[awayTeam]) {
        estadisticas[awayTeam] = {
          equipo: awayTeam,
          puntos: 0,
          partidosJugados: 0,
          partidosGanados: 0,
          partidosEmpatados: 0,
          partidosPerdidos: 0,
          golesFavor: 0,
          golesContra: 0,
          diferencia: 0
        };
      }
    });

    // Procesar resultados
    partidosGrupo.forEach(match => {
      const resultado = resultadosGrupos[match.id];
      if (resultado && resultado.local !== null && resultado.visitante !== null) {
        const homeTeam = match.home_team?.name || match.home_team_id;
        const awayTeam = match.away_team?.name || match.away_team_id;
        
        estadisticas[homeTeam].partidosJugados++;
        estadisticas[homeTeam].golesFavor += resultado.local;
        estadisticas[homeTeam].golesContra += resultado.visitante;
        
        estadisticas[awayTeam].partidosJugados++;
        estadisticas[awayTeam].golesFavor += resultado.visitante;
        estadisticas[awayTeam].golesContra += resultado.local;
        
        if (resultado.local > resultado.visitante) {
          estadisticas[homeTeam].partidosGanados++;
          estadisticas[homeTeam].puntos += 3;
          estadisticas[awayTeam].partidosPerdidos++;
        } else if (resultado.local < resultado.visitante) {
          estadisticas[awayTeam].partidosGanados++;
          estadisticas[awayTeam].puntos += 3;
          estadisticas[homeTeam].partidosPerdidos++;
        } else {
          estadisticas[homeTeam].partidosEmpatados++;
          estadisticas[awayTeam].partidosEmpatados++;
          estadisticas[homeTeam].puntos += 1;
          estadisticas[awayTeam].puntos += 1;
        }
      }
    });

    let sorted = Object.values(estadisticas)
      .map(equipo => ({
        ...equipo,
        diferencia: equipo.golesFavor - equipo.golesContra
      }))
      .sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        if (b.diferencia !== a.diferencia) return b.diferencia - a.diferencia;
        return b.golesFavor - a.golesFavor;
      });

    // Si hay un orden manual guardado para este grupo, usar ese orden
    const manualOrder = manualGroupOrders[groupId];
    if (manualOrder && manualOrder.length > 0) {
      // Reordenar según el orden manual
      const teamNameToEquipo = new Map(sorted.map(e => {
        const match = groupMatches[groupId]?.find(m => 
          m.home_team?.name === e.equipo || m.away_team?.name === e.equipo
        );
        const teamId = match?.home_team?.name === e.equipo ? match.home_team_id : match?.away_team_id;
        return [teamId, e];
      }));
      
      const reordered: EstadisticasEquipo[] = [];
      manualOrder.forEach(teamId => {
        const equipo = teamNameToEquipo.get(teamId);
        if (equipo) reordered.push(equipo);
      });
      
      // Añadir cualquier equipo que no esté en el orden manual
      sorted.forEach(e => {
        if (!reordered.find(r => r.equipo === e.equipo)) {
          reordered.push(e);
        }
      });
      
      sorted = reordered;
    }

    return sorted;
  };

  // Función para mover un equipo arriba o abajo en la clasificación
  const moveTeamInGroup = (groupId: string, index: number, direction: 'up' | 'down') => {
    const clasificacion = calcularClasificacionGrupo(groupId);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= clasificacion.length) return;

    const newOrder = [...clasificacion];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    
    setPendingOrderChanges(prev => ({
      ...prev,
      [groupId]: newOrder
    }));

    // Get team IDs in the new order
    const teamOrder = newOrder.map(equipo => {
      const match = groupMatches[groupId]?.find(m => 
        m.home_team?.name === equipo.equipo || m.away_team?.name === equipo.equipo
      );
      return match?.home_team?.name === equipo.equipo ? match.home_team_id : match?.away_team_id;
    }).filter(Boolean) as string[];

    setManualGroupOrders(prev => ({
      ...prev,
      [groupId]: teamOrder
    }));
  };

  // Función para guardar el orden manual de un grupo
  const saveGroupOrder = async (groupId: string) => {
    const teamOrder = manualGroupOrders[groupId];
    if (!teamOrder) return;

    try {
      const { error } = await supabase
        .from('group_standings_override')
        .upsert({
          group_id: groupId,
          tournament_id: '11111111-1111-1111-1111-111111111111',
          team_order: teamOrder,
          updated_at: new Date().toISOString()
        }, { onConflict: 'group_id,tournament_id' });

      if (error) throw error;

      // Limpiar cambios pendientes
      setPendingOrderChanges(prev => {
        const newPending = { ...prev };
        delete newPending[groupId];
        return newPending;
      });

      // Recalcular puntos de todos los usuarios
      await supabase.rpc('update_all_user_points', {
        p_tournament_id: '11111111-1111-1111-1111-111111111111'
      });

      // Actualizar dieciseisavos
      await updateRoundOf32Teams();

      toast({
        title: "Orden guardado",
        description: `El orden del Grupo ${groupId} ha sido actualizado y los puntos recalculados.`,
      });
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el orden del grupo",
      });
    }
  };

  // Función para verificar si un grupo tiene todos sus resultados completos
  const isGroupComplete = (groupId: string): boolean => {
    const partidosGrupo = groupMatches[groupId] || [];
    if (partidosGrupo.length === 0) return false;
    
    return partidosGrupo.every(match => {
      const resultado = resultadosGrupos[match.id];
      return resultado && resultado.local !== null && resultado.visitante !== null;
    });
  };

  // Función para verificar si todos los grupos están completos
  const areAllGroupsComplete = (): boolean => {
    const grupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    return grupos.every(groupId => isGroupComplete(groupId));
  };

  // Función para calcular las 8 mejores terceras clasificadas según criterios FIFA
  const calcularMejoresTerceras = (): Array<EstadisticasEquipo & { grupo: string }> => {
    const grupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const terceros: Array<EstadisticasEquipo & { grupo: string }> = [];

    // Obtener el tercer lugar de cada grupo
    grupos.forEach(grupo => {
      const clasificacion = calcularClasificacionGrupo(grupo);
      if (clasificacion.length >= 3) {
        terceros.push({
          ...clasificacion[2], // Tercer lugar (índice 2)
          grupo: grupo
        });
      }
    });

    // Ordenar según criterios FIFA para terceros lugares
    return terceros
      .sort((a, b) => {
        // a) más puntos obtenidos en todos los partidos de grupo
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        // b) diferencia de goles en todos los partidos de grupo
        if (b.diferencia !== a.diferencia) return b.diferencia - a.diferencia;
        // c) más goles marcados en todos los partidos de grupo
        if (b.golesFavor !== a.golesFavor) return b.golesFavor - a.golesFavor;
        // Si siguen empatados, mantener orden alfabético por grupo
        return a.grupo.localeCompare(b.grupo);
      }); // Devolver todos los 12 terceros
  };

  const updateRoundOf32Teams = async () => {
    try {
      // Primero asegurar que existen todos los partidos de playoff
      await ensurePlayoffMatchesExistStatic();

      // Primero, resetear completamente el cuadro de eliminatorias (excepto equipos de dieciseisavos)
      const roundsToReset = ['Octavos de Final', 'Cuartos de Final', 'Semifinales', 'Final'];
      
      for (const round of roundsToReset) {
        await supabase
          .from('matches')
          .update({
            home_team_id: null,
            away_team_id: null,
            winner_team_id: null,
            status: 'scheduled'
          })
          .eq('match_type', 'playoff')
          .eq('round', round)
          .eq('tournament_id', '11111111-1111-1111-1111-111111111111');
      }
      
      // Resetear winner_team_id y equipos de dieciseisavos también
      await supabase
        .from('matches')
        .update({
          home_team_id: null,
          away_team_id: null,
          winner_team_id: null,
          status: 'scheduled'
        })
        .eq('match_type', 'playoff')
        .eq('round', 'Dieciseisavos de Final')
        .eq('tournament_id', '11111111-1111-1111-1111-111111111111');
      
      // Eliminar campeón
      await supabase
        .from('tournament_winners')
        .delete()
        .eq('tournament_id', '11111111-1111-1111-1111-111111111111');
      
      setCampeon('');
      setPlayoffWinners({});

      // Verificar qué grupos están completos
      const grupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
      const gruposCompletos = grupos.filter(g => isGroupComplete(g));
      const todosGruposCompletos = gruposCompletos.length === 12;

      // Calcular clasificados solo de los grupos que están completos
      const qualified: Record<string, { first: Team | null, second: Team | null }> = {};
      
      grupos.forEach(groupId => {
        // Solo calcular clasificados si el grupo está completo
        if (!isGroupComplete(groupId)) {
          qualified[groupId] = { first: null, second: null };
          return;
        }

        const clasificacion = calcularClasificacionGrupo(groupId);
        const partidosGrupo = groupMatches[groupId] || [];
        
        // Obtener el objeto Team del primer clasificado
        const firstTeamName = clasificacion[0]?.equipo;
        let firstTeam: Team | null = null;
        for (const m of partidosGrupo) {
          if (m.home_team?.name === firstTeamName) { firstTeam = m.home_team; break; }
          if (m.away_team?.name === firstTeamName) { firstTeam = m.away_team; break; }
        }
        
        // Obtener el objeto Team del segundo clasificado
        const secondTeamName = clasificacion[1]?.equipo;
        let secondTeam: Team | null = null;
        for (const m of partidosGrupo) {
          if (m.home_team?.name === secondTeamName) { secondTeam = m.home_team; break; }
          if (m.away_team?.name === secondTeamName) { secondTeam = m.away_team; break; }
        }
        
        qualified[groupId] = { first: firstTeam, second: secondTeam };
      });

      // Obtener las 8 mejores terceras SOLO si todos los grupos están completos
      let tercerosTeams: Team[] = [];
      if (todosGruposCompletos) {
        const mejoresTerceras = calcularMejoresTerceras().slice(0, 8); // Solo los 8 mejores
        tercerosTeams = mejoresTerceras.map(tercero => {
          const matchesInGroup = groupMatches[tercero.grupo];
          for (const match of matchesInGroup || []) {
            if (match.home_team?.name === tercero.equipo) return match.home_team;
            if (match.away_team?.name === tercero.equipo) return match.away_team;
          }
          return null;
        }).filter(Boolean) as Team[];
      }

      // Configuración de dieciseisavos según formato Mundial 2026
      // Los cruces con terceros solo se completan cuando todos los grupos están completos
      const roundOf32Pairings = [
        { home: qualified.A.first, away: todosGruposCompletos ? tercerosTeams[0] : null },
        { home: qualified.B.first, away: todosGruposCompletos ? tercerosTeams[1] : null },
        { home: qualified.C.first, away: todosGruposCompletos ? tercerosTeams[2] : null },
        { home: qualified.D.first, away: todosGruposCompletos ? tercerosTeams[3] : null },
        { home: qualified.E.first, away: qualified.F.second },
        { home: qualified.F.first, away: qualified.E.second },
        { home: qualified.G.first, away: qualified.H.second },
        { home: qualified.H.first, away: qualified.G.second },
        { home: qualified.I.first, away: qualified.J.second },
        { home: qualified.J.first, away: qualified.I.second },
        { home: qualified.K.first, away: qualified.L.second },
        { home: qualified.L.first, away: qualified.K.second },
        { home: qualified.A.second, away: todosGruposCompletos ? tercerosTeams[4] : null },
        { home: qualified.B.second, away: todosGruposCompletos ? tercerosTeams[5] : null },
        { home: qualified.C.second, away: todosGruposCompletos ? tercerosTeams[6] : null },
        { home: qualified.D.second, away: todosGruposCompletos ? tercerosTeams[7] : null },
      ];

      // Actualizar cada partido con los equipos clasificados (permitiendo valores nulos)
      for (let i = 0; i < roundOf32Pairings.length; i++) {
        const pairing = roundOf32Pairings[i];
        const matchId = `R32_${i + 1}`;
        
        // Actualizar el partido (ya existe porque ensurePlayoffMatchesExist lo creó)
        await supabase
          .from('matches')
          .update({
            home_team_id: pairing.home?.id || null,
            away_team_id: pairing.away?.id || null,
          })
          .eq('id', matchId);
      }

      // Mensaje informativo según el estado de los grupos
      const gruposIncompletos = grupos.filter(g => !isGroupComplete(g));
      if (gruposIncompletos.length > 0) {
        toast({
          title: "Clasificados parciales",
          description: `Grupos incompletos: ${gruposIncompletos.join(', ')}. Complete los resultados de todos los grupos para ver el cuadro completo.`,
        });
      } else {
        toast({
          title: "Clasificados actualizados",
          description: "Los equipos de dieciseisavos se han actualizado automáticamente",
        });
      }

      fetchData();
    } catch (error) {
      console.error('Error updating round of 32:', error);
    }
  };

  // Función para seleccionar ganador de un partido de eliminatorias y propagarlo
  // Sigue la normativa FIFA 2026 para el avance de equipos entre rondas
  // Ahora usa IDs de partidos directamente en lugar de índices de array
  const handleSelectPlayoffWinner = async (matchId: string, teamId: string, teamName: string, round: string) => {
    try {
      // Guardar el ganador en el estado local
      setPlayoffWinners(prev => ({
        ...prev,
        [matchId]: teamId
      }));

      // Actualizar en la base de datos
      const { error: updateError } = await supabase
        .from('matches')
        .update({ 
          winner_team_id: teamId,
          status: 'completed'
        })
        .eq('id', matchId);

      if (updateError) throw updateError;

      // Avanzar el equipo a la siguiente ronda automáticamente
      const team = teams.find(t => t.id === teamId);
      if (!team) return;
      
      // Mapeos que devuelven directamente el ID del partido destino y si es home o away
      if (round === 'Dieciseisavos de Final') {
        // Mapeo FIFA 2026 de Dieciseisavos a Octavos (Artículo 12.7)
        // Clave: número de R32 (1-16), Valor: [ID del partido R16, esAway]
        const r32ToR16Map: Record<string, [string, boolean]> = {
          'R32_1': ['R16_2', false],  // W73 -> R16_2 home
          'R32_2': ['R16_1', false],  // W74 -> R16_1 home
          'R32_3': ['R16_2', true],   // W75 -> R16_2 away
          'R32_4': ['R16_3', false],  // W76 -> R16_3 home
          'R32_5': ['R16_1', true],   // W77 -> R16_1 away
          'R32_6': ['R16_3', true],   // W78 -> R16_3 away
          'R32_7': ['R16_4', false],  // W79 -> R16_4 home
          'R32_8': ['R16_4', true],   // W80 -> R16_4 away
          'R32_9': ['R16_6', false],  // W81 -> R16_6 home
          'R32_10': ['R16_6', true],  // W82 -> R16_6 away
          'R32_11': ['R16_5', false], // W83 -> R16_5 home
          'R32_12': ['R16_5', true],  // W84 -> R16_5 away
          'R32_13': ['R16_8', false], // W85 -> R16_8 home
          'R32_14': ['R16_7', false], // W86 -> R16_7 home
          'R32_15': ['R16_8', true],  // W87 -> R16_8 away
          'R32_16': ['R16_7', true],  // W88 -> R16_7 away
        };
        
        const mapping = r32ToR16Map[matchId];
        if (mapping) {
          const [targetMatchId, isAway] = mapping;
          const updateField = isAway ? 'away_team_id' : 'home_team_id';
          
          await supabase
            .from('matches')
            .update({ [updateField]: teamId })
            .eq('id', targetMatchId);
        }
      } else if (round === 'Octavos de Final') {
        // Mapeo FIFA 2026 de Octavos a Cuartos (Artículo 12.8)
        const r16ToQFMap: Record<string, [string, boolean]> = {
          'R16_1': ['QF_1', false],   // W89 -> QF_1 home
          'R16_2': ['QF_1', true],    // W90 -> QF_1 away
          'R16_3': ['QF_3', false],   // W91 -> QF_3 home
          'R16_4': ['QF_3', true],    // W92 -> QF_3 away
          'R16_5': ['QF_2', false],   // W93 -> QF_2 home
          'R16_6': ['QF_2', true],    // W94 -> QF_2 away
          'R16_7': ['QF_4', false],   // W95 -> QF_4 home
          'R16_8': ['QF_4', true],    // W96 -> QF_4 away
        };
        
        const mapping = r16ToQFMap[matchId];
        if (mapping) {
          const [targetMatchId, isAway] = mapping;
          const updateField = isAway ? 'away_team_id' : 'home_team_id';
          
          await supabase
            .from('matches')
            .update({ [updateField]: teamId })
            .eq('id', targetMatchId);
        }
      } else if (round === 'Cuartos de Final') {
        // Mapeo FIFA 2026 de Cuartos a Semifinales (Artículo 12.9)
        const qfToSFMap: Record<string, [string, boolean]> = {
          'QF_1': ['SF_1', false],    // W97 -> SF_1 home
          'QF_2': ['SF_1', true],     // W98 -> SF_1 away
          'QF_3': ['SF_2', false],    // W99 -> SF_2 home
          'QF_4': ['SF_2', true],     // W100 -> SF_2 away
        };
        
        const mapping = qfToSFMap[matchId];
        if (mapping) {
          const [targetMatchId, isAway] = mapping;
          const updateField = isAway ? 'away_team_id' : 'home_team_id';
          
          await supabase
            .from('matches')
            .update({ [updateField]: teamId })
            .eq('id', targetMatchId);
        }
      } else if (round === 'Semifinales') {
        // Semifinales a Final
        const sfToFinalMap: Record<string, boolean> = {
          'SF_1': false,  // W101 -> Final home
          'SF_2': true,   // W102 -> Final away
        };
        
        const isAway = sfToFinalMap[matchId];
        if (isAway !== undefined) {
          const updateField = isAway ? 'away_team_id' : 'home_team_id';
          
          await supabase
            .from('matches')
            .update({ [updateField]: teamId })
            .eq('id', 'FINAL_1');
        }
      } else if (round === 'Final') {
        // Actualizar el campeón en la BD
        setCampeon(teamName);
        
        // Guardar en tournament_winners
        await supabase
          .from('tournament_winners')
          .upsert({
            tournament_id: '11111111-1111-1111-1111-111111111111',
            winner_team_id: teamId
          }, { onConflict: 'tournament_id' });
      }

      // Queue knockout_result notification event
      // round_name = the round the team qualifies TO (not the current round)
      const nextRoundMap: Record<string, string> = {
        'Dieciseisavos de Final': 'Octavos de Final',
        'Octavos de Final': 'Cuartos de Final',
        'Cuartos de Final': 'Semifinales',
        'Semifinales': 'Final',
        'Final': 'Campeón',
      };
      await queueNotificationEvent({
        type: 'knockout_result',
        entity_id: matchId,
        payload: {
          match_id: matchId,
          team_id: teamId,
          team_name: teamName,
          round_name: nextRoundMap[round] || round,
        },
      });

      // Recargar datos para reflejar los cambios en el estado
      await fetchData();

      // Recalcular puntos de todos los usuarios después de actualizar el bracket
      const { error: recalcError } = await supabase.rpc('update_all_user_points', {
        p_tournament_id: '11111111-1111-1111-1111-111111111111'
      });

      if (recalcError) {
        console.error('Error recalculating points:', recalcError);
      }

      toast({
        title: "Ganador guardado",
        description: `${teamName} avanza a la siguiente ronda. Puntos recalculados.`,
      });

    } catch (error) {
      console.error('Error saving winner:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al guardar el ganador del partido.",
      });
    }
  };

  // Función para reiniciar el cuadro de playoffs
  const handleResetPlayoffs = async () => {
    try {
      // Limpiar ganadores en estado local
      setPlayoffWinners({});
      
      // Limpiar equipos de rondas posteriores a dieciseisavos en la BD
      const roundsToReset = ['Octavos de Final', 'Cuartos de Final', 'Semifinales', 'Final'];
      
      for (const round of roundsToReset) {
        const matches = playoffMatches[round] || [];
        for (const match of matches) {
          await supabase
            .from('matches')
            .update({
              home_team_id: null,
              away_team_id: null,
              winner_team_id: null,
              status: 'scheduled'
            })
            .eq('id', match.id);
        }
      }
      
      // Resetear winner_team_id de dieciseisavos también
      const r32Matches = playoffMatches['Dieciseisavos de Final'] || playoffMatches['round_of_32'] || [];
      for (const match of r32Matches) {
        await supabase
          .from('matches')
          .update({
            winner_team_id: null,
            status: 'scheduled'
          })
          .eq('id', match.id);
      }
      
      // Eliminar campeón de la BD
      const { error: deleteChampionError } = await supabase
        .from('tournament_winners')
        .delete()
        .eq('tournament_id', '11111111-1111-1111-1111-111111111111');
      
      if (deleteChampionError) {
        console.error('Error deleting champion:', deleteChampionError);
      }
      
      // Recalcular puntos después del reset
      await supabase.rpc('update_all_user_points', {
        p_tournament_id: '11111111-1111-1111-1111-111111111111'
      });
      
      toast({
        title: "Cuadro reiniciado",
        description: "Se han eliminado todos los ganadores, el campeón y se han recalculado los puntos.",
      });
      
      // Recargar datos y después limpiar el campeón en estado local
      await fetchData();
      setCampeon('');
    } catch (error) {
      console.error('Error resetting playoffs:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al reiniciar el cuadro.",
      });
    }
  };

  // Función para guardar los clasificados de playoffs y recalcular puntos
  const handleSavePlayoffClassified = async () => {
    try {
      const { error: recalcError } = await supabase.rpc('update_all_user_points', {
        p_tournament_id: '11111111-1111-1111-1111-111111111111'
      });

      if (recalcError) {
        console.error('Error recalculating points:', recalcError);
        throw recalcError;
      }

      // Queue event for notification pipeline
      await queueNotificationEvent({
        type: 'knockout_result',
        entity_id: 'playoff_save',
        payload: { round_name: 'Eliminatorias' },
      });

      toast({
        title: "Clasificados guardados",
        description: "Puntos recalculados. Notificaciones en cola.",
      });
    } catch (error) {
      console.error('Error saving playoff classified:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al guardar y recalcular los puntos.",
      });
    }
  };

  // Sincroniza el estado local de external_ids cuando se cargan los partidos
  useEffect(() => {
    const map: Record<string, string> = {};
    Object.values(groupMatches).flat().forEach((m) => {
      map[m.id] = m.external_id != null ? String(m.external_id) : "";
    });
    setExternalIds((prev) => ({ ...prev, ...map }));
  }, [groupMatches]);

  const handleExternalIdChange = (matchId: string, value: string) => {
    setExternalIds((prev) => ({ ...prev, [matchId]: value }));
  };

  const handleSaveExternalId = async (matchId: string) => {
    const raw = (externalIds[matchId] ?? "").trim();
    const parsed = raw === "" ? null : Number(raw);
    if (raw !== "" && (!Number.isInteger(parsed) || (parsed as number) <= 0)) {
      toast({ variant: "destructive", title: "ID inválido", description: "Introduce un número entero positivo." });
      return;
    }
    setSavingExternalId((p) => ({ ...p, [matchId]: true }));
    try {
      const { error } = await supabase
        .from("matches")
        .update({ external_id: parsed })
        .eq("id", matchId);
      if (error) throw error;
      toast({ title: "ID guardado", description: `Partido ${matchId}: ${parsed ?? "sin mapear"}` });
      // Reflejar en estado local
      setGroupMatches((prev) => {
        const next: Record<string, Match[]> = {};
        for (const [g, list] of Object.entries(prev)) {
          next[g] = list.map((m) => (m.id === matchId ? { ...m, external_id: parsed as number | null } : m));
        }
        return next;
      });
    } catch (err) {
      console.error("Error saving external_id:", err);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setSavingExternalId((p) => ({ ...p, [matchId]: false }));
    }
  };

  const handleSyncResults = async () => {
    setSyncingResults(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-match-results");
      if (error) throw error;
      const r = data as { fetched?: number; updated?: number; skipped_unmapped?: number; errors?: string[] };
      toast({
        title: "Sincronización completada",
        description: `Recibidos: ${r.fetched ?? 0} · Actualizados: ${r.updated ?? 0} · Sin mapear: ${r.skipped_unmapped ?? 0}`,
      });
      if (r.errors && r.errors.length > 0) console.warn("Sync errors:", r.errors);
      await fetchData();
    } catch (err) {
      console.error("Error syncing results:", err);
      toast({
        variant: "destructive",
        title: "Error en la sincronización",
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setSyncingResults(false);
    }
  };

  const togglePredictionsLock = async () => {
    setUpdatingLock(true);
    try {
      const newLockStatus = !predictionsLocked;
      const { error } = await supabase
        .from('tournaments')
        .update({ predictions_locked: newLockStatus })
        .eq('id', '11111111-1111-1111-1111-111111111111');

      if (error) throw error;

      setPredictionsLocked(newLockStatus);
      toast({
        title: newLockStatus ? "Pronósticos bloqueados" : "Pronósticos desbloqueados",
        description: newLockStatus 
          ? "Los usuarios ya no pueden editar ni crear pronósticos." 
          : "Los usuarios pueden volver a editar y crear pronósticos.",
      });
    } catch (error) {
      console.error('Error toggling predictions lock:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al cambiar el estado de los pronósticos.",
      });
    } finally {
      setUpdatingLock(false);
    }
  };

  const toggleRankingsVisibility = async () => {
    setUpdatingRankingsVisibility(true);
    try {
      const newVisibility = !rankingsVisible;
      const { error } = await supabase
        .from('tournaments')
        .update({ rankings_visible: newVisibility } as any)
        .eq('id', '11111111-1111-1111-1111-111111111111');
      if (error) throw error;
      setRankingsVisible(newVisibility);
      toast({
        title: newVisibility ? "Clasificación visible" : "Clasificación oculta",
        description: newVisibility
          ? "Todos los usuarios pueden ver la clasificación completa"
          : "Cada usuario solo ve su propia posición",
      });
    } catch (error) {
      console.error('Error toggling rankings visibility:', error);
      toast({ title: "Error", description: "No se pudo cambiar la visibilidad", variant: "destructive" });
    } finally {
      setUpdatingRankingsVisibility(false);
    }
  };

  const handleSaveCampeon = async () => {
    if (!campeon) {
      toast({
        title: "Error",
        description: "Debes seleccionar un campeón",
        variant: "destructive",
      });
      return;
    }

    try {
      const teamId = teams.find(t => t.name === campeon)?.id;
      if (!teamId) throw new Error('Team not found');

      // Eliminar ganador existente
      await supabase
        .from('tournament_winners')
        .delete()
        .eq('tournament_id', '11111111-1111-1111-1111-111111111111');

      // Insertar nuevo ganador
      const { error } = await supabase
        .from('tournament_winners')
        .insert({
          tournament_id: '11111111-1111-1111-1111-111111111111',
          winner_team_id: teamId
        });

      if (error) throw error;

      // Recalcular puntos
      const { error: recalcError } = await supabase.rpc('update_all_user_points', {
        p_tournament_id: '11111111-1111-1111-1111-111111111111'
      });

      if (recalcError) {
        console.error('Error recalculating points:', recalcError);
      }

      // Queue event
      await queueNotificationEvent({
        type: 'knockout_result',
        entity_id: 'champion',
        payload: { team_id: teamId, round_name: 'Campeón' },
      });

      toast({
        title: "Campeón guardado",
        description: "Puntos recalculados. Notificaciones en cola.",
      });
    } catch (error) {
      console.error('Error saving champion:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el campeón",
        variant: "destructive",
      });
    }
  };

  const handleSaveAwards = async () => {
    try {
      // Guardar Balón de Oro usando upsert
      if (balonOro) {
        const { error: balonError } = await supabase
          .from('individual_awards')
          .upsert({
            tournament_id: '11111111-1111-1111-1111-111111111111',
            award_type: 'balon_oro',
            winner_name: balonOro
          }, { 
            onConflict: 'tournament_id,award_type',
            ignoreDuplicates: false 
          });

        if (balonError) {
          // Si falla el upsert, intentar update
          const { error: updateError } = await supabase
            .from('individual_awards')
            .update({ winner_name: balonOro })
            .eq('tournament_id', '11111111-1111-1111-1111-111111111111')
            .eq('award_type', 'balon_oro');
          
          if (updateError) throw updateError;
        }
      }

      // Guardar Bota de Oro usando upsert
      if (botaOro) {
        const { error: botaError } = await supabase
          .from('individual_awards')
          .upsert({
            tournament_id: '11111111-1111-1111-1111-111111111111',
            award_type: 'bota_oro',
            winner_name: botaOro
          }, { 
            onConflict: 'tournament_id,award_type',
            ignoreDuplicates: false 
          });

        if (botaError) {
          // Si falla el upsert, intentar update
          const { error: updateError } = await supabase
            .from('individual_awards')
            .update({ winner_name: botaOro })
            .eq('tournament_id', '11111111-1111-1111-1111-111111111111')
            .eq('award_type', 'bota_oro');
          
          if (updateError) throw updateError;
        }
      }

      // Recalcular puntos
      const { error: recalcError } = await supabase.rpc('update_all_user_points', {
        p_tournament_id: '11111111-1111-1111-1111-111111111111'
      });

      if (recalcError) {
        console.error('Error recalculating points:', recalcError);
      }

      // Queue events for each award
      if (balonOro) {
        await queueNotificationEvent({
          type: 'award_result',
          entity_id: 'balon_oro',
          payload: { award_name: 'Balón de Oro', winner: balonOro },
        });
      }
      if (botaOro) {
        await queueNotificationEvent({
          type: 'award_result',
          entity_id: 'bota_oro',
          payload: { award_name: 'Bota de Oro', winner: botaOro },
        });
      }

      toast({
        title: "Premios guardados",
        description: "Puntos recalculados. Notificaciones en cola.",
      });
    } catch (error) {
      console.error('Error saving awards:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los premios",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <div>
            <h3 className="font-semibold">Debes iniciar sesión</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Esta página requiere autenticación.
            </p>
          </div>
        </Alert>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <div>
            <h3 className="font-semibold">Acceso denegado</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Esta página es solo para administradores.
            </p>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Gestión de Resultados
          </h1>
          <p className="text-muted-foreground text-sm">
            Panel de administración del torneo
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleSaveAllGroupResults}
            variant="default"
            size="sm"
            className="shadow-soft"
          >
            <Save className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Guardar Todos</span>
            <span className="sm:hidden">Guardar</span>
          </Button>
          <Button 
            onClick={handleDeleteAllResults}
            disabled={deletingResults}
            variant="outline"
            size="sm"
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            {deletingResults ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Eliminar Resultados</span>
                <span className="sm:hidden">Eliminar</span>
              </>
            )}
          </Button>
          <Button 
            onClick={togglePredictionsLock}
            disabled={updatingLock}
            variant={predictionsLocked ? "destructive" : "default"}
            size="sm"
          >
            {updatingLock ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : predictionsLocked ? (
              <>
                <LockOpen className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Desbloquear Pronósticos</span>
                <span className="sm:hidden">Desbloquear</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Bloquear Pronósticos</span>
                <span className="sm:hidden">Bloquear</span>
              </>
            )}
          </Button>
          <Button
            onClick={handleSyncResults}
            disabled={syncingResults}
            variant="outline"
            size="sm"
          >
            {syncingResults ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Sincronizar Resultados</span>
                <span className="sm:hidden">Sincronizar</span>
              </>
            )}
          </Button>
          <Link to="/plantillas-notificaciones">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Plantillas</span>
            </Button>
          </Link>
          <Button
            onClick={toggleRankingsVisibility}
            disabled={updatingRankingsVisibility}
            variant={rankingsVisible ? "default" : "outline"}
            size="sm"
          >
            {updatingRankingsVisibility ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : rankingsVisible ? (
              <>
                <EyeOff className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Ocultar Clasificación</span>
                <span className="sm:hidden">Ocultar</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Mostrar Clasificación</span>
                <span className="sm:hidden">Mostrar</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grupos" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Fase de Grupos</span>
          </TabsTrigger>
          <TabsTrigger value="eliminatorias" className="flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <span>Fase Final</span>
          </TabsTrigger>
        </TabsList>

        {/* Fase de Grupos */}
        <TabsContent value="grupos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Object.entries(groupMatches)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([groupId, groupMatchesList]) => {
              // Ordenar partidos dentro del grupo por fecha y luego por id
              const sortedMatches = [...groupMatchesList].sort((a, b) => {
                if (a.match_date && b.match_date) {
                  return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
                }
                return a.id.localeCompare(b.id);
              });
              const clasificacion = calcularClasificacionGrupo(groupId);
              
              return (
                <Card key={groupId} className="shadow-soft border-0 bg-gradient-card">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="flex items-center space-x-2 text-sm">
                      <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-xs">{groupId}</span>
                      </div>
                      <span>Grupo {groupId}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-0 space-y-2">
                    {/* Partidos */}
                    <div className="space-y-1">
                      {sortedMatches.map((match) => (
                        <div key={match.id} className="p-1.5 rounded bg-muted/30">
                          {/* Equipos y marcador en una línea */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium flex-1 truncate text-right">{match.home_team?.name}</span>
                            <Input
                              type="number"
                              min="0"
                              max="20"
                              placeholder="-"
                              className="w-10 h-6 text-center text-xs p-0"
                              value={resultadosGrupos[match.id]?.local ?? ''}
                              onChange={(e) => handleResultadoChange(match.id, 'local', e.target.value)}
                            />
                            <span className="text-muted-foreground text-xs">-</span>
                            <Input
                              type="number"
                              min="0"
                              max="20"
                              placeholder="-"
                              className="w-10 h-6 text-center text-xs p-0"
                              value={resultadosGrupos[match.id]?.visitante ?? ''}
                              onChange={(e) => handleResultadoChange(match.id, 'visitante', e.target.value)}
                            />
                            <span className="text-xs font-medium flex-1 truncate">{match.away_team?.name}</span>
                            <Button
                              size="sm"
                              onClick={() => handleSaveMatch(match.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                          </div>
                          {/* Campo external_id para mapeo con API-Football */}
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-muted-foreground w-12 shrink-0">API id:</span>
                            <Input
                              type="number"
                              min="1"
                              placeholder="external_id"
                              className="h-5 text-[10px] px-1 flex-1"
                              value={externalIds[match.id] ?? ""}
                              onChange={(e) => handleExternalIdChange(match.id, e.target.value)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveExternalId(match.id)}
                              disabled={savingExternalId[match.id]}
                              className="h-5 w-5 p-0"
                            >
                              {savingExternalId[match.id] ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Clasificación con ordenamiento manual */}
                    <div className="space-y-1 pt-1 border-t border-border/50">
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="border-b border-border/50">
                              <th className="text-left py-1 px-0.5 font-semibold w-4">#</th>
                              <th className="text-center py-1 px-0.5 font-semibold w-6"></th>
                              <th className="text-left py-1 px-0.5 font-semibold">Equipo</th>
                              <th className="text-center py-1 px-0.5 font-semibold w-5">Pts</th>
                              <th className="text-center py-1 px-0.5 font-semibold w-5">DG</th>
                              <th className="text-center py-1 px-0.5 font-semibold w-4">GF</th>
                              <th className="text-center py-1 px-0.5 font-semibold w-4">GC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clasificacion.map((equipo, index) => (
                              <tr 
                                key={equipo.equipo}
                                className={`${index < 2 ? 'bg-success/20' : 'bg-muted/30'}`}
                              >
                                <td className="py-0.5 px-0.5 font-bold">{index + 1}</td>
                                <td className="py-0.5 px-0.5">
                                  <div className="flex flex-col gap-0">
                                    <button
                                      onClick={() => moveTeamInGroup(groupId, index, 'up')}
                                      disabled={index === 0}
                                      className="p-0 h-3 w-4 disabled:opacity-30 hover:bg-muted rounded flex items-center justify-center"
                                    >
                                      <ChevronUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => moveTeamInGroup(groupId, index, 'down')}
                                      disabled={index === clasificacion.length - 1}
                                      className="p-0 h-3 w-4 disabled:opacity-30 hover:bg-muted rounded flex items-center justify-center"
                                    >
                                      <ChevronDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-0.5 px-0.5 truncate max-w-[60px]">{equipo.equipo}</td>
                                <td className="py-0.5 px-0.5 text-center font-bold">{equipo.puntos}</td>
                                <td className={`py-0.5 px-0.5 text-center ${equipo.diferencia >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {equipo.diferencia >= 0 ? '+' : ''}{equipo.diferencia}
                                </td>
                                <td className="py-0.5 px-0.5 text-center">{equipo.golesFavor}</td>
                                <td className="py-0.5 px-0.5 text-center">{equipo.golesContra}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {pendingOrderChanges[groupId] && (
                        <Button 
                          size="sm" 
                          onClick={() => saveGroupOrder(groupId)} 
                          className="w-full h-6 text-[10px] mt-1"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Guardar orden
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Tabla de las 12 terceras clasificadas */}
          <Card className="shadow-soft border-0 bg-gradient-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-base">
                <div className="w-6 h-6 bg-warning rounded flex items-center justify-center">
                  <Trophy className="w-3 h-3 text-warning-foreground" />
                </div>
                <span>Terceras Clasificadas</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Los 8 mejores terceros (verde) clasifican a la fase eliminatoria
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-1 font-semibold">#</th>
                      <th className="text-left py-2 px-1 font-semibold">Gr</th>
                      <th className="text-left py-2 px-1 font-semibold">Equipo</th>
                      <th className="text-center py-2 px-1 font-semibold">Pts</th>
                      <th className="text-center py-2 px-1 font-semibold">DG</th>
                      <th className="text-center py-2 px-1 font-semibold">GF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calcularMejoresTerceras().map((equipo, index) => (
                      <tr 
                        key={`${equipo.grupo}-${equipo.equipo}`}
                        className={`${index < 8 ? 'bg-success/20 font-medium' : 'bg-muted/30 text-muted-foreground'} border-b border-border/30`}
                      >
                        <td className="py-1.5 px-1 font-bold">{index + 1}</td>
                        <td className="py-1.5 px-1">
                          <span className="font-bold">{equipo.grupo}</span>
                        </td>
                        <td className="py-1.5 px-1 truncate max-w-[100px]">{equipo.equipo}</td>
                        <td className="py-1.5 px-1 text-center font-bold">{equipo.puntos}</td>
                        <td className={`py-1.5 px-1 text-center ${equipo.diferencia >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {equipo.diferencia >= 0 ? '+' : ''}{equipo.diferencia}
                        </td>
                        <td className="py-1.5 px-1 text-center">{equipo.golesFavor}</td>
                      </tr>
                    ))}
                    {calcularMejoresTerceras().length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-muted-foreground">
                          Completa los resultados para ver las clasificaciones
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fase Eliminatoria */}
        <TabsContent value="eliminatorias" className="space-y-6">
          <Card className="shadow-soft border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-6 h-6" />
                <span>Cuadro Eliminatorio</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Haz clic en el equipo ganador de cada partido para avanzarlo a la siguiente ronda
              </p>
            </CardHeader>
            <CardContent>
              <PlayoffBracket
                playoffMatches={playoffMatches}
                playoffWinners={playoffWinners}
                predictionsLocked={false}
                onSelectWinner={(matchId, teamId, teamName, round) => 
                  handleSelectPlayoffWinner(matchId, teamId, teamName, round)
                }
                onReset={handleResetPlayoffs}
                onSave={handleSavePlayoffClassified}
                isAdmin={true}
                campeon={campeon}
              />
            </CardContent>
          </Card>

          {/* Premios Individuales */}
          <Card className="shadow-soft border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Premios Individuales</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Balón de Oro</label>
                  <Select value={balonOro} onValueChange={setBalonOro}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona jugador" />
                    </SelectTrigger>
                    <SelectContent>
                      {jugadores.map((jugador) => (
                        <SelectItem key={jugador} value={jugador}>
                          {jugador}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Bota de Oro</label>
                  <Select value={botaOro} onValueChange={setBotaOro}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona jugador" />
                    </SelectTrigger>
                    <SelectContent>
                      {jugadores.map((jugador) => (
                        <SelectItem key={jugador} value={jugador}>
                          {jugador}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveAwards} className="w-full mt-4">
                <Save className="w-4 h-4 mr-2" />
                Guardar Premios Individuales
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
