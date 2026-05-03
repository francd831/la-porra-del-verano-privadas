import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    return error instanceof Error ? error.message : "Comprueba el codigo de invitacion.";
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
        title: "Liga encontrada",
        description: "Te has unido correctamente.",
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mis ligas</h1>
            <p className="text-sm text-muted-foreground">Ligas privadas donde compites con tus pronosticos.</p>
          </div>
        </div>
        <Button asChild className="gap-2">
          <Link to="/ligas/crear">
            <Plus className="h-4 w-4" />
            Crear liga
          </Link>
        </Button>
      </div>

      <Card className="mb-6 border-0 bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-5 w-5 text-primary" />
            Unirse con codigo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="Codigo de invitacion"
              className="uppercase"
            />
            <Button onClick={handleJoinLeague} disabled={joining || !inviteCode.trim()}>
              {joining ? "Uniendo..." : "Unirse"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Cargando ligas...</div>
      ) : leagues.length === 0 ? (
        <Card className="border-0 bg-gradient-card shadow-soft">
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-lg font-semibold">Aun no perteneces a ninguna liga</h2>
            <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
              Crea una liga privada o usa un codigo de invitacion para competir con tu grupo.
            </p>
            <Button asChild>
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
              <Link key={league.id} to={`/ligas/${league.id}`} className="block">
                <Card className="h-full border-0 bg-gradient-card shadow-soft transition-all hover:shadow-strong">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg">{league.name}</CardTitle>
                      <Badge variant="secondary" className="shrink-0 uppercase">
                        {league.plan}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Miembros</span>
                      <span className="font-semibold">{stats.memberCount}/{league.max_members}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tu posicion</span>
                      <span className="font-semibold">
                        {stats.userPosition ? `#${stats.userPosition}` : "Sin porra"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tus puntos</span>
                      <span className="font-semibold text-primary">{stats.userPoints} pts</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Codigo</span>
                      <span className="font-mono font-semibold">{league.invite_code}</span>
                    </div>
                    {role && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4" />
                        <span>{role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Miembro"}</span>
                      </div>
                    )}
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
