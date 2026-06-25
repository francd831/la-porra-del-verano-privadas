import { Trophy, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

// Interfaz para equipos clasificados por ronda
interface ClassifiedTeams {
  r32: Set<string>;
  r16: Set<string>;
  qf: Set<string>;
  sf: Set<string>;
  final: Set<string>;
  champion: string | null;
}
interface PlayoffBracketProps {
  playoffMatches: Record<string, Match[]>;
  playoffWinners: Record<string, string>;
  predictionsLocked: boolean;
  onSelectWinner?: (matchId: string, teamId: string, teamName: string, round: string) => void;
  onViewParticipants?: (match: Match, title: string) => void;
  onReset?: () => void;
  onSave?: () => void;
  isAdmin?: boolean;
  campeon?: string;
  campeonReal?: string | null; // ID del campeón real (de tournament_winners)
  classifiedTeams?: ClassifiedTeams;
}

// Función para calcular puntos por equipo clasificado
// Muestra puntos si el usuario predijo que este equipo llegaría a esta ronda y acertó
// Los puntos se dan por cada equipo que el usuario predijo como ganador de la ronda anterior
// y que efectivamente está en la ronda actual según los resultados reales del admin
const getTeamPoints = (teamId: string, matchId: string, round: string, playoffWinners: Record<string, string>, classifiedTeams?: ClassifiedTeams): number | null => {
  if (!classifiedTeams || !teamId) return null;

  // Sistema de puntos según la función calculate_user_points de Supabase:
  // - Dieciseisavos (R32): El equipo debe estar en un partido de R32 real y el usuario lo predijo en R32 -> 10 pts
  // - Octavos (R16): El equipo debe estar en un partido de R16 real y el usuario lo predijo ganador en R32 -> 15 pts
  // - Cuartos (QF): El equipo debe estar en un partido de QF real y el usuario lo predijo ganador en R16 -> 20 pts
  // - Semifinales (SF): El equipo debe estar en un partido de SF real y el usuario lo predijo ganador en QF -> 30 pts
  // - Final: El equipo debe estar en la final real y el usuario lo predijo ganador en SF -> 40 pts
  // - Campeón: 50 pts (manejado por separado)

  const pointsConfig: Record<string, {
    classifiedSet: Set<string>;
    prevRoundPrefix: string;
    points: number;
  }> = {
    // Para que un equipo en Dieciseisavos (R32) dé puntos: debe estar en r32 real y el usuario lo predijo en R32
    'Dieciseisavos de Final': {
      classifiedSet: classifiedTeams.r32,
      prevRoundPrefix: 'R32_',
      points: 10
    },
    // Para que un equipo en Octavos (R16) dé puntos: debe estar en r16 real y el usuario lo predijo ganador en R32
    'Octavos de Final': {
      classifiedSet: classifiedTeams.r16,
      prevRoundPrefix: 'R32_',
      points: 15
    },
    // Para que un equipo en Cuartos (QF) dé puntos: debe estar en qf real y el usuario lo predijo ganador en R16
    'Cuartos de Final': {
      classifiedSet: classifiedTeams.qf,
      prevRoundPrefix: 'R16_',
      points: 20
    },
    // Para que un equipo en Semifinales (SF) dé puntos: debe estar en sf real y el usuario lo predijo ganador en QF
    'Semifinales': {
      classifiedSet: classifiedTeams.sf,
      prevRoundPrefix: 'QF_',
      points: 30
    },
    // Para que un equipo en Final dé puntos: debe estar en final real y el usuario lo predijo ganador en SF
    'Final': {
      classifiedSet: classifiedTeams.final,
      prevRoundPrefix: 'SF_',
      points: 40
    }
  };
  const config = pointsConfig[round];
  if (!config) return null;

  // Verificar si el equipo realmente está clasificado a esta ronda (según resultados del admin)
  if (!config.classifiedSet.has(teamId)) return null;

  // En Dieciseisavos el usuario puntua por haber clasificado al equipo desde grupos,
  // no por haberlo elegido como ganador del cruce.
  if (round === 'Dieciseisavos de Final') return config.points;

  // Para otras rondas, verificar si el usuario predijo este equipo como ganador en la ronda anterior
  const userPredictedThisTeam = Object.entries(playoffWinners).some(([mId, winnerId]) => winnerId === teamId && mId.startsWith(config.prevRoundPrefix));
  return userPredictedThisTeam ? config.points : null;
};

// Componente para un partido individual
const BracketMatch = ({
  match,
  playoffWinners,
  predictionsLocked,
  onSelectWinner,
  onViewParticipants,
  isAdmin = false,
  isFinal = false,
  compact = false,
  classifiedTeams
}: {
  match: Match;
  playoffWinners: Record<string, string>;
  predictionsLocked: boolean;
  onSelectWinner?: (matchId: string, teamId: string, teamName: string, round: string) => void;
  onViewParticipants?: (match: Match, title: string) => void;
  isAdmin?: boolean;
  isFinal?: boolean;
  compact?: boolean;
  classifiedTeams?: ClassifiedTeams;
}) => {
  const homeSelected = playoffWinners[match.id] === match.home_team_id;
  const awaySelected = playoffWinners[match.id] === match.away_team_id;

  // Solo calcular puntos si NO es admin (los admins no ven badges de puntos)
  const homePoints = !isAdmin && match.home_team_id ? getTeamPoints(match.home_team_id, match.id, match.round, playoffWinners, classifiedTeams) : null;
  const awayPoints = !isAdmin && match.away_team_id ? getTeamPoints(match.away_team_id, match.id, match.round, playoffWinners, classifiedTeams) : null;

  // Para admin: el botón debe estar habilitado para seleccionar ganadores
  // Para usuarios: el botón solo está habilitado si NO está bloqueado
  const homeIsMissing = !match.home_team;
  const awayIsMissing = !match.away_team;
  const readOnly = !isAdmin && predictionsLocked;
  const isDisabled = homeIsMissing || readOnly;
  const awayIsDisabled = awayIsMissing || readOnly;
  return <div className={cn("flex flex-col rounded-lg overflow-hidden border", isFinal ? "border-gold bg-gradient-to-br from-gold/20 to-gold/5 shadow-lg" : "border-border bg-card", compact ? "w-28" : "w-36")}>
      {/* Equipo Local */}
      <button onClick={() => match.home_team && onSelectWinner?.(match.id, match.home_team_id, match.home_team.name, match.round)} disabled={isDisabled} className={cn("flex items-center gap-1 px-2 py-1.5 text-xs transition-all border-b border-border/50", compact ? "py-1 text-[10px]" : "", homeSelected ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted/50", isDisabled && "cursor-default", homeIsMissing && "opacity-50")}>
        <span className="flex-1 truncate text-left">
          {match.home_team?.name || 'TBD'}
        </span>
        {homePoints !== null && <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[8px] font-bold rounded bg-success text-success-foreground">
            +{homePoints}
          </span>}
        {homeSelected && !isFinal && !homePoints && <span className="text-[10px]">✓</span>}
        {homeSelected && isFinal && <Trophy className="w-3 h-3 text-gold" />}
      </button>
      
      {/* Equipo Visitante */}
      <button onClick={() => match.away_team && onSelectWinner?.(match.id, match.away_team_id, match.away_team.name, match.round)} disabled={awayIsDisabled} className={cn("flex items-center gap-1 px-2 py-1.5 text-xs transition-all", compact ? "py-1 text-[10px]" : "", awaySelected ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted/50", awayIsDisabled && "cursor-default", awayIsMissing && "opacity-50")}>
        <span className="flex-1 truncate text-left">
          {match.away_team?.name || 'TBD'}
        </span>
        {awayPoints !== null && <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[8px] font-bold rounded bg-success text-success-foreground">
            +{awayPoints}
          </span>}
        {awaySelected && !isFinal && !awayPoints && <span className="text-[10px]">✓</span>}
        {awaySelected && isFinal && <Trophy className="w-3 h-3 text-gold" />}
      </button>
    </div>;
};

// Componente para conectores entre partidos
const BracketConnector = ({
  direction = 'right'
}: {
  direction?: 'left' | 'right';
}) => <div className={cn("flex items-center", direction === 'left' ? "flex-row-reverse" : "")}>
    <div className={cn("w-4 h-px bg-border", direction === 'left' ? "ml-0" : "mr-0")} />
  </div>;
export default function PlayoffBracket({
  playoffMatches,
  playoffWinners,
  predictionsLocked,
  onSelectWinner,
  onViewParticipants,
  onReset,
  onSave,
  isAdmin = false,
  campeon,
  campeonReal,
  classifiedTeams
}: PlayoffBracketProps) {
  const r32Matches = playoffMatches['round_of_32'] || playoffMatches['Dieciseisavos de Final'] || [];
  const r16Matches = playoffMatches['round_of_16'] || playoffMatches['Octavos de Final'] || [];
  const qfMatches = playoffMatches['quarter_finals'] || playoffMatches['Cuartos de Final'] || [];
  const sfMatches = playoffMatches['semi_finals'] || playoffMatches['Semifinales'] || [];
  const finalMatches = playoffMatches['final'] || playoffMatches['Final'] || [];

  // Organización visual para que los ganadores fluyan naturalmente hacia el centro (Final)
  // La lógica FIFA permanece intacta (IDs y mappings), solo cambiamos el ORDEN VISUAL
  // 
  // Estructura visual (desde el centro hacia afuera):
  // - Final en el centro
  // - SF_1 (izq) y SF_2 (der) alimentan la final
  // - QF_1 y QF_2 alimentan SF_1; QF_3 y QF_4 alimentan SF_2
  // - Los octavos y dieciseisavos se organizan para que los ganadores fluyan hacia sus cuartos
  //
  // FLUJO LADO IZQUIERDO (hacia SF_1):
  //   SF_1 recibe de QF_1 y QF_2
  //   QF_1 recibe de R16_1 y R16_2 (flujo visual: arriba)
  //   QF_2 recibe de R16_5 y R16_6 (flujo visual: abajo)
  //   R16_1 recibe de R32_2 y R32_5
  //   R16_2 recibe de R32_1 y R32_3
  //   R16_5 recibe de R32_11 y R32_12
  //   R16_6 recibe de R32_9 y R32_10
  //
  // FLUJO LADO DERECHO (hacia SF_2):
  //   SF_2 recibe de QF_3 y QF_4
  //   QF_3 recibe de R16_3 y R16_4 (flujo visual: arriba)
  //   QF_4 recibe de R16_7 y R16_8 (flujo visual: abajo)
  //   R16_3 recibe de R32_4 y R32_6
  //   R16_4 recibe de R32_7 y R32_8
  //   R16_7 recibe de R32_14 y R32_16
  //   R16_8 recibe de R32_13 y R32_15

  // Helper para obtener partido por ID
  const getR32ById = (id: string) => r32Matches.find(m => m?.id === id);
  const getR16ById = (id: string) => r16Matches.find(m => m?.id === id);
  const getQFById = (id: string) => qfMatches.find(m => m?.id === id);
  const getSFById = (id: string) => sfMatches.find(m => m?.id === id);

  // LADO IZQUIERDO - Flujo: R32 -> R16 -> QF -> SF_1 -> Final (home)
  // Ordenado para que visualmente los ganadores bajen/suban al siguiente nivel correctamente
  const leftR32Visual = [getR32ById('R32_2'),
  // M74: 1E vs 3ª -> W74 -> R16_1 home
  getR32ById('R32_5'),
  // M77: 1I vs 3ª -> W77 -> R16_1 away
  getR32ById('R32_1'),
  // M73: 2A vs 2B -> W73 -> R16_2 home
  getR32ById('R32_3'),
  // M75: 1F vs 2C -> W75 -> R16_2 away
  getR32ById('R32_11'),
  // M83: 2K vs 2L -> W83 -> R16_5 home
  getR32ById('R32_12'),
  // M84: 1H vs 2J -> W84 -> R16_5 away
  getR32ById('R32_9'),
  // M81: 1D vs 3ª -> W81 -> R16_6 home
  getR32ById('R32_10') // M82: 1G vs 3ª -> W82 -> R16_6 away
  ].filter(Boolean) as Match[];
  const leftR16Visual = [getR16ById('R16_1'),
  // M89: W74 vs W77 -> W89 -> QF_1 home
  getR16ById('R16_2'),
  // M90: W73 vs W75 -> W90 -> QF_1 away
  getR16ById('R16_5'),
  // M93: W83 vs W84 -> W93 -> QF_2 home
  getR16ById('R16_6') // M94: W81 vs W82 -> W94 -> QF_2 away
  ].filter(Boolean) as Match[];
  const leftQF = [getQFById('QF_1'),
  // M97: W89 vs W90 -> W97 -> SF_1 home
  getQFById('QF_2') // M98: W93 vs W94 -> W98 -> SF_1 away
  ].filter(Boolean) as Match[];
  const leftSF = [getSFById('SF_1')].filter(Boolean) as Match[]; // M101: W97 vs W98 -> Final home

  // LADO DERECHO - Flujo: R32 -> R16 -> QF -> SF_2 -> Final (away)
  const rightR32Visual = [getR32ById('R32_4'),
  // M76: 1C vs 2F -> W76 -> R16_3 home
  getR32ById('R32_6'),
  // M78: 2E vs 2I -> W78 -> R16_3 away
  getR32ById('R32_7'),
  // M79: 1A vs 3ª -> W79 -> R16_4 home
  getR32ById('R32_8'),
  // M80: 1L vs 3ª -> W80 -> R16_4 away
  getR32ById('R32_14'),
  // M86: 1J vs 2H -> W86 -> R16_7 home
  getR32ById('R32_16'),
  // M88: 2D vs 2G -> W88 -> R16_7 away
  getR32ById('R32_13'),
  // M85: 1B vs 3ª -> W85 -> R16_8 home
  getR32ById('R32_15') // M87: 1K vs 3ª -> W87 -> R16_8 away
  ].filter(Boolean) as Match[];
  const rightR16Visual = [getR16ById('R16_3'),
  // M91: W76 vs W78 -> W91 -> QF_3 home
  getR16ById('R16_4'),
  // M92: W79 vs W80 -> W92 -> QF_3 away
  getR16ById('R16_7'),
  // M95: W86 vs W88 -> W95 -> QF_4 home
  getR16ById('R16_8') // M96: W85 vs W87 -> W96 -> QF_4 away
  ].filter(Boolean) as Match[];
  const rightQF = [getQFById('QF_3'),
  // M99: W91 vs W92 -> W99 -> SF_2 home
  getQFById('QF_4') // M100: W95 vs W96 -> W100 -> SF_2 away
  ].filter(Boolean) as Match[];
  const rightSF = [getSFById('SF_2')].filter(Boolean) as Match[]; // M102: W99 vs W100 -> Final away

  const boardWidth = 1216;
  const boardHeight = 820;
  const compactWidth = 112;
  const normalWidth = 144;
  const matchHeight = 58;
  const yR32 = [82, 146, 232, 296, 402, 466, 552, 616];
  const yR16 = [114, 264, 434, 584];
  const yQF = [184, 504];
  const ySF = [344];
  const yFinal = 560;

  const positionedMatches = [
    ...leftR32Visual.map((match, index) => ({ match, x: 8, y: yR32[index], width: compactWidth, compact: true, isFinal: false })),
    ...leftR16Visual.map((match, index) => ({ match, x: 142, y: yR16[index], width: compactWidth, compact: true, isFinal: false })),
    ...leftQF.map((match, index) => ({ match, x: 298, y: yQF[index], width: normalWidth, compact: false, isFinal: false })),
    ...leftSF.map((match, index) => ({ match, x: 462, y: ySF[index], width: normalWidth, compact: false, isFinal: false })),
    ...(finalMatches[0] ? [{ match: finalMatches[0], x: 536, y: yFinal, width: normalWidth, compact: false, isFinal: true }] : []),
    ...rightSF.map((match, index) => ({ match, x: 610, y: ySF[index], width: normalWidth, compact: false, isFinal: false })),
    ...rightQF.map((match, index) => ({ match, x: 774, y: yQF[index], width: normalWidth, compact: false, isFinal: false })),
    ...rightR16Visual.map((match, index) => ({ match, x: 954, y: yR16[index], width: compactWidth, compact: true, isFinal: false })),
    ...rightR32Visual.map((match, index) => ({ match, x: 1096, y: yR32[index], width: compactWidth, compact: true, isFinal: false })),
  ];

  const positions = new Map(positionedMatches.map((item) => [item.match.id, item]));
  const centerY = (id: string) => (positions.get(id)?.y || 0) + matchHeight / 2;
  const leftEdge = (id: string) => positions.get(id)?.x || 0;
  const rightEdge = (id: string) => {
    const item = positions.get(id);
    return item ? item.x + item.width : 0;
  };
  const connectorPath = (fromId: string, toId: string, side: 'left' | 'right' | 'center') => {
    if (!positions.has(fromId) || !positions.has(toId)) return null;
    if (side === 'center') {
      const from = positions.get(fromId);
      const to = positions.get(toId);
      if (!from || !to) return null;
      const x1 = from.x + from.width / 2;
      const y1 = from.y + matchHeight;
      const x2 = to.x + to.width / 2;
      const y2 = to.y;
      const midY = y1 + Math.abs(y2 - y1) / 2;
      return `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`;
    }
    const x1 = side === 'right' ? leftEdge(fromId) : rightEdge(fromId);
    const x2 = side === 'right' ? rightEdge(toId) : leftEdge(toId);
    const y1 = centerY(fromId);
    const y2 = centerY(toId);
    const midX = side === 'right' ? x1 - Math.abs(x1 - x2) / 2 : x1 + Math.abs(x2 - x1) / 2;
    return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
  };

  const connectors = [
    ['R32_2', 'R16_1', 'left'], ['R32_5', 'R16_1', 'left'],
    ['R32_1', 'R16_2', 'left'], ['R32_3', 'R16_2', 'left'],
    ['R32_11', 'R16_5', 'left'], ['R32_12', 'R16_5', 'left'],
    ['R32_9', 'R16_6', 'left'], ['R32_10', 'R16_6', 'left'],
    ['R16_1', 'QF_1', 'left'], ['R16_2', 'QF_1', 'left'],
    ['R16_5', 'QF_2', 'left'], ['R16_6', 'QF_2', 'left'],
    ['QF_1', 'SF_1', 'left'], ['QF_2', 'SF_1', 'left'],
    ['SF_1', 'FINAL_1', 'center'],
    ['R32_4', 'R16_3', 'right'], ['R32_6', 'R16_3', 'right'],
    ['R32_7', 'R16_4', 'right'], ['R32_8', 'R16_4', 'right'],
    ['R32_14', 'R16_7', 'right'], ['R32_16', 'R16_7', 'right'],
    ['R32_13', 'R16_8', 'right'], ['R32_15', 'R16_8', 'right'],
    ['R16_3', 'QF_3', 'right'], ['R16_4', 'QF_3', 'right'],
    ['R16_7', 'QF_4', 'right'], ['R16_8', 'QF_4', 'right'],
    ['QF_3', 'SF_2', 'right'], ['QF_4', 'SF_2', 'right'],
    ['SF_2', 'FINAL_1', 'center'],
  ] as const;

  const roundLabels = [
    { label: 'Dieciseisavos', x: 8, width: compactWidth },
    { label: 'Octavos', x: 142, width: compactWidth },
    { label: 'Cuartos', x: 298, width: normalWidth },
    { label: 'Semifinal', x: 462, width: normalWidth },
    { label: 'Final', x: 536, width: normalWidth, trophy: true },
    { label: 'Semifinal', x: 610, width: normalWidth },
    { label: 'Cuartos', x: 774, width: normalWidth },
    { label: 'Octavos', x: 954, width: compactWidth },
    { label: 'Dieciseisavos', x: 1096, width: compactWidth },
  ];

  return <div className="playoff-bracket-scroll w-full overflow-x-auto pb-4">
      <div className="space-y-6">
        <div className="relative mx-auto" style={{ width: boardWidth, height: boardHeight }}>
          <svg className="absolute inset-0 z-0 pointer-events-none" width={boardWidth} height={boardHeight} viewBox={`0 0 ${boardWidth} ${boardHeight}`} aria-hidden="true">
            {connectors.map(([fromId, toId, side]) => {
              const d = connectorPath(fromId, toId, side);
              return d ? <path key={`${fromId}-${toId}`} d={d} fill="none" stroke="hsl(var(--border))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" /> : null;
            })}
          </svg>

          {roundLabels.map(({ label, x, width, trophy }) => (
            <div key={`${label}-${x}`} className="absolute top-2 z-10 flex items-center justify-center gap-1 text-xs font-semibold text-muted-foreground" style={{ left: x, width }}>
              {trophy && <Trophy className="w-4 h-4 text-gold" />}
              <span>{label}</span>
            </div>
          ))}

          <Trophy className="absolute z-10 w-12 h-12 text-gold animate-pulse" style={{ left: 584, top: 502 }} />

          {positionedMatches.map(({ match, x, y, compact, isFinal }) => (
            <div key={match.id} className="absolute z-20" style={{ left: x, top: y }}>
              <BracketMatch match={match} playoffWinners={playoffWinners} predictionsLocked={predictionsLocked} onSelectWinner={onSelectWinner} onViewParticipants={onViewParticipants} isAdmin={isAdmin} compact={compact} isFinal={isFinal} classifiedTeams={classifiedTeams} />
            </div>
          ))}

          {campeon && <div className="absolute z-20 text-center" style={{ left: 502, top: 650, width: 212 }}>
              <p className="text-xs text-muted-foreground">Campeon</p>
              <div className="flex items-center justify-center gap-2">
                <p className="font-bold text-gold text-3xl">{campeon}</p>
                {campeonReal && classifiedTeams?.champion === campeonReal && (() => {
                  const finalWinnerId = playoffWinners['FINAL_1'];
                  if (finalWinnerId && finalWinnerId === campeonReal) {
                    return <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 text-[10px] font-bold rounded bg-success text-success-foreground">
                        +50
                      </span>;
                  }
                  return null;
                })()}
              </div>
            </div>}
        </div>

        {/* Leyenda y boton reset */}
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary rounded" />
            <span>Seleccionado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-card border rounded" />
            <span>Por seleccionar</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold" />
            <span>Campeon</span>
          </div>
          {onSave && !predictionsLocked && <Button variant="default" size="sm" onClick={onSave} className="ml-4">
              <Save className="w-3 h-3 mr-1" />
              Guardar y recalcular
            </Button>}
          {onReset && !predictionsLocked && <Button variant="outline" size="sm" onClick={onReset} className="ml-2 text-destructive hover:text-destructive">
              <RotateCcw className="w-3 h-3 mr-1" />
              Reiniciar cuadro
            </Button>}
        </div>
      </div>
    </div>;

  return <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[1200px] flex flex-col items-center gap-8">
        {/* Títulos de las rondas */}
        <div className="w-full grid grid-cols-9 gap-2 text-center text-xs font-semibold text-muted-foreground mb-2">
          <div>Dieciseisavos</div>
          <div>Octavos</div>
          <div>Cuartos</div>
          <div>Semifinal</div>
          <div className="flex items-center justify-center gap-1">
            <Trophy className="w-4 h-4 text-gold" />
            <span>Final</span>
          </div>
          <div>Semifinal</div>
          <div>Cuartos</div>
          <div>Octavos</div>
          <div>Dieciseisavos</div>
        </div>

        {/* Bracket principal */}
        <div className="w-full grid grid-cols-9 gap-2 items-center">
          {/* Lado Izquierdo - Dieciseisavos */}
          <div className="flex flex-col gap-2 items-end">
            {leftR32Visual.map(match => <BracketMatch key={match.id} match={match} playoffWinners={playoffWinners} predictionsLocked={predictionsLocked} onSelectWinner={onSelectWinner} onViewParticipants={onViewParticipants} isAdmin={isAdmin} compact classifiedTeams={classifiedTeams} />)}
          </div>

          {/* Lado Izquierdo - Octavos */}
          <div className="flex flex-col gap-6 items-end">
            {leftR16Visual.map(match => <BracketMatch key={match.id} match={match} playoffWinners={playoffWinners} predictionsLocked={predictionsLocked} onSelectWinner={onSelectWinner} onViewParticipants={onViewParticipants} isAdmin={isAdmin} compact classifiedTeams={classifiedTeams} />)}
          </div>

          {/* Lado Izquierdo - Cuartos */}
          <div className="flex flex-col gap-16 items-end">
            {leftQF.map(match => <BracketMatch key={match.id} match={match} playoffWinners={playoffWinners} predictionsLocked={predictionsLocked} onSelectWinner={onSelectWinner} onViewParticipants={onViewParticipants} isAdmin={isAdmin} classifiedTeams={classifiedTeams} />)}
          </div>

          {/* Lado Izquierdo - Semifinal */}
          <div className="flex flex-col justify-center items-end">
            {leftSF.map(match => <BracketMatch key={match.id} match={match} playoffWinners={playoffWinners} predictionsLocked={predictionsLocked} onSelectWinner={onSelectWinner} onViewParticipants={onViewParticipants} isAdmin={isAdmin} classifiedTeams={classifiedTeams} />)}
          </div>

          {/* Centro - Final */}
          <div className="flex flex-col items-center justify-center">
            <div className="mb-4">
              <Trophy className="w-12 h-12 text-gold animate-pulse" />
            </div>
            {finalMatches.length > 0 && <BracketMatch match={finalMatches[0]} playoffWinners={playoffWinners} predictionsLocked={predictionsLocked} onSelectWinner={onSelectWinner} onViewParticipants={onViewParticipants} isAdmin={isAdmin} isFinal classifiedTeams={classifiedTeams} />}
            {campeon && <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">Campeón</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="font-bold text-gold text-3xl">{campeon}</p>
                  {campeonReal && classifiedTeams?.champion === campeonReal && (() => {
                // Verificar si el usuario predijo correctamente el campeón en la Final
                const finalWinnerId = playoffWinners['FINAL_1'];
                if (finalWinnerId && finalWinnerId === campeonReal) {
                  return <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 text-[10px] font-bold rounded bg-success text-success-foreground">
                          +50
                        </span>;
                }
                return null;
              })()}
                </div>
              </div>}
          </div>

          {/* Lado Derecho - Semifinal */}
          <div className="flex flex-col justify-center items-start">
            {rightSF.map(match => <BracketMatch key={match.id} match={match} playoffWinners={playoffWinners} predictionsLocked={predictionsLocked} onSelectWinner={onSelectWinner} onViewParticipants={onViewParticipants} isAdmin={isAdmin} classifiedTeams={classifiedTeams} />)}
          </div>

          {/* Lado Derecho - Cuartos */}
          <div className="flex flex-col gap-16 items-start">
            {rightQF.map(match => <BracketMatch key={match.id} match={match} playoffWinners={playoffWinners} predictionsLocked={predictionsLocked} onSelectWinner={onSelectWinner} onViewParticipants={onViewParticipants} isAdmin={isAdmin} classifiedTeams={classifiedTeams} />)}
          </div>

          {/* Lado Derecho - Octavos */}
          <div className="flex flex-col gap-6 items-start">
            {rightR16Visual.map(match => <BracketMatch key={match.id} match={match} playoffWinners={playoffWinners} predictionsLocked={predictionsLocked} onSelectWinner={onSelectWinner} onViewParticipants={onViewParticipants} isAdmin={isAdmin} compact classifiedTeams={classifiedTeams} />)}
          </div>

          {/* Lado Derecho - Dieciseisavos */}
          <div className="flex flex-col gap-2 items-start">
            {rightR32Visual.map(match => <BracketMatch key={match.id} match={match} playoffWinners={playoffWinners} predictionsLocked={predictionsLocked} onSelectWinner={onSelectWinner} onViewParticipants={onViewParticipants} isAdmin={isAdmin} compact classifiedTeams={classifiedTeams} />)}
          </div>
        </div>

        {/* Leyenda y botón reset */}
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary rounded" />
            <span>Seleccionado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-card border rounded" />
            <span>Por seleccionar</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold" />
            <span>Campeón</span>
          </div>
          {onSave && !predictionsLocked && <Button variant="default" size="sm" onClick={onSave} className="ml-4">
              <Save className="w-3 h-3 mr-1" />
              Guardar y recalcular
            </Button>}
          {onReset && !predictionsLocked && <Button variant="outline" size="sm" onClick={onReset} className="ml-2 text-destructive hover:text-destructive">
              <RotateCcw className="w-3 h-3 mr-1" />
              Reiniciar cuadro
            </Button>}
        </div>
      </div>
    </div>;
}
