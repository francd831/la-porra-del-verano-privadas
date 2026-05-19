import { Link, Navigate } from "react-router-dom";
import { Target, Trophy, BarChart3, Users, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

const porraSteps = [
  {
    icon: Target,
    title: "Haz tus pronósticos",
    description: "Predice los resultados de los 104 partidos del Mundial 2026.",
  },
  {
    icon: BarChart3,
    title: "Suma puntos",
    description: "Acierta signo, goles exactos y posiciones de grupo para sumar más.",
  },
  {
    icon: Trophy,
    title: "Sube en la clasificación",
    description: "Compite en la clasificación general y mira tu posición en tiempo real.",
  },
];

const leagueSteps = [
  {
    icon: Users,
    title: "Crea tu liga",
    description: "Configura una liga privada en segundos y elige un nombre.",
  },
  {
    icon: Send,
    title: "Invita a tu gente",
    description: "Comparte el código con amigos, familia o compañeros.",
  },
  {
    icon: Trophy,
    title: "Ranking exclusivo",
    description: "Tendréis vuestra clasificación privada además de la general.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section - Foco en la porra */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />

        <div className="relative z-10 container mx-auto max-w-4xl text-center px-4 py-20">
          <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 text-sm px-4 py-1.5">
            ⚽ Mundial 2026 · USA, México y Canadá
          </Badge>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight font-heading">
            <span className="block text-white">Haz tu porra del</span>
            <span className="block text-gold mt-2">Mundial 2026</span>
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-10 max-w-2xl mx-auto font-light">
            Demuestra lo que sabes y sé el mejor de tus amigos
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-gold hover:bg-gold/90 text-black font-bold text-lg px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              asChild
            >
              <Link to="/registro">Empezar mi porra</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Cómo funciona la porra */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold font-heading mb-3">Tu porra del Mundial</h2>
            <p className="text-muted-foreground text-lg">Así funciona en 3 pasos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {porraSteps.map((step, i) => (
              <Card key={i} className="shadow-soft border-0 bg-gradient-card hover:shadow-lg hover:scale-[1.02] transition-all duration-300 text-center">
                <CardContent className="pt-8 pb-6 px-5">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-primary/20">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-xs font-bold text-primary/60 mb-2 uppercase tracking-wider">Paso {i + 1}</div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 font-bold rounded-full px-8"
              asChild
            >
              <Link to="/registro">Empezar gratis</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Ligas privadas - sección secundaria */}
      <section id="ligas" className="py-20 px-4 bg-muted/10">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-gold/20 text-gold border-gold/30 text-xs px-3 py-1">
              Opcional · Para jugar con los tuyos
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold font-heading mb-3">
              ¿Quieres jugar con tus amigos?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Crea una liga privada e invita a tu grupo. Tendréis vuestra propia clasificación,
              además de la general.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {leagueSteps.map((step, i) => (
              <Card key={i} className="shadow-soft border-0 bg-gradient-card hover:shadow-lg transition-all duration-300 text-center">
                <CardContent className="pt-8 pb-6 px-5">
                  <div className="w-14 h-14 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-gold/20">
                    <step.icon className="w-7 h-7 text-gold" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      </section>

      {/* Legal disclaimers */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="p-6 bg-muted/20 rounded-2xl border border-muted/30 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              La plataforma no organiza apuestas, botes ni premios económicos.
            </p>
            <p className="text-sm text-muted-foreground">
              Cualquier incentivo privado entre miembros de una liga queda fuera de la responsabilidad de la plataforma.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold font-heading mb-4">
            ¿Listo para tu porra del Mundial?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Regístrate gratis y empieza a predecir en menos de un minuto.
          </p>
          <Button
            size="lg"
            className="bg-gold hover:bg-gold/90 text-black font-bold text-lg px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            asChild
          >
            <Link to="/registro">Empezar mi porra</Link>
          </Button>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <Link className="hover:text-primary underline-offset-4 hover:underline" to="/politica-privacidad">
              Política de privacidad
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link className="hover:text-primary underline-offset-4 hover:underline" to="/condiciones-servicio">
              Condiciones de servicio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
