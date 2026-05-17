import { useState, useEffect, useCallback } from "react";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SNOOZE_KEY = "pwa-install-snoozed-until";

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isSnoozed(): boolean {
  const until = localStorage.getItem(SNOOZE_KEY);
  if (!until) return false;
  return Date.now() < parseInt(until, 10);
}

function snooze7Days() {
  localStorage.setItem(SNOOZE_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
}

export function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isMobile() || isStandalone() || isSnoozed()) return;

    if (isIOS()) {
      // No beforeinstallprompt on iOS — show instructions after a delay
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (isIOS()) {
      setShowIOSInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setShow(false);
    // Don't show again this session (dismissed state persists in memory)
  }, []);

  const handleSnooze = useCallback(() => {
    snooze7Days();
    setShow(false);
  }, []);

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300 md:hidden">
      <div className="glass rounded-2xl p-4 shadow-lg border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            {showIOSInstructions ? (
              <>
                <p className="text-sm font-semibold mb-1">Instalar en iPhone/iPad</p>
                <p className="text-xs text-muted-foreground">
                  Pulsa <Share className="inline w-3 h-3 mx-0.5" /> <strong>Compartir</strong> y luego{" "}
                  <strong>"Añadir a pantalla de inicio"</strong>
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold mb-1">Instala la app</p>
                <p className="text-xs text-muted-foreground">
                  Accede más rápido desde tu pantalla de inicio
                </p>
              </>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!showIOSInstructions && (
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleInstall} className="flex-1 text-xs">
              Instalar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleSnooze} className="text-xs text-muted-foreground">
              Ahora no
            </Button>
          </div>
        )}

        {showIOSInstructions && (
          <Button size="sm" variant="ghost" onClick={handleDismiss} className="w-full mt-2 text-xs text-muted-foreground">
            Entendido
          </Button>
        )}
      </div>
    </div>
  );
}
