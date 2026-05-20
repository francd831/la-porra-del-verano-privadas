import { Award, CalendarDays, Medal, Sparkles, Target, Trophy, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DemoEntry = {
  rank: number;
  name: string;
  points: number;
};

type DemoGroup = {
  eventType: string;
  eventKey: string;
  eventLabel: string;
  entries: DemoEntry[];
};

const sectionConfig = [
  {
    title: "Reyes de la general",
    description: "Los mejores acumulados de toda la porra.",
    icon: Trophy,
    types: ["overall"],
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
  },
  {
    title: "Premios",
    description: "Aciertos de Balón de Oro y Bota de Oro.",
    icon: Award,
    types: ["award"],
  },
  {
    title: "Partidos perfectos",
    description: "Top 3 de algunos partidos destacados.",
    icon: Sparkles,
    types: ["match"],
  },
];

const demoGroups: DemoGroup[] = [
  {
    eventType: "overall",
    eventKey: "total",
    eventLabel: "Mejor general",
    entries: [
      { rank: 1, name: "Laia Mundialista", points: 486 },
      { rank: 2, name: "Fran 2026", points: 472 },
      { rank: 3, name: "Capitán Pronóstico", points: 461 },
    ],
  },
  {
    eventType: "overall",
    eventKey: "groups",
    eventLabel: "Mejor fase de grupos",
    entries: [
      { rank: 1, name: "Marta Goles", points: 248 },
      { rank: 2, name: "Pablo Exacto", points: 239 },
      { rank: 3, name: "Nuria VAR", points: 231 },
    ],
  },
  {
    eventType: "overall",
    eventKey: "group_order",
    eventLabel: "Maestro de grupos",
    entries: [
      { rank: 1, name: "Sergio Tabla", points: 80 },
      { rank: 1, name: "Ana Tiebreak", points: 80 },
      { rank: 3, name: "Diego Fixture", points: 60 },
    ],
  },
  {
    eventType: "matchday",
    eventKey: "group_md_1",
    eventLabel: "Jornada 1",
    entries: [
      { rank: 1, name: "Pablo Exacto", points: 91 },
      { rank: 2, name: "Nuria VAR", points: 86 },
      { rank: 3, name: "Laia Mundialista", points: 83 },
    ],
  },
  {
    eventType: "matchday",
    eventKey: "group_md_2",
    eventLabel: "Jornada 2",
    entries: [
      { rank: 1, name: "Fran 2026", points: 88 },
      { rank: 2, name: "Marta Goles", points: 84 },
      { rank: 3, name: "Capitán Pronóstico", points: 82 },
    ],
  },
  {
    eventType: "matchday",
    eventKey: "group_md_3",
    eventLabel: "Jornada 3",
    entries: [
      { rank: 1, name: "Sergio Tabla", points: 96 },
      { rank: 2, name: "Ana Tiebreak", points: 92 },
      { rank: 3, name: "Diego Fixture", points: 89 },
    ],
  },
  {
    eventType: "group",
    eventKey: "A",
    eventLabel: "Grupo A",
    entries: [
      { rank: 1, name: "Marta Goles", points: 64 },
      { rank: 2, name: "Fran 2026", points: 58 },
      { rank: 3, name: "Nuria VAR", points: 57 },
    ],
  },
  {
    eventType: "group",
    eventKey: "B",
    eventLabel: "Grupo B",
    entries: [
      { rank: 1, name: "Laia Mundialista", points: 61 },
      { rank: 2, name: "Capitán Pronóstico", points: 59 },
      { rank: 3, name: "Sergio Tabla", points: 55 },
    ],
  },
  {
    eventType: "group",
    eventKey: "C",
    eventLabel: "Grupo C",
    entries: [
      { rank: 1, name: "Pablo Exacto", points: 67 },
      { rank: 2, name: "Ana Tiebreak", points: 62 },
      { rank: 3, name: "Diego Fixture", points: 58 },
    ],
  },
  {
    eventType: "round",
    eventKey: "r32",
    eventLabel: "Dieciseisavos",
    entries: [
      { rank: 1, name: "Capitán Pronóstico", points: 130 },
      { rank: 2, name: "Laia Mundialista", points: 120 },
      { rank: 3, name: "Fran 2026", points: 110 },
    ],
  },
  {
    eventType: "round",
    eventKey: "r16",
    eventLabel: "Octavos",
    entries: [
      { rank: 1, name: "Nuria VAR", points: 105 },
      { rank: 2, name: "Marta Goles", points: 90 },
      { rank: 3, name: "Sergio Tabla", points: 90 },
    ],
  },
  {
    eventType: "round",
    eventKey: "final",
    eventLabel: "Final",
    entries: [
      { rank: 1, name: "Fran 2026", points: 40 },
      { rank: 1, name: "Laia Mundialista", points: 40 },
      { rank: 3, name: "Pablo Exacto", points: 0 },
    ],
  },
  {
    eventType: "award",
    eventKey: "balon_oro",
    eventLabel: "Balón de Oro",
    entries: [
      { rank: 1, name: "Ana Tiebreak", points: 30 },
      { rank: 1, name: "Marta Goles", points: 30 },
      { rank: 1, name: "Diego Fixture", points: 30 },
    ],
  },
  {
    eventType: "award",
    eventKey: "bota_oro",
    eventLabel: "Bota de Oro",
    entries: [
      { rank: 1, name: "Capitán Pronóstico", points: 30 },
      { rank: 1, name: "Fran 2026", points: 30 },
      { rank: 1, name: "Nuria VAR", points: 30 },
    ],
  },
  {
    eventType: "match",
    eventKey: "match_1",
    eventLabel: "España - Brasil",
    entries: [
      { rank: 1, name: "Pablo Exacto", points: 19 },
      { rank: 2, name: "Marta Goles", points: 14 },
      { rank: 3, name: "Laia Mundialista", points: 9 },
    ],
  },
  {
    eventType: "match",
    eventKey: "match_2",
    eventLabel: "Argentina - Francia",
    entries: [
      { rank: 1, name: "Fran 2026", points: 18 },
      { rank: 2, name: "Sergio Tabla", points: 13 },
      { rank: 3, name: "Ana Tiebreak", points: 8 },
    ],
  },
  {
    eventType: "match",
    eventKey: "match_3",
    eventLabel: "Portugal - Alemania",
    entries: [
      { rank: 1, name: "Nuria VAR", points: 17 },
      { rank: 2, name: "Diego Fixture", points: 12 },
      { rank: 3, name: "Capitán Pronóstico", points: 7 },
    ],
  },
];

function EventCard({ group }: { group: DemoGroup }) {
  const winner = group.entries[0];

  return (
    <Card className="border-border/50 bg-card/70 shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-tight">{group.eventLabel}</CardTitle>
          <Badge className="shrink-0 bg-primary/15 text-primary border border-primary/25">
            {winner.points} pts
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {group.entries.map((entry) => (
          <div
            key={`${group.eventKey}-${entry.rank}-${entry.name}`}
            className="flex items-center justify-between gap-3 rounded-lg bg-muted/25 px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                #{entry.rank}
              </div>
              <span className="truncate text-sm font-medium">{entry.name}</span>
            </div>
            <span className="shrink-0 text-sm font-bold">{entry.points}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function HallOfFameDemo() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Medal className="h-4 w-4" />
            Prueba visual
          </div>
          <h1 className="text-3xl font-bold">Hall of Fame</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Datos inventados para revisar el look & feel antes de activar la sección real.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit text-sm">
          {demoGroups.length} categorías de ejemplo
        </Badge>
      </div>

      <div className="space-y-8">
        {sectionConfig.map((section) => {
          const Icon = section.icon;
          const sectionGroups = demoGroups.filter((group) => section.types.includes(group.eventType));

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
                  <EventCard key={`${group.eventType}:${group.eventKey}`} group={group} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
