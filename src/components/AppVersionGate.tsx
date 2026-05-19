import { useCallback, useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppVersionInfo = {
  version: string;
  forceReload?: boolean;
  message?: string;
};

const CURRENT_VERSION_KEY = "app-version-current";
const FORCE_RELOAD_KEY = "app-version-force-reloaded";
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function updateServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.update()));
}

async function clearAppCaches() {
  if (!("caches" in window)) return;

  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

function reloadPage() {
  window.location.reload();
}

export function AppVersionGate() {
  const [pendingVersion, setPendingVersion] = useState<AppVersionInfo | null>(null);

  const applyUpdate = useCallback(async (force = false) => {
    if (force) {
      await clearAppCaches();
    }

    await updateServiceWorker();
    reloadPage();
  }, []);

  const checkVersion = useCallback(async () => {
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: "no-store",
      });

      if (!response.ok) return;

      const nextVersion = (await response.json()) as AppVersionInfo;
      if (!nextVersion.version) return;

      const currentVersion = localStorage.getItem(CURRENT_VERSION_KEY);
      if (!currentVersion) {
        localStorage.setItem(CURRENT_VERSION_KEY, nextVersion.version);
        return;
      }

      if (currentVersion === nextVersion.version) return;

      if (nextVersion.forceReload) {
        const forceReloadedVersion = localStorage.getItem(FORCE_RELOAD_KEY);
        localStorage.setItem(CURRENT_VERSION_KEY, nextVersion.version);

        if (forceReloadedVersion !== nextVersion.version) {
          localStorage.setItem(FORCE_RELOAD_KEY, nextVersion.version);
          await applyUpdate(true);
        }

        return;
      }

      setPendingVersion(nextVersion);
    } catch {
      // Version checks should never block the app.
    }
  }, [applyUpdate]);

  useEffect(() => {
    checkVersion();

    const interval = window.setInterval(checkVersion, CHECK_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkVersion]);

  const handleUpdate = async () => {
    if (pendingVersion?.version) {
      localStorage.setItem(CURRENT_VERSION_KEY, pendingVersion.version);
    }

    await applyUpdate(false);
  };

  if (!pendingVersion) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[60] animate-in slide-in-from-bottom-4 duration-300 md:bottom-6 md:left-auto md:max-w-sm">
      <div className="rounded-2xl border border-primary/20 bg-card/95 p-4 shadow-lg backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Nueva version disponible</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {pendingVersion.message || "Actualiza para ver los ultimos cambios."}
            </p>
          </div>
          <button
            aria-label="Cerrar aviso de actualizacion"
            className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setPendingVersion(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Button className="mt-3 w-full" size="sm" onClick={handleUpdate}>
          Actualizar
        </Button>
      </div>
    </div>
  );
}
