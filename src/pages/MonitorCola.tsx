import { useState, useEffect, useCallback } from "react";
import { RefreshCw, RotateCcw, CheckCircle2, AlertCircle, Clock, Loader2, Zap, Bell, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EventRow {
  id: string;
  type: string;
  entity_id: string | null;
  status: string;
  attempts: number;
  error: string | null;
  payload: any;
  created_at: string;
  updated_at: string;
}

interface NotificationRow {
  id: string;
  event_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

const statusConfig: Record<string, { icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { icon: <Clock className="h-3 w-3" />, variant: "outline" },
  calculating: { icon: <Loader2 className="h-3 w-3 animate-spin" />, variant: "secondary" },
  calculated: { icon: <CheckCircle2 className="h-3 w-3" />, variant: "secondary" },
  publishing: { icon: <Zap className="h-3 w-3" />, variant: "default" },
  done: { icon: <CheckCircle2 className="h-3 w-3" />, variant: "default" },
  failed: { icon: <AlertCircle className="h-3 w-3" />, variant: "destructive" },
  sent: { icon: <CheckCircle2 className="h-3 w-3" />, variant: "default" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || { icon: null, variant: "outline" as const };
  return (
    <Badge variant={cfg.variant} className="gap-1 text-xs">
      {cfg.icon}
      {status}
    </Badge>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function MonitorCola() {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    const [evRes, notifRes] = await Promise.all([
      supabase
        .from("events_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("notification_outbox")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (evRes.data) setEvents(evRes.data);
    if (notifRes.data) setNotifications(notifRes.data as unknown as NotificationRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 10s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("monitor-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events_queue" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_outbox" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleRetry = async (eventId: string) => {
    setRetrying(eventId);
    try {
      // Reset to pending
      const { error } = await supabase
        .from("events_queue")
        .update({ status: "pending", error: null, updated_at: new Date().toISOString() } as any)
        .eq("id", eventId);

      if (error) throw error;

      // Trigger processing immediately
      const { error: invokeError } = await supabase.functions.invoke("process-events", { body: {} });
      if (invokeError) console.error("Invoke error:", invokeError);

      toast({ title: "Reintento lanzado", description: "El evento se está reprocesando." });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRetrying(null);
    }
  };

  const handleProcessAll = async () => {
    setRetrying("all");
    try {
      const { error: invokeError } = await supabase.functions.invoke("process-events", { body: {} });
      if (invokeError) throw invokeError;
      toast({ title: "Procesamiento lanzado" });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRetrying(null);
    }
  };

  const pendingCount = events.filter(e => e.status === "pending").length;
  const failedCount = events.filter(e => e.status === "failed").length;
  const doneCount = events.filter(e => e.status === "done").length;
  const notifSent = notifications.filter(n => n.status === "sent").length;
  const notifFailed = notifications.filter(n => n.status === "failed").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted/60">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Monitor de Cola
            </h1>
            <p className="text-muted-foreground text-sm">events_queue · notification_outbox</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "Auto ✓" : "Auto ✗"}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{pendingCount}</div>
              <div className="text-xs text-muted-foreground">Pendientes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-destructive">{failedCount}</div>
              <div className="text-xs text-muted-foreground">Fallidos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{doneCount}</div>
              <div className="text-xs text-muted-foreground">Completados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{notifSent}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Bell className="h-3 w-3" /> Enviadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-destructive">{notifFailed}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Bell className="h-3 w-3" /> Fallidas</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="events">
          <TabsList className="w-full">
            <TabsTrigger value="events" className="flex-1">Eventos ({events.length})</TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1">Notificaciones ({notifications.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Cola de Eventos</CardTitle>
                <Button size="sm" onClick={handleProcessAll} disabled={retrying === "all" || pendingCount === 0}>
                  {retrying === "all" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
                  Procesar pendientes
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="hidden md:table-cell">Intentos</TableHead>
                        <TableHead className="hidden md:table-cell">Hace</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((ev) => (
                        <>
                          <TableRow key={ev.id} className={ev.status === "failed" ? "bg-destructive/5" : ""}>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpandedEvent(expandedEvent === ev.id ? null : ev.id)}>
                                {expandedEvent === ev.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </Button>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{ev.type}</TableCell>
                            <TableCell><StatusBadge status={ev.status} /></TableCell>
                            <TableCell className="hidden md:table-cell">{ev.attempts}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{timeAgo(ev.updated_at)}</TableCell>
                            <TableCell className="text-right">
                              {(ev.status === "failed" || ev.status === "pending") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRetry(ev.id)}
                                  disabled={retrying === ev.id}
                                >
                                  {retrying === ev.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                          {expandedEvent === ev.id && (
                            <TableRow key={`${ev.id}-detail`}>
                              <TableCell colSpan={6}>
                                <div className="p-3 space-y-2 text-xs bg-muted/30 rounded">
                                  <div><span className="font-semibold">ID:</span> {ev.id}</div>
                                  <div><span className="font-semibold">Entity:</span> {ev.entity_id || "—"}</div>
                                  <div><span className="font-semibold">Creado:</span> {new Date(ev.created_at).toLocaleString()}</div>
                                  <div><span className="font-semibold">Actualizado:</span> {new Date(ev.updated_at).toLocaleString()}</div>
                                  {ev.error && (
                                    <div className="text-destructive"><span className="font-semibold">Error:</span> {ev.error}</div>
                                  )}
                                  {ev.payload && (
                                    <div>
                                      <span className="font-semibold">Payload:</span>
                                      <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-x-auto">{JSON.stringify(ev.payload, null, 2)}</pre>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                      {events.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No hay eventos en la cola
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Buzón de Notificaciones</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="hidden md:table-cell">Tipo</TableHead>
                        <TableHead className="hidden md:table-cell">Hace</TableHead>
                        <TableHead className="hidden md:table-cell">Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.map((n) => (
                        <TableRow key={n.id} className={n.status === "failed" ? "bg-destructive/5" : ""}>
                          <TableCell>
                            <div className="font-medium text-xs">{n.title}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{n.body}</div>
                          </TableCell>
                          <TableCell><StatusBadge status={n.status} /></TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-xs">{n.type}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{timeAgo(n.created_at)}</TableCell>
                          <TableCell className="hidden md:table-cell text-destructive text-xs truncate max-w-[150px]">{n.error || "—"}</TableCell>
                        </TableRow>
                      ))}
                      {notifications.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No hay notificaciones
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
