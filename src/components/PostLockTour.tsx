import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const FEATURE_KEY = "post_lock_tour_2026_v1";
const ADMIN_PREVIEW_FEATURE_KEY = "post_lock_tour_admin_preview_2026_v1";
const TOURNAMENT_ID = "11111111-1111-1111-1111-111111111111";

interface TourStep {
  title: string;
  body: string;
  targetId?: string;
}

interface TargetBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

const findVisibleTarget = (targetId?: string): TargetBox | null => {
  if (!targetId || typeof document === "undefined") return null;

  const elements = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour-id="${targetId}"]`));
  const target = elements.find((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  });

  if (!target) return null;

  const rect = target.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
};

export function PostLockTour() {
  const { user, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [featureKey, setFeatureKey] = useState(FEATURE_KEY);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetBox, setTargetBox] = useState<TargetBox | null>(null);

  const steps = useMemo<TourStep[]>(
    () => [
      {
        title: "Pronósticos cerrados",
        body: "Ahora empieza lo bueno. Ya puedes comparar porras, seguir puntos en directo y pelear cada clasificación.",
      },
      {
        title: "Inicio",
        body: "Aquí verás tu resumen de puntuación, próximos partidos, estadísticas y los badges que vayas consiguiendo.",
        targetId: "nav-dashboard",
      },
      {
        title: "Mi Porra",
        body: "Tus pronósticos se quedan visibles en el mismo formato en el que los hiciste, para consultarlos cuando quieras.",
        targetId: "nav-mi-porra",
      },
      {
        title: "Pronósticos",
        body: "Cuando los pronósticos estén cerrados, podrás ver qué ha puesto cada usuario en partidos, eliminatorias y premios.",
        targetId: "nav-pronosticos",
      },
      {
        title: "Clasificación",
        body: "Aquí tendrás la General y las ligas privadas en las que participas, con la clasificación calculada en tiempo real.",
        targetId: "nav-clasificacion",
      },
      {
        title: "Hall of Fame",
        body: "Verás clasificaciones especiales por categorías. Si entras en un podio, el badge aparecerá también en Inicio.",
        targetId: "nav-hall-of-fame",
      },
    ],
    []
  );

  const currentStep = steps[stepIndex];

  const markAsSeen = useCallback(async () => {
    if (!user) return;

    await (supabase as any)
      .from("user_feature_acknowledgements")
      .upsert(
        {
          user_id: user.id,
          feature_key: featureKey,
          acknowledged_at: new Date().toISOString(),
        },
        { onConflict: "user_id,feature_key" }
      );
  }, [featureKey, user]);

  const closeTour = useCallback(async () => {
    setIsOpen(false);
    await markAsSeen();
  }, [markAsSeen]);

  useEffect(() => {
    if (loading || !user) {
      setIsReady(true);
      return;
    }

    let isMounted = true;

    const checkTourStatus = async () => {
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      const isAdminPreview = !!role;
      const nextFeatureKey = isAdminPreview ? ADMIN_PREVIEW_FEATURE_KEY : FEATURE_KEY;
      setFeatureKey(nextFeatureKey);

      const { data: tournament } = await supabase
        .from("tournaments")
        .select("predictions_locked")
        .eq("id", TOURNAMENT_ID)
        .maybeSingle();

      if (!isMounted || (!tournament?.predictions_locked && !isAdminPreview)) {
        if (isMounted) setIsReady(true);
        return;
      }

      const { data: acknowledgement } = await (supabase as any)
        .from("user_feature_acknowledgements")
        .select("feature_key")
        .eq("user_id", user.id)
        .eq("feature_key", nextFeatureKey)
        .maybeSingle();

      if (!isMounted) return;
      setIsOpen(!acknowledgement);
      setIsReady(true);
    };

    checkTourStatus();

    return () => {
      isMounted = false;
    };
  }, [loading, user]);

  useEffect(() => {
    if (!isOpen) return;

    const updateTargetBox = () => {
      setTargetBox(findVisibleTarget(currentStep.targetId));
    };

    updateTargetBox();
    window.addEventListener("resize", updateTargetBox);
    window.addEventListener("scroll", updateTargetBox, true);

    return () => {
      window.removeEventListener("resize", updateTargetBox);
      window.removeEventListener("scroll", updateTargetBox, true);
    };
  }, [currentStep.targetId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeTour();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeTour, isOpen]);

  if (!isReady || !isOpen || !user) return null;

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;
  const cardStyle = targetBox
    ? {
        top: Math.min(window.innerHeight - 300, Math.max(88, targetBox.top + targetBox.height + 18)),
        left: Math.min(window.innerWidth - 352, Math.max(16, targetBox.left + targetBox.width / 2 - 176)),
      }
    : undefined;

  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {targetBox && (
        <div
          className="absolute rounded-2xl border-2 border-gold shadow-[0_0_32px_rgba(245,197,24,0.45)] transition-all duration-200"
          style={{
            top: targetBox.top - 8,
            left: targetBox.left - 8,
            width: targetBox.width + 16,
            height: targetBox.height + 16,
          }}
        />
      )}

      <div
        className={`absolute w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-primary/30 bg-card/95 p-5 shadow-strong ${
          targetBox ? "" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        }`}
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-lock-tour-title"
      >
        <button
          type="button"
          onClick={closeTour}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Cerrar tutorial"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-3 pr-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Guía rápida
            </p>
            <h2 id="post-lock-tour-title" className="text-xl font-bold text-foreground">
              {currentStep.title}
            </h2>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{currentStep.body}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            {stepIndex + 1} / {steps.length}
          </span>
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Atrás
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={isLastStep ? closeTour : () => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}
            >
              {isLastStep ? "Entendido" : "Siguiente"}
              {!isLastStep && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
