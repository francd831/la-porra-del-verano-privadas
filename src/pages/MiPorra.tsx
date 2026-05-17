import { useState, useMemo, useEffect } from "react";
import { Target, Save, Trophy, Users, Flag, Loader2, Zap, ArrowRight, Eye, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PredictionsViewerDialog from "@/components/PredictionsViewerDialog";
import PlayoffBracket from "@/components/PlayoffBracket";

// Interfaces para los datos de la base de datos
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
  match_date: string;
  home_team?: Team;
  away_team?: Team;
}

// Interfaz para los resultados de partidos
interface PartidoResultado {
  local: number | null;
  visitante: number | null;
}

// Interfaz para las estadísticas de un equipo
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

const BALON_ORO_OPTIONS = [
  "Harry Kane",
  "Lamine Yamal",
  "Kylian Mbappé",
  "Michael Olise",
  "Lionel Messi",
  "Vinícius Junior",
  "Bruno Fernandes",
  "Raphinha",
  "Jude Bellingham",
  "Ousmane Dembélé",
  "Rayan Cherki",
  "Declan Rice",
  "Rodri",
  "Pedri",
  "Erling Haaland",
  "OTRO",
];

const BOTA_ORO_OPTIONS = [
  "Kylian Mbappé",
  "Harry Kane",
  "Erling Haaland",
  "Lionel Messi",
  "Lamine Yamal",
  "Vinícius Junior",
  "Cristiano Ronaldo",
  "Ousmane Dembélé",
  "Raphinha",
  "Lautaro Martínez",
  "Mikel Oyarzabal",
  "Romelu Lukaku",
  "Alexander Isak",
  "Viktor Gyökeres",
  "Bukayo Saka",
  "OTRO",
];

// Interfaz para resultados reales de partidos
interface RealMatchResult {
  id: string;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
}

// Interfaz para equipos clasificados por ronda
interface ClassifiedTeams {
  r32: Set<string>;
  r16: Set<string>;
  qf: Set<string>;
  sf: Set<string>;
  final: Set<string>;
  champion: string | null;
}
export default function Pronosticos() {
  const [partidosGrupos, setPartidosGrupos] = useState<Record<string, PartidoResultado>>({});
  const [campeon, setCampeon] = useState("");
  const [balonOro, setBalonOro] = useState("");
  const [botaOro, setBotaOro] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Estados para datos de la base de datos
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groupMatches, setGroupMatches] = useState<Record<string, Match[]>>({});
  const [playoffMatches, setPlayoffMatches] = useState<Record<string, Match[]>>({});
  const [playoffPredictions, setPlayoffPredictions] = useState<Record<string, PartidoResultado>>({});
  const [playoffWinners, setPlayoffWinners] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("grupos");
  const [predictionsLocked, setPredictionsLocked] = useState(false);

  // Estados para resultados reales y equipos clasificados
  const [realMatchResults, setRealMatchResults] = useState<Record<string, RealMatchResult>>({});
  const [classifiedTeams, setClassifiedTeams] = useState<ClassifiedTeams>({
    r32: new Set(),
    r16: new Set(),
    qf: new Set(),
    sf: new Set(),
    final: new Set(),
    champion: null
  });
  const [adminGroupOrders, setAdminGroupOrders] = useState<Record<string, string[]>>({});

  // Estados para diálogo de ver participantes
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<{
    matchId?: string;
    awardType?: string;
    type: 'group' | 'playoff' | 'award';
    homeTeam?: string;
    awayTeam?: string;
    title: string;
  } | null>(null);
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();

  // Cargar datos de la base de datos
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar equipos
        const {
          data: teamsData,
          error: teamsError
        } = await supabase.from('teams').select('*').order('name');
        if (teamsError) throw teamsError;
        setTeams(teamsData || []);

        // Cargar partidos de fase de grupos con información de equipos
        const {
          data: groupMatchesData,
          error: groupMatchesError
        } = await supabase.from('matches').select(`
            *,
            home_team:teams!matches_home_team_id_fkey(*),
            away_team:teams!matches_away_team_id_fkey(*)
          `).eq('match_type', 'group').order('match_date');
        if (groupMatchesError) throw groupMatchesError;
        const processedGroupMatches = groupMatchesData || [];
        setMatches(processedGroupMatches);

        // Agrupar partidos por grupo
        const groupedMatches: Record<string, Match[]> = {};
        processedGroupMatches.forEach(match => {
          if (!groupedMatches[match.group_id]) {
            groupedMatches[match.group_id] = [];
          }
          groupedMatches[match.group_id].push(match);
        });
        setGroupMatches(groupedMatches);

        // Cargar partidos de fase eliminatoria
        const {
          data: playoffMatchesData,
          error: playoffMatchesError
        } = await supabase.from('matches').select(`
            *,
            home_team:teams!matches_home_team_id_fkey(*),
            away_team:teams!matches_away_team_id_fkey(*)
          `).eq('match_type', 'playoff').order('match_date');
        if (playoffMatchesError) throw playoffMatchesError;

        // Agrupar partidos de playoff por ronda
        const groupedPlayoffs: Record<string, Match[]> = {};
        (playoffMatchesData || []).forEach(match => {
          const round = match.round || 'Dieciseisavos de Final';
          if (!groupedPlayoffs[round]) {
            groupedPlayoffs[round] = [];
          }
          groupedPlayoffs[round].push(match);
        });
        // Asegurar claves de todas las rondas aunque no haya registros en BD
        if (!groupedPlayoffs['Dieciseisavos de Final']) {
          groupedPlayoffs['Dieciseisavos de Final'] = [];
        }
        if (!groupedPlayoffs['Octavos de Final']) {
          groupedPlayoffs['Octavos de Final'] = [];
        }
        setPlayoffMatches(groupedPlayoffs);

        // Cargar predicciones existentes si hay usuario
        if (user) {
          await loadExistingPredictions(teamsData || [], groupedPlayoffs, groupedMatches);
        }

        // Cargar estado de bloqueo de pronósticos
        const {
          data: tournamentData
        } = await supabase.from('tournaments').select('predictions_locked').eq('id', '11111111-1111-1111-1111-111111111111').single();
        if (tournamentData) {
          setPredictionsLocked(tournamentData.predictions_locked || false);
        }

        // Cargar resultados reales de partidos completados
        const {
          data: allMatchesData
        } = await supabase.from('matches').select('id, home_goals, away_goals, status, round, home_team_id, away_team_id').eq('tournament_id', '11111111-1111-1111-1111-111111111111');
        if (allMatchesData) {
          const resultsMap: Record<string, RealMatchResult> = {};
          const classified: ClassifiedTeams = {
            r32: new Set<string>(),
            r16: new Set<string>(),
            qf: new Set<string>(),
            sf: new Set<string>(),
            final: new Set<string>(),
            champion: null
          };
          allMatchesData.forEach(m => {
            resultsMap[m.id] = {
              id: m.id,
              home_goals: m.home_goals,
              away_goals: m.away_goals,
              status: m.status
            };

            // Recopilar equipos clasificados por ronda
            if (m.home_team_id || m.away_team_id) {
              if (m.round === 'Dieciseisavos de Final') {
                if (m.home_team_id) classified.r32.add(m.home_team_id);
                if (m.away_team_id) classified.r32.add(m.away_team_id);
              } else if (m.round === 'Octavos de Final') {
                if (m.home_team_id) classified.r16.add(m.home_team_id);
                if (m.away_team_id) classified.r16.add(m.away_team_id);
              } else if (m.round === 'Cuartos de Final') {
                if (m.home_team_id) classified.qf.add(m.home_team_id);
                if (m.away_team_id) classified.qf.add(m.away_team_id);
              } else if (m.round === 'Semifinales') {
                if (m.home_team_id) classified.sf.add(m.home_team_id);
                if (m.away_team_id) classified.sf.add(m.away_team_id);
              } else if (m.round === 'Final') {
                if (m.home_team_id) classified.final.add(m.home_team_id);
                if (m.away_team_id) classified.final.add(m.away_team_id);
              }
            }
          });

          // Cargar campeón si existe
          const {
            data: winnerData
          } = await supabase.from('tournament_winners').select('winner_team_id').eq('tournament_id', '11111111-1111-1111-1111-111111111111').maybeSingle();
          if (winnerData?.winner_team_id) {
            classified.champion = winnerData.winner_team_id;
          }
          setRealMatchResults(resultsMap);
          setClassifiedTeams(classified);
        }

        // Cargar órdenes oficiales de grupos (del admin)
        const {
          data: overridesData
        } = await supabase.from('group_standings_override').select('group_id, team_order').eq('tournament_id', '11111111-1111-1111-1111-111111111111');
        if (overridesData) {
          const overridesMap: Record<string, string[]> = {};
          overridesData.forEach(o => {
            overridesMap[o.group_id] = o.team_order;
          });
          setAdminGroupOrders(overridesMap);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error al cargar los datos del torneo."
        });
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [user, toast]);

  // Reconstruir el bracket basándose en las predicciones guardadas
  // Sigue la normativa FIFA 2026 para el mapeo correcto entre rondas
  const reconstructBracketFromPredictions = (winnersMap: Record<string, string>, teamsData: Team[], basePlayoffMatches: Record<string, Match[]>) => {
    const newPlayoffMatches = JSON.parse(JSON.stringify(basePlayoffMatches)) as Record<string, Match[]>;

    // Mapeos FIFA 2026 (mismos que en handleSelectWinner)
    const r32ToR16Map: Record<number, [number, boolean]> = {
      0: [1, false],
      1: [0, false],
      2: [1, true],
      3: [2, false],
      4: [0, true],
      5: [2, true],
      6: [3, false],
      7: [3, true],
      8: [5, false],
      9: [5, true],
      10: [4, false],
      11: [4, true],
      12: [7, false],
      13: [6, false],
      14: [7, true],
      15: [6, true]
    };
    const r16ToQFMap: Record<number, [number, boolean]> = {
      0: [0, false],
      1: [0, true],
      2: [2, false],
      3: [2, true],
      4: [1, false],
      5: [1, true],
      6: [3, false],
      7: [3, true]
    };
    const qfToSFMap: Record<number, [number, boolean]> = {
      0: [0, false],
      1: [0, true],
      2: [1, false],
      3: [1, true]
    };

    // Procesar por orden de ronda para asegurar que los equipos avancen correctamente
    // Primero R32, luego R16, luego QF, luego SF
    const roundOrder = ['R32_', 'R16_', 'QF_', 'SF_', 'F_'];
    for (const roundPrefix of roundOrder) {
      Object.entries(winnersMap).filter(([matchId]) => matchId.startsWith(roundPrefix)).forEach(([matchId, winnerId]) => {
        const team = teamsData.find(t => t.id === winnerId);
        if (!team) return;
        let mapping: [number, boolean] | undefined;
        let nextRoundKey: string | undefined;
        let matchNumber: number;
        if (matchId.startsWith('R32_')) {
          matchNumber = parseInt(matchId.replace('R32_', '')) - 1;
          mapping = r32ToR16Map[matchNumber];
          nextRoundKey = 'Octavos de Final';
        } else if (matchId.startsWith('R16_')) {
          matchNumber = parseInt(matchId.replace('R16_', '')) - 1;
          mapping = r16ToQFMap[matchNumber];
          nextRoundKey = 'Cuartos de Final';
        } else if (matchId.startsWith('QF_')) {
          matchNumber = parseInt(matchId.replace('QF_', '')) - 1;
          mapping = qfToSFMap[matchNumber];
          nextRoundKey = 'Semifinales';
        } else if (matchId.startsWith('SF_')) {
          matchNumber = parseInt(matchId.replace('SF_', '')) - 1;
          const finalMatches = newPlayoffMatches['Final'] || [];
          if (finalMatches[0]) {
            if (matchNumber === 0) {
              finalMatches[0] = {
                ...finalMatches[0],
                home_team: team,
                home_team_id: winnerId
              };
            } else {
              finalMatches[0] = {
                ...finalMatches[0],
                away_team: team,
                away_team_id: winnerId
              };
            }
            newPlayoffMatches['Final'] = finalMatches;
          }
          return;
        } else {
          return;
        }
        if (mapping && nextRoundKey) {
          const [nextMatchIndex, isAway] = mapping;
          const nextMatches = newPlayoffMatches[nextRoundKey] || [];

          // Asegurarse de que el partido existe
          if (!nextMatches[nextMatchIndex]) {
            const roundIds: Record<string, string> = {
              'Octavos de Final': 'R16_',
              'Cuartos de Final': 'QF_',
              'Semifinales': 'SF_',
              'Final': 'F_'
            };
            nextMatches[nextMatchIndex] = {
              id: `${roundIds[nextRoundKey]}${nextMatchIndex + 1}`,
              home_team_id: '',
              away_team_id: '',
              group_id: '',
              round: nextRoundKey,
              match_date: ''
            } as Match;
          }
          if (isAway) {
            nextMatches[nextMatchIndex] = {
              ...nextMatches[nextMatchIndex],
              away_team: team,
              away_team_id: winnerId
            };
          } else {
            nextMatches[nextMatchIndex] = {
              ...nextMatches[nextMatchIndex],
              home_team: team,
              home_team_id: winnerId
            };
          }
          newPlayoffMatches[nextRoundKey] = nextMatches;
        }
      });
    }
    return newPlayoffMatches;
  };

  // Generar dieciseisavos de final basándose en predicciones de grupos
  // Esta función NO modifica el estado directamente, retorna el resultado
  const generarDieciseisavosFromPredictions = (groupPredictionsMap: Record<string, PartidoResultado>, groupMatchesData: Record<string, Match[]>, teamsData: Team[]): Match[] => {
    const standings: Record<string, Team[]> = {};

    // Calcular clasificación de cada grupo usando las predicciones de grupos
    Object.keys(groupMatchesData).forEach(groupId => {
      const estadisticas: Record<string, EstadisticasEquipo> = {};
      const partidosGrupo = groupMatchesData[groupId] || [];

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

      // Procesar resultados con predicciones del usuario
      partidosGrupo.forEach(match => {
        const resultado = groupPredictionsMap[match.id];
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

      // Ordenar y mapear a Teams
      const clasificacion = Object.values(estadisticas).map(e => ({
        ...e,
        diferencia: e.golesFavor - e.golesContra
      })).sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        if (b.diferencia !== a.diferencia) return b.diferencia - a.diferencia;
        return b.golesFavor - a.golesFavor;
      });
      standings[groupId] = clasificacion.map(est => {
        for (const match of partidosGrupo) {
          if (match.home_team?.name === est.equipo) return match.home_team;
          if (match.away_team?.name === est.equipo) return match.away_team;
        }
        return null;
      }).filter(Boolean) as Team[];
    });

    // Obtener mejores terceras
    const grupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const terceros: Array<{
      equipo: string;
      grupo: string;
      puntos: number;
      diferencia: number;
      golesFavor: number;
    }> = [];
    grupos.forEach(grupo => {
      if (standings[grupo]?.length >= 3) {
        const tercero = standings[grupo][2];
        if (tercero) {
          // Recalcular stats del tercero
          const estadisticas = {
            puntos: 0,
            diferencia: 0,
            golesFavor: 0
          };
          (groupMatchesData[grupo] || []).forEach(match => {
            const resultado = groupPredictionsMap[match.id];
            if (resultado && resultado.local !== null && resultado.visitante !== null) {
              if (match.home_team?.id === tercero.id) {
                estadisticas.golesFavor += resultado.local;
                estadisticas.diferencia += resultado.local - resultado.visitante;
                if (resultado.local > resultado.visitante) estadisticas.puntos += 3;else if (resultado.local === resultado.visitante) estadisticas.puntos += 1;
              } else if (match.away_team?.id === tercero.id) {
                estadisticas.golesFavor += resultado.visitante;
                estadisticas.diferencia += resultado.visitante - resultado.local;
                if (resultado.visitante > resultado.local) estadisticas.puntos += 3;else if (resultado.visitante === resultado.local) estadisticas.puntos += 1;
              }
            }
          });
          terceros.push({
            equipo: tercero.name,
            grupo,
            puntos: estadisticas.puntos,
            diferencia: estadisticas.diferencia,
            golesFavor: estadisticas.golesFavor
          });
        }
      }
    });
    const mejoresTerceras = terceros.sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
      if (b.diferencia !== a.diferencia) return b.diferencia - a.diferencia;
      return b.golesFavor - a.golesFavor;
    }).slice(0, 8);
    const getTerceroPorGrupo = (grupo: string): Team | undefined => {
      const tercero = mejoresTerceras.find(t => t.grupo === grupo);
      if (!tercero) return undefined;
      for (const match of groupMatchesData[grupo] || []) {
        if (match.home_team?.name === tercero.equipo) return match.home_team;
        if (match.away_team?.name === tercero.equipo) return match.away_team;
      }
      return undefined;
    };

    // Configuración FIFA 2026 - Artículo 12.6
    const dieciseisavosMatchups = [{
      home: standings['A']?.[1],
      away: standings['B']?.[1]
    }, {
      home: standings['E']?.[0],
      away: mejoresTerceras[0] ? getTerceroPorGrupo(mejoresTerceras[0].grupo) : undefined
    }, {
      home: standings['F']?.[0],
      away: standings['C']?.[1]
    }, {
      home: standings['C']?.[0],
      away: standings['F']?.[1]
    }, {
      home: standings['I']?.[0],
      away: mejoresTerceras[1] ? getTerceroPorGrupo(mejoresTerceras[1].grupo) : undefined
    }, {
      home: standings['E']?.[1],
      away: standings['I']?.[1]
    }, {
      home: standings['A']?.[0],
      away: mejoresTerceras[2] ? getTerceroPorGrupo(mejoresTerceras[2].grupo) : undefined
    }, {
      home: standings['L']?.[0],
      away: mejoresTerceras[3] ? getTerceroPorGrupo(mejoresTerceras[3].grupo) : undefined
    }, {
      home: standings['D']?.[0],
      away: mejoresTerceras[4] ? getTerceroPorGrupo(mejoresTerceras[4].grupo) : undefined
    }, {
      home: standings['G']?.[0],
      away: mejoresTerceras[5] ? getTerceroPorGrupo(mejoresTerceras[5].grupo) : undefined
    }, {
      home: standings['K']?.[1],
      away: standings['L']?.[1]
    }, {
      home: standings['H']?.[0],
      away: standings['J']?.[1]
    }, {
      home: standings['B']?.[0],
      away: mejoresTerceras[6] ? getTerceroPorGrupo(mejoresTerceras[6].grupo) : undefined
    }, {
      home: standings['J']?.[0],
      away: standings['H']?.[1]
    }, {
      home: standings['K']?.[0],
      away: mejoresTerceras[7] ? getTerceroPorGrupo(mejoresTerceras[7].grupo) : undefined
    }, {
      home: standings['D']?.[1],
      away: standings['G']?.[1]
    }];
    return dieciseisavosMatchups.map((matchup, i) => ({
      id: `R32_${i + 1}`,
      home_team_id: matchup.home?.id || '',
      away_team_id: matchup.away?.id || '',
      home_team: matchup.home,
      away_team: matchup.away,
      group_id: '',
      round: 'Dieciseisavos de Final',
      match_date: ''
    })) as Match[];
  };

  // Cargar predicciones existentes del usuario
  const loadExistingPredictions = async (teamsData: Team[], basePlayoffMatches: Record<string, Match[]>, groupMatchesData: Record<string, Match[]>) => {
    if (!user) return;
    try {
      // Cargar datos de matches para verificar el tipo
      const {
        data: allMatches
      } = await supabase.from('matches').select('id, match_type');
      const groupMatchIds = new Set(allMatches?.filter(m => m.match_type === 'group').map(m => m.id) || []);

      // Cargar predicciones del usuario
      const {
        data: predictions,
        error
      } = await supabase.from('predictions').select('match_id, home_goals, away_goals, predicted_winner_team_id, playoff_round').eq('user_id', user.id);
      if (error) throw error;
      const groupPredictionsMap: Record<string, PartidoResultado> = {};
      const playoffWinnersMap: Record<string, string> = {};
      const playoffPredictionsMap: Record<string, PartidoResultado> = {};
      predictions?.forEach(prediction => {
        // Predicciones de grupos (tienen match_id válido en la tabla matches)
        if (prediction.match_id && groupMatchIds.has(prediction.match_id)) {
          if (prediction.home_goals !== null && prediction.away_goals !== null) {
            groupPredictionsMap[prediction.match_id] = {
              local: prediction.home_goals,
              visitante: prediction.away_goals
            };
          }
        }

        // Predicciones de playoffs (usan playoff_round en lugar de match_id)
        if (prediction.playoff_round && prediction.predicted_winner_team_id) {
          playoffWinnersMap[prediction.playoff_round] = prediction.predicted_winner_team_id;
        }
      });
      setPartidosGrupos(groupPredictionsMap);
      setPlayoffWinners(playoffWinnersMap);
      setPlayoffPredictions(playoffPredictionsMap);

      // Si hay predicciones de playoffs guardadas, reconstruir el bracket completo
      if (Object.keys(playoffWinnersMap).length > 0 && Object.keys(groupMatchesData).length > 0) {
        // Primero generar dieciseisavos basándose en las predicciones de grupos del usuario
        const dieciseisavosMatches = generarDieciseisavosFromPredictions(groupPredictionsMap, groupMatchesData, teamsData);

        // Crear estructura base con los dieciseisavos generados
        const newPlayoffMatches: Record<string, Match[]> = {
          'Dieciseisavos de Final': dieciseisavosMatches,
          'Octavos de Final': Array.from({
            length: 8
          }, (_, i) => ({
            id: `R16_${i + 1}`,
            home_team_id: '',
            away_team_id: '',
            group_id: '',
            round: 'Octavos de Final',
            match_date: ''
          })) as Match[],
          'Cuartos de Final': Array.from({
            length: 4
          }, (_, i) => ({
            id: `QF_${i + 1}`,
            home_team_id: '',
            away_team_id: '',
            group_id: '',
            round: 'Cuartos de Final',
            match_date: ''
          })) as Match[],
          'Semifinales': Array.from({
            length: 2
          }, (_, i) => ({
            id: `SF_${i + 1}`,
            home_team_id: '',
            away_team_id: '',
            group_id: '',
            round: 'Semifinales',
            match_date: ''
          })) as Match[],
          'Final': [{
            id: 'FINAL_1',
            home_team_id: '',
            away_team_id: '',
            group_id: '',
            round: 'Final',
            match_date: ''
          }] as Match[]
        };

        // Ahora aplicar las predicciones de ganadores para avanzar equipos
        const reconstructedMatches = reconstructBracketFromPredictions(playoffWinnersMap, teamsData, newPlayoffMatches);
        setPlayoffMatches(reconstructedMatches);
      }

      // Cargar predicción del campeón
      const {
        data: championData
      } = await supabase.from('champion_predictions').select('predicted_winner_team_id').eq('user_id', user.id).maybeSingle();
      if (championData) {
        const team = teamsData.find(t => t.id === championData.predicted_winner_team_id);
        if (team) setCampeon(team.name);
      }

      // Cargar predicciones de premios
      const {
        data: awards
      } = await supabase.from('award_predictions').select('award_type, player_name').eq('user_id', user.id);
      awards?.forEach(award => {
        if (award.award_type === 'balon_oro') setBalonOro(award.player_name);
        if (award.award_type === 'bota_oro') setBotaOro(award.player_name);
      });
    } catch (error) {
      console.error('Error loading predictions:', error);
    }
  };

  // Función para generar automáticamente los dieciseisavos de final (Round of 32)
  // Según normativa FIFA 2026 - Artículo 12.6
  const generarDieciseisavosDeFinal = () => {
    const standings: Record<string, Team[]> = {};

    // Calcular clasificación de cada grupo basándose en las PREDICCIONES del usuario (partidosGrupos)
    Object.keys(groupMatches).forEach(groupId => {
      const clasificacion = calcularClasificacionGrupo(groupId);
      // Mapear nombres de equipos a objetos Team
      standings[groupId] = clasificacion.map(est => {
        const matchesInGroup = groupMatches[groupId];
        for (const match of matchesInGroup) {
          if (match.home_team?.name === est.equipo) return match.home_team;
          if (match.away_team?.name === est.equipo) return match.away_team;
        }
        return null;
      }).filter(Boolean) as Team[];
    });

    // Obtener las 8 mejores terceras de los 12 grupos
    const mejoresTerceras = calcularMejoresTerceras().slice(0, 8);

    // Mapear terceras a grupos para determinar emparejamientos según Anexo C
    const tercerosGrupos = mejoresTerceras.map(t => t.grupo).sort().join('');

    // Función para obtener el Team de un tercero por su grupo
    const getTerceroPorGrupo = (grupo: string): Team | undefined => {
      const tercero = mejoresTerceras.find(t => t.grupo === grupo);
      if (!tercero) return undefined;
      const matchesInGroup = groupMatches[grupo];
      for (const match of matchesInGroup || []) {
        if (match.home_team?.name === tercero.equipo) return match.home_team;
        if (match.away_team?.name === tercero.equipo) return match.away_team;
      }
      return undefined;
    };

    // Según la normativa FIFA 2026, hay 495 combinaciones posibles de 8 mejores terceros
    // Aquí usamos una configuración simplificada basada en los grupos de los terceros clasificados
    // En un sistema completo, se debería implementar el Anexo C completo

    // Configuración de terceros para cada partido según la combinación de grupos clasificados
    // Formato: { posición en mejores terceras => partido al que va }
    const getTercerosParaPartidos = (): Record<string, Team | undefined> => {
      // Simplificación: asignar terceros en orden según su clasificación
      // En la implementación real del Anexo C, esto dependería de qué grupos clasifican
      return {
        'ABCDF': getTerceroPorGrupo(mejoresTerceras[0]?.grupo),
        // Para 1E
        'CDFGH': getTerceroPorGrupo(mejoresTerceras[1]?.grupo),
        // Para 1I
        'CEFHI': getTerceroPorGrupo(mejoresTerceras[2]?.grupo),
        // Para 1A
        'EHIJK': getTerceroPorGrupo(mejoresTerceras[3]?.grupo),
        // Para 1L
        'BEFIJ': getTerceroPorGrupo(mejoresTerceras[4]?.grupo),
        // Para 1D
        'AEHIJ': getTerceroPorGrupo(mejoresTerceras[5]?.grupo),
        // Para 1G
        'EFGIJ': getTerceroPorGrupo(mejoresTerceras[6]?.grupo),
        // Para 1B
        'DEIJL': getTerceroPorGrupo(mejoresTerceras[7]?.grupo) // Para 1K
      };
    };
    const newPlayoffMatches = {
      ...playoffMatches
    };

    // Crear 16 partidos de Dieciseisavos según formato FIFA 2026 - Artículo 12.6
    // Los índices corresponden al orden oficial: M73-M88
    const dieciseisavosMatchups = [
    // M73: 2A vs 2B
    {
      home: standings['A']?.[1],
      away: standings['B']?.[1]
    },
    // M74: 1E vs Mejor 3ª (ABCDF)
    {
      home: standings['E']?.[0],
      away: mejoresTerceras[0] ? getTerceroPorGrupo(mejoresTerceras[0].grupo) : undefined
    },
    // M75: 1F vs 2C
    {
      home: standings['F']?.[0],
      away: standings['C']?.[1]
    },
    // M76: 1C vs 2F
    {
      home: standings['C']?.[0],
      away: standings['F']?.[1]
    },
    // M77: 1I vs Mejor 3ª (CDFGH)
    {
      home: standings['I']?.[0],
      away: mejoresTerceras[1] ? getTerceroPorGrupo(mejoresTerceras[1].grupo) : undefined
    },
    // M78: 2E vs 2I
    {
      home: standings['E']?.[1],
      away: standings['I']?.[1]
    },
    // M79: 1A vs Mejor 3ª (CEFHI)
    {
      home: standings['A']?.[0],
      away: mejoresTerceras[2] ? getTerceroPorGrupo(mejoresTerceras[2].grupo) : undefined
    },
    // M80: 1L vs Mejor 3ª (EHIJK)
    {
      home: standings['L']?.[0],
      away: mejoresTerceras[3] ? getTerceroPorGrupo(mejoresTerceras[3].grupo) : undefined
    },
    // M81: 1D vs Mejor 3ª (BEFIJ)
    {
      home: standings['D']?.[0],
      away: mejoresTerceras[4] ? getTerceroPorGrupo(mejoresTerceras[4].grupo) : undefined
    },
    // M82: 1G vs Mejor 3ª (AEHIJ)
    {
      home: standings['G']?.[0],
      away: mejoresTerceras[5] ? getTerceroPorGrupo(mejoresTerceras[5].grupo) : undefined
    },
    // M83: 2K vs 2L
    {
      home: standings['K']?.[1],
      away: standings['L']?.[1]
    },
    // M84: 1H vs 2J
    {
      home: standings['H']?.[0],
      away: standings['J']?.[1]
    },
    // M85: 1B vs Mejor 3ª (EFGIJ)
    {
      home: standings['B']?.[0],
      away: mejoresTerceras[6] ? getTerceroPorGrupo(mejoresTerceras[6].grupo) : undefined
    },
    // M86: 1J vs 2H
    {
      home: standings['J']?.[0],
      away: standings['H']?.[1]
    },
    // M87: 1K vs Mejor 3ª (DEIJL)
    {
      home: standings['K']?.[0],
      away: mejoresTerceras[7] ? getTerceroPorGrupo(mejoresTerceras[7].grupo) : undefined
    },
    // M88: 2D vs 2G
    {
      home: standings['D']?.[1],
      away: standings['G']?.[1]
    }];

    // Crear/actualizar partidos de dieciseisavos
    const dieciseisavosMatches: Match[] = dieciseisavosMatchups.map((matchup, i) => ({
      id: `R32_${i + 1}`,
      home_team_id: matchup.home?.id || '',
      away_team_id: matchup.away?.id || '',
      home_team: matchup.home,
      away_team: matchup.away,
      group_id: '',
      round: 'Dieciseisavos de Final',
      match_date: ''
    })) as Match[];
    newPlayoffMatches['Dieciseisavos de Final'] = dieciseisavosMatches;

    // Crear placeholders para Octavos (8 partidos)
    if (!newPlayoffMatches['Octavos de Final'] || newPlayoffMatches['Octavos de Final'].length === 0) {
      newPlayoffMatches['Octavos de Final'] = Array.from({
        length: 8
      }, (_, i) => ({
        id: `R16_${i + 1}`,
        home_team_id: '',
        away_team_id: '',
        group_id: '',
        round: 'Octavos de Final',
        match_date: ''
      })) as Match[];
    }

    // Crear placeholders para Cuartos
    if (!newPlayoffMatches['Cuartos de Final'] || newPlayoffMatches['Cuartos de Final'].length === 0) {
      newPlayoffMatches['Cuartos de Final'] = Array.from({
        length: 4
      }, (_, i) => ({
        id: `QF_${i + 1}`,
        home_team_id: '',
        away_team_id: '',
        group_id: '',
        round: 'Cuartos de Final',
        match_date: ''
      })) as Match[];
    }
    if (!newPlayoffMatches['Semifinales'] || newPlayoffMatches['Semifinales'].length === 0) {
      newPlayoffMatches['Semifinales'] = Array.from({
        length: 2
      }, (_, i) => ({
        id: `SF_${i + 1}`,
        home_team_id: '',
        away_team_id: '',
        group_id: '',
        round: 'Semifinales',
        match_date: ''
      })) as Match[];
    }
    if (!newPlayoffMatches['Final'] || newPlayoffMatches['Final'].length === 0) {
      newPlayoffMatches['Final'] = [{
        id: `FINAL_1`,
        home_team_id: '',
        away_team_id: '',
        group_id: '',
        round: 'Final',
        match_date: ''
      }] as Match[];
    }
    setPlayoffMatches(newPlayoffMatches);
    toast({
      title: "Dieciseisavos generados",
      description: "Los cruces se han generado según tus pronósticos de la fase de grupos."
    });
  };

  // Función para calcular las estadísticas de un grupo
  const calcularClasificacionGrupo = (groupId: string): EstadisticasEquipo[] => {
    const estadisticas: Record<string, EstadisticasEquipo> = {};
    const partidosGrupo = groupMatches[groupId] || [];

    // Inicializar estadísticas para todos los equipos del grupo
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

    // Procesar resultados de partidos
    partidosGrupo.forEach(match => {
      const resultado = partidosGrupos[match.id];
      if (resultado && resultado.local !== null && resultado.visitante !== null) {
        const homeTeam = match.home_team?.name || match.home_team_id;
        const awayTeam = match.away_team?.name || match.away_team_id;
        const golesLocal = resultado.local;
        const golesVisitante = resultado.visitante;

        // Actualizar estadísticas del equipo local
        estadisticas[homeTeam].partidosJugados++;
        estadisticas[homeTeam].golesFavor += golesLocal;
        estadisticas[homeTeam].golesContra += golesVisitante;

        // Actualizar estadísticas del equipo visitante
        estadisticas[awayTeam].partidosJugados++;
        estadisticas[awayTeam].golesFavor += golesVisitante;
        estadisticas[awayTeam].golesContra += golesLocal;

        // Determinar resultado y asignar puntos
        if (golesLocal > golesVisitante) {
          // Victoria local
          estadisticas[homeTeam].partidosGanados++;
          estadisticas[homeTeam].puntos += 3;
          estadisticas[awayTeam].partidosPerdidos++;
        } else if (golesLocal < golesVisitante) {
          // Victoria visitante
          estadisticas[awayTeam].partidosGanados++;
          estadisticas[awayTeam].puntos += 3;
          estadisticas[homeTeam].partidosPerdidos++;
        } else {
          // Empate
          estadisticas[homeTeam].partidosEmpatados++;
          estadisticas[awayTeam].partidosEmpatados++;
          estadisticas[homeTeam].puntos += 1;
          estadisticas[awayTeam].puntos += 1;
        }
      }
    });

    // Calcular diferencia de goles y ordenar
    return Object.values(estadisticas).map(equipo => ({
      ...equipo,
      diferencia: equipo.golesFavor - equipo.golesContra
    })).sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
      if (b.diferencia !== a.diferencia) return b.diferencia - a.diferencia;
      return b.golesFavor - a.golesFavor;
    });
  };

  // Función para calcular las 8 mejores terceras clasificadas según criterios FIFA
  const calcularMejoresTerceras = (): Array<EstadisticasEquipo & {
    grupo: string;
  }> => {
    const grupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const terceros: Array<EstadisticasEquipo & {
      grupo: string;
    }> = [];

    // Obtener el tercer lugar de cada grupo
    grupos.forEach(grupo => {
      const clasificacion = calcularClasificacionGrupo(grupo);
      if (clasificacion.length >= 3) {
        terceros.push({
          ...clasificacion[2],
          // Tercer lugar (índice 2)
          grupo: grupo
        });
      }
    });

    // Ordenar según criterios FIFA para terceros lugares
    return terceros.sort((a, b) => {
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

  // Función para calcular los puntos ganados por un partido de grupo
  const calcularPuntosPartido = (matchId: string): number | null => {
    const realResult = realMatchResults[matchId];
    const prediction = partidosGrupos[matchId];

    // Solo calcular si el partido está completado y hay predicción
    if (!realResult || realResult.status !== 'completed' || realResult.home_goals === null || realResult.away_goals === null || !prediction || prediction.local === null || prediction.visitante === null) {
      return null;
    }
    const pLocal = prediction.local;
    const pVisitante = prediction.visitante;
    const rLocal = realResult.home_goals;
    const rVisitante = realResult.away_goals;
    let puntos = 0;

    // Resultado exacto: todos los puntos + bonus
    if (pLocal === rLocal && pVisitante === rVisitante) {
      puntos = 2 + rLocal + (2 + rVisitante) + 5 + 6; // goles + acierto resultado + bonus exacto
    } else {
      // Puntos por goles acertados
      if (pLocal === rLocal) {
        puntos += 2 + rLocal;
      }
      if (pVisitante === rVisitante) {
        puntos += 2 + rVisitante;
      }
      // Puntos por acertar resultado (victoria/empate/derrota)
      const predWinner = pLocal > pVisitante ? 'home' : pLocal < pVisitante ? 'away' : 'draw';
      const realWinner = rLocal > rVisitante ? 'home' : rLocal < rVisitante ? 'away' : 'draw';
      if (predWinner === realWinner) {
        puntos += 5;
      }
    }
    return puntos;
  };

  // Función para verificar si el usuario acertó el orden exacto de un grupo
  const verificarAciertoOrdenGrupo = (groupId: string): boolean | null => {
    // Verificar si todos los partidos del grupo están completados
    const partidosGrupo = groupMatches[groupId] || [];
    const todosCompletados = partidosGrupo.every(match => {
      const result = realMatchResults[match.id];
      return result && result.status === 'completed' && result.home_goals !== null && result.away_goals !== null;
    });
    if (!todosCompletados) return null; // Grupo no completado aún

    // Calcular orden real basado en resultados reales o override del admin
    let ordenReal: string[];
    if (adminGroupOrders[groupId] && adminGroupOrders[groupId].length > 0) {
      ordenReal = adminGroupOrders[groupId];
    } else {
      // Calcular orden desde resultados reales
      const estadisticas: Record<string, {
        teamId: string;
        puntos: number;
        gd: number;
        gf: number;
      }> = {};
      partidosGrupo.forEach(match => {
        const result = realMatchResults[match.id];
        if (!result || result.home_goals === null || result.away_goals === null) return;
        const homeId = match.home_team_id;
        const awayId = match.away_team_id;
        if (!estadisticas[homeId]) estadisticas[homeId] = {
          teamId: homeId,
          puntos: 0,
          gd: 0,
          gf: 0
        };
        if (!estadisticas[awayId]) estadisticas[awayId] = {
          teamId: awayId,
          puntos: 0,
          gd: 0,
          gf: 0
        };
        estadisticas[homeId].gf += result.home_goals;
        estadisticas[homeId].gd += result.home_goals - result.away_goals;
        estadisticas[awayId].gf += result.away_goals;
        estadisticas[awayId].gd += result.away_goals - result.home_goals;
        if (result.home_goals > result.away_goals) {
          estadisticas[homeId].puntos += 3;
        } else if (result.home_goals < result.away_goals) {
          estadisticas[awayId].puntos += 3;
        } else {
          estadisticas[homeId].puntos += 1;
          estadisticas[awayId].puntos += 1;
        }
      });
      ordenReal = Object.values(estadisticas).sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
      }).map(e => e.teamId);
    }

    // Calcular orden predicho por el usuario
    const estadisticasUser: Record<string, {
      teamId: string;
      puntos: number;
      gd: number;
      gf: number;
    }> = {};
    partidosGrupo.forEach(match => {
      const pred = partidosGrupos[match.id];
      if (!pred || pred.local === null || pred.visitante === null) return;
      const homeId = match.home_team_id;
      const awayId = match.away_team_id;
      if (!estadisticasUser[homeId]) estadisticasUser[homeId] = {
        teamId: homeId,
        puntos: 0,
        gd: 0,
        gf: 0
      };
      if (!estadisticasUser[awayId]) estadisticasUser[awayId] = {
        teamId: awayId,
        puntos: 0,
        gd: 0,
        gf: 0
      };
      estadisticasUser[homeId].gf += pred.local;
      estadisticasUser[homeId].gd += pred.local - pred.visitante;
      estadisticasUser[awayId].gf += pred.visitante;
      estadisticasUser[awayId].gd += pred.visitante - pred.local;
      if (pred.local > pred.visitante) {
        estadisticasUser[homeId].puntos += 3;
      } else if (pred.local < pred.visitante) {
        estadisticasUser[awayId].puntos += 3;
      } else {
        estadisticasUser[homeId].puntos += 1;
        estadisticasUser[awayId].puntos += 1;
      }
    });
    const ordenUser = Object.values(estadisticasUser).sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    }).map(e => e.teamId);

    // Comparar órdenes
    if (ordenReal.length !== ordenUser.length || ordenReal.length === 0) return null;
    return ordenReal.every((teamId, index) => teamId === ordenUser[index]);
  };

  // Función para calcular puntos de playoff por equipo
  const calcularPuntosPlayoffEquipo = (teamId: string, round: string): number | null => {
    // Obtener predicción del usuario para este equipo en la ronda anterior
    const roundMapping: Record<string, {
      predRound: string;
      points: number;
    }> = {
      'Dieciseisavos de Final': {
        predRound: 'R32_',
        points: 10
      },
      'Octavos de Final': {
        predRound: 'R32_',
        points: 15
      },
      'Cuartos de Final': {
        predRound: 'R16_',
        points: 20
      },
      'Semifinales': {
        predRound: 'QF_',
        points: 30
      },
      'Final': {
        predRound: 'SF_',
        points: 40
      },
      'champion': {
        predRound: 'champion',
        points: 50
      }
    };
    const config = roundMapping[round];
    if (!config) return null;

    // Verificar si el equipo está clasificado a esta ronda en la realidad
    let isClassified = false;
    if (round === 'Dieciseisavos de Final') isClassified = classifiedTeams.r32.has(teamId);else if (round === 'Octavos de Final') isClassified = classifiedTeams.r16.has(teamId);else if (round === 'Cuartos de Final') isClassified = classifiedTeams.qf.has(teamId);else if (round === 'Semifinales') isClassified = classifiedTeams.sf.has(teamId);else if (round === 'Final') isClassified = classifiedTeams.final.has(teamId);else if (round === 'champion') isClassified = classifiedTeams.champion === teamId;
    if (!isClassified) return null;

    // Verificar si el usuario predijo este equipo
    let userPredicted = false;
    if (round === 'champion') {
      const championTeam = teams.find(t => t.name === campeon);
      userPredicted = championTeam?.id === teamId;
    } else {
      // Buscar en las predicciones de playoff si el usuario eligió este equipo
      Object.entries(playoffWinners).forEach(([matchId, winnerId]) => {
        if (winnerId === teamId) {
          // Verificar si la predicción es de la ronda correcta para obtener puntos en esta ronda
          if (round === 'Dieciseisavos de Final' && matchId.startsWith('R32_')) {
            userPredicted = true;
          } else if (round === 'Octavos de Final' && matchId.startsWith('R32_')) {
            userPredicted = true;
          } else if (round === 'Cuartos de Final' && matchId.startsWith('R16_')) {
            userPredicted = true;
          } else if (round === 'Semifinales' && matchId.startsWith('QF_')) {
            userPredicted = true;
          } else if (round === 'Final' && matchId.startsWith('SF_')) {
            userPredicted = true;
          }
        }
      });
    }
    return userPredicted ? config.points : null;
  };

  // Función para manejar cambios en los marcadores
  // Al cambiar cualquier resultado de grupos, se reinicia TODA la fase eliminatoria
  const handlePartidoChange = (matchId: string, tipo: 'local' | 'visitante', valor: string) => {
    let numeroValor: number | null = null;
    if (valor !== '') {
      const parsed = parseInt(valor, 10);
      if (isNaN(parsed) || parsed < 0 || parsed > 50) return;
      numeroValor = parsed;
    }
    setPartidosGrupos(prev => {
      const newPredictions = {
        ...prev,
        [matchId]: {
          ...prev[matchId],
          [tipo]: numeroValor
        }
      };
      return newPredictions;
    });

    // Reiniciar TODA la fase eliminatoria cuando se cambia un resultado de grupos
    // Esto incluye: ganadores, equipos en todas las rondas y campeón
    setPlayoffWinners({});
    setCampeon('');

    // Reiniciar el bracket completo - limpiar todas las rondas
    const resetPlayoffMatches: Record<string, Match[]> = {
      'Dieciseisavos de Final': [],
      'Octavos de Final': Array.from({
        length: 8
      }, (_, i) => ({
        id: `R16_${i + 1}`,
        home_team_id: '',
        away_team_id: '',
        group_id: '',
        round: 'Octavos de Final',
        match_date: ''
      })) as Match[],
      'Cuartos de Final': Array.from({
        length: 4
      }, (_, i) => ({
        id: `QF_${i + 1}`,
        home_team_id: '',
        away_team_id: '',
        group_id: '',
        round: 'Cuartos de Final',
        match_date: ''
      })) as Match[],
      'Semifinales': Array.from({
        length: 2
      }, (_, i) => ({
        id: `SF_${i + 1}`,
        home_team_id: '',
        away_team_id: '',
        group_id: '',
        round: 'Semifinales',
        match_date: ''
      })) as Match[],
      'Final': [{
        id: 'FINAL_1',
        home_team_id: '',
        away_team_id: '',
        group_id: '',
        round: 'Final',
        match_date: ''
      }] as Match[]
    };
    setPlayoffMatches(resetPlayoffMatches);
  };

  // Función para manejar cambios en marcadores de playoffs
  const handlePlayoffChange = (matchId: string, tipo: 'local' | 'visitante', valor: string) => {
    let numeroValor: number | null = null;
    if (valor !== '') {
      const parsed = parseInt(valor, 10);
      if (isNaN(parsed) || parsed < 0 || parsed > 50) return;
      numeroValor = parsed;
    }
    setPlayoffPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [tipo]: numeroValor
      }
    }));
  };

  // Función para seleccionar ganador de un partido de eliminatorias
  // Sigue la normativa FIFA 2026 para el avance de equipos entre rondas
  const handleSelectWinner = (matchId: string, teamId: string, teamName: string, round: string) => {
    // Guardar el ganador
    setPlayoffWinners(prev => ({
      ...prev,
      [matchId]: teamId
    }));

    // Avanzar el equipo a la siguiente ronda automáticamente
    const newPlayoffMatches = {
      ...playoffMatches
    };
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    if (round === 'Dieciseisavos de Final') {
      // Mapeo FIFA 2026 de Dieciseisavos a Octavos (Artículo 12.7)
      // Dieciseisavos indexados 0-15 (R32_1 a R32_16)
      // Octavos indexados 0-7 (R16_1 a R16_8)
      // Mapeo: { índice_dieciseisavo: [índice_octavo, esLocal] }
      const r32ToR16Map: Record<number, [number, boolean]> = {
        0: [1, false],
        // W73 (R32_1) -> M90 como home (índice 1)
        1: [0, false],
        // W74 (R32_2) -> M89 como home (índice 0)
        2: [1, true],
        // W75 (R32_3) -> M90 como away
        3: [2, false],
        // W76 (R32_4) -> M91 como home (índice 2)
        4: [0, true],
        // W77 (R32_5) -> M89 como away
        5: [2, true],
        // W78 (R32_6) -> M91 como away
        6: [3, false],
        // W79 (R32_7) -> M92 como home (índice 3)
        7: [3, true],
        // W80 (R32_8) -> M92 como away
        8: [5, false],
        // W81 (R32_9) -> M94 como home (índice 5)
        9: [5, true],
        // W82 (R32_10) -> M94 como away
        10: [4, false],
        // W83 (R32_11) -> M93 como home (índice 4)
        11: [4, true],
        // W84 (R32_12) -> M93 como away
        12: [7, false],
        // W85 (R32_13) -> M96 como home (índice 7)
        13: [6, false],
        // W86 (R32_14) -> M95 como home (índice 6)
        14: [7, true],
        // W87 (R32_15) -> M96 como away
        15: [6, true] // W88 (R32_16) -> M95 como away
      };
      const matchNumber = parseInt(matchId.replace('R32_', '')) - 1;
      const mapping = r32ToR16Map[matchNumber];
      if (mapping) {
        const [octavoIndex, isAway] = mapping;
        const octavosMatches = [...(newPlayoffMatches['Octavos de Final'] || [])];
        if (octavosMatches[octavoIndex]) {
          if (isAway) {
            octavosMatches[octavoIndex] = {
              ...octavosMatches[octavoIndex],
              away_team: team,
              away_team_id: teamId
            };
          } else {
            octavosMatches[octavoIndex] = {
              ...octavosMatches[octavoIndex],
              home_team: team,
              home_team_id: teamId
            };
          }
          newPlayoffMatches['Octavos de Final'] = octavosMatches;
        }
      }
    } else if (round === 'Octavos de Final') {
      // Mapeo FIFA 2026 de Octavos a Cuartos (Artículo 12.8)
      // M97: W89 vs W90 -> QF_1
      // M98: W93 vs W94 -> QF_2
      // M99: W91 vs W92 -> QF_3
      // M100: W95 vs W96 -> QF_4
      const r16ToQFMap: Record<number, [number, boolean]> = {
        0: [0, false],
        // W89 (R16_1) -> M97 como home (QF_1)
        1: [0, true],
        // W90 (R16_2) -> M97 como away
        2: [2, false],
        // W91 (R16_3) -> M99 como home (QF_3)
        3: [2, true],
        // W92 (R16_4) -> M99 como away
        4: [1, false],
        // W93 (R16_5) -> M98 como home (QF_2)
        5: [1, true],
        // W94 (R16_6) -> M98 como away
        6: [3, false],
        // W95 (R16_7) -> M100 como home (QF_4)
        7: [3, true] // W96 (R16_8) -> M100 como away
      };
      const matchNumber = parseInt(matchId.replace('R16_', '')) - 1;
      const mapping = r16ToQFMap[matchNumber];
      if (mapping) {
        const [cuartoIndex, isAway] = mapping;
        const cuartosMatches = [...(newPlayoffMatches['Cuartos de Final'] || [])];
        if (cuartosMatches[cuartoIndex]) {
          if (isAway) {
            cuartosMatches[cuartoIndex] = {
              ...cuartosMatches[cuartoIndex],
              away_team: team,
              away_team_id: teamId
            };
          } else {
            cuartosMatches[cuartoIndex] = {
              ...cuartosMatches[cuartoIndex],
              home_team: team,
              home_team_id: teamId
            };
          }
          newPlayoffMatches['Cuartos de Final'] = cuartosMatches;
        }
      }
    } else if (round === 'Cuartos de Final') {
      // Mapeo FIFA 2026 de Cuartos a Semifinales (Artículo 12.9)
      // SF1 (M101): W97 vs W98 -> SF_1
      // SF2 (M102): W99 vs W100 -> SF_2
      const qfToSFMap: Record<number, [number, boolean]> = {
        0: [0, false],
        // W97 (QF_1) -> SF1 como home
        1: [0, true],
        // W98 (QF_2) -> SF1 como away
        2: [1, false],
        // W99 (QF_3) -> SF2 como home
        3: [1, true] // W100 (QF_4) -> SF2 como away
      };
      const matchNumber = parseInt(matchId.replace('QF_', '')) - 1;
      const mapping = qfToSFMap[matchNumber];
      if (mapping) {
        const [semifinalIndex, isAway] = mapping;
        const semifinalMatches = [...(newPlayoffMatches['Semifinales'] || [])];
        if (semifinalMatches[semifinalIndex]) {
          if (isAway) {
            semifinalMatches[semifinalIndex] = {
              ...semifinalMatches[semifinalIndex],
              away_team: team,
              away_team_id: teamId
            };
          } else {
            semifinalMatches[semifinalIndex] = {
              ...semifinalMatches[semifinalIndex],
              home_team: team,
              home_team_id: teamId
            };
          }
          newPlayoffMatches['Semifinales'] = semifinalMatches;
        }
      }
    } else if (round === 'Semifinales') {
      // Final: W101 vs W102
      const matchNumber = parseInt(matchId.replace('SF_', '')) - 1;
      const finalMatches = [...(newPlayoffMatches['Final'] || [])];
      if (finalMatches[0]) {
        if (matchNumber === 0) {
          finalMatches[0] = {
            ...finalMatches[0],
            home_team: team,
            home_team_id: teamId
          };
        } else {
          finalMatches[0] = {
            ...finalMatches[0],
            away_team: team,
            away_team_id: teamId
          };
        }
        newPlayoffMatches['Final'] = finalMatches;
      }
    } else if (round === 'Final') {
      // Actualizar automáticamente el campeón
      setCampeon(teamName);
    }
    setPlayoffMatches(newPlayoffMatches);
  };

  // Función para reiniciar el cuadro de playoffs (mantiene solo equipos de dieciseisavos, pero limpia ganadores)
  const handleResetPlayoffs = async () => {
    if (!user) return;

    // Limpiar TODOS los ganadores incluyendo dieciseisavos
    setPlayoffWinners({});

    // Limpiar equipos de rondas posteriores a dieciseisavos
    const newPlayoffMatches = {
      ...playoffMatches
    };
    ['Octavos de Final', 'Cuartos de Final', 'Semifinales', 'Final'].forEach(round => {
      if (newPlayoffMatches[round]) {
        newPlayoffMatches[round] = newPlayoffMatches[round].map(match => ({
          ...match,
          home_team: undefined,
          away_team: undefined,
          home_team_id: '',
          away_team_id: ''
        }));
      }
    });
    setPlayoffMatches(newPlayoffMatches);
    setCampeon('');

    // Eliminar predicciones de playoffs de la BD
    try {
      const playoffMatchIds = [...(playoffMatches['Dieciseisavos de Final'] || []).map(m => m.id), ...(playoffMatches['Octavos de Final'] || []).map(m => m.id), ...(playoffMatches['Cuartos de Final'] || []).map(m => m.id), ...(playoffMatches['Semifinales'] || []).map(m => m.id), ...(playoffMatches['Final'] || []).map(m => m.id)];
      if (playoffMatchIds.length > 0) {
        await supabase.from('predictions').delete().eq('user_id', user.id).in('match_id', playoffMatchIds);
      }

      // También eliminar predicción de campeón
      await supabase.from('champion_predictions').delete().eq('user_id', user.id).eq('tournament_id', '11111111-1111-1111-1111-111111111111');
      toast({
        title: "Cuadro reiniciado",
        description: "Se han eliminado todas las selecciones de ganadores y el campeón."
      });
    } catch (error) {
      console.error('Error resetting playoffs:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al reiniciar el cuadro. Los cambios locales se aplicaron."
      });
    }
  };

  // Función para ir a la fase eliminatoria
  const handleGoToPlayoffs = () => {
    // Verificar que se hayan completado todos los partidos de grupos
    const allGroupMatchesFilled = Object.values(groupMatches).every(matches => matches.every(match => {
      const prediction = partidosGrupos[match.id];
      return prediction && prediction.local !== null && prediction.visitante !== null;
    }));
    if (!allGroupMatchesFilled) {
      toast({
        variant: "destructive",
        title: "Fase de grupos incompleta",
        description: "Debes completar todos los resultados de la fase de grupos antes de continuar."
      });
      return;
    }

    // Generar dieciseisavos automáticamente
    generarDieciseisavosDeFinal();

    // Cambiar a la pestaña de eliminatorias
    setActiveTab("eliminatorias");
  };

  // Función para ir a premios individuales
  const handleGoToAwards = () => {
    // Verificar que se hayan seleccionado todos los ganadores de playoffs
    const allPlayoffWinnersSelected = Object.values(playoffMatches).every(matches => matches.every(match => playoffWinners[match.id]));
    if (!allPlayoffWinnersSelected) {
      toast({
        variant: "destructive",
        title: "Fase eliminatoria incompleta",
        description: "Debes seleccionar el ganador de cada partido antes de continuar."
      });
      return;
    }

    // Verificar que se haya seleccionado un campeón
    if (!campeon) {
      toast({
        variant: "destructive",
        title: "Falta seleccionar campeón",
        description: "Debes seleccionar el campeón del torneo antes de continuar."
      });
      return;
    }

    // Cambiar a la pestaña de premios
    setActiveTab("premios");
  };


  // Función para validar que todos los pronósticos están completos
  const validatePredictions = (): { valid: boolean; message: string } => {
    // 1. Validar fase de grupos
    const allGroupMatchesFilled = Object.values(groupMatches).every(matches => 
      matches.every(match => {
        const prediction = partidosGrupos[match.id];
        return prediction && prediction.local !== null && prediction.visitante !== null;
      })
    );
    if (!allGroupMatchesFilled) {
      return { valid: false, message: "Debes completar todos los resultados de la fase de grupos." };
    }

    // 2. Validar cuadro de eliminatorias
    const allRounds = ['Dieciseisavos de Final', 'Octavos de Final', 'Cuartos de Final', 'Semifinales', 'Final'];
    for (const round of allRounds) {
      const roundMatches = playoffMatches[round] || [];
      for (const match of roundMatches) {
        if (!playoffWinners[match.id]) {
          return { valid: false, message: `Debes seleccionar el ganador de todos los partidos de ${round}.` };
        }
      }
    }

    // 3. Validar campeón
    if (!campeon) {
      return { valid: false, message: "Debes seleccionar el campeón del torneo." };
    }

    // 4. Validar premios individuales
    if (!balonOro) {
      return { valid: false, message: "Debes seleccionar el Balón de Oro." };
    }
    if (!botaOro) {
      return { valid: false, message: "Debes seleccionar la Bota de Oro." };
    }

    return { valid: true, message: "" };
  };

  // Función para guardar pronósticos
  const handleGuardarPronosticos = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión para guardar tus pronósticos."
      });
      return;
    }

    // Validar que todo esté completo
    const validation = validatePredictions();
    
    // Check specifically if group results are incomplete (warn but don't block)
    const allGroupMatchesFilled = Object.values(groupMatches).every(matches => 
      matches.every(match => {
        const prediction = partidosGrupos[match.id];
        return prediction && prediction.local !== null && prediction.visitante !== null;
      })
    );
    const groupsIncomplete = !allGroupMatchesFilled;

    // Block only if non-group validations fail (playoffs, champion, awards)
    if (!validation.valid && !groupsIncomplete) {
      toast({
        variant: "destructive",
        title: "Pronósticos incompletos",
        description: validation.message
      });
      return;
    }
    
    // If only groups are incomplete, check if the rest is also incomplete
    if (!validation.valid && groupsIncomplete) {
      // Check if the error is ONLY about groups - if so, warn and continue
      // Re-validate skipping groups
      const allRounds = ['Dieciseisavos de Final', 'Octavos de Final', 'Cuartos de Final', 'Semifinales', 'Final'];
      let nonGroupError = false;
      for (const round of allRounds) {
        const roundMatches = playoffMatches[round] || [];
        for (const match of roundMatches) {
          if (!playoffWinners[match.id]) {
            nonGroupError = true;
            break;
          }
        }
        if (nonGroupError) break;
      }
      if (!nonGroupError && !campeon) nonGroupError = true;
      if (!nonGroupError && !balonOro) nonGroupError = true;
      if (!nonGroupError && !botaOro) nonGroupError = true;
      
      if (nonGroupError) {
        toast({
          variant: "destructive",
          title: "Pronósticos incompletos",
          description: validation.message
        });
        return;
      }
    }
    
    // Show warning if groups are incomplete but still save
    if (groupsIncomplete) {
      toast({
        variant: "destructive",
        title: "Resultados incompletos",
        description: "Algunos resultados de la fase de grupos están sin completar. Se guardarán los pronósticos igualmente."
      });
    }

    setIsLoading(true);
    try {
      // Usar el tournament_id fijo desde la nueva estructura
      const tournamentId = '11111111-1111-1111-1111-111111111111';

      // Crear o actualizar el registro de envío del usuario
      const {
        data: existingSubmission
      } = await supabase.from('user_submissions').select('id, prize_participation_requested').eq('user_id', user.id).eq('tournament_id', tournamentId).maybeSingle();
      let submissionId = existingSubmission?.id;
      if (!submissionId) {
        const {
          data: newSubmission,
          error: submissionError
        } = await supabase.from('user_submissions').insert({
          user_id: user.id,
          tournament_id: tournamentId,
          is_complete: false,
          total_predictions: 0,
          champion_predicted: false,
          awards_predicted: false
        }).select('id').single();
        if (submissionError) throw submissionError;
        submissionId = newSubmission.id;
      }

      // Contar predicciones y preparar datos (grupos + playoffs)
      const matchPredictions = [];

      // Añadir predicciones de grupos
      for (const [matchId, resultado] of Object.entries(partidosGrupos)) {
        if (resultado.local !== null && resultado.visitante !== null) {
          matchPredictions.push({
            user_id: user.id,
            match_id: matchId,
            home_goals: resultado.local,
            away_goals: resultado.visitante,
            submission_id: submissionId
          });
        }
      }

      // Guardar predicciones de playoffs por separado (sin match_id ya que son generadas localmente)
      // Usamos el campo playoff_round para identificar cada predicción de playoff
      const playoffPredictionsList: {
        user_id: string;
        playoff_round: string;
        predicted_winner_team_id: string;
        submission_id: string;
      }[] = [];
      for (const [matchId, winnerId] of Object.entries(playoffWinners)) {
        if (winnerId) {
          playoffPredictionsList.push({
            user_id: user.id,
            playoff_round: matchId,
            // R32_1, R16_1, QF_1, etc.
            predicted_winner_team_id: winnerId,
            submission_id: submissionId
          });
        }
      }
      // Eliminar duplicados manteniendo solo la última entrada por match_id
      const uniquePredictionsMap = new Map<string, typeof matchPredictions[0]>();
      matchPredictions.forEach(pred => {
        if (pred.match_id) {
          uniquePredictionsMap.set(pred.match_id, pred);
        }
      });
      const uniquePredictions = Array.from(uniquePredictionsMap.values());
      console.log('Group predictions to save:', uniquePredictions.length);
      console.log('Playoff predictions to save:', playoffPredictionsList.length);

      // Upsert predicciones de partidos de grupos (insertar o actualizar si ya existen)
      if (uniquePredictions.length > 0) {
        const {
          data: upsertedData,
          error: matchError
        } = await supabase.from('predictions').upsert(uniquePredictions, {
          onConflict: 'user_id,match_id'
        }).select();
        console.log('Upserted group predictions:', upsertedData?.length, 'Error:', matchError);
        if (matchError) throw matchError;
      }

      // Guardar predicciones de playoffs (eliminar y volver a insertar)
      if (playoffPredictionsList.length > 0) {
        // Primero eliminar predicciones de playoff existentes del usuario
        await supabase.from('predictions').delete().eq('user_id', user.id).not('playoff_round', 'is', null);

        // Insertar nuevas predicciones de playoff
        const {
          error: playoffError
        } = await supabase.from('predictions').insert(playoffPredictionsList);
        console.log('Inserted playoff predictions:', playoffPredictionsList.length, 'Error:', playoffError);
        if (playoffError) throw playoffError;
      }

      // Guardar predicción del campeón
      let championPredicted = false;
      if (campeon) {
        // Buscar el ID del equipo por nombre
        const teamId = teams.find(t => t.name === campeon)?.id;
        if (teamId) {
          await supabase.from('champion_predictions').delete().eq('user_id', user.id).eq('tournament_id', tournamentId);
          const {
            error: championError
          } = await supabase.from('champion_predictions').insert({
            user_id: user.id,
            tournament_id: tournamentId,
            predicted_winner_team_id: teamId,
            submission_id: submissionId
          });
          if (championError) throw championError;
          championPredicted = true;
        }
      }

      // Guardar predicciones de premios individuales  
      const awardPredictions = [];
      if (balonOro) {
        awardPredictions.push({
          user_id: user.id,
          tournament_id: tournamentId,
          award_type: 'balon_oro',
          player_name: balonOro,
          submission_id: submissionId
        });
      }
      if (botaOro) {
        awardPredictions.push({
          user_id: user.id,
          tournament_id: tournamentId,
          award_type: 'bota_oro',
          player_name: botaOro,
          submission_id: submissionId
        });
      }
      let awardsPredicted = false;
      if (awardPredictions.length > 0) {
        await supabase.from('award_predictions').delete().eq('user_id', user.id).eq('tournament_id', tournamentId);
        const {
          error: awardError
        } = await supabase.from('award_predictions').insert(awardPredictions);
        if (awardError) throw awardError;
        awardsPredicted = true;
      }

      // Actualizar el estado del envío
      const {
        error: updateError
      } = await supabase.from('user_submissions').update({
        total_predictions: matchPredictions.length,
        champion_predicted: championPredicted,
        awards_predicted: awardsPredicted,
        is_complete: matchPredictions.length > 0 || championPredicted || awardsPredicted,
        updated_at: new Date().toISOString()
      }).eq('id', submissionId);
      if (updateError) throw updateError;

      toast({
        title: "Pronósticos guardados",
        description: "Tus pronósticos se han guardado correctamente."
      });
    } catch (error: any) {
      console.error('Error saving predictions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al guardar los pronósticos. Intenta nuevamente."
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingData) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando datos del torneo...</p>
        </div>
      </div>;
  }
  if (!user) {
    return <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <div>
            <h3 className="font-semibold">Inicia sesión para hacer pronósticos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Debes iniciar sesión para poder guardar tus pronósticos del Mundial 2026.
            </p>
          </div>
        </Alert>
      </div>;
  }
  return <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
          Pronósticos Mundial 2026
        </h1>
        <p className="text-muted-foreground">Puedes modificar tus pronósticos hasta el 10 de junio</p>
      </div>

      {/* Aviso cuando los pronósticos están bloqueados */}
      {predictionsLocked && <Alert className="border-destructive bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <div className="ml-2">
            <h3 className="font-semibold text-destructive">Pronósticos cerrados</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ya no se aceptan nuevos pronósticos ni modificaciones. El torneo ha comenzado.
            </p>
          </div>
        </Alert>}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grupos" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Fase de Grupos</span>
          </TabsTrigger>
          <TabsTrigger value="eliminatorias" className="flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <span>Fase final</span>
          </TabsTrigger>
        </TabsList>

        {/* Fase de Grupos */}
        <TabsContent value="grupos" className="space-y-4 relative">
          {/* Botón flotante para guardar pronósticos */}
          <div className="fixed top-20 right-4 z-50 flex flex-col items-end gap-2 sm:flex-row">
            {!predictionsLocked && (
              <Button onClick={handleGuardarPronosticos} disabled={isLoading} className="bg-gradient-hero shadow-strong" size="sm">
                {isLoading ? <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </> : <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Pronósticos
                  </>}
              </Button>
            )}
            <Button onClick={handleGoToPlayoffs} className="bg-gradient-hero shadow-strong hover:opacity-90" size="sm">
              <span>Ir a Fase Final</span>
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          
          {/* Botón para generar resultados aleatorios */}
          {!predictionsLocked && <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => {
            // Generar resultados aleatorios realistas para todos los partidos de grupos
            const generateRandomScore = (): number => {
              // Distribución realista de goles en fútbol:
              // 0 goles: ~25%, 1 gol: ~35%, 2 goles: ~22%, 3 goles: ~12%, 4+ goles: ~6%
              const rand = Math.random();
              if (rand < 0.25) return 0;
              if (rand < 0.60) return 1;
              if (rand < 0.82) return 2;
              if (rand < 0.94) return 3;
              if (rand < 0.98) return 4;
              return 5;
            };
            const newPredictions: Record<string, PartidoResultado> = {};
            Object.values(groupMatches).flat().forEach(match => {
              newPredictions[match.id] = {
                local: generateRandomScore(),
                visitante: generateRandomScore()
              };
            });
            setPartidosGrupos(newPredictions);

            // Reiniciar fase eliminatoria
            setPlayoffWinners({});
            setCampeon('');
            setPlayoffMatches({
              'Dieciseisavos de Final': [],
              'Octavos de Final': Array.from({
                length: 8
              }, (_, i) => ({
                id: `R16_${i + 1}`,
                home_team_id: '',
                away_team_id: '',
                group_id: '',
                round: 'Octavos de Final',
                match_date: ''
              })) as Match[],
              'Cuartos de Final': Array.from({
                length: 4
              }, (_, i) => ({
                id: `QF_${i + 1}`,
                home_team_id: '',
                away_team_id: '',
                group_id: '',
                round: 'Cuartos de Final',
                match_date: ''
              })) as Match[],
              'Semifinales': Array.from({
                length: 2
              }, (_, i) => ({
                id: `SF_${i + 1}`,
                home_team_id: '',
                away_team_id: '',
                group_id: '',
                round: 'Semifinales',
                match_date: ''
              })) as Match[],
              'Final': [{
                id: 'FINAL_1',
                home_team_id: '',
                away_team_id: '',
                group_id: '',
                round: 'Final',
                match_date: ''
              }] as Match[]
            });
            toast({
              title: "Resultados generados",
              description: "Se han generado resultados aleatorios para todos los partidos de la fase de grupos."
            });
          }} className="gap-2">
                <Shuffle className="w-4 h-4" />
                <span>Generar resultados aleatorios</span>
              </Button>
            </div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(groupMatches).sort(([a], [b]) => a.localeCompare(b)).map(([groupId, groupMatchesList]) => {
            // Ordenar partidos dentro del grupo por fecha y luego por id
            const sortedMatches = [...groupMatchesList].sort((a, b) => {
              if (a.match_date && b.match_date) {
                return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
              }
              return a.id.localeCompare(b.id);
            });
            const clasificacion = calcularClasificacionGrupo(groupId);
            return <Card key={groupId} className="shadow-soft border-0 bg-gradient-card">
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
                      {sortedMatches.map(match => {
                    const puntosGanados = calcularPuntosPartido(match.id);
                    return <div key={match.id} className="p-1.5 rounded bg-muted/30">
                            {/* Equipos y marcador en una línea */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium flex-1 truncate text-right">{match.home_team?.name}</span>
                              <Input type="number" min="0" max="20" placeholder="-" className="w-10 h-6 text-center text-xs p-0" value={partidosGrupos[match.id]?.local ?? ''} onChange={e => handlePartidoChange(match.id, 'local', e.target.value)} disabled={predictionsLocked} />
                              <span className="text-muted-foreground text-xs">-</span>
                              <Input type="number" min="0" max="20" placeholder="-" className="w-10 h-6 text-center text-xs p-0" value={partidosGrupos[match.id]?.visitante ?? ''} onChange={e => handlePartidoChange(match.id, 'visitante', e.target.value)} disabled={predictionsLocked} />
                              <span className="text-xs font-medium flex-1 truncate">{match.away_team?.name}</span>
                              {puntosGanados !== null && <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 text-[10px] font-bold rounded bg-success text-success-foreground">
                                  +{puntosGanados}
                                </span>}
                              {predictionsLocked && <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                          setSelectedMatch({
                            matchId: match.id,
                            type: 'group',
                            homeTeam: match.home_team?.name,
                            awayTeam: match.away_team?.name,
                            title: 'Pronósticos del partido'
                          });
                          setViewDialogOpen(true);
                        }}>
                                  <Eye className="w-3 h-3" />
                                </Button>}
                            </div>
                          </div>;
                  })}
                    </div>

                    {/* Clasificación */}
                    {clasificacion.length > 0 && (() => {
                  const aciertoOrden = verificarAciertoOrdenGrupo(groupId);
                  return <div className="space-y-1 pt-1 border-t border-border/50 relative">
                          {/* Badge +20 cuando acierta el orden - centrado entre Equipo y Pts */}
                          {aciertoOrden === true && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                              <Badge className="bg-gold text-gold-foreground text-[11px] px-2 py-0.5 font-bold shadow-glow animate-pulse">
                                +20
                              </Badge>
                            </div>}
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border/50">
                                  <th className="text-left py-1 px-1 font-semibold w-5">#</th>
                                  <th className="text-left py-1 px-1 font-semibold">Equipo</th>
                                  <th className="text-center py-1 px-1 font-semibold w-6">Pts</th>
                                  <th className="text-center py-1 px-1 font-semibold w-6">DG</th>
                                  <th className="text-center py-1 px-1 font-semibold w-5">GF</th>
                                  <th className="text-center py-1 px-1 font-semibold w-5">GC</th>
                                </tr>
                              </thead>
                              <tbody>
                                {clasificacion.map((equipo, index) => <tr key={equipo.equipo} className={`${index < 2 ? 'bg-success/20' : 'bg-muted/30'}`}>
                                    <td className="py-0.5 px-1 font-bold">{index + 1}</td>
                                    <td className="py-0.5 px-1 truncate max-w-[80px]">{equipo.equipo}</td>
                                    <td className="py-0.5 px-1 text-center font-bold">{equipo.puntos}</td>
                                    <td className={`py-0.5 px-1 text-center ${equipo.diferencia >= 0 ? 'text-success' : 'text-destructive'}`}>
                                      {equipo.diferencia >= 0 ? '+' : ''}{equipo.diferencia}
                                    </td>
                                    <td className="py-0.5 px-1 text-center">{equipo.golesFavor}</td>
                                    <td className="py-0.5 px-1 text-center">{equipo.golesContra}</td>
                                  </tr>)}
                              </tbody>
                            </table>
                          </div>
                        </div>;
                })()}
                  </CardContent>
                </Card>;
          })}
          </div>

          {/* Tabla de las 12 terceras clasificadas */}
          <div className="max-w-lg mx-auto">
          <Card className="shadow-soft border-0 bg-gradient-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-base">
                <div className="w-6 h-6 bg-warning rounded flex items-center justify-center">
                  <Trophy className="w-3 h-3 text-warning-foreground" />
                </div>
                <span>Clasificación mejores terceros</span>
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
                    {calcularMejoresTerceras().map((equipo, index) => <tr key={`${equipo.grupo}-${equipo.equipo}`} className={`${index < 8 ? 'bg-success/20 font-medium' : 'bg-muted/30 text-muted-foreground'} border-b border-border/30`}>
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
                      </tr>)}
                    {calcularMejoresTerceras().length === 0 && <tr>
                        <td colSpan={6} className="py-4 text-center text-muted-foreground">
                          <span>Completa los resultados para ver las clasificaciones</span>
                        </td>
                      </tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        {/* Fase Eliminatoria */}
        <TabsContent value="eliminatorias" className="space-y-6">
          {!predictionsLocked && (
            <div className="fixed top-20 right-4 z-50">
              <Button onClick={handleGuardarPronosticos} disabled={isLoading || !user} className="bg-gradient-hero shadow-strong" size="sm">
                {isLoading ? <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </> : <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Pronósticos
                  </>}
              </Button>
            </div>
          )}

          <Card className="shadow-soft border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-6 h-6" />
                <span>Fase Eliminatoria</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PlayoffBracket playoffMatches={playoffMatches} playoffWinners={playoffWinners} predictionsLocked={predictionsLocked} onSelectWinner={(matchId, teamId, teamName, round) => handleSelectWinner(matchId, teamId, teamName, round)} onViewParticipants={(match, title) => {
              setSelectedMatch({
                matchId: match.id,
                type: 'playoff',
                homeTeam: match.home_team?.name,
                awayTeam: match.away_team?.name,
                title
              });
              setViewDialogOpen(true);
            }} onReset={handleResetPlayoffs} campeon={campeon} campeonReal={classifiedTeams.champion} classifiedTeams={classifiedTeams} />

              <div className="text-center text-sm text-muted-foreground mt-8 p-4 bg-muted/50 rounded-lg">
                <p>Haz clic en el equipo que crees que ganará cada partido.</p>
                <p className="mt-1">Los ganadores avanzan automáticamente a la siguiente ronda.</p>
              </div>
            </CardContent>
          </Card>

          {/* Premios Individuales */}
          <Card className="shadow-soft border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-6 h-6" />
                <span>Premios Individuales</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-gold-foreground" />
                    </div>
                    <span className="font-semibold">Balón de Oro</span>
                  </div>
                  <Select value={balonOro} onValueChange={setBalonOro} disabled={predictionsLocked}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el mejor jugador" />
                    </SelectTrigger>
                    <SelectContent>
                      {BALON_ORO_OPTIONS.map(jugador => <SelectItem key={jugador} value={jugador}>
                          {jugador}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  {predictionsLocked && <Button size="sm" variant="secondary" className="w-full" onClick={() => {
                  setSelectedMatch({
                    awardType: 'balon_oro',
                    type: 'award',
                    title: 'Pronósticos del Balón de Oro'
                  });
                  setViewDialogOpen(true);
                }}>
                      <Eye className="w-4 h-4 mr-1" />
                      <span>Ver participantes</span>
                    </Button>}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-success rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-success-foreground" />
                    </div>
                    <span className="font-semibold">Bota de Oro</span>
                  </div>
                  <Select value={botaOro} onValueChange={setBotaOro} disabled={predictionsLocked}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el máximo goleador" />
                    </SelectTrigger>
                    <SelectContent>
                      {BOTA_ORO_OPTIONS.map(jugador => <SelectItem key={jugador} value={jugador}>
                          {jugador}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  {predictionsLocked && <Button size="sm" variant="secondary" className="w-full" onClick={() => {
                  setSelectedMatch({
                    awardType: 'bota_oro',
                    type: 'award',
                    title: 'Pronósticos de la Bota de Oro'
                  });
                  setViewDialogOpen(true);
                }}>
                      <Eye className="w-4 h-4 mr-1" />
                      <span>Ver participantes</span>
                    </Button>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo para ver pronósticos de participantes */}
      {selectedMatch && <PredictionsViewerDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} matchId={selectedMatch.matchId} awardType={selectedMatch.awardType} type={selectedMatch.type} homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} title={selectedMatch.title} />}

    </div>;
}
