import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Copy, ExternalLink, Search, ShieldCheck, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type LeagueRow = {
  id: string;
  name: string;
  comments: string | null;
  invite_code: string;
  logo_url: string | null;
  owner_id: string;
  requires_approval: boolean;
  created_at: string;
};

type MemberRow = {
  league_id: string;
  user_id: string;
  status: string;
};

type DisplayNameResult = {
  user_id: string;
  display_name: string | null;
};

type LeagueSummary = LeagueRow & {
  owner_name: string;
  approved_count: number;
  pending_count: number;
  total_count: number;
};

export default function AdminLigas() {
  const { toast } = useToast();
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadLeagues = async () => {
      setLoading(true);
      try {
        const { data: leaguesData, error: leaguesError } = await supabase
          .from("leagues")
          .select("id, name, comments, invite_code, logo_url, owner_id, requires_approval, created_at")
          .order("created_at", { ascending: false });

        if (leaguesError) throw leaguesError;

        const rows = (leaguesData || []) as LeagueRow[];
        const leagueIds = rows.map((league) => league.id);
        const { data: membersData, error: membersError } = leagueIds.length
          ? await supabase
              .from("league_members")
              .select("league_id, user_id, status")
              .in("league_id", leagueIds)
          : { data: [], error: null };

        if (membersError) throw membersError;

        const typedMembers = (membersData || []) as MemberRow[];
        const ownerIds = Array.from(new Set(rows.map((league) => league.owner_id)));

        const { data: profilesData } = ownerIds.length
          ? await supabase.rpc("get_user_display_names", { p_user_ids: ownerIds })
          : { data: [] };

        const profileMap = new Map(
          ((profilesData || []) as DisplayNameResult[]).map((profile) => [
            profile.user_id,
            profile.display_name || "Usuario",
          ])
        );

        const countsByLeague = new Map<string, { approved: number; pending: number; total: number }>();
        typedMembers.forEach((member) => {
          const current = countsByLeague.get(member.league_id) || { approved: 0, pending: 0, total: 0 };
          current.total += 1;
          if (member.status === "pending") {
            current.pending += 1;
          } else {
            current.approved += 1;
          }
          countsByLeague.set(member.league_id, current);
        });

        setLeagues(rows.map((league) => {
          const counts = countsByLeague.get(league.id) || { approved: 0, pending: 0, total: 0 };
          return {
            ...league,
            owner_name: profileMap.get(league.owner_id) || "Usuario",
            approved_count: counts.approved,
            pending_count: counts.pending,
            total_count: counts.total,
          };
        }));
      } catch (error) {
        console.error("Error loading admin leagues:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las ligas.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadLeagues();
  }, [toast]);

  const filteredLeagues = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return leagues;

    return leagues.filter((league) => {
      return [
        league.name,
        league.owner_name,
        league.invite_code,
        league.comments || "",
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [leagues, search]);

  const copyInviteCode = async (inviteCode: string) => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      toast({
        title: "Código copiado",
        description: inviteCode,
      });
    } catch {
      toast({
        title: "Código de invitación",
        description: inviteCode,
      });
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 pb-24">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-glow">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold md:text-3xl">Ligas privadas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vista de administración de todas las ligas creadas.
          </p>
        </div>
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar liga, owner o código"
            className="h-11 bg-muted/30 pl-9"
          />
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Ligas creadas</div>
            <div className="mt-1 text-2xl font-black">{leagues.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Miembros aprobados</div>
            <div className="mt-1 text-2xl font-black">
              {leagues.reduce((total, league) => total + league.approved_count, 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Pendientes</div>
            <div className="mt-1 text-2xl font-black text-gold">
              {leagues.reduce((total, league) => total + league.pending_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/50 bg-card/60 shadow-strong">
        <CardHeader className="border-b border-border/30">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Todas las ligas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Cargando ligas...</div>
          ) : filteredLeagues.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No hay ligas que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/10">
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Liga</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Owner</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Miembros</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Acceso</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Código</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeagues.map((league) => (
                    <tr key={league.id} className="border-b border-border/20 hover:bg-muted/10">
                      <td className="max-w-[260px] px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          {league.logo_url && (
                            <img
                              src={league.logo_url}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded-lg border border-border/40 bg-white object-contain p-1"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{league.name}</div>
                            {league.comments && (
                              <div className="mt-0.5 truncate text-xs text-muted-foreground">{league.comments}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{league.owner_name}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            {league.approved_count}
                          </Badge>
                          {league.pending_count > 0 && (
                            <Badge className="gap-1 bg-gold/15 text-gold border border-gold/25">
                              <Clock className="h-3 w-3" />
                              {league.pending_count}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={league.requires_approval ? "outline" : "secondary"}>
                          {league.requires_approval ? "Aprobación" : "Directo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-2 px-2 font-mono font-bold"
                          onClick={() => copyInviteCode(league.invite_code)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {league.invite_code}
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" className="h-8 gap-2 rounded-lg">
                          <Link to={`/ligas/${league.id}`}>
                            Ver
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
