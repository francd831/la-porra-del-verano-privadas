import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Copy, Crown, Medal, MessageSquare, Plus, Search, Star, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_TOURNAMENT_ID = "11111111-1111-1111-1111-111111111111";
const MAX_PRIVATE_LEAGUES = 5;

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
}

interface LeagueOption {
  id: string;
  name: string;
  comments: string | null;
  invite_code: string;
  owner_id: string;
  plan: string;
  max_members: number;
  member_count: number;
}

interface LeagueMemberPositionRow {
  league_id: string;
  user_id: string;
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
}

interface DisplayNameResult {
  user_id: string;
  display_name: string | null;
}

export default function Clasificacion() {
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [rankingsVisible, setRankingsVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [rankingPositions, setRankingPositions] = useState<Record<string, number | null>>({});
  const [selectedLeagueId, setSelectedLeagueId] = useState("global");
  const [inviteCode, setInviteCode] = useState("");
  const [joiningLeague, setJoiningLeague] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.id === selectedLeagueId) || null,
    [leagues, selectedLeagueId]
  );

  const isGlobalRanking = selectedLeagueId === "global";

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
      const globalRanking = pointsRows
        .filter((row) => !adminIds.has(row.user_id))
        .sort((a, b) => (b.points_total || 0) - (a.points_total || 0));

      const globalPosition = globalRanking.findIndex((row) => row.user_id === user.id);
      const positions: Record<string, number | null> = {
        global: globalPosition >= 0 ? globalPosition + 1 : null,
      };

      if (leagueOptions.length > 0) {
        const { data: memberRows, error: membersError } = await supabase
          .from("league_members")
          .select("league_id, user_id")
          .in("league_id", leagueOptions.map((league) => league.id));
        if (membersError) throw membersError;

        const membersByLeague = new Map<string, string[]>();
        ((memberRows || []) as LeagueMemberPositionRow[]).forEach((member) => {
          const current = membersByLeague.get(member.league_id) || [];
          current.push(member.user_id);
          membersByLeague.set(member.league_id, current);
        });

        leagueOptions.forEach((league) => {
          const leagueRanking = (membersByLeague.get(league.id) || [])
            .filter((memberId) => !adminIds.has(memberId))
            .sort((a, b) => (pointsByUser.get(b) || 0) - (pointsByUser.get(a) || 0));
          const leaguePosition = leagueRanking.findIndex((memberId) => memberId === user.id);
          positions[league.id] = leaguePosition >= 0 ? leaguePosition + 1 : null;
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
      .select("league_id")
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
      .select("id, name, comments, invite_code, owner_id, plan, max_members")
      .in("id", leagueIds)
      .order("created_at", { ascending: false });
    if (leaguesError) {
      console.error("Error loading leagues:", leaguesError);
      return;
    }
    const { data: countRows } = await supabase
      .from("league_members")
      .select("league_id, user_id")
      .in("league_id", leagueIds);
    const countsByLeague = new Map<string, number>();
    (countRows || []).forEach((row) => {
      countsByLeague.set(row.league_id, (countsByLeague.get(row.league_id) || 0) + 1);
    });
    const loadedLeagues = (leaguesData || []).map((league) => ({
      ...league,
      member_count: countsByLeague.get(league.id) || 0,
    }));
    setLeagues(loadedLeagues);
    await fetchRankingPositions(loadedLeagues);
  }, [fetchRankingPositions, user]);

  useEffect(() => {
    fetchUserLeagues();
  }, [fetchUserLeagues]);

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
    if (message.includes("League member limit reached")) {
      return "Esta liga ha alcanzado el límite de miembros.";
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

      toast({
        title: "Te has unido a la liga",
        description: "La clasificación privada ya está disponible aquí.",
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

  const copySelectedLeagueInviteCode = async () => {
    if (!selectedLeague) return;
    try {
      await navigator.clipboard.writeText(selectedLeague.invite_code);
      toast({
        title: "Código copiado",
        description: "Ya puedes compartirlo con quien quieras invitar.",
      });
    } catch {
      toast({
        title: "Código de invitación",
        description: selectedLeague.invite_code,
      });
    }
  };

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
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

      let leagueMemberIds: Set<string> | null = null;
      if (!isGlobalRanking) {
        const { data: leagueMembers, error } = await supabase
          .from("league_members")
          .select("user_id")
          .eq("league_id", selectedLeagueId);
        if (error) throw error;
        leagueMemberIds = new Set((leagueMembers || []).map((m) => m.user_id));
      }

      let submissionsQuery = supabase
        .from("user_submissions")
        .select(`
          user_id, points_total, points_groups, points_group_order, points_playoffs,
          points_awards, points_r32, points_r16, points_qf, points_sf, points_final, points_champion
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
          };
        })
        .sort((a, b) => b.points_total - a.points_total);

      setRankings(rankingsData);
    } catch (e) {
      console.error("Error fetching rankings:", e);
      setRankings([]);
    } finally {
      setLoading(false);
    }
  }, [isGlobalRanking, selectedLeagueId]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const toggleRow = (userId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
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
  const userPosition = user ? rankings.findIndex((r) => r.user_id === user.id) + 1 : 0;
  const currentUserPoints = user ? rankings.find((r) => r.user_id === user.id)?.points_total || 0 : 0;
  const showFullRanking = true;
  const rankingTitle = selectedLeague ? selectedLeague.name : "General";
  const selectedLeagueIsOwner = !!selectedLeague && selectedLeague.owner_id === user?.id;
  const getSelectorPosition = (scopeId: string) => {
    const position = rankingPositions[scopeId];
    return position ? `#${position}` : "-";
  };
  const getSelectorPositionClass = (active: boolean) =>
    active
      ? "text-primary-foreground"
      : "text-muted-foreground";

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-24">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-glow">
            {selectedLeague ? <Users className="w-5 h-5 text-primary-foreground" /> : <Trophy className="w-5 h-5 text-primary-foreground" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold">Clasificación</h1>
            <p className="text-sm text-muted-foreground">
              {selectedLeague ? `Liga privada: ${rankingTitle}` : "Clasificación general"}
              {userPosition > 0 && ` · tu posición #${userPosition}`}
            </p>
          </div>
        </div>
        {user && (
          <Badge className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
            {currentUserPoints} pts
          </Badge>
        )}
      </div>

      {/* Selector de ranking: General + ligas privadas */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedLeagueId("global")}
          className={`min-h-[68px] min-w-[124px] px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 border ${
            isGlobalRanking
              ? "bg-primary text-primary-foreground border-primary shadow-neon"
              : "bg-secondary/60 text-foreground border-border/50 hover:bg-muted/50"
          }`}
        >
          <Trophy className="w-4 h-4 shrink-0" />
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <span className="truncate">General</span>
            {user && (
              <span className={`mt-1 text-2xl font-black leading-none ${getSelectorPositionClass(isGlobalRanking)}`}>
                {getSelectorPosition("global")}
              </span>
            )}
          </span>
        </button>
        {leagues.map((league) => (
          <button
            key={league.id}
            onClick={() => setSelectedLeagueId(league.id)}
            className={`min-h-[68px] min-w-[124px] max-w-[180px] px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 border ${
              selectedLeagueId === league.id
                ? "bg-primary text-primary-foreground border-primary shadow-neon"
                : "bg-secondary/60 text-foreground border-border/50 hover:bg-muted/50"
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="max-w-full truncate">{league.name}</span>
              {user && (
                <span className={`mt-1 text-2xl font-black leading-none ${getSelectorPositionClass(selectedLeagueId === league.id)}`}>
                  {getSelectorPosition(league.id)}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {user && (
        <Card className="mb-6 border border-border/50 bg-card/60 backdrop-blur-xl shadow-soft">
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm">Ligas privadas</div>
                <div className="text-xs text-muted-foreground">
                  Crea una liga o únete con código. Puedes pertenecer a {MAX_PRIVATE_LEAGUES} ligas como máximo.
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 gap-2 rounded-xl font-bold">
                <Link to="/ligas/crear">
                  <Plus className="h-4 w-4" />
                  Crear liga
                </Link>
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  placeholder="Código"
                  className="h-11 min-w-[150px] uppercase bg-muted/30 font-mono tracking-wider"
                  disabled={joiningLeague || leagues.length >= MAX_PRIVATE_LEAGUES}
                />
                <Button
                  variant="outline"
                  className="h-11 gap-2 rounded-xl"
                  onClick={handleJoinLeague}
                  disabled={joiningLeague || !inviteCode.trim() || leagues.length >= MAX_PRIVATE_LEAGUES}
                >
                  <Search className="h-4 w-4" />
                  {joiningLeague ? "Uniendo..." : "Unirse"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedLeague && (
        <Card className="mb-6 border border-border/50 bg-card/60 backdrop-blur-xl shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {selectedLeagueIsOwner ? (
                <Crown className="h-5 w-5 text-gold" />
              ) : (
                <MessageSquare className="h-5 w-5 text-primary" />
              )}
              <span>{selectedLeague.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedLeagueIsOwner ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Miembros</div>
                    <div className="text-xl font-black text-primary">
                      {selectedLeague.member_count}/{selectedLeague.max_members}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Plan</div>
                    <div className="text-xl font-black uppercase text-primary">{selectedLeague.plan}</div>
                  </div>
                  <button
                    type="button"
                    onClick={copySelectedLeagueInviteCode}
                    className="rounded-xl border border-border/50 bg-muted/20 p-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Copy className="h-3 w-3" />
                      Código
                    </div>
                    <div className="font-mono text-xl font-black tracking-widest text-primary">
                      {selectedLeague.invite_code}
                    </div>
                  </button>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Comentarios de la liga
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {selectedLeague.comments || "Todavía no hay comentarios para esta liga."}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild className="rounded-xl font-bold">
                    <Link to={`/ligas/${selectedLeague.id}`}>
                      Gestionar liga
                    </Link>
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={copySelectedLeagueInviteCode}>
                    Copiar código
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
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
                <p className="text-sm font-bold text-primary">{topThree[1].points_total} pts</p>
              </Card>
              <div className="h-12 bg-muted-foreground/20 rounded-t-lg flex items-center justify-center border border-border/30">
                <span className="text-lg font-bold text-muted-foreground">2</span>
              </div>
            </div>
            <div className="flex-1 text-center">
              <Card className="border border-gold/40 bg-gold/15 backdrop-blur-sm p-3 mb-2 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                <div className="w-12 h-12 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-1">
                  <Trophy className="w-6 h-6 text-gold" />
                </div>
                <h3 className="font-bold text-xs text-gold truncate">{topThree[0].display_name}</h3>
                <p className="text-base font-bold text-gold">{topThree[0].points_total} pts</p>
              </Card>
              <div className="h-16 bg-gold/20 rounded-t-lg flex items-center justify-center border border-gold/40 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                <span className="text-xl font-bold text-gold">1</span>
              </div>
            </div>
            <div className="flex-1 text-center">
              <Card className="border border-amber-700/30 bg-amber-900/20 backdrop-blur-sm p-3 mb-2">
                <div className="w-10 h-10 bg-amber-700/20 rounded-full flex items-center justify-center mx-auto mb-1">
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="font-semibold text-xs truncate text-foreground">{topThree[2].display_name}</h3>
                <p className="text-sm font-bold text-primary">{topThree[2].points_total} pts</p>
              </Card>
              <div className="h-10 bg-amber-700/20 rounded-t-lg flex items-center justify-center border border-amber-700/30">
                <span className="text-lg font-bold text-amber-500">3</span>
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
            <CardTitle className="flex items-center space-x-2 text-base">
              <Trophy className="w-5 h-5 text-gold" />
              <span>{selectedLeague ? `Liga: ${selectedLeague.name}` : "Clasificación general"}</span>
            </CardTitle>
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
                    const realIndex = rankings.findIndex((r) => r.user_id === p.user_id);
                    const posicion = showFullRanking ? index + 1 : realIndex + 1;
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
                            <div className="font-semibold flex items-center space-x-1 text-xs">
                              <span className="truncate max-w-[100px] sm:max-w-[140px]">{p.display_name}</span>
                              {esUsuario && (
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] px-1">Tú</Badge>
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
