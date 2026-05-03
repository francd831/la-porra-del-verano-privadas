import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Gift, Medal, Star, Trophy, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const DEFAULT_TOURNAMENT_ID = "11111111-1111-1111-1111-111111111111";

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
  prize_payment_completed: boolean;
}

interface LeagueOption {
  id: string;
  name: string;
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
  prize_payment_completed: boolean | null;
}

interface DisplayNameResult {
  user_id: string;
  display_name: string | null;
}

export default function Clasificacion() {
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrizeOnly, setShowPrizeOnly] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [rankingsVisible, setRankingsVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState("global");
  const { user } = useAuth();

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

  useEffect(() => {
    const fetchUserLeagues = async () => {
      if (!user) {
        setLeagues([]);
        setSelectedLeagueId("global");
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

      const leagueIds = (memberData || []).map((member) => member.league_id);
      if (leagueIds.length === 0) {
        setLeagues([]);
        setSelectedLeagueId("global");
        return;
      }

      const { data: leaguesData, error: leaguesError } = await supabase
        .from("leagues")
        .select("id, name")
        .in("id", leagueIds)
        .order("created_at", { ascending: false });

      if (leaguesError) {
        console.error("Error loading leagues:", leaguesError);
        return;
      }

      const options = leaguesData || [];
      setLeagues(options);
      setSelectedLeagueId((current) => {
        if (current !== "global" && options.some((league) => league.id === current)) {
          return current;
        }
        return options[0]?.id || "global";
      });
    };

    fetchUserLeagues();
  }, [user]);

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
      const adminIds = new Set((adminRoles || []).map((role) => role.user_id));

      let leagueMemberIds: Set<string> | null = null;
      if (!isGlobalRanking) {
        const { data: leagueMembers, error: leagueMembersError } = await supabase
          .from("league_members")
          .select("user_id")
          .eq("league_id", selectedLeagueId);

        if (leagueMembersError) throw leagueMembersError;
        leagueMemberIds = new Set((leagueMembers || []).map((member) => member.user_id));
      }

      let submissionsQuery = supabase
        .from("user_submissions")
        .select(`
          user_id,
          points_total,
          points_groups,
          points_group_order,
          points_playoffs,
          points_awards,
          points_r32,
          points_r16,
          points_qf,
          points_sf,
          points_final,
          points_champion,
          prize_payment_completed
        `)
        .eq("tournament_id", DEFAULT_TOURNAMENT_ID)
        .order("points_total", { ascending: false });

      if (leagueMemberIds && leagueMemberIds.size > 0) {
        submissionsQuery = submissionsQuery.in("user_id", Array.from(leagueMemberIds));
      }

      const { data: submissionsData, error } = await submissionsQuery;
      if (error) throw error;

      const scopedSubmissions = ((submissionsData || []) as SubmissionRow[]).filter((item) => {
        if (adminIds.has(item.user_id)) return false;
        if (leagueMemberIds && !leagueMemberIds.has(item.user_id)) return false;
        return true;
      });

      const scopedUserIds = leagueMemberIds
        ? Array.from(leagueMemberIds).filter((userId) => !adminIds.has(userId))
        : scopedSubmissions.map((item) => item.user_id);

      const userIds = scopedUserIds;
      const { data: profilesData } = await supabase.rpc("get_user_display_names", {
        p_user_ids: userIds,
      });

      const profilesMap = new Map(
        ((profilesData || []) as DisplayNameResult[]).map((profile) => [
          profile.user_id,
          profile.display_name || "Usuario",
        ])
      );

      const submissionsMap = new Map(scopedSubmissions.map((item) => [item.user_id, item]));

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
            prize_payment_completed: item?.prize_payment_completed || false,
          };
        })
        .sort((a, b) => b.points_total - a.points_total);

      setRankings(rankingsData);
    } catch (error) {
      console.error("Error fetching rankings:", error);
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
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const getPosicionIcon = (posicion: number, size: "sm" | "md" = "sm") => {
    const iconSize = size === "sm" ? "w-4 h-4" : "w-6 h-6";
    switch (posicion) {
      case 1:
        return <Trophy className={`${iconSize} text-gold`} />;
      case 2:
        return <Medal className={`${iconSize} text-muted-foreground`} />;
      case 3:
        return <Star className={`${iconSize} text-amber-600`} />;
      default:
        return <span className={`${iconSize} flex items-center justify-center text-sm font-bold`}>{posicion}</span>;
    }
  };

  const getPosicionBadge = (posicion: number) => {
    if (posicion === 1) return "bg-gold/20 text-gold border border-gold/30";
    if (posicion === 2) return "bg-muted-foreground/15 text-muted-foreground border border-border/50";
    if (posicion === 3) return "bg-amber-700/20 text-amber-500 border border-amber-700/30";
    return "bg-muted/50 text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center">Cargando clasificacion...</div>
      </div>
    );
  }

  const visibleRankings = isGlobalRanking && !rankingsVisible && !isAdmin && user
    ? rankings.filter((ranking) => ranking.user_id === user.id)
    : rankings;

  const filteredRankings = showPrizeOnly
    ? visibleRankings.filter((ranking) => ranking.prize_payment_completed)
    : visibleRankings;

  const topThree = filteredRankings.slice(0, 3);
  const userPosition = user ? rankings.findIndex((ranking) => ranking.user_id === user.id) + 1 : 0;
  const showFullRanking = !isGlobalRanking || rankingsVisible || isAdmin;
  const rankingTitle = selectedLeague ? selectedLeague.name : "Global";

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-glow">
              {selectedLeague ? (
                <Users className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Trophy className="w-5 h-5 text-primary-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">Clasificacion</h1>
              <p className="text-sm text-muted-foreground">
                {selectedLeague ? `Liga privada: ${rankingTitle}` : "Clasificacion global"}
                {userPosition > 0 && ` - tu posicion #${userPosition}`}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {leagues.length > 1 && (
              <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Selecciona liga" />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map((league) => (
                    <SelectItem key={league.id} value={league.id}>
                      {league.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center gap-1 bg-secondary/80 backdrop-blur-sm rounded-xl p-1 border border-border/50">
              <button
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                  !showPrizeOnly
                    ? "bg-primary text-primary-foreground shadow-neon"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                onClick={() => setShowPrizeOnly(false)}
              >
                General
              </button>
              <button
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                  showPrizeOnly
                    ? "bg-gold text-gold-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                onClick={() => setShowPrizeOnly(true)}
              >
                <Gift className="w-3.5 h-3.5" />
                Premios
              </button>
            </div>
          </div>
        </div>
      </div>

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

      {isGlobalRanking && !rankingsVisible && !isAdmin && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-xl text-sm text-muted-foreground text-center">
          La clasificacion global completa aun no esta disponible. Solo puedes ver tu posicion global.
        </div>
      )}

      <Card className="shadow-strong border-0 bg-gradient-card">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center space-x-2 text-base">
            <Trophy className="w-5 h-5 text-gold" />
            <span>{selectedLeague ? `Liga: ${selectedLeague.name}` : "Clasificacion global"}</span>
            {showPrizeOnly && <Badge className="ml-2 bg-gold text-gold-foreground text-xs">Premios</Badge>}
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
                  <th className="text-center p-2 font-semibold text-xs hidden xl:table-cell">Campeon</th>
                  <th className="text-center p-2 font-semibold text-xs hidden xl:table-cell">Premios</th>
                  <th className="p-2 sm:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRankings.map((participante, index) => {
                  const realIndex = rankings.findIndex((ranking) => ranking.user_id === participante.user_id);
                  const posicion = showFullRanking ? index + 1 : realIndex + 1;
                  const esUsuarioActual = user && participante.user_id === user.id;
                  const isExpanded = expandedRows.has(participante.user_id);

                  return (
                    <React.Fragment key={participante.user_id}>
                      <tr
                        className={`border-b border-border/50 transition-all hover:bg-muted/20 ${esUsuarioActual ? "bg-primary/5 border-primary/20" : ""}`}
                      >
                        <td className="p-2">
                          <div className="flex items-center space-x-1">
                            {getPosicionIcon(posicion)}
                            <Badge className={`${getPosicionBadge(posicion)} font-bold text-xs px-1.5`}>
                              #{posicion}
                            </Badge>
                          </div>
                        </td>

                        <td className="p-2">
                          <div className="font-semibold flex items-center space-x-1 text-xs">
                            {participante.prize_payment_completed && (
                              <span title="Acceso a premios">
                                <Gift className="w-3 h-3 text-gold flex-shrink-0" />
                              </span>
                            )}
                            <span className="truncate max-w-[80px] sm:max-w-[120px]">{participante.display_name}</span>
                            {esUsuarioActual && (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] px-1">
                                Tu
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="p-2 text-center">
                          <div className="font-bold text-primary text-sm">{participante.points_total}</div>
                        </td>
                        <td className="p-2 text-center hidden sm:table-cell">
                          <div className="font-semibold text-xs">{participante.points_groups}</div>
                        </td>
                        <td className="p-2 text-center hidden md:table-cell">
                          <div className="font-semibold text-xs">{participante.points_r32}</div>
                        </td>
                        <td className="p-2 text-center hidden md:table-cell">
                          <div className="font-semibold text-xs">{participante.points_r16}</div>
                        </td>
                        <td className="p-2 text-center hidden lg:table-cell">
                          <div className="font-semibold text-xs">{participante.points_qf}</div>
                        </td>
                        <td className="p-2 text-center hidden lg:table-cell">
                          <div className="font-semibold text-xs">{participante.points_sf}</div>
                        </td>
                        <td className="p-2 text-center hidden lg:table-cell">
                          <div className="font-semibold text-xs">{participante.points_final}</div>
                        </td>
                        <td className="p-2 text-center hidden xl:table-cell">
                          <div className="font-semibold text-xs">{participante.points_champion}</div>
                        </td>
                        <td className="p-2 text-center hidden xl:table-cell">
                          <div className="font-semibold text-xs">{participante.points_awards}</div>
                        </td>

                        <td className="p-2 sm:hidden">
                          <button
                            onClick={() => toggleRow(participante.user_id)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="sm:hidden bg-muted/30 border-b border-border/30">
                          <td colSpan={4} className="p-3">
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="text-center">
                                <div className="text-muted-foreground">Grupos</div>
                                <div className="font-semibold">{participante.points_groups}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-muted-foreground">1/16</div>
                                <div className="font-semibold">{participante.points_r32}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-muted-foreground">1/8</div>
                                <div className="font-semibold">{participante.points_r16}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-muted-foreground">1/4</div>
                                <div className="font-semibold">{participante.points_qf}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-muted-foreground">Semis</div>
                                <div className="font-semibold">{participante.points_sf}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-muted-foreground">Final</div>
                                <div className="font-semibold">{participante.points_final}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-muted-foreground">Campeon</div>
                                <div className="font-semibold">{participante.points_champion}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-muted-foreground">Premios Ind.</div>
                                <div className="font-semibold">{participante.points_awards}</div>
                              </div>
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
    </div>
  );
}
