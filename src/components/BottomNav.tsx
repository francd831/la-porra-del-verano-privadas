import { Link, useLocation } from "react-router-dom";
import { Trophy, Target, Award, FileText, Home, User, BarChart3, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [predictionsLocked, setPredictionsLocked] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  useEffect(() => {
    supabase
      .from("tournaments")
      .select("predictions_locked")
      .limit(1)
      .single()
      .then(({ data }) => setPredictionsLocked(!!data?.predictions_locked));
  }, []);

  const basesOrPronosticos = predictionsLocked
    ? { href: "/pronosticos", icon: BarChart3, label: "Pronósticos" }
    : { href: "/bases", icon: FileText, label: "Bases" };

  const items = user
    ? isAdmin
      ? [
          { href: "/resultados", icon: Award, label: "Resultados" },
          { href: "/ligas", icon: Users, label: "Ligas" },
          { href: "/clasificacion", icon: Trophy, label: "Ranking" },
          basesOrPronosticos,
          { href: "/perfil", icon: User, label: "Perfil" },
        ]
      : [
          { href: "/dashboard", icon: Home, label: "Inicio" },
          { href: "/mi-porra", icon: Target, label: "Mi Porra" },
          { href: "/ligas", icon: Users, label: "Ligas" },
          { href: "/clasificacion", icon: Trophy, label: "Ranking" },
          basesOrPronosticos,
          { href: "/perfil", icon: User, label: "Perfil" },
        ]
    : [
        { href: "/", icon: Home, label: "Inicio" },
        { href: "/bases", icon: FileText, label: "Bases" },
        { href: "/login", icon: User, label: "Entrar" },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/70 backdrop-blur-xl border-t border-border/50">
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] mt-0.5 ${isActive ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area spacer for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
