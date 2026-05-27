import { useEffect, useMemo, useState } from "react";
import { Award, CalendarDays, Medal, Shield, Sparkles, Target, Trophy, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TOURNAMENT_ID = "11111111-1111-1111-1111-111111111111";

type ScoreEvent = {
  id: string;
  user_id: string;
  event_type: string;
  event_key: string;
  event_label: string;
  points: number;
  rank: number | null;
  metadata: Record<string, unknown>;
};

type Profile = {
  user_id: string;
  display_name: string | null;
};

type ExpectedGroup = {
  eventType: string;
  eventKey: string;
  eventLabel: string;
  metricLabel?: string;
};

type EventGroup = ExpectedGroup & {
  entries: ScoreEvent[];
  currentUserEntry?: ScoreEvent;
};

const groupLetters = Array.from({ length: 12 }, (_, index) => String.fromCharCode(65 + index));

const sectionConfig = [
  {
    title: "Reyes de la general",
    description: "Los mejores acumulados de toda la porra.",
    icon: Trophy,
    groups: [
      { eventType: "overall", eventKey: "total", eventLabel: "Mejor general" },
      { eventType: "overall", eventKey: "groups", eventLabel: "Mejor fase de grupos" },
      { eventType: "overall", eventKey: "playoffs", eventLabel: "Mejor fase de eliminatorias" },
    ],
  },
  {
    title: "Reyes de los resultados",
    description: "Quienes más signos y resultados exactos han acertado.",
    icon: Sparkles,
    groups: [
      { eventType: "results", eventKey: "signs_total", eventLabel: "Más signos acertados", metricLabel: "aciertos" },
      { eventType: "results", eventKey: "exact_scores_total", eventLabel: "Más resultados exactos", metricLabel: "exactos" },
    ],
  },
  {
    title: "Jornadas",
    description: "Los mejores pronosticadores de cada jornada de grupos.",
    icon: CalendarDays,
    groups: [
      { eventType: "matchday", eventKey: "group_md_1", eventLabel: "Jornada 1" },
      { eventType: "matchday", eventKey: "group_md_2", eventLabel: "Jornada 2" },
      { eventType: "matchday", eventKey: "group_md_3", eventLabel: "Jornada 3" },
    ],
  },
  {
    title: "Grupos",
    description: "Especialistas por grupo, incluyendo bonus de orden exacto.",
    icon: Users,
    groups: groupLetters.map((letter) => ({
      eventType: "group",
      eventKey: letter,
      eventLabel: `Grupo ${letter}`,
    })),
  },
  {
    title: "Eliminatorias",
    description: "Quienes más puntos suman en cada ronda.",
    icon: Target,
    groups: [
      { eventType: "round", eventKey: "r32", eventLabel: "Dieciseisavos" },
      { eventType: "round", eventKey: "r16", eventLabel: "Octavos" },
      { eventType: "round", eventKey: "qf", eventLabel: "Cuartos" },
      { eventType: "round", eventKey: "sf", eventLabel: "Semifinales" },
      { eventType: "round", eventKey: "final", eventLabel: "Final" },
      { eventType: "round", eventKey: "champion", eventLabel: "Campeón" },
    ],
  },
  {
    title: "Premios Individuales",
    description: "Suma conjunta de Balón de Oro y Bota de Oro.",
    icon: Award,
    groups: [
      { eventType: "overall", eventKey: "awards", eventLabel: "Premios Individuales" },
    ],
  },
];

function groupKey(eventType: string, eventKey: string) {
  return `${eventType}:${eventKey}`;
}

function getDisplayName(event: ScoreEvent, profiles: Map<string, Profile>) {
  const profile = profiles.get(event.user_id);
  return profile?.display_name || "Usuario";
}

function formatMetric(group: EventGroup, value: number) {
  return group.metricLabel ? `${value} ${group.metricLabel}` : `${value} pts`;
}

function EventCard({
  group,
  profiles,
}: {
  group: EventGroup;
  profiles: Map<string, Profile>;
}) {
  const winner = group.entries[0];
  const hasData = group.entries.length > 0 && group.entries.some((entry) => entry.points > 0);
  const topEntries = group.entries.slice(0, 3);
  const currentUserEntry = group.currentUserEntry;
  const shieldClasses = [
    "fill-gold text-gold drop-shadow-[0_0_8px_hsl(var(--gold)/0.35)]",
    "fill-slate-300 text-slate-300",
    "fill-amber-700 text-amber-700",
  ];

  return (
    <Card className="border-border/50 bg-card/70 shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-tight">{group.eventLabel}</CardTitle>
          {hasData && winner && (
            <Badge className="shrink-0 bg-primary/15 text-primary border border-primary/25">
              {formatMetric(group, winner.points)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!hasData ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
            Aún no hay datos suficientes para mostrar una clasificación.
          </div>
        ) : (
          topEntries.map((entry, index) => {
            const isWinner = index === 0;

            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors ${
                  isWinner
                    ? "border border-gold/40 bg-gold/20 shadow-[0_0_22px_hsl(var(--gold)/0.12)]"
                    : "bg-muted/25"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                    <Shield className={`h-7 w-7 ${shieldClasses[index] || "fill-primary/20 text-primary"}`} />
                    <span className={`absolute text-[10px] font-black ${index === 0 ? "text-gold-foreground" : "text-background"}`}>
                      {entry.rank || index + 1}
                    </span>
                  </div>
                  <span className={`truncate text-sm ${isWinner ? "font-bold" : "font-medium"}`}>
                    {getDisplayName(entry, profiles)}
                  </span>
                </div>
                <span className={`shrink-0 text-sm ${isWinner ? "font-black text-gold" : "font-bold"}`}>
                  {formatMetric(group, entry.points)}
                </span>
              </div>
            );
          })
        )}
        {hasData && (
          <div className="mt-3 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2">
            {currentUserEntry ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase text-primary">Tu posición</div>
                  <div className="truncate text-sm font-semibold">
                    #{currentUserEntry.rank || "-"} · {getDisplayName(currentUserEntry, profiles)}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-black text-primary">
                  {formatMetric(group, currentUserEntry.points)}
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Tu posición aparecerá cuando tengas puntos en esta clasificación.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDayOption(eventKey: string) {
  const date = new Date(`${eventKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return eventKey;
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

function DayKingSection({
  dayGroups,
  selectedDay,
  onSelectedDayChange,
  profiles,
}: {
  dayGroups: EventGroup[];
  selectedDay: string;
  onSelectedDayChange: (day: string) => void;
  profiles: Map<string, Profile>;
}) {
  const selectedGroup = dayGroups.find((group) => group.eventKey === selectedDay) || dayGroups[0];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Rey del día</h2>
            <p className="text-sm text-muted-foreground">
              Cuenta todos los partidos jugados en la fecha seleccionada (hora española).
            </p>
          </div>
        </div>
        <Select value={selectedGroup?.eventKey || ""} onValueChange={onSelectedDayChange} disabled={dayGroups.length === 0}>
          <SelectTrigger className="w-full bg-card/70 md:w-56">
            <SelectValue placeholder="Selecciona un día" />
          </SelectTrigger>
          <SelectContent>
            {dayGroups.map((group) => (
              <SelectItem key={group.eventKey} value={group.eventKey}>
                {formatDayOption(group.eventKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGroup ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <EventCard group={selectedGroup} profiles={profiles} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/70 bg-card/60 p-6 text-sm text-muted-foreground">
          Aún no hay días con partidos puntuables.
        </div>
      )}
    </section>
  );
}

export default function HallOfFame() {
  const { user } = useAuth();
  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState("");

  useEffect(() => {
    const loadHallOfFame = async () => {
      setLoading(true);
      try {
        const { data: topEventsData, error: topEventsError } = await supabase
          .from("user_score_events")
          .select("id, user_id, event_type, event_key, event_label, points, rank, metadata")
          .eq("tournament_id", TOURNAMENT_ID)
          .lte("rank", 3)
          .order("event_type", { ascending: true })
          .order("event_key", { ascending: true })
          .order("rank", { ascending: true })
          .order("points", { ascending: false });

        if (topEventsError) throw topEventsError;

        const { data: userEventsData, error: userEventsError } = user
          ? await supabase
              .from("user_score_events")
              .select("id, user_id, event_type, event_key, event_label, points, rank, metadata")
              .eq("tournament_id", TOURNAMENT_ID)
              .eq("user_id", user.id)
          : { data: [], error: null };

        if (userEventsError) throw userEventsError;

        const eventsById = new Map<string, ScoreEvent>();
        [...((topEventsData || []) as ScoreEvent[]), ...((userEventsData || []) as ScoreEvent[])].forEach((event) => {
          eventsById.set(event.id, event);
        });

        const nextEvents = Array.from(eventsById.values());
        setEvents(nextEvents);

        const userIds = Array.from(new Set(nextEvents.map((event) => event.user_id)));
        if (userIds.length === 0) {
          setProfiles(new Map());
          return;
        }

        const { data: profilesData, error: profilesError } = await supabase.rpc("get_user_display_names", {
          p_user_ids: userIds,
        });

        if (profilesError) throw profilesError;

        setProfiles(new Map((profilesData || []).map((profile) => [profile.user_id, profile as Profile])));
      } catch (error) {
        console.error("Error loading Hall of Fame:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHallOfFame();
  }, [user]);

  const groupedEvents = useMemo(() => {
    const grouped = new Map<string, ScoreEvent[]>();

    for (const event of events) {
      const key = groupKey(event.event_type, event.event_key);
      const current = grouped.get(key) || [];
      current.push(event);
      grouped.set(key, current);
    }

    for (const group of grouped.values()) {
      group.sort((a, b) => (a.rank || 999) - (b.rank || 999) || b.points - a.points);
    }

    return grouped;
  }, [events]);

  const sectionGroups = useMemo(() => {
    return sectionConfig.map((section) => ({
      ...section,
      groups: section.groups.map((expected) => ({
        ...expected,
        entries: groupedEvents.get(groupKey(expected.eventType, expected.eventKey)) || [],
        currentUserEntry: user
          ? (groupedEvents.get(groupKey(expected.eventType, expected.eventKey)) || []).find(
              (entry) => entry.user_id === user.id
            )
          : undefined,
      })),
    }));
  }, [groupedEvents, user]);

  const dayGroups = useMemo(() => {
    return Array.from(groupedEvents.entries())
      .filter(([key]) => key.startsWith("day:"))
      .map(([key, entries]) => {
        const eventKey = key.replace("day:", "");
        return {
          eventType: "day",
          eventKey,
          eventLabel: entries[0]?.event_label || `Rey del día · ${formatDayOption(eventKey)}`,
          entries,
          currentUserEntry: user ? entries.find((entry) => entry.user_id === user.id) : undefined,
        } as EventGroup;
      })
      .sort((a, b) => a.eventKey.localeCompare(b.eventKey));
  }, [groupedEvents, user]);

  useEffect(() => {
    if (dayGroups.length === 0) return;
    if (selectedDay && dayGroups.some((group) => group.eventKey === selectedDay)) return;
    setSelectedDay(dayGroups[dayGroups.length - 1].eventKey);
  }, [dayGroups, selectedDay]);

  const activeDayCount = dayGroups.some((group) => group.entries.some((entry) => entry.points > 0)) ? 1 : 0;
  const activeGroupCount = sectionGroups.reduce(
    (count, section) => count + section.groups.filter((group) => group.entries.some((entry) => entry.points > 0)).length,
    0
  ) + activeDayCount;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Medal className="h-4 w-4" />
            Hall of Fame
          </div>
          <h1 className="text-3xl font-bold">Los mejores pronosticadores</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Ganadores por jornadas, grupos, rondas, premios y grandes hitos de la porra.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit text-sm">
          {activeGroupCount} categorías activas
        </Badge>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border/50 bg-card/60 p-10 text-center text-muted-foreground">
          Cargando Hall of Fame...
        </div>
      ) : (
        <div className="space-y-8">
          <DayKingSection
            dayGroups={dayGroups}
            selectedDay={selectedDay}
            onSelectedDayChange={setSelectedDay}
            profiles={profiles}
          />
          {sectionGroups.map((section) => {
            const Icon = section.icon;

            return (
              <section key={section.title} className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{section.title}</h2>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {section.groups.map((group) => (
                    <EventCard key={`${group.eventType}:${group.eventKey}`} group={group} profiles={profiles} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
