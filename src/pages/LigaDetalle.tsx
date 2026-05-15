import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Crown, Shield, Trophy, Users, Medal, Share2, MessageSquare, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface League {
  id: string;
  name: string;
  comments: string | null;
  invite_code: string;
  owner_id: string;
  plan: string;
  max_members: number;
  created_at: string;
  tournament_id: string;
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
  const [commentsDraft, setCommentsDraft] = useState("");
  const [savingComments, setSavingComments] = useState(false);
  const currentMember = useMemo(() => {
    return members.find((member) => member.user_id === user?.id);
  }, [members, user]);

  const isOwner = league?.owner_id === user?.id;
  const canEditLeague = isOwner || currentMember?.role === "admin";

  const fetchLeague = useCallback(async () => {
    if (!leagueId) return;
    setLoading(true);
    try {
      const { data: leagueData, error: leagueError } = await supabase
        .from("leagues")
        .select("id, name, comments, invite_code, owner_id, plan, max_members, created_at, tournament_id")
        .eq("id", leagueId)
        .single();

      if (leagueError) throw leagueError;
      setLeague(leagueData);
      setCommentsDraft(leagueData.comments || "");

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
        title: "¡Código copiado! 📋",
        description: "Compártelo con tu grupo.",
      });
    } catch {
      toast({
        title: "Código de invitación",
        description: league.invite_code,
      });
    }
  };

  const saveComments = async () => {
    if (!league || !canEditLeague || savingComments) return;

    setSavingComments(true);
    try {
      const trimmedComments = commentsDraft.trim();
      const { data, error } = await supabase
        .from("leagues")
        .update({ comments: trimmedComments || null })
        .eq("id", league.id)
        .select("comments")
        .single();

      if (error) throw error;

      setLeague((current) => current ? { ...current, comments: data.comments } : current);
      setCommentsDraft(data.comments || "");
      toast({
        title: "Comentarios guardados",
        description: "La información de la liga se ha actualizado.",
      });
    } catch (error) {
      console.error("Error saving league comments:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los comentarios.",
      });
    } finally {
      setSavingComments(false);
    }
  };



  const roleLabel = (role: string) => {
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    return "Miembro";
  };

  const getMedalColor = (index: number) => {
    if (index === 0) return "text-gold";
    if (index === 1) return "text-muted-foreground";
    if (index === 2) return "text-orange-400";
    return "";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando liga...</p>
        </div>
      </div>
    );
  }

  if (!league) return null;

  

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl pb-24">
      <Button variant="ghost" className="mb-4 gap-2 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => navigate("/ligas")}>
        <ArrowLeft className="h-4 w-4" />
        Mis ligas
      </Button>

      {/* League header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-glow">
              <Trophy className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">{league.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {members.length} miembros
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={copyInviteCode}
              className="gap-2 rounded-xl border-border/50 hover:border-primary/50"
            >
              <Copy className="h-4 w-4" />
              <span className="font-mono font-bold tracking-wider">{league.invite_code}</span>
            </Button>
            <Button asChild className="rounded-xl font-bold">
              <Link to="/mi-porra">Mi porra</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Rankings table */}
        <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-strong overflow-hidden">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-gold" />
              Clasificación
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rankings.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">
                  Aún no hay pronósticos guardados.
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Los puntos aparecerán cuando los miembros completen su porra.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/10">
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">#</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Participante</th>
                      <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pts</th>
                      <th className="hidden px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:table-cell">Grupos</th>
                      <th className="hidden px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground md:table-cell">Elim.</th>
                      <th className="hidden px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground md:table-cell">Bonus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((ranking, index) => {
                      const isCurrentUser = ranking.user_id === user?.id;
                      const isTopThree = index < 3;
                      return (
                        <tr
                          key={ranking.user_id}
                          className={`border-b border-border/20 transition-colors ${
                            isCurrentUser
                              ? "bg-primary/8 hover:bg-primary/12"
                              : "hover:bg-muted/10"
                          }`}
                        >
                          <td className="px-4 py-3">
                            {isTopThree ? (
                              <span className={`font-bold text-lg ${getMedalColor(index)}`}>
                                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                              </span>
                            ) : (
                              <span className="font-semibold text-muted-foreground text-sm">{index + 1}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm ${isCurrentUser ? "text-primary" : ""}`}>
                                {ranking.display_name}
                              </span>
                              {isCurrentUser && (
                                <Badge variant="outline" className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                                  Tú
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-primary">{ranking.points_total}</span>
                          </td>
                          <td className="hidden px-4 py-3 text-center text-sm text-muted-foreground sm:table-cell">{ranking.points_groups}</td>
                          <td className="hidden px-4 py-3 text-center text-sm text-muted-foreground md:table-cell">{ranking.points_playoffs}</td>
                          <td className="hidden px-4 py-3 text-center text-sm text-muted-foreground md:table-cell">{ranking.points_awards}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Members */}
          <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-soft overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" />
                Comentarios
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {canEditLeague ? (
                <>
                  <Textarea
                    value={commentsDraft}
                    onChange={(event) => setCommentsDraft(event.target.value)}
                    placeholder="Añade notas, normas o información útil para esta liga..."
                    maxLength={1000}
                    className="min-h-28 resize-none bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="w-full gap-2 rounded-xl"
                    onClick={saveComments}
                    disabled={savingComments}
                  >
                    <Save className="h-4 w-4" />
                    {savingComments ? "Guardando..." : "Guardar comentarios"}
                  </Button>
                </>
              ) : league.comments ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {league.comments}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Esta liga todavía no tiene comentarios.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-soft overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Miembros
                </span>
                <span className="text-xs text-muted-foreground font-normal">{members.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1.5 max-h-[320px] overflow-y-auto">
              {members.map((member) => {
                const isMe = member.user_id === user?.id;
                return (
                  <div
                    key={member.user_id}
                    className={`flex items-center justify-between gap-2 rounded-lg p-2.5 transition-colors ${
                      isMe ? "bg-primary/8" : "bg-muted/20 hover:bg-muted/30"
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        member.role === "owner"
                          ? "bg-gold/20 text-gold"
                          : member.role === "admin"
                          ? "bg-primary/20 text-primary"
                          : "bg-muted/40 text-muted-foreground"
                      }`}>
                        {member.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className={`truncate text-sm font-medium ${isMe ? "text-primary" : ""}`}>
                          {member.display_name}
                          {isMe && <span className="text-xs text-primary/60 ml-1">(tú)</span>}
                        </div>
                      </div>
                    </div>
                    {member.role !== "member" && (
                      <Badge variant={member.role === "owner" ? "default" : "secondary"} className="shrink-0 gap-1 text-[10px]">
                        {member.role === "owner" ? <Crown className="h-2.5 w-2.5" /> : <Shield className="h-2.5 w-2.5" />}
                        {roleLabel(member.role)}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Invite CTA */}
          <Card className="border border-primary/20 bg-primary/5 backdrop-blur-xl shadow-soft overflow-hidden">
            <CardContent className="p-4 text-center space-y-3">
              <Share2 className="h-6 w-6 text-primary mx-auto" />
              <div>
                <p className="font-semibold text-sm mb-1">Invita a más gente</p>
                <p className="text-xs text-muted-foreground">Comparte el código con tu grupo</p>
              </div>
              <Button
                variant="outline"
                onClick={copyInviteCode}
                className="w-full gap-2 rounded-xl border-primary/30 hover:bg-primary/10 font-mono font-bold tracking-wider"
              >
                <Copy className="h-4 w-4" />
                {league.invite_code}
              </Button>
            </CardContent>
          </Card>

          {/* Info card */}
          <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-soft overflow-hidden">
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Tu rol</span>
                <span className="font-semibold text-xs">{roleLabel(currentMember?.role || "member")}</span>
              </div>
              <p className="text-[11px] text-muted-foreground/60 pt-1 border-t border-border/20">
                Tus pronósticos son únicos y cuentan en todas las ligas donde participes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
