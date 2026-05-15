import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Shield, Users, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface League {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  plan: string;
  max_members: number;
  created_at: string;
}

interface MemberRow {
  league_id: string;
  role: string;
}

interface LeagueStats {
  memberCount: number;
  userPosition: number | null;
  userPoints: number;
}

interface SubmissionRow {
  user_id: string;
  points_total: number | null;
}

export default function MisLigas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [memberships, setMemberships] = useState<MemberRow[]>([]);
  const [leagueStats, setLeagueStats] = useState<Record<string, LeagueStats>>({});
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const roleByLeague = useMemo(() => {
    return new Map(memberships.map((membership) => [membership.league_id, membership.role]));
  }, [memberships]);

  const getErrorMessage = (error: unknown) => {
    if (!(error instanceof Error)) return "Comprueba el código de invitación.";
    if (error.message.includes("League member limit reached")) {
      return "Esta liga ha alcanzado el límite de su plan. El owner debe ampliarla para aceptar más miembros.";
    }
    return error.message;
  };

  const fetchLeagues = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from("league_members")
        .select("league_id, role")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      const rows = memberData || [];
      setMemberships(rows);

      const leagueIds = rows.map((row) => row.league_id);
      if (leagueIds.length === 0) {
        setLeagues([]);
        setLeagueStats({});
        return;
      }

      const { data: leaguesData, error: leaguesError } = await supabase
        .from("leagues")
        .select("id, name, invite_code, owner_id, plan, max_members, created_at")
        .in("id", leagueIds)
        .order("created_at", { ascending: false });

      if (leaguesError) throw leaguesError;
      setLeagues(leaguesData || []);

      const { data: countsData } = await supabase
        .from("league_members")
        .select("league_id, user_id")
        .in("league_id", leagueIds);

      const membersByLeague = new Map<string, string[]>();
      const allMemberIds = new Set<string>();
      (countsData || []).forEach((row) => {
        const ids = membersByLeague.get(row.league_id) || [];
        ids.push(row.user_id);
        membersByLeague.set(row.league_id, ids);
        allMemberIds.add(row.user_id);
      });

      const { data: submissionsData } = allMemberIds.size
        ? await supabase
            .from("user_submissions")
            .select("user_id, points_total")
            .eq("tournament_id", "11111111-1111-1111-1111-111111111111")
            .in("user_id", Array.from(allMemberIds))
        : { data: [] };

      const submissionsMap = new Map(
        ((submissionsData || []) as SubmissionRow[]).map((submission) => [
          submission.user_id,
          submission.points_total || 0,
        ])
      );

      const stats: Record<string, LeagueStats> = {};
      leagueIds.forEach((leagueId) => {
        const memberIds = membersByLeague.get(leagueId) || [];
        const rankedMembers = [...memberIds].sort((a, b) => {
          return (submissionsMap.get(b) || 0) - (submissionsMap.get(a) || 0);
        });
        const position = rankedMembers.findIndex((memberId) => memberId === user.id);
        stats[leagueId] = {
          memberCount: memberIds.length,
          userPosition: position >= 0 ? position + 1 : null,
          userPoints: submissionsMap.get(user.id) || 0,
        };
      });
      setLeagueStats(stats);
    } catch (error) {
      console.error("Error loading leagues:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar tus ligas.",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchLeagues();
    }
  }, [user, fetchLeagues]);

  const handleJoinLeague = async () => {
    const normalizedCode = inviteCode.trim().toUpperCase();
    if (!normalizedCode) return;

    setJoining(true);
    try {
      const { data: leagueId, error } = await supabase.rpc("join_league_by_invite_code", {
        p_invite_code: normalizedCode,
      });

      if (error) throw error;

      toast({
        title: "¡Te has unido! 🎉",
        description: "Ya formas parte de la liga.",
      });
      setInviteCode("");
      navigate(`/ligas/${leagueId}`);
    } catch (error: unknown) {
      console.error("Error joining league:", error);
      toast({
        variant: "destructive",
        title: "No se pudo unir",
        description: getErrorMessage(error),
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl pb-24">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-glow">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Mis ligas</h1>
            <p className="text-sm text-muted-foreground">Compite con tu grupo en rankings privados</p>
          </div>
        </div>
        <Button asChild className="gap-2 rounded-xl h-11 px-6 font-bold bg-gradient-to-r from-primary to-primary/80 shadow-glow hover:shadow-strong transition-all duration-300">
          <Link to="/ligas/crear">
            <Plus className="h-4 w-4" />
            Crear liga
          </Link>
        </Button>
      </div>

      {/* Join with code */}
      <Card className="mb-8 border border-border/50 bg-card/60 backdrop-blur-xl shadow-soft overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">¿Tienes un código de invitación?</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="Ej. ABC123"
              className="uppercase h-11 bg-muted/30 border-border/50 font-mono text-base tracking-wider"
            />
            <Button
              onClick={handleJoinLeague}
              disabled={joining || !inviteCode.trim()}
              className="h-11 px-6 rounded-xl font-bold shrink-0"
            >
              {joining ? "Uniendo..." : "Unirse"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando tus ligas...</p>
        </div>
      ) : leagues.length === 0 ? (
        <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-soft">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/30 border border-border/50">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Aún no tienes ligas</h2>
            <p className="mx-auto mb-8 max-w-sm text-sm text-muted-foreground leading-relaxed">
              Crea una liga privada para competir con tus amigos o usa un código de invitación para unirte a una existente.
            </p>
            <Button asChild className="rounded-xl h-11 px-8 font-bold bg-gradient-to-r from-primary to-primary/80 shadow-glow">
              <Link to="/ligas/crear">Crear primera liga</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {leagues.map((league) => {
            const role = roleByLeague.get(league.id);
            const stats = leagueStats[league.id] || {
              memberCount: 0,
              userPosition: null,
              userPoints: 0,
            };

            return (
              <Link key={league.id} to={`/ligas/${league.id}`} className="block group">
                <Card className="h-full border border-border/50 bg-card/60 backdrop-blur-xl shadow-soft transition-all duration-300 group-hover:shadow-strong group-hover:border-primary/30 group-hover:scale-[1.01]">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                          <Trophy className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-lg truncate">{league.name}</CardTitle>
                          {role && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              {role === "owner" ? <Shield className="h-3 w-3" /> : null}
                              {role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Miembro"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {stats.memberCount}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 rounded-lg bg-muted/20 p-2.5 text-center">
                        <div className="text-xs text-muted-foreground mb-0.5">Posición</div>
                        <div className="font-bold text-sm">
                          {stats.userPosition ? (
                            <span className="text-gold">#{stats.userPosition}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 rounded-lg bg-muted/20 p-2.5 text-center">
                        <div className="text-xs text-muted-foreground mb-0.5">Puntos</div>
                        <div className="font-bold text-sm text-primary">{stats.userPoints}</div>
                      </div>
                      <div className="flex-1 rounded-lg bg-muted/20 p-2.5 text-center">
                        <div className="text-xs text-muted-foreground mb-0.5">Código</div>
                        <div className="font-bold text-xs font-mono">{league.invite_code}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
