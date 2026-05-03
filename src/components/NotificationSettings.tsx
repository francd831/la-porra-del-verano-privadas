import { useState, useEffect } from "react";
import { Bell, BellOff, AlertTriangle, Smartphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// VAPID public key — must match the one stored as secret
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");
  const [subscriptionCount, setSubscriptionCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadSettings().then(() => autoReRegisterIfNeeded());
    if ("Notification" in window) {
      setPermissionState(Notification.permission);
    }
  }, [user]);

  // Auto re-register push subscription if enabled but no active subs (expired)
  const autoReRegisterIfNeeded = async () => {
    if (!user) return;
    try {
      const [{ data: settings }, { data: subs }] = await Promise.all([
        supabase.from("user_notification_settings").select("enabled").eq("user_id", user.id).maybeSingle(),
        supabase.from("push_subscriptions").select("id").eq("user_id", user.id).eq("active", true),
      ]);
      const isEnabled = settings?.enabled ?? false;
      const activeSubs = subs?.length ?? 0;
      
      if (isEnabled && activeSubs === 0 && "Notification" in window && Notification.permission === "granted") {
        console.log("Push subscription expired, auto re-registering...");
        const success = await registerPushSubscription();
        if (success) {
          console.log("Push subscription re-registered successfully");
          await loadSettings(); // refresh count
        } else {
          console.warn("Failed to auto re-register push subscription");
        }
      }
    } catch (e) {
      console.error("Auto re-register check failed:", e);
    }
  };

  const loadSettings = async () => {
    if (!user) return;
    try {
      const [{ data: settings }, { data: subs }] = await Promise.all([
        supabase.from("user_notification_settings").select("enabled").eq("user_id", user.id).maybeSingle(),
        supabase.from("push_subscriptions").select("id").eq("user_id", user.id).eq("active", true),
      ]);
      setEnabled(settings?.enabled ?? false);
      setSubscriptionCount(subs?.length ?? 0);
    } catch (e) {
      console.error("Error loading notification settings:", e);
    } finally {
      setLoading(false);
    }
  };

  const registerPushSubscription = async (): Promise<boolean> => {
    try {
      if (!VAPID_PUBLIC_KEY) {
        toast({
          variant: "destructive",
          title: "Error de configuración",
          description: "Falta VITE_VAPID_PUBLIC_KEY en Vercel (variables de entorno del frontend).",
        });
        return false;
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast({
          variant: "destructive",
          title: "No soportado",
          description: "Este dispositivo/navegador no soporta notificaciones push.",
        });
        return false;
      }

      // Use the VitePWA-generated service worker (which includes sw-push.js via importScripts)
      const registration = await navigator.serviceWorker.ready;

      // IMPORTANT: remove any previous subscription (may be tied to old VAPID key)
      const existingSub = await (registration as any).pushManager.getSubscription();
      if (existingSub) {
        try {
          await existingSub.unsubscribe();
        } catch {}
      }

      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();

      const platform = /android/i.test(navigator.userAgent)
        ? "android"
        : /iphone|ipad|ipod/i.test(navigator.userAgent)
          ? "ios"
          : /macintosh/i.test(navigator.userAgent)
            ? "macos"
            : /windows/i.test(navigator.userAgent)
              ? "windows"
              : "other";

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user!.id,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh,
          auth: subJson.keys!.auth,
          user_agent: navigator.userAgent,
          active: true,
          vapid_public_key: VAPID_PUBLIC_KEY,
          platform,
          last_seen_at: new Date().toISOString(),
          invalidated_at: null,
          invalid_reason: null,
        },
        { onConflict: "user_id,endpoint" },
      );

      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Push registration failed:", e);
      return false;
    }
  };

  const unregisterPushSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      if (registration) {
        const subscription = await (registration as any).pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          await supabase
            .from("push_subscriptions")
            .update({ active: false })
            .eq("user_id", user!.id)
            .eq("endpoint", endpoint);
        }
      }
    } catch (e) {
      console.error("Push unsubscribe failed:", e);
    }
  };

  const handleToggle = async (newValue: boolean) => {
    if (!user) return;
    setLoading(true);

    try {
      if (newValue) {
        // Request permission
        if (!("Notification" in window)) {
          toast({
            variant: "destructive",
            title: "No soportado",
            description: "Tu navegador no soporta notificaciones push.",
          });
          setLoading(false);
          return;
        }

        const permission = await Notification.requestPermission();
        setPermissionState(permission);

        if (permission !== "granted") {
          toast({
            variant: "destructive",
            title: "Permiso denegado",
            description: "Debes permitir las notificaciones en los ajustes de tu navegador.",
          });
          setLoading(false);
          return;
        }

        const success = await registerPushSubscription();
        if (!success) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo registrar la suscripción push.",
          });
          setLoading(false);
          return;
        }
      } else {
        await unregisterPushSubscription();
      }

      // Update settings in DB
      const { error } = await supabase
        .from("user_notification_settings")
        .upsert({ user_id: user.id, enabled: newValue }, { onConflict: "user_id" });

      if (error) throw error;

      setEnabled(newValue);
      await loadSettings();

      toast({
        title: newValue ? "Notificaciones activadas" : "Notificaciones desactivadas",
        description: newValue
          ? "Recibirás notificaciones de resultados y clasificación."
          : "Ya no recibirás notificaciones push.",
      });
    } catch (e) {
      console.error("Error toggling notifications:", e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cambiar la configuración.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !enabled) {
    return null;
  }

  return (
    <Card className="shadow-soft border-0 bg-gradient-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Notificaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            {enabled ? (
              <Bell className="w-5 h-5 text-primary" />
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="notifications-toggle" className="font-semibold cursor-pointer">
                Recibir notificaciones
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">Resultados, puntos y clasificación en tiempo real</p>
            </div>
          </div>
          <Switch id="notifications-toggle" checked={enabled} onCheckedChange={handleToggle} disabled={loading} />
        </div>

        {enabled && subscriptionCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Smartphone className="w-3.5 h-3.5" />
            <span>
              {subscriptionCount} dispositivo{subscriptionCount !== 1 ? "s" : ""} registrado
              {subscriptionCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {permissionState === "denied" && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-destructive">Permisos bloqueados</p>
              <p className="text-muted-foreground mt-1">
                Has bloqueado las notificaciones. Para reactivarlas, ve a los ajustes de tu navegador → Sitios web →
                Notificaciones y permite este sitio.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
