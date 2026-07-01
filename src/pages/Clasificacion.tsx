import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Calculator, ChevronDown, ChevronUp, Crown, Medal, MessageSquare, Plus, RotateCcw, Search, Sparkles, Star, Timer, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_TOURNAMENT_ID = "11111111-1111-1111-1111-111111111111";
const MAX_PRIVATE_LEAGUES = 3;
const WHAT_IF_ALLOWED_USER_IDS = new Set(["9b7996cb-f410-41dd-b6b3-4c5ac2cd5a56"]);

const PLAYOFF_ROUNDS = [
  { id: "Dieciseisavos de Final", label: "1/16", predictionPrefix: "R32", points: 15 },
  { id: "Octavos de Final", label: "Octavos", predictionPrefix: "R16", points: 20 },
  { id: "Cuartos de Final", label: "Cuartos", predictionPrefix: "QF", points: 30 },
  { id: "Semifinales", label: "Semis", predictionPrefix: "SF", points: 40 },
  { id: "Final", label: "Final", predictionPrefix: "CHAMPION", points: 50 },
] as const;

const NEXT_SLOT_BY_MATCH_ID: Record<string, { target: string; side: "home" | "away" }> = {
  R32_1: { target: "R16_2", side: "home" },
  R32_2: { target: "R16_1", side: "home" },
  R32_3: { target: "R16_2", side: "away" },
  R32_4: { target: "R16_3", side: "home" },
  R32_5: { target: "R16_1", side: "away" },
  R32_6: { target: "R16_3", side: "away" },
  R32_7: { target: "R16_4", side: "home" },
  R32_8: { target: "R16_4", side: "away" },
  R32_9: { target: "R16_6", side: "home" },
  R32_10: { target: "R16_6", side: "away" },
  R32_11: { target: "R16_5", side: "home" },
  R32_12: { target: "R16_5", side: "away" },
  R32_13: { target: "R16_8", side: "home" },
  R32_14: { target: "R16_7", side: "home" },
  R32_15: { target: "R16_8", side: "away" },
  R32_16: { target: "R16_7", side: "away" },
  R16_1: { target: "QF_1", side: "home" },
  R16_2: { target: "QF_1", side: "away" },
  R16_3: { target: "QF_3", side: "home" },
  R16_4: { target: "QF_3", side: "away" },
  R16_5: { target: "QF_2", side: "home" },
  R16_6: { target: "QF_2", side: "away" },
  R16_7: { target: "QF_4", side: "home" },
  R16_8: { target: "QF_4", side: "away" },
  QF_1: { target: "SF_1", side: "home" },
  QF_2: { target: "SF_1", side: "away" },
  QF_3: { target: "SF_2", side: "home" },
  QF_4: { target: "SF_2", side: "away" },
  SF_1: { target: "FINAL_1", side: "home" },
  SF_2: { target: "FINAL_1", side: "away" },
};

interface UserRanking {
  user_id: string;
  display_name: string;
  points_total: number;
  points_groups: number;
  points_group_order: number;
  points_playoffs: number;
  points_awards: number;
  points_r32: number;
  points_r16: number;
  points_qf: number;
  points_sf: number;
  points_final: number;
  points_champion: number;
  is_complete: boolean;
}

interface LeagueOption {
  id: string;
  name: string;
  comments: string | null;
  invite_code: string;
  logo_url: string | null;
  owner_id: string;
  requires_approval: boolean;
  member_status: string;
  member_count: number;
}

interface LeagueMemberPositionRow {
  league_id: string;
  user_id: string;
  status: string;
}

interface SubmissionRow {
  user_id: string;
  points_total: number | null;
  points_groups: number | null;
  points_group_order: number | null;
  points_playoffs: number | null;
  points_awards: number | null;
  points_r32: number | null;
  points_r16: number | null;
  points_qf: number | null;
  points_sf: number | null;
  points_final: number | null;
  points_champion: number | null;
  is_complete: boolean | null;
}

interface DisplayNameResult {
  user_id: string;
  display_name: string | null;
}

interface LiveMatch {
  id: string;
  home_goals: number | null;
  away_goals: number | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
}

interface PlayoffTeam {
  id: string;
  name: string;
}

interface WhatIfMatch {
  id: string;
  round: string | null;
  match_date: string | null;
  status: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  winner_team_id: string | null;
  home_team: PlayoffTeam | null;
  away_team: PlayoffTeam | null;
}

interface WhatIfDisplayMatch extends WhatIfMatch {
  home_display: PlayoffTeam | null;
  away_display: PlayoffTeam | null;
}

interface SimulatedRanking extends UserRanking {
  current_position: number;
  simulated_position: number;
  simulated_total: number;
  simulated_delta: number;
}

interface WhatIfSimulationDelta {
  user_id: string;
  simulated_delta: number;
}

interface GeneralStats {
  registered: number;
  notStarted: number;
  incomplete: number;
  complete: number;
}

export default function Clasificacion() {
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [generalStats, setGeneralStats] = useState<GeneralStats>({
    registered: 0,
    notStarted: 0,
    incomplete: 0,
    complete: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [rankingsVisible, setRankingsVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [rankingPositions, setRankingPositions] = useState<Record<string, number | null>>({});
  const [selectedLeagueId, setSelectedLeagueId] = useState("general");
  const [inviteCode, setInviteCode] = useState("");
  const [joiningLeague, setJoiningLeague] = useState(false);
  const [whatIfMatches, setWhatIfMatches] = useState<WhatIfMatch[]>([]);
  const [whatIfSelections, setWhatIfSelections] = useState<Record<string, string>>({});
  const [simulatedRankings, setSimulatedRankings] = useState<SimulatedRanking[] | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfExpanded, setWhatIfExpanded] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const showWhatIf = !!user && WHAT_IF_ALLOWED_USER_IDS.has(user.id);

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.id === selectedLeagueId) || null,
    [leagues, selectedLeagueId]
  );

  const isGeneralRanking = selectedLeagueId === "general";

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  const fetchRankingPositions = useCallback(async (leagueOptions: LeagueOption[]) => {
    if (!user) {
      setRankingPositions({});
      return;
    }

    try {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const adminIds = new Set((adminRoles || []).map((r) => r.user_id));

      const { data: submissionsData, error: submissionsError } = await supabase
        .from("user_submissions")
        .select("user_id, points_total")
        .eq("tournament_id", DEFAULT_TOURNAMENT_ID);
      if (submissionsError) throw submissionsError;

      const pointsRows = (submissionsData || []) as Pick<SubmissionRow, "user_id" | "points_total">[];
      const pointsByUser = new Map(pointsRows.map((row) => [row.user_id, row.points_total || 0]));
      const generalRanking = pointsRows
        .filter((row) => !adminIds.has(row.user_id));

      const userGeneralPoints = pointsByUser.get(user.id);
      const positions: Record<string, number | null> = {
        general: userGeneralPoints === undefined
          ? null
          : generalRanking.filter((row) => (row.points_total || 0) > userGeneralPoints).length + 1,
      };

      if (leagueOptions.length > 0) {
        const { data: memberRows, error: membersError } = await supabase
          .from("league_members")
          .select("league_id, user_id, status")
          .in("league_id", leagueOptions.map((league) => league.id))
          .eq("status", "approved");
        if (membersError) throw membersError;

        const membersByLeague = new Map<string, string[]>();
        ((memberRows || []) as LeagueMemberPositionRow[]).forEach((member) => {
          const current = membersByLeague.get(member.league_id) || [];
          current.push(member.user_id);
          membersByLeague.set(member.league_id, current);
        });

        leagueOptions.forEach((league) => {
          const leagueMemberIds = (membersByLeague.get(league.id) || []).filter((memberId) => !adminIds.has(memberId));
          if (!leagueMemberIds.includes(user.id)) {
            positions[league.id] = null;
            return;
          }
          const userLeaguePoints = pointsByUser.get(user.id) || 0;
          positions[league.id] = leagueMemberIds.filter((memberId) => (pointsByUser.get(memberId) || 0) > userLeaguePoints).length + 1;
        });
      }

      setRankingPositions(positions);
    } catch (e) {
      console.error("Error loading ranking positions:", e);
      setRankingPositions({});
    }
  }, [user]);

  const fetchUserLeagues = useCallback(async () => {
    if (!user) {
      setLeagues([]);
      setRankingPositions({});
      return;
    }
    const { data: memberData, error: memberError } = await supabase
      .from("league_members")
      .select("league_id, status")
      .eq("user_id", user.id);
    if (memberError) {
      console.error("Error loading user leagues:", memberError);
      return;
    }
    const leagueIds = (memberData || []).map((m) => m.league_id);
    if (leagueIds.length === 0) {
      setLeagues([]);
      await fetchRankingPositions([]);
      return;
    }
    const { data: leaguesData, error: leaguesError } = await supabase
      .from("leagues")
      .select("id, name, comments, invite_code, logo_url, owner_id, requires_approval")
      .in("id", leagueIds)
      .order("created_at", { ascending: false });
    if (leaguesError) {
      console.error("Error loading leagues:", leaguesError);
      return;
    }
    const { data: countRows } = await supabase
      .from("league_members")
      .select("league_id, user_id")
      .in("league_id", leagueIds)
      .eq("status", "approved");
    const countsByLeague = new Map<string, number>();
    (countRows || []).forEach((row) => {
      countsByLeague.set(row.league_id, (countsByLeague.get(row.league_id) || 0) + 1);
    });
    const statusByLeague = new Map((memberData || []).map((row) => [row.league_id, row.status || "approved"]));
    const loadedLeagues = (leaguesData || []).map((league) => ({
      ...league,
      member_status: statusByLeague.get(league.id) || "approved",
      member_count: countsByLeague.get(league.id) || 0,
    }));
    setLeagues(loadedLeagues);
    await fetchRankingPositions(loadedLeagues);
  }, [fetchRankingPositions, user]);

  useEffect(() => {
    fetchUserLeagues();
  }, [fetchUserLeagues]);

  const fetchWhatIfData = useCallback(async () => {
    if (!showWhatIf || !whatIfExpanded) {
      setWhatIfMatches([]);
      setWhatIfSelections({});
      setSimulatedRankings(null);
      return;
    }

    setWhatIfLoading(true);
    try {
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(`
          id,
          round,
          match_date,
          status,
          home_team_id,
          away_team_id,
          winner_team_id,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `)
        .eq("tournament_id", DEFAULT_TOURNAMENT_ID)
        .eq("match_type", "playoff")
        .order("match_date", { ascending: true });

      if (matchesError) throw matchesError;

      setWhatIfMatches((matchesData || []).map((match) => ({
        id: match.id,
        round: match.round,
        match_date: match.match_date,
        status: match.status,
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        winner_team_id: match.winner_team_id,
        home_team: match.home_team as PlayoffTeam | null,
        away_team: match.away_team as PlayoffTeam | null,
      })));
    } catch (e) {
      console.error("Error loading what-if data:", e);
    } finally {
      setWhatIfLoading(false);
    }
  }, [showWhatIf, whatIfExpanded]);

  useEffect(() => {
    fetchWhatIfData();
  }, [fetchWhatIfData]);

  const getJoinErrorMessage = (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message || "")
          : "";

    if (message.includes("User league limit reached")) {
      return `Solo puedes pertenecer a ${MAX_PRIVATE_LEAGUES} ligas privadas.`;
    }
    return message || "Comprueba el código de invitación.";
  };

  const handleJoinLeague = async () => {
    const normalizedCode = inviteCode.trim().toUpperCase();
    if (!normalizedCode) return;

    if (!user) {
      toast({
        variant: "destructive",
        title: "Inicia sesión",
        description: "Necesitas entrar con tu cuenta para unirte a una liga.",
      });
      return;
    }

    if (leagues.length >= MAX_PRIVATE_LEAGUES) {
      toast({
        variant: "destructive",
        title: "Límite alcanzado",
        description: `Solo puedes pertenecer a ${MAX_PRIVATE_LEAGUES} ligas privadas.`,
      });
      return;
    }

    setJoiningLeague(true);
    try {
      const { data: leagueId, error } = await supabase.rpc("join_league_by_invite_code", {
        p_invite_code: normalizedCode,
      });

      if (error) throw error;

      const { data: membership } = typeof leagueId === "string"
        ? await supabase
            .from("league_members")
            .select("status")
            .eq("league_id", leagueId)
            .eq("user_id", user.id)
            .maybeSingle()
        : { data: null };
      const isPending = membership?.status === "pending";

      toast({
        title: isPending ? "Solicitud enviada" : "Te has unido a la liga",
        description: isPending
          ? "El owner debe aprobar tu acceso antes de que compitas en la clasificación."
          : "La clasificación privada ya está disponible aquí.",
      });
      setInviteCode("");
      await fetchUserLeagues();
      if (typeof leagueId === "string") {
        setSelectedLeagueId(leagueId);
      }
    } catch (error: unknown) {
      console.error("Error joining league:", error);
      toast({
        variant: "destructive",
        title: "No se pudo unir",
        description: getJoinErrorMessage(error),
      });
    } finally {
      setJoiningLeague(false);
    }
  };

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      const { data: liveMatchesData, error: liveMatchesError } = await supabase
        .from("matches")
        .select(`
          id,
          home_goals,
          away_goals,
          home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name)
        `)
        .eq("tournament_id", DEFAULT_TOURNAMENT_ID)
        .eq("status", "in_progress")
        .order("match_date", { ascending: true });
      if (liveMatchesError) throw liveMatchesError;
      setLiveMatches((liveMatchesData || []).map((match) => ({
        id: match.id,
        home_goals: match.home_goals,
        away_goals: match.away_goals,
        home_team: match.home_team as { name: string } | null,
        away_team: match.away_team as { name: string } | null,
      })));

      const { data: tournamentData } = await supabase
        .from("tournaments")
        .select("rankings_visible")
        .eq("id", DEFAULT_TOURNAMENT_ID)
        .single();
      setRankingsVisible(tournamentData?.rankings_visible || false);

      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const adminIds = new Set((adminRoles || []).map((r) => r.user_id));

      if (isGeneralRanking) {
        const { data: statsData, error: statsError } = await supabase.rpc("get_general_participation_stats", {
          p_tournament_id: DEFAULT_TOURNAMENT_ID,
        });
        if (statsError) throw statsError;

        const stats = Array.isArray(statsData) ? statsData[0] : statsData;
        setGeneralStats({
          registered: Number(stats?.registered || 0),
          notStarted: Number(stats?.not_started || 0),
          incomplete: Number(stats?.incomplete || 0),
          complete: Number(stats?.complete || 0),
        });
      }

      let leagueMemberIds: Set<string> | null = null;
      if (!isGeneralRanking) {
        const { data: leagueMembers, error } = await supabase
          .from("league_members")
          .select("user_id")
          .eq("league_id", selectedLeagueId)
          .eq("status", "approved");
        if (error) throw error;
        leagueMemberIds = new Set((leagueMembers || []).map((m) => m.user_id));
      }

      let submissionsQuery = supabase
        .from("user_submissions")
        .select(`
          user_id, points_total, points_groups, points_group_order, points_playoffs,
          points_awards, points_r32, points_r16, points_qf, points_sf, points_final, points_champion,
          is_complete
        `)
        .eq("tournament_id", DEFAULT_TOURNAMENT_ID)
        .order("points_total", { ascending: false });

      if (leagueMemberIds && leagueMemberIds.size > 0) {
        submissionsQuery = submissionsQuery.in("user_id", Array.from(leagueMemberIds));
      }

      const { data: submissionsData, error } = await submissionsQuery;
      if (error) throw error;

      const scoped = ((submissionsData || []) as SubmissionRow[]).filter((item) => {
        if (adminIds.has(item.user_id)) return false;
        if (leagueMemberIds && !leagueMemberIds.has(item.user_id)) return false;
        return true;
      });

      const scopedUserIds = leagueMemberIds
        ? Array.from(leagueMemberIds).filter((id) => !adminIds.has(id))
        : scoped.map((item) => item.user_id);

      const { data: profilesData } = await supabase.rpc("get_user_display_names", {
        p_user_ids: scopedUserIds,
      });

      const profilesMap = new Map(
        ((profilesData || []) as DisplayNameResult[]).map((p) => [p.user_id, p.display_name || "Usuario"])
      );
      const submissionsMap = new Map(scoped.map((item) => [item.user_id, item]));

      const rankingsData: UserRanking[] = scopedUserIds
        .map((userId) => {
          const item = submissionsMap.get(userId);
          return {
            user_id: userId,
            display_name: profilesMap.get(userId) || "Usuario",
            points_total: item?.points_total || 0,
            points_groups: item?.points_groups || 0,
            points_group_order: item?.points_group_order || 0,
            points_playoffs: item?.points_playoffs || 0,
            points_awards: item?.points_awards || 0,
            points_r32: item?.points_r32 || 0,
            points_r16: item?.points_r16 || 0,
            points_qf: item?.points_qf || 0,
            points_sf: item?.points_sf || 0,
            points_final: item?.points_final || 0,
            points_champion: item?.points_champion || 0,
            is_complete: !!item?.is_complete,
          };
        })
        .sort((a, b) => {
          if (b.points_total !== a.points_total) return b.points_total - a.points_total;
          return a.display_name.localeCompare(b.display_name, "es", { sensitivity: "base" });
        });

      setRankings(rankingsData);
    } catch (e) {
      console.error("Error fetching rankings:", e);
      setRankings([]);
    } finally {
      setLoading(false);
    }
  }, [isGeneralRanking, selectedLeagueId]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const toggleRow = (userId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const getPosicionIcon = (posicion: number) => {
    switch (posicion) {
      case 1: return <Trophy className="w-4 h-4 text-gold" />;
      case 2: return <Medal className="w-4 h-4 text-muted-foreground" />;
      case 3: return <Star className="w-4 h-4 text-amber-600" />;
      default: return <span className="w-4 h-4 flex items-center justify-center text-sm font-bold">{posicion}</span>;
    }
  };

  const getPosicionBadge = (posicion: number) => {
    if (posicion === 1) return "bg-gold/20 text-gold border border-gold/30";
    if (posicion === 2) return "bg-muted-foreground/15 text-muted-foreground border border-border/50";
    if (posicion === 3) return "bg-amber-700/20 text-amber-500 border border-amber-700/30";
    return "bg-muted/50 text-muted-foreground";
  };

  const visibleRankings = rankings;
  const topThree = visibleRankings.slice(0, 3);
  const rankingPositionsByUser = useMemo(() => {
    const positions = new Map<string, number>();
    visibleRankings.forEach((ranking, index) => {
      const firstSamePointsIndex = visibleRankings.findIndex((candidate) => candidate.points_total === ranking.points_total);
      positions.set(ranking.user_id, firstSamePointsIndex + 1);
    });
    return positions;
  }, [visibleRankings]);
  const userPosition = user ? rankingPositionsByUser.get(user.id) || 0 : 0;
  const currentUserPoints = user ? rankings.find((r) => r.user_id === user.id)?.points_total || 0 : 0;
  const showFullRanking = true;
  const rankingTitle = selectedLeague ? selectedLeague.name : "General";
  const selectedLeagueIsOwner = !!selectedLeague && selectedLeague.owner_id === user?.id;
  const selectedLeagueIsPending = selectedLeague?.member_status === "pending";
  const participantCount = selectedLeague
    ? selectedLeague.member_count
    : generalStats.incomplete + generalStats.complete;
  const getSelectorPosition = (scopeId: string) => {
    const position = rankingPositions[scopeId];
    return position ? `#${position}` : "-";
  };
  const getSelectorPositionClass = (active: boolean) =>
    active
      ? "text-primary-foreground"
      : "text-muted-foreground";

  const isMatchCompleted = (status: string | null) => {
    const normalized = (status || "").toLowerCase();
    return normalized === "completed" || normalized === "finished";
  };

  const whatIfDisplayMatches = useMemo(() => {
    const displayById = new Map<string, WhatIfDisplayMatch>(
      whatIfMatches.map((match) => [
        match.id,
        {
          ...match,
          home_display: match.home_team,
          away_display: match.away_team,
        },
      ])
    );

    const applyWinnerToNextSlot = (match: WhatIfDisplayMatch, winnerTeamId: string | null) => {
      if (!winnerTeamId) return;
      const nextSlot = NEXT_SLOT_BY_MATCH_ID[match.id];
      const target = nextSlot ? displayById.get(nextSlot.target) : null;
      if (!target) return;

      const selectedTeam =
        match.home_display?.id === winnerTeamId
          ? match.home_display
          : match.away_display?.id === winnerTeamId
            ? match.away_display
            : null;
      if (!selectedTeam) return;

      if (nextSlot.side === "home" && !target.home_team_id) {
        target.home_display = selectedTeam;
      }
      if (nextSlot.side === "away" && !target.away_team_id) {
        target.away_display = selectedTeam;
      }
    };

    PLAYOFF_ROUNDS.forEach((round) => {
      Array.from(displayById.values())
        .filter((match) => match.round === round.id)
        .forEach((match) => {
          const winnerTeamId = isMatchCompleted(match.status)
            ? match.winner_team_id
            : whatIfSelections[match.id] || null;
          applyWinnerToNextSlot(match, winnerTeamId);
        });
    });

    return Array.from(displayById.values()).sort((a, b) => {
      const roundA = PLAYOFF_ROUNDS.findIndex((round) => round.id === a.round);
      const roundB = PLAYOFF_ROUNDS.findIndex((round) => round.id === b.round);
      if (roundA !== roundB) return roundA - roundB;
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
  }, [whatIfMatches, whatIfSelections]);

  const pendingWhatIfMatchesByRound = useMemo(() => {
    const grouped = new Map<string, WhatIfDisplayMatch[]>();
    whatIfDisplayMatches
      .filter((match) => !isMatchCompleted(match.status))
      .forEach((match) => {
        const current = grouped.get(match.round || "") || [];
        current.push(match);
        grouped.set(match.round || "", current);
      });
    return grouped;
  }, [whatIfDisplayMatches]);

  const clearDownstreamSelections = (matchId: string, selections: Record<string, string>) => {
    const nextSelections = { ...selections };
    let cursor = NEXT_SLOT_BY_MATCH_ID[matchId]?.target;
    while (cursor) {
      delete nextSelections[cursor];
      cursor = NEXT_SLOT_BY_MATCH_ID[cursor]?.target;
    }
    return nextSelections;
  };

  const handleWhatIfSelection = (matchId: string, teamId: string | null) => {
    if (!teamId) return;
    setWhatIfSelections((prev) => ({
      ...clearDownstreamSelections(matchId, prev),
      [matchId]: teamId,
    }));
    setSimulatedRankings(null);
  };

  const calculateWhatIfRanking = async () => {
    const callableSupabase = supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: WhatIfSimulationDelta[] | null; error: Error | null }>;
    };

    const { data, error } = await callableSupabase.rpc("simulate_what_if_rankings", {
      p_tournament_id: DEFAULT_TOURNAMENT_ID,
      p_selected_winners: whatIfSelections,
      p_user_ids: visibleRankings.map((ranking) => ranking.user_id),
    });

    if (error) {
      console.error("Error calculating what-if ranking:", error);
      toast({
        variant: "destructive",
        title: "No se pudo calcular",
        description: "Prueba de nuevo en unos segundos.",
      });
      return;
    }

    const deltasByUser = new Map((data || []).map((row) => [row.user_id, row.simulated_delta || 0]));

    const simulated = visibleRankings
      .map((ranking) => ({
        ...ranking,
        current_position: rankingPositionsByUser.get(ranking.user_id) || 0,
        simulated_total: ranking.points_total + (deltasByUser.get(ranking.user_id) || 0),
        simulated_delta: deltasByUser.get(ranking.user_id) || 0,
        simulated_position: 0,
      }))
      .sort((a, b) => {
        if (b.simulated_total !== a.simulated_total) return b.simulated_total - a.simulated_total;
        return a.display_name.localeCompare(b.display_name, "es", { sensitivity: "base" });
      });

    const ranked = simulated.map((ranking, index, all) => {
      const firstSamePointsIndex = all.findIndex((candidate) => candidate.simulated_total === ranking.simulated_total);
      return {
        ...ranking,
        simulated_position: firstSamePointsIndex + 1,
      };
    });

    setSimulatedRankings(ranked);
  };

  const resetWhatIf = () => {
    setWhatIfSelections({});
    setSimulatedRankings(null);
  };

  const hasWhatIfSelections = Object.keys(whatIfSelections).length > 0;
  const simulatedTop = simulatedRankings?.slice(0, 10) || [];
  const simulatedCurrentUser = user
    ? simulatedRankings?.find((ranking) => ranking.user_id === user.id) || null
    : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-24">
      {/* Header */}
      <div className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-glow">
            {selectedLeague ? <Users className="w-5 h-5 text-primary-foreground" /> : <Trophy className="w-5 h-5 text-primary-foreground" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Clasificación</h1>
            <p className="text-sm text-muted-foreground">
              {selectedLeague ? `Liga privada: ${rankingTitle}` : "Clasificación general"}
              {userPosition > 0 && ` · tu posición #${userPosition}`}
            </p>
          </div>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:max-w-[62%] lg:max-w-none">
          <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
            {participantCount} participantes
          </Badge>
          {user && isGeneralRanking && (
            <div className="flex min-w-0 flex-wrap justify-end gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 max-w-full rounded-full border-border/60 bg-card/40 px-3 text-xs">
                <Link to="/ligas/crear">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Crear liga
                </Link>
              </Button>
              <div className="flex min-w-0 gap-1.5">
                <Input
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  placeholder="Código"
                  className="h-8 w-24 max-w-[34vw] rounded-full bg-card/40 px-3 text-xs uppercase font-mono tracking-wider"
                  disabled={joiningLeague || leagues.length >= MAX_PRIVATE_LEAGUES}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-border/60 bg-card/40 px-3 text-xs"
                  onClick={handleJoinLeague}
                  disabled={joiningLeague || !inviteCode.trim() || leagues.length >= MAX_PRIVATE_LEAGUES}
                >
                  <Search className="mr-1.5 h-3.5 w-3.5" />
                  {joiningLeague ? "..." : "Unirse"}
                </Button>
              </div>
            </div>
          )}
          {user && (
            <Badge className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
              {currentUserPoints} pts
            </Badge>
          )}
        </div>
      </div>

      {/* Selector de ranking: General + ligas privadas */}
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedLeagueId("general")}
            className={`min-h-[68px] min-w-[124px] px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 border ${
              isGeneralRanking
                ? "bg-primary text-primary-foreground border-primary shadow-neon"
                : "bg-secondary/60 text-foreground border-border/50 hover:bg-muted/50"
            }`}
          >
            <Trophy className="w-4 h-4 shrink-0" />
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="truncate">General</span>
              {user && (
                <span className={`mt-1 text-2xl font-black leading-none ${getSelectorPositionClass(isGeneralRanking)}`}>
                  {getSelectorPosition("general")}
                </span>
              )}
            </span>
          </button>
          {leagues.map((league) => (
            <button
              key={league.id}
              onClick={() => setSelectedLeagueId(league.id)}
              className={`min-h-[68px] min-w-[124px] max-w-[220px] px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 border ${
                selectedLeagueId === league.id
                  ? "bg-primary text-primary-foreground border-primary shadow-neon"
                  : "bg-secondary/60 text-foreground border-border/50 hover:bg-muted/50"
              }`}
            >
              {league.logo_url ? (
                <img
                  src={league.logo_url}
                  alt={league.name}
                  className="h-11 w-28 shrink-0 rounded-lg border border-border/40 bg-white object-contain px-2 py-1"
                />
              ) : (
                <Users className="w-4 h-4 shrink-0" />
              )}
              <span className="flex min-w-0 flex-col items-start leading-tight">
                {!league.logo_url && <span className="max-w-full truncate">{league.name}</span>}
                {league.member_status === "pending" && (
                  <span className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${getSelectorPositionClass(selectedLeagueId === league.id)}`}>
                    Pendiente
                  </span>
                )}
                {user && league.member_status !== "pending" && (
                  <span className={`mt-1 text-2xl font-black leading-none ${getSelectorPositionClass(selectedLeagueId === league.id)}`}>
                    {getSelectorPosition(league.id)}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

      </div>

      {liveMatches.length > 0 && (
        <Card className="mb-6 overflow-hidden border-primary/30 bg-primary/10 shadow-glow">
          <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15">
                <Timer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  {liveMatches.length === 1 ? "Partido en juego" : "Partidos en juego"}
                </p>
                <div className="mt-1 grid gap-1">
                  {liveMatches.map((match) => (
                    <p key={match.id} className="text-base font-bold text-foreground">
                      {match.home_team?.name || "Equipo local"}
                      <span className="mx-2 text-primary">
                        {match.home_goals ?? "-"} - {match.away_goals ?? "-"}
                      </span>
                      {match.away_team?.name || "Equipo visitante"}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <Badge className="w-fit border border-primary/30 bg-primary text-primary-foreground">
              Clasificacion en tiempo real
            </Badge>
          </CardContent>
        </Card>
      )}

      {selectedLeague && (
        <Card className="mb-6 border border-border/50 bg-card/60 backdrop-blur-xl shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {selectedLeague.logo_url && (
                <img
                  src={selectedLeague.logo_url}
                  alt={selectedLeague.name}
                  className="h-12 w-36 shrink-0 rounded-xl border border-border/40 bg-white object-contain px-3 py-2"
                />
              )}
              {selectedLeagueIsOwner ? (
                <Crown className="h-5 w-5 text-gold" />
              ) : (
                <MessageSquare className="h-5 w-5 text-primary" />
              )}
              {!selectedLeague.logo_url && <span>{selectedLeague.name}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedLeagueIsOwner ? (
              <Button asChild className="rounded-xl font-bold">
                <Link to={`/ligas/${selectedLeague.id}`}>
                  Gestionar liga
                </Link>
              </Button>
            ) : (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                {selectedLeagueIsPending && (
                  <div className="mb-4 rounded-lg border border-primary/25 bg-primary/5 p-3">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      Pendiente de aceptación
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ya has solicitado entrar en esta liga. El owner debe aprobar tu acceso para que puedas competir.
                    </p>
                  </div>
                )}
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Comentario del admin
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {selectedLeague.comments || "El admin todavía no ha añadido comentarios a esta liga."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showWhatIf && (
        <Card className="mb-6 overflow-hidden border-primary/25 bg-card/70 shadow-soft backdrop-blur-xl">
          <CardHeader className="p-0">
            <div
              role="button"
              tabIndex={0}
              className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-primary/5 sm:flex-row sm:items-start sm:justify-between sm:p-5"
              onClick={() => setWhatIfExpanded((prev) => !prev)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setWhatIfExpanded((prev) => !prev);
                }
              }}
            >
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-gradient-to-br from-primary/35 via-purple-500/25 to-cyan-400/15 shadow-glow">
                    <span className="absolute inset-1 rounded-full bg-white/10 blur-[1px]" />
                    <Sparkles className="relative h-4 w-4 text-primary" />
                  </span>
                  ¿Y si...?
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Simula qué pasaría en esta clasificación si pasan unos equipos u otros.
                </p>
              </div>
              <div className={`flex gap-2 ${whatIfExpanded ? "" : "hidden"}`} onClick={(event) => event.stopPropagation()}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={resetWhatIf}
                  disabled={!hasWhatIfSelections}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Limpiar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl font-bold"
                  onClick={calculateWhatIfRanking}
                  disabled={!hasWhatIfSelections}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular
                </Button>
              </div>
              {!whatIfExpanded && <ChevronDown className="h-5 w-5 shrink-0 text-primary" />}
            </div>
          </CardHeader>
          {whatIfExpanded && <CardContent className="space-y-5">
            {whatIfLoading ? (
              <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground">
                Preparando simulador...
              </div>
            ) : (
              <>
                <div className="space-y-5">
                  {PLAYOFF_ROUNDS.map((round) => {
                    const matches = pendingWhatIfMatchesByRound.get(round.id) || [];
                    if (matches.length === 0) return null;

                    return (
                      <div key={round.id} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-border/60" />
                          <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/10 px-3 py-1 text-primary">
                            {round.label}
                          </Badge>
                          <div className="h-px flex-1 bg-border/60" />
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {matches.map((match) => {
                            const selectedTeamId = whatIfSelections[match.id];
                            const homeSelected = selectedTeamId === match.home_display?.id;
                            const awaySelected = selectedTeamId === match.away_display?.id;

                            return (
                              <div
                                key={match.id}
                                className="rounded-2xl border border-border/50 bg-background/35 p-3"
                              >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                    {match.id.replace("_", " ")}
                                  </span>
                                  <span className="text-[11px] font-semibold text-primary">+{round.points}</span>
                                </div>
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                  <button
                                    type="button"
                                    className={`min-h-12 rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                                      homeSelected
                                        ? "border-primary bg-primary text-primary-foreground shadow-neon"
                                        : "border-border/60 bg-secondary/70 text-foreground hover:border-primary/40 hover:bg-primary/10"
                                    } ${!match.home_display ? "cursor-not-allowed opacity-50" : ""}`}
                                    onClick={() => handleWhatIfSelection(match.id, match.home_display?.id || null)}
                                    disabled={!match.home_display}
                                  >
                                    <span className="block truncate">{match.home_display?.name || "TBD"}</span>
                                  </button>
                                  <span className="text-xs font-bold text-muted-foreground">vs</span>
                                  <button
                                    type="button"
                                    className={`min-h-12 rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                                      awaySelected
                                        ? "border-primary bg-primary text-primary-foreground shadow-neon"
                                        : "border-border/60 bg-secondary/70 text-foreground hover:border-primary/40 hover:bg-primary/10"
                                    } ${!match.away_display ? "cursor-not-allowed opacity-50" : ""}`}
                                    onClick={() => handleWhatIfSelection(match.id, match.away_display?.id || null)}
                                    disabled={!match.away_display}
                                  >
                                    <span className="block truncate">{match.away_display?.name || "TBD"}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center border-t border-border/50 pt-4">
                  <Button
                    type="button"
                    className="w-full max-w-xs rounded-xl font-bold"
                    onClick={calculateWhatIfRanking}
                    disabled={!hasWhatIfSelections}
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Calcular
                  </Button>
                </div>

                {simulatedRankings && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-foreground">Clasificación simulada</h3>
                      <Badge className="rounded-full bg-primary text-primary-foreground">
                        {Object.keys(whatIfSelections).length} escenarios
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {simulatedTop.map((ranking) => (
                        <div
                          key={ranking.user_id}
                          className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border px-3 py-2 ${
                            ranking.user_id === user?.id
                              ? "border-primary/35 bg-primary/10"
                              : "border-border/45 bg-background/40"
                          }`}
                        >
                          <span className="text-sm font-black text-primary">#{ranking.simulated_position}</span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-foreground">{ranking.display_name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              Ahora #{ranking.current_position || "-"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-foreground">{ranking.simulated_total} pts</div>
                            {ranking.simulated_delta > 0 && (
                              <div className="text-[11px] font-bold text-emerald-400">+{ranking.simulated_delta}</div>
                            )}
                          </div>
                        </div>
                      ))}
                      {simulatedCurrentUser && !simulatedTop.some((ranking) => ranking.user_id === simulatedCurrentUser.user_id) && (
                        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-primary/35 bg-primary/10 px-3 py-2">
                          <span className="text-sm font-black text-primary">#{simulatedCurrentUser.simulated_position}</span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-foreground">Tu posición</div>
                            <div className="text-[11px] text-muted-foreground">
                              Ahora #{simulatedCurrentUser.current_position || "-"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-foreground">{simulatedCurrentUser.simulated_total} pts</div>
                            {simulatedCurrentUser.simulated_delta > 0 && (
                              <div className="text-[11px] font-bold text-emerald-400">+{simulatedCurrentUser.simulated_delta}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>}
        </Card>
      )}

      {/* Podio */}
      {topThree.length >= 3 && showFullRanking && (
        <div className="mb-6">
          <div className="flex justify-center items-end gap-2 sm:gap-4 max-w-lg mx-auto">
            <div className="flex-1 text-center">
              <Card className="border border-border/50 bg-secondary/60 backdrop-blur-sm p-3 mb-2">
                <div className="w-10 h-10 bg-muted-foreground/20 rounded-full flex items-center justify-center mx-auto mb-1">
                  <Medal className="w-5 h-5 text-[hsl(215,20%,75%)]" />
                </div>
                <h3 className="font-semibold text-xs truncate text-foreground">{topThree[1].display_name}</h3>
                {!topThree[1].is_complete && (
                  <Badge variant="outline" className="mx-auto mt-1 w-fit border-amber-400/40 bg-amber-400/10 text-[9px] text-amber-300">
                    Incompleta
                  </Badge>
                )}
                <p className="text-sm font-bold text-primary">{topThree[1].points_total} pts</p>
              </Card>
              <div className="h-12 bg-muted-foreground/20 rounded-t-lg flex items-center justify-center border border-border/30">
                <span className="text-lg font-bold text-muted-foreground">{rankingPositionsByUser.get(topThree[1].user_id) || 2}</span>
              </div>
            </div>
            <div className="flex-1 text-center">
              <Card className="border border-gold/40 bg-gold/15 backdrop-blur-sm p-3 mb-2 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                <div className="w-12 h-12 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-1">
                  <Trophy className="w-6 h-6 text-gold" />
                </div>
                <h3 className="font-bold text-xs text-gold truncate">{topThree[0].display_name}</h3>
                {!topThree[0].is_complete && (
                  <Badge variant="outline" className="mx-auto mt-1 w-fit border-amber-400/40 bg-amber-400/10 text-[9px] text-amber-300">
                    Incompleta
                  </Badge>
                )}
                <p className="text-base font-bold text-gold">{topThree[0].points_total} pts</p>
              </Card>
              <div className="h-16 bg-gold/20 rounded-t-lg flex items-center justify-center border border-gold/40 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                <span className="text-xl font-bold text-gold">{rankingPositionsByUser.get(topThree[0].user_id) || 1}</span>
              </div>
            </div>
            <div className="flex-1 text-center">
              <Card className="border border-amber-700/30 bg-amber-900/20 backdrop-blur-sm p-3 mb-2">
                <div className="w-10 h-10 bg-amber-700/20 rounded-full flex items-center justify-center mx-auto mb-1">
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="font-semibold text-xs truncate text-foreground">{topThree[2].display_name}</h3>
                {!topThree[2].is_complete && (
                  <Badge variant="outline" className="mx-auto mt-1 w-fit border-amber-400/40 bg-amber-400/10 text-[9px] text-amber-300">
                    Incompleta
                  </Badge>
                )}
                <p className="text-sm font-bold text-primary">{topThree[2].points_total} pts</p>
              </Card>
              <div className="h-10 bg-amber-700/20 rounded-t-lg flex items-center justify-center border border-amber-700/30">
                <span className="text-lg font-bold text-amber-500">{rankingPositionsByUser.get(topThree[2].user_id) || 3}</span>
              </div>
            </div>
          </div>
        </div>
      )}


      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Cargando clasificación...</div>
      ) : (
        <Card className="shadow-strong border-0 bg-gradient-card">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex min-w-0 items-center space-x-2 text-base">
                <Trophy className="h-5 w-5 shrink-0 text-gold" />
              <span>{selectedLeague ? `Liga: ${selectedLeague.name}` : "Clasificación general"}</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-semibold text-xs">Pos.</th>
                    <th className="text-left p-2 font-semibold text-xs">Participante</th>
                    <th className="text-center p-2 font-semibold text-xs">Total</th>
                    <th className="text-center p-2 font-semibold text-xs hidden sm:table-cell">Grupos</th>
                    <th className="text-center p-2 font-semibold text-xs hidden md:table-cell">1/16</th>
                    <th className="text-center p-2 font-semibold text-xs hidden md:table-cell">1/8</th>
                    <th className="text-center p-2 font-semibold text-xs hidden lg:table-cell">1/4</th>
                    <th className="text-center p-2 font-semibold text-xs hidden lg:table-cell">Semis</th>
                    <th className="text-center p-2 font-semibold text-xs hidden lg:table-cell">Final</th>
                    <th className="text-center p-2 font-semibold text-xs hidden xl:table-cell">Campeón</th>
                    <th className="p-2 sm:hidden"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRankings.map((p, index) => {
                    const posicion = rankingPositionsByUser.get(p.user_id) || index + 1;
                    const esUsuario = user && p.user_id === user.id;
                    const isExpanded = expandedRows.has(p.user_id);
                    return (
                      <React.Fragment key={p.user_id}>
                        <tr className={`border-b border-border/50 transition-all hover:bg-muted/20 ${esUsuario ? "bg-primary/5 border-primary/20" : ""}`}>
                          <td className="p-2">
                            <div className="flex items-center space-x-1">
                              {getPosicionIcon(posicion)}
                              <Badge className={`${getPosicionBadge(posicion)} font-bold text-xs px-1.5`}>#{posicion}</Badge>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="font-semibold flex min-w-0 flex-wrap items-center gap-1 text-xs sm:flex-nowrap">
                              <span className="min-w-0 break-words sm:max-w-[140px] sm:truncate">{p.display_name}</span>
                              {esUsuario && (
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] px-1">Tú</Badge>
                              )}
                              {!p.is_complete && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-amber-400/40 bg-amber-400/10 text-[10px] text-amber-300 px-1"
                                  title="Este usuario todavia no ha completado toda su porra"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  Incompleta
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-center"><div className="font-bold text-primary text-sm">{p.points_total}</div></td>
                          <td className="p-2 text-center hidden sm:table-cell"><div className="font-semibold text-xs">{p.points_groups}</div></td>
                          <td className="p-2 text-center hidden md:table-cell"><div className="font-semibold text-xs">{p.points_r32}</div></td>
                          <td className="p-2 text-center hidden md:table-cell"><div className="font-semibold text-xs">{p.points_r16}</div></td>
                          <td className="p-2 text-center hidden lg:table-cell"><div className="font-semibold text-xs">{p.points_qf}</div></td>
                          <td className="p-2 text-center hidden lg:table-cell"><div className="font-semibold text-xs">{p.points_sf}</div></td>
                          <td className="p-2 text-center hidden lg:table-cell"><div className="font-semibold text-xs">{p.points_final}</div></td>
                          <td className="p-2 text-center hidden xl:table-cell"><div className="font-semibold text-xs">{p.points_champion}</div></td>
                          <td className="p-2 sm:hidden">
                            <button onClick={() => toggleRow(p.user_id)} className="p-1 hover:bg-muted rounded">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="sm:hidden bg-muted/30 border-b border-border/30">
                            <td colSpan={4} className="p-3">
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="text-center"><div className="text-muted-foreground">Grupos</div><div className="font-semibold">{p.points_groups}</div></div>
                                <div className="text-center"><div className="text-muted-foreground">1/16</div><div className="font-semibold">{p.points_r32}</div></div>
                                <div className="text-center"><div className="text-muted-foreground">1/8</div><div className="font-semibold">{p.points_r16}</div></div>
                                <div className="text-center"><div className="text-muted-foreground">1/4</div><div className="font-semibold">{p.points_qf}</div></div>
                                <div className="text-center"><div className="text-muted-foreground">Semis</div><div className="font-semibold">{p.points_sf}</div></div>
                                <div className="text-center"><div className="text-muted-foreground">Final</div><div className="font-semibold">{p.points_final}</div></div>
                                <div className="text-center"><div className="text-muted-foreground">Campeón</div><div className="font-semibold">{p.points_champion}</div></div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
