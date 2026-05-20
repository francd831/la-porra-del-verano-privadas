export interface FifaStandingStats {
  equipo: string;
  puntos: number;
  golesFavor: number;
  diferencia: number;
}

export interface FifaMatchResult {
  home: number | null;
  away: number | null;
}

interface HeadToHeadStats {
  points: number;
  goalDifference: number;
  goalsFor: number;
}

function compareOverall(a: FifaStandingStats, b: FifaStandingStats) {
  if (b.diferencia !== a.diferencia) return b.diferencia - a.diferencia;
  if (b.golesFavor !== a.golesFavor) return b.golesFavor - a.golesFavor;
  return a.equipo.localeCompare(b.equipo);
}

function splitByCriterion<T>(teams: T[], getValue: (team: T) => number) {
  const groups: T[][] = [];
  const sorted = [...teams].sort((a, b) => getValue(b) - getValue(a));

  sorted.forEach((team) => {
    const value = getValue(team);
    const current = groups[groups.length - 1];
    if (!current || getValue(current[0]) !== value) {
      groups.push([team]);
    } else {
      current.push(team);
    }
  });

  return groups;
}

export function sortStandingsByFifaCriteria<TMatch, TStanding extends FifaStandingStats>(
  standings: TStanding[],
  matches: TMatch[],
  getHomeTeam: (match: TMatch) => string | null | undefined,
  getAwayTeam: (match: TMatch) => string | null | undefined,
  getResult: (match: TMatch) => FifaMatchResult | null | undefined
): TStanding[] {
  const resolveTie = (tiedTeams: TStanding[]): TStanding[] => {
    if (tiedTeams.length <= 1) return tiedTeams;

    const teamSet = new Set(tiedTeams.map((team) => team.equipo));
    const headToHead = new Map<string, HeadToHeadStats>();
    tiedTeams.forEach((team) => {
      headToHead.set(team.equipo, { points: 0, goalDifference: 0, goalsFor: 0 });
    });

    matches.forEach((match) => {
      const homeTeam = getHomeTeam(match);
      const awayTeam = getAwayTeam(match);
      const result = getResult(match);
      if (!homeTeam || !awayTeam || !teamSet.has(homeTeam) || !teamSet.has(awayTeam)) return;
      if (!result || result.home === null || result.away === null) return;

      const homeStats = headToHead.get(homeTeam);
      const awayStats = headToHead.get(awayTeam);
      if (!homeStats || !awayStats) return;

      homeStats.goalsFor += result.home;
      homeStats.goalDifference += result.home - result.away;
      awayStats.goalsFor += result.away;
      awayStats.goalDifference += result.away - result.home;

      if (result.home > result.away) {
        homeStats.points += 3;
      } else if (result.home < result.away) {
        awayStats.points += 3;
      } else {
        homeStats.points += 1;
        awayStats.points += 1;
      }
    });

    const headToHeadCriteria = [
      (team: TStanding) => headToHead.get(team.equipo)?.points || 0,
      (team: TStanding) => headToHead.get(team.equipo)?.goalDifference || 0,
      (team: TStanding) => headToHead.get(team.equipo)?.goalsFor || 0,
    ];

    for (const criterion of headToHeadCriteria) {
      const groups = splitByCriterion(tiedTeams, criterion);
      if (groups.length > 1) {
        return groups.flatMap((group) => resolveTie(group));
      }
    }

    const overallGroups = splitByCriterion(tiedTeams, (team) => team.diferencia)
      .flatMap((group) => splitByCriterion(group, (team) => team.golesFavor));

    return overallGroups.flatMap((group) =>
      group.length > 1 ? [...group].sort(compareOverall) : group
    );
  };

  const pointGroups = splitByCriterion(standings, (team) => team.puntos);
  return pointGroups.flatMap((group) => resolveTie(group));
}

export function sortThirdPlacedByFifaCriteria<TStanding extends FifaStandingStats & { grupo: string }>(
  standings: TStanding[]
): TStanding[] {
  return [...standings].sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.diferencia !== a.diferencia) return b.diferencia - a.diferencia;
    if (b.golesFavor !== a.golesFavor) return b.golesFavor - a.golesFavor;
    return a.grupo.localeCompare(b.grupo);
  });
}
