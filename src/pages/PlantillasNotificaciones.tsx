import { useState, useEffect } from "react";
import { Bell, Save, Info, Send, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Template {
  id: string;
  key: string;
  title: string;
  body: string;
  enabled: boolean;
}

const PLACEHOLDER_DESCRIPTIONS: Record<string, string> = {
  "{HOME_TEAM}": "Equipo local",
  "{AWAY_TEAM}": "Equipo visitante",
  "{REAL_SCORE_HOME}": "Goles reales local",
  "{REAL_SCORE_AWAY}": "Goles reales visitante",
  "{USER_PRED_HOME}": "Pronóstico local del usuario",
  "{USER_PRED_AWAY}": "Pronóstico visitante del usuario",
  "{POINTS}": "Puntos obtenidos (del partido o ronda)",
  "{TOTAL_POINTS}": "Puntos totales acumulados",
  "{RANK}": "Posición en clasificación",
  "{ROUND_NAME}": "Nombre de la ronda",
  "{TEAM}": "Equipo clasificado",
  "{AWARD_NAME}": "Nombre del premio",
  "{WINNER}": "Ganador real",
  "{USER_PICK}": "Elección del usuario",
};

const KEY_LABELS: Record<string, string> = {
  match_result_base: "Resultado de partido (base)",
  match_suffix_gt10: "Sufijo: +10 puntos",
  match_suffix_lt3: "Sufijo: <3 puntos",
  knockout_correct: "Eliminatoria acertada",
  knockout_wrong: "Eliminatoria fallada",
  award_result: "Resultado premio individual",
};

export default function PlantillasNotificaciones() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editedTemplates, setEditedTemplates] = useState<Record<string, Partial<Template>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_templates")
        .select("*")
        .order("key");

      if (error) throw error;
      setTemplates(data || []);
    } catch (e) {
      console.error("Error fetching templates:", e);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las plantillas." });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id: string, field: keyof Template, value: string | boolean) => {
    setEditedTemplates((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const getValue = (template: Template, field: keyof Template) => {
    return editedTemplates[template.id]?.[field] ?? template[field];
  };

  const isEdited = (id: string) => !!editedTemplates[id];

  const handleSave = async (template: Template) => {
    const edits = editedTemplates[template.id];
    if (!edits) return;

    setSaving(template.id);
    try {
      const { error } = await supabase
        .from("notification_templates")
        .update({
          title: (edits.title ?? template.title) as string,
          body: (edits.body ?? template.body) as string,
          enabled: (edits.enabled ?? template.enabled) as boolean,
        })
        .eq("id", template.id);

      if (error) throw error;

      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, ...edits } : t))
      );
      setEditedTemplates((prev) => {
        const next = { ...prev };
        delete next[template.id];
        return next;
      });

      toast({ title: "Guardado", description: `Plantilla "${KEY_LABELS[template.key] || template.key}" actualizada.` });
    } catch (e) {
      console.error("Error saving template:", e);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar." });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async () => {
    const editedIds = Object.keys(editedTemplates);
    if (editedIds.length === 0) return;

    for (const id of editedIds) {
      const template = templates.find((t) => t.id === id);
      if (template) await handleSave(template);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Título y cuerpo son obligatorios." });
      return;
    }

    if (!confirm("¿Enviar esta notificación a TODOS los usuarios con notificaciones activas?")) return;

    setSendingBroadcast(true);
    try {
      // 1. Create event in events_queue with status "publishing"
      const { data: eventData, error: eventError } = await supabase
        .from("events_queue")
        .insert({
          type: "admin_broadcast",
          entity_id: `broadcast_${Date.now()}`,
          status: "publishing",
          payload: {
            title: broadcastTitle.trim(),
            body: broadcastBody.trim(),
          },
        } as any)
        .select("id")
        .single();

      if (eventError || !eventData) throw eventError || new Error("No event created");

      // 2. Call send-push-notifications directly
      const { error: pushError } = await supabase.functions.invoke("send-push-notifications", {
        body: { event_id: eventData.id },
      });

      if (pushError) throw pushError;

      // 3. Mark event as done
      await supabase
        .from("events_queue")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", eventData.id);

      toast({ title: "Enviado", description: "Notificación broadcast enviada correctamente." });
      setBroadcastTitle("");
      setBroadcastBody("");
    } catch (e) {
      console.error("Error sending broadcast:", e);
      toast({ variant: "destructive", title: "Error", description: "No se pudo enviar la notificación." });
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const hasEdits = Object.keys(editedTemplates).length > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-hero rounded-2xl flex items-center justify-center shadow-glow">
            <Bell className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Plantillas de Notificación</h1>
            <p className="text-sm text-muted-foreground">Edita los mensajes que reciben los usuarios</p>
          </div>
        </div>
        {hasEdits && (
          <Button onClick={handleSaveAll} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Guardar todo ({Object.keys(editedTemplates).length})
          </Button>
        )}
      </div>

      {/* Manual Broadcast */}
      <Card className="shadow-soft border-0 bg-gradient-card mb-6 ring-1 ring-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Enviar notificación manual</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Envía una notificación personalizada a todos los usuarios con notificaciones activas
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Título</label>
            <Input
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="Ej: ¡Atención participantes!"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Cuerpo del mensaje</label>
            <Textarea
              value={broadcastBody}
              onChange={(e) => setBroadcastBody(e.target.value)}
              placeholder="Ej: Recuerda completar tus pronósticos antes del {DEADLINE_DATE}..."
              rows={3}
              className="text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Puedes usar placeholders como {"{DISPLAY_NAME}"} u otros campos personalizados.
            </p>
          </div>
          <Button
            onClick={handleSendBroadcast}
            disabled={sendingBroadcast || !broadcastTitle.trim() || !broadcastBody.trim()}
            className="w-full sm:w-auto"
          >
            {sendingBroadcast ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar a todos
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Placeholders reference */}
      <Card className="shadow-soft border-0 bg-gradient-card mb-6">
        <Accordion type="single" collapsible>
          <AccordionItem value="placeholders" className="border-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2 text-sm">
                <Info className="w-4 h-4 text-primary" />
                <span>Placeholders disponibles</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(PLACEHOLDER_DESCRIPTIONS).map(([key, desc]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono">{key}</code>
                    <span className="text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {/* Templates list */}
      <div className="space-y-4">
        {templates.map((template) => {
          const enabled = getValue(template, "enabled") as boolean;
          const edited = isEdited(template.id);

          return (
            <Card
              key={template.id}
              className={`shadow-soft border-0 bg-gradient-card transition-all ${
                !enabled ? "opacity-60" : ""
              } ${edited ? "ring-1 ring-primary/40" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <CardTitle className="text-base truncate">
                      {KEY_LABELS[template.key] || template.key}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono flex-shrink-0">
                      {template.key}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => handleChange(template.id, "enabled", v)}
                    />
                    {edited && (
                      <Button
                        size="sm"
                        onClick={() => handleSave(template)}
                        disabled={saving === template.id}
                        className="text-xs"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Guardar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Título</label>
                  <Input
                    value={getValue(template, "title") as string}
                    onChange={(e) => handleChange(template.id, "title", e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Cuerpo del mensaje</label>
                  <Textarea
                    value={getValue(template, "body") as string}
                    onChange={(e) => handleChange(template.id, "body", e.target.value)}
                    rows={3}
                    className="text-sm font-mono"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
