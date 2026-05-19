import { useEffect, useMemo, useState } from "react";
import { Award, CalendarDays, Medal, Sparkles, Target, Trophy, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

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
  email: string | null;
};

type EventGroup = {
  eventType: string;
  eventKey: string;
  eventLabel: string;
  entries: ScoreEvent[];
};

const sectionConfig = [
  {
    title: "Reyes de la general",
    description: "Los mejores acumulados de toda la porra.",
    icon: Trophy,
    types: ["overall"],
    keys: ["total", "groups", "playoffs", "awards", "group_order"],
  },
  {
    title: "Jornadas",
    description: "Los mejores pronosticadores de cada jornada de grupos.",
    icon: CalendarDays,
    types: ["matchday"],
  },
  {
    title: "Grupos",
    description: "Especialistas por grupo, incluyendo bonus de orden exacto.",
    icon: Users,
    types: ["group"],
  },
  {
    title: "Eliminatorias",
    description: "Quienes más puntos suman en cada ronda.",
    icon: Target,
    types: ["round"],
    keys: ["r32", "r16", "qf", "sf", "final", "champion"],
  },
  {
    title: "Premios",
    description: "Aciertos de Balón de Oro y Bota de Oro.",
    icon: Award,
    types: ["award"],
  },
  {
    title: "Partidos perfectos",
    description: "Top 3 de cada partido ya puntuado.",
    icon: Sparkles,
    types: ["match"],
    limit: 12,
  },
];

function groupKey(event: ScoreEvent) {
  return `${event.event_type}:${event.event_key}`;
}

function getDisplayName(event: ScoreEvent, profiles: Map<string, Profile>) {
  const profile = profiles.get(event.user_id);
  return profile?.display_name || profile?.email || "Participante";
}

function sortGroups(groups: EventGroup[], keys?: string[]) {
  if (!keys) {
    return [...groups].sort((a, b) => a.eventLabel.localeCompare(b.eventLabel, "es"));
  }

  return [...groups].sort((a, b) => keys.indexOf(a.eventKey) - keys.indexOf(b.eventKey));
}

function EventCard({
  group,
  profiles,
}: {
  group: EventGroup;
  profiles: Map<string, Profile>;
}) {
  const winner = group.entries[0];
  const topEntries = group.entries.slice(0, 3);

  return (
    <Card className="border-border/50 bg-card/70 shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-tight">{group.eventLabel}</CardTitle>
          {winner && (
            <Badge className="shrink-0 bg-primary/15 text-primary border border-primary/25">
              {winner.points} pts
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {topEntries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-muted/25 px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                #{entry.rank || "-"}
              </div>
              <span className="truncate text-sm font-medium">{getDisplayName(entry, profiles)}</span>
            </div>
            <span className="shrink-0 text-sm font-bold">{entry.points}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function HallOfFame() {
  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHallOfFame = async () => {
      setLoading(true);
      try {
        const { data: eventsData, error: eventsError } = await supabase
          .from("user_score_events")
          .select("id, user_id, event_type, event_key, event_label, points, rank, metadata")
          .eq("tournament_id", TOURNAMENT_ID)
          .lte("rank", 3)
          .order("event_type", { ascending: true })
          .order("event_key", { ascending: true })
          .order("rank", { ascending: true })
          .order("points", { ascending: false });

        if (eventsError) throw eventsError;

        const nextEvents = (eventsData || []) as ScoreEvent[];
        setEvents(nextEvents);

        const userIds = Array.from(new Set(nextEvents.map((event) => event.user_id)));
        if (userIds.length === 0) {
          setProfiles(new Map());
          return;
        }

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, display_name, email")
          .in("user_id", userIds);

        if (profilesError) throw profilesError;

        setProfiles(new Map((profilesData || []).map((profile) => [profile.user_id, profile as Profile])));
      } catch (error) {
        console.error("Error loading Hall of Fame:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHallOfFame();
  }, []);

  const groupedEvents = useMemo(() => {
    const grouped = new Map<string, EventGroup>();

    for (const event of events) {
      const key = groupKey(event);
      const current = grouped.get(key);
      if (current) {
        current.entries.push(event);
      } else {
        grouped.set(key, {
          eventType: event.event_type,
          eventKey: event.event_key,
          eventLabel: event.event_label,
          entries: [event],
        });
      }
    }

    for (const group of grouped.values()) {
      group.entries.sort((a, b) => (a.rank || 999) - (b.rank || 999) || b.points - a.points);
    }

    return Array.from(grouped.values());
  }, [events]);

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
        {events.length > 0 && (
          <Badge variant="secondary" className="w-fit text-sm">
            {groupedEvents.length} categorías activas
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-border/50 bg-card/60 p-10 text-center text-muted-foreground">
          Cargando Hall of Fame...
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/60 p-10 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <h2 className="text-lg font-semibold">Aún no hay méritos calculados</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Aparecerán cuando se guarden resultados y se recalculen las puntuaciones.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sectionConfig.map((section) => {
            const Icon = section.icon;
            const sectionGroups = sortGroups(
              groupedEvents.filter((group) => section.types.includes(group.eventType)),
              section.keys
            ).slice(0, section.limit);

            if (sectionGroups.length === 0) return null;

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
                  {sectionGroups.map((group) => (
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
