import { Link, Navigate } from "react-router-dom";
import { FileText, Trophy, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import CountdownTimer from "@/components/CountdownTimer";
const quickLinksLoggedOut = [
  {
    name: "¿Cómo funciona?",
    description: "Reglas y sistema de puntuación",
    icon: FileText,
    href: "/bases",
    color: "success",
  },
];
const quickLinksLoggedIn = [
  {
    name: "Mi Porra",
    description: "Haz tus pronósticos",
    icon: Trophy,
    href: "/mi-porra",
    color: "primary",
  },
  {
    name: "Clasificación",
    description: "Consulta el ranking",
    icon: BarChart3,
    href: "/clasificacion",
    color: "gold",
  },
  {
    name: "¿Cómo funciona?",
    description: "Reglas y sistema de puntuación",
    icon: FileText,
    href: "/bases",
    color: "success",
  },
];
export default function Home() {
  const { user, loading } = useAuth();

  // Si el usuario está logueado, redirigir al dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="min-h-screen">
      {/* Countdown Timer */}
      <CountdownTimer />

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Dark Overlay with Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />

        {/* Content */}
        <div className="relative z-10 container mx-auto max-w-4xl text-center px-4 py-20">
          {/* Main Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            La Porra del Verano
            <span className="block text-gold mt-2">Mundial 2026</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-10 max-w-2xl mx-auto font-light">
            Predice resultados y compite con tus amigos
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-gold hover:bg-gold/90 text-black font-bold text-lg px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              asChild
            >
              <Link to="/registro">Regístrate</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/50 text-white hover:bg-white/10 font-bold text-lg px-10 py-6 rounded-full transition-all duration-300"
              asChild
            >
              <Link to="/login">Iniciar Sesión</Link>
            </Button>
          </div>
        </div>

        {/* Decorative Bottom Fade */}
      </section>
    </div>
  );
}
