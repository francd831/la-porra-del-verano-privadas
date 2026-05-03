import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, CreditCard, Crown, Shield, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getLeaguePlan, LEAGUE_PLANS, type LeaguePlanId } from "@/lib/leaguePlans";

interface League {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  plan: string;
  max_members: number;
  created_at: string;
}

interface Member {
  user_id: string;
  role: string;
  joined_at: string;
  display_name: string;
}

interface RankingRow {
  user_id: string;
  display_name: string;
  points_total: number;
  points_groups: number;
  points_playoffs: number;
  points_awards: number;
}

interface DisplayNameResult {
  user_id: string;
  display_name: string | null;
}

interface SubmissionRow {
  user_id: string;
  points_total: number | null;
  points_groups: number | null;
  points_playoffs: number | null;
  points_awards: number | null;
}

export default function LigaDetalle() {
  const { leagueId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  const currentMember = useMemo(() => {
    return members.find((member) => member.user_id === user?.id);
  }, [members, user]);

  const currentPlan = useMemo(() => getLeaguePlan(league?.plan), [league]);
  const isOwner = league?.owner_id === user?.id;
  const isLeagueFull = members.length >= (league?.max_members || currentPlan.maxMembers);
  const shouldShowUpgrade = league?.plan === "free" && isLeagueFull;

  const fetchLeague = useCallback(async () => {
    if (!leagueId) return;
    setLoading(true);
    try {
      const { data: leagueData, error: leagueError } = await supabase
        .from("leagues")
        .select("id, name, invite_code, owner_id, plan, max_members, created_at")
        .eq("id", leagueId)
        .single();

      if (leagueError) throw leagueError;
      setLeague(leagueData);

      const { data: memberData, error: memberError } = await supabase
        .from("league_members")
        .select("user_id, role, joined_at")
        .eq("league_id", leagueId)
        .order("joined_at", { ascending: true });

      if (memberError) throw memberError;

      const memberRows = memberData || [];
      const userIds = memberRows.map((member) => member.user_id);
      const { data: profilesData } = userIds.length
        ? await supabase.rpc("get_user_display_names", { p_user_ids: userIds })
        : { data: [] };

      const profileMap = new Map(((profilesData || []) as DisplayNameResult[]).map((profile) => [
        profile.user_id,
        profile.display_name || "Usuario",
      ]));

      const formattedMembers = memberRows.map((member) => ({
        ...member,
        display_name: profileMap.get(member.user_id) || "Usuario",
      }));
      setMembers(formattedMembers);

      const { data: submissionsData, error: submissionsError } = userIds.length
        ? await supabase
            .from("user_submissions")
            .select("user_id, points_total, points_groups, points_playoffs, points_awards")
            .eq("tournament_id", leagueData.tournament_id)
            .in("user_id", userIds)
            .order("points_total", { ascending: false })
        : { data: [], error: null };

      if (submissionsError) throw submissionsError;

      const submissionsMap = new Map(
        ((submissionsData || []) as SubmissionRow[]).map((submission) => [submission.user_id, submission])
      );

      setRankings(formattedMembers
        .map((member) => {
          const submission = submissionsMap.get(member.user_id);
          return {
            user_id: member.user_id,
            display_name: member.display_name,
            points_total: submission?.points_total || 0,
            points_groups: submission?.points_groups || 0,
            points_playoffs: submission?.points_playoffs || 0,
            points_awards: submission?.points_awards || 0,
          };
        })
        .sort((a, b) => b.points_total - a.points_total));
    } catch (error) {
      console.error("Error loading league:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la liga.",
      });
      navigate("/ligas");
    } finally {
      setLoading(false);
    }
  }, [leagueId, navigate, toast]);

  useEffect(() => {
    if (leagueId && user) {
      fetchLeague();
    }
  }, [leagueId, user, fetchLeague]);

  const copyInviteCode = async () => {
    if (!league) return;
    try {
      await navigator.clipboard.writeText(league.invite_code);
      toast({
        title: "Codigo copiado",
        description: "Ya puedes compartirlo con tu grupo.",
      });
    } catch {
      toast({
        title: "Codigo de invitacion",
        description: league.invite_code,
      });
    }
  };

  const handlePlanChange = async (plan: LeaguePlanId) => {
    if (!league || !isOwner || updatingPlan) return;

    setUpdatingPlan(true);
    try {
      const { data, error } = await supabase.rpc("update_league_plan_for_testing", {
        p_league_id: league.id,
        p_plan: plan,
      });

      if (error) throw error;
      setLeague(data);
      toast({
        title: "Plan actualizado",
        description: "Cambio manual aplicado para testing. Stripe queda pendiente.",
      });
    } catch (error) {
      console.error("Error updating league plan:", error);
      toast({
        variant: "destructive",
        title: "No se pudo cambiar el plan",
        description: "Solo el owner puede cambiar el plan manualmente.",
      });
    } finally {
      setUpdatingPlan(false);
    }
  };

  const roleLabel = (role: string) => {
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    return "Miembro";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="py-12 text-center text-muted-foreground">Cargando liga...</div>
      </div>
    );
  }

  if (!league) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/ligas")}>
        <ArrowLeft className="h-4 w-4" />
        Mis ligas
      </Button>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{league.name}</h1>
            <p className="text-sm text-muted-foreground">
              {members.length}/{league.max_members} miembros - plan {currentPlan.name}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={copyInviteCode} className="gap-2">
            <Copy className="h-4 w-4" />
            {league.invite_code}
          </Button>
          <Button asChild>
            <Link to="/mi-porra">Editar mi porra</Link>
          </Button>
        </div>
      </div>

      {shouldShowUpgrade && (
        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <CreditCard className="h-4 w-4" />
          <AlertTitle>Liga free completa</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Esta liga ya tiene {members.length} de {league.max_members} miembros. Para aceptar nuevas incorporaciones,
              cambia a Pro o superior. Los cobros reales no estan activos todavia.
            </p>
            {isOwner && (
              <Button className="gap-2" onClick={() => handlePlanChange("pro")} disabled={updatingPlan}>
                <CreditCard className="h-4 w-4" />
                {updatingPlan ? "Actualizando..." : "Subir a Pro para testing"}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="border-0 bg-gradient-card shadow-strong">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gold" />
              Clasificacion de la liga
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rankings.length === 0 ? (
              <div className="px-6 py-10 text-center text-muted-foreground">
                Todavia no hay pronosticos guardados por los miembros de esta liga.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-left text-xs font-semibold">Pos.</th>
                      <th className="p-3 text-left text-xs font-semibold">Participante</th>
                      <th className="p-3 text-center text-xs font-semibold">Total</th>
                      <th className="hidden p-3 text-center text-xs font-semibold sm:table-cell">Grupos</th>
                      <th className="hidden p-3 text-center text-xs font-semibold md:table-cell">Final</th>
                      <th className="hidden p-3 text-center text-xs font-semibold md:table-cell">Premios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((ranking, index) => {
                      const isCurrentUser = ranking.user_id === user?.id;
                      return (
                        <tr
                          key={ranking.user_id}
                          className={`border-b border-border/50 hover:bg-muted/20 ${
                            isCurrentUser ? "bg-primary/5" : ""
                          }`}
                        >
                          <td className="p-3 font-bold">#{index + 1}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{ranking.display_name}</span>
                              {isCurrentUser && (
                                <Badge variant="outline" className="bg-primary/10 text-primary">
                                  Tu
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center font-bold text-primary">{ranking.points_total}</td>
                          <td className="hidden p-3 text-center sm:table-cell">{ranking.points_groups}</td>
                          <td className="hidden p-3 text-center md:table-cell">{ranking.points_playoffs}</td>
                          <td className="hidden p-3 text-center md:table-cell">{ranking.points_awards}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-0 bg-gradient-card shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-primary" />
                Miembros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{member.display_name}</div>
                    <div className="text-xs text-muted-foreground">{member.user_id === user?.id ? "Tu cuenta" : "Participante"}</div>
                  </div>
                  <Badge variant={member.role === "member" ? "secondary" : "default"} className="shrink-0 gap-1">
                    {member.role === "owner" ? <Crown className="h-3 w-3" /> : member.role === "admin" ? <Shield className="h-3 w-3" /> : null}
                    {roleLabel(member.role)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {isOwner && (
            <Card className="border-0 bg-gradient-card shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Planes de liga
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {LEAGUE_PLANS.map((plan) => {
                    const isActive = plan.id === league.plan;
                    return (
                      <div
                        key={plan.id}
                        className={`rounded-lg border p-3 ${
                          isActive ? "border-primary bg-primary/5" : "border-border bg-muted/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold">{plan.name}</div>
                            <div className="text-xs text-muted-foreground">Hasta {plan.maxMembers} miembros</div>
                          </div>
                          {isActive && <Badge>Actual</Badge>}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{plan.description}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Cambio manual para testing</div>
                  <Select
                    value={league.plan}
                    onValueChange={(value) => handlePlanChange(value as LeaguePlanId)}
                    disabled={updatingPlan}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAGUE_PLANS.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {plan.maxMembers} miembros
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Preparado para conectar Stripe despues: por ahora no se crea ningun cobro ni checkout.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 bg-gradient-card shadow-soft">
            <CardContent className="space-y-3 p-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tu rol</span>
                <span className="font-semibold">{roleLabel(currentMember?.role || "member")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Codigo</span>
                <span className="font-mono font-semibold">{league.invite_code}</span>
              </div>
              <p className="text-muted-foreground">
                Tus predicciones son unicas por usuario y cuentan en todas las ligas donde participes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
