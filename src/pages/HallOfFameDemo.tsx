import { Award, CalendarDays, Medal, Shield, Sparkles, Target, Trophy, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DemoEntry = {
  rank: number;
  name: string;
  value: number;
};

type DemoGroup = {
  eventType: string;
  eventKey: string;
  eventLabel: string;
  metricLabel?: string;
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
    title: "Reyes de los resultados",
    description: "Quienes más signos y resultados exactos han acertado.",
    icon: Sparkles,
    types: ["results"],
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
    title: "Premios Individuales",
    description: "Suma conjunta de Balón de Oro y Bota de Oro.",
    icon: Award,
    types: ["award"],
  },
];

const names = [
  "Laia Mundialista",
  "Fran 2026",
  "Capitán Pronóstico",
  "Marta Goles",
  "Pablo Exacto",
  "Nuria VAR",
  "Sergio Tabla",
  "Ana Tiebreak",
  "Diego Fixture",
];

function podium(a: number, b: number, c: number, offset = 0): DemoEntry[] {
  return [
    { rank: 1, name: names[offset % names.length], value: a },
    { rank: 2, name: names[(offset + 1) % names.length], value: b },
    { rank: 3, name: names[(offset + 2) % names.length], value: c },
  ];
}

const groupLetters = Array.from({ length: 12 }, (_, index) => String.fromCharCode(65 + index));

const demoGroups: DemoGroup[] = [
  {
    eventType: "overall",
    eventKey: "total",
    eventLabel: "Mejor general",
    entries: podium(486, 472, 461, 0),
  },
  {
    eventType: "overall",
    eventKey: "groups",
    eventLabel: "Mejor fase de grupos",
    entries: podium(248, 239, 231, 3),
  },
  {
    eventType: "overall",
    eventKey: "playoffs_master",
    eventLabel: "Maestro de eliminatorias",
    entries: podium(218, 206, 198, 6),
  },
  {
    eventType: "matchday",
    eventKey: "group_md_1",
    eventLabel: "Jornada 1",
    entries: podium(91, 86, 83, 4),
  },
  {
    eventType: "matchday",
    eventKey: "group_md_2",
    eventLabel: "Jornada 2",
    entries: podium(88, 84, 82, 1),
  },
  {
    eventType: "matchday",
    eventKey: "group_md_3",
    eventLabel: "Jornada 3",
    entries: podium(96, 92, 89, 6),
  },
  ...groupLetters.map((letter, index) => ({
    eventType: "group",
    eventKey: letter,
    eventLabel: `Grupo ${letter}`,
    entries: podium(67 - (index % 5), 62 - (index % 4), 58 - (index % 3), index + 2),
  })),
  {
    eventType: "round",
    eventKey: "r32",
    eventLabel: "Dieciseisavos",
    entries: podium(130, 120, 110, 2),
  },
  {
    eventType: "round",
    eventKey: "r16",
    eventLabel: "Octavos",
    entries: podium(105, 90, 90, 5),
  },
  {
    eventType: "round",
    eventKey: "qf",
    eventLabel: "Cuartos",
    entries: podium(80, 75, 70, 7),
  },
  {
    eventType: "round",
    eventKey: "sf",
    eventLabel: "Semifinales",
    entries: podium(60, 45, 45, 1),
  },
  {
    eventType: "round",
    eventKey: "final",
    eventLabel: "Final",
    entries: podium(40, 40, 0, 0),
  },
  {
    eventType: "round",
    eventKey: "champion",
    eventLabel: "Campeón",
    entries: podium(50, 50, 0, 3),
  },
  {
    eventType: "award",
    eventKey: "individual_awards",
    eventLabel: "Premios Individuales",
    entries: podium(60, 30, 30, 7),
  },
  {
    eventType: "results",
    eventKey: "signs_total",
    eventLabel: "Más signos acertados",
    metricLabel: "aciertos",
    entries: podium(42, 39, 37, 4),
  },
  {
    eventType: "results",
    eventKey: "exact_scores_total",
    eventLabel: "Más resultados exactos",
    metricLabel: "exactos",
    entries: podium(16, 14, 13, 1),
  },
];

function formatMetric(group: DemoGroup, value: number) {
  return group.metricLabel ? `${value} ${group.metricLabel}` : `${value} pts`;
}

function EventCard({ group }: { group: DemoGroup }) {
  const winner = group.entries[0];
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
          <Badge className="shrink-0 bg-primary/15 text-primary border border-primary/25">
            {formatMetric(group, winner.value)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {group.entries.map((entry, index) => {
          const isWinner = index === 0;

          return (
            <div
              key={`${group.eventKey}-${entry.rank}-${entry.name}`}
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
                    {entry.rank}
                  </span>
                </div>
                <span className={`truncate text-sm ${isWinner ? "font-bold" : "font-medium"}`}>
                  {entry.name}
                </span>
              </div>
              <span className={`shrink-0 text-sm ${isWinner ? "font-black text-gold" : "font-bold"}`}>
                {formatMetric(group, entry.value)}
              </span>
            </div>
          );
        })}
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
