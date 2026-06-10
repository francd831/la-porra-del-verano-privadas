import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Eye, MessageSquare, Search, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type MessageUser = {
  user_id: string;
  display_name: string | null;
  email: string | null;
};

type AdminMessageRow = {
  id: string;
  title: string;
  body: string;
  target_all: boolean;
  created_at: string;
};

type MessageStats = {
  recipientCount: number;
  seenCount: number;
  readCount: number;
};

type RecipientRow = {
  message_id: string;
  user_id: string;
};

type ReadRow = {
  message_id: string;
  user_id: string;
  seen_at: string | null;
  read_at: string | null;
};

export default function AdminMensajes() {
  const { toast } = useToast();
  const [users, setUsers] = useState<MessageUser[]>([]);
  const [incompleteUserIds, setIncompleteUserIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<(AdminMessageRow & MessageStats)[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [targetAll, setTargetAll] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: usersData, error: usersError } = await (supabase as any).rpc("get_admin_message_users");
      if (usersError) throw usersError;

      const knownUserIds = new Set(((usersData || []) as MessageUser[]).map((user) => user.user_id));
      const { data: incompleteSubmissionsData, error: incompleteSubmissionsError } = await (supabase as any)
        .from("user_submissions")
        .select("user_id")
        .eq("tournament_id", "11111111-1111-1111-1111-111111111111")
        .eq("is_complete", false);
      if (incompleteSubmissionsError) throw incompleteSubmissionsError;

      const { data: messagesData, error: messagesError } = await (supabase as any)
        .from("admin_messages")
        .select("id, title, body, target_all, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (messagesError) throw messagesError;

      const messageIds = ((messagesData || []) as AdminMessageRow[]).map((message) => message.id);
      const { data: recipientsData, error: recipientsError } = messageIds.length
        ? await (supabase as any)
            .from("admin_message_recipients")
            .select("message_id, user_id")
            .in("message_id", messageIds)
        : { data: [], error: null };
      if (recipientsError) throw recipientsError;

      const { data: readsData, error: readsError } = messageIds.length
        ? await (supabase as any)
            .from("admin_message_reads")
            .select("message_id, user_id, seen_at, read_at")
            .in("message_id", messageIds)
        : { data: [], error: null };
      if (readsError) throw readsError;

      const recipientCounts = new Map<string, number>();
      ((recipientsData || []) as RecipientRow[]).forEach((recipient) => {
        recipientCounts.set(recipient.message_id, (recipientCounts.get(recipient.message_id) || 0) + 1);
      });

      const seenCounts = new Map<string, number>();
      const readCounts = new Map<string, number>();
      ((readsData || []) as ReadRow[]).forEach((read) => {
        if (read.seen_at) {
          seenCounts.set(read.message_id, (seenCounts.get(read.message_id) || 0) + 1);
        }
        if (read.read_at) {
          readCounts.set(read.message_id, (readCounts.get(read.message_id) || 0) + 1);
        }
      });

      setUsers((usersData || []) as MessageUser[]);
      setIncompleteUserIds(
        Array.from(new Set((incompleteSubmissionsData || []).map((submission: { user_id: string }) => submission.user_id)))
          .filter((userId) => knownUserIds.has(userId))
      );
      setMessages(
        ((messagesData || []) as AdminMessageRow[]).map((message) => ({
          ...message,
          recipientCount: message.target_all ? usersData?.length || 0 : recipientCounts.get(message.id) || 0,
          seenCount: seenCounts.get(message.id) || 0,
          readCount: readCounts.get(message.id) || 0,
        }))
      );
    } catch (error) {
      console.error("Error loading admin messages:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los mensajes.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return users;

    return users.filter((user) => {
      return [user.display_name || "", user.email || ""].some((value) =>
        value.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [users, search]);

  const toggleUser = (userId: string) => {
    setTargetAll(false);
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectAll = () => {
    setTargetAll(true);
    setSelectedUserIds([]);
  };

  const selectIncomplete = () => {
    setTargetAll(false);
    setSelectedUserIds(incompleteUserIds);
  };

  const sendMessage = async () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      toast({
        variant: "destructive",
        title: "Faltan datos",
        description: "Escribe un título y un mensaje.",
      });
      return;
    }

    if (!targetAll && selectedUserIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Selecciona destinatarios",
        description: "Elige al menos un usuario o pulsa Todos.",
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await (supabase as any).rpc("create_admin_message", {
        p_title: trimmedTitle,
        p_body: trimmedBody,
        p_target_all: targetAll,
        p_user_ids: targetAll ? [] : selectedUserIds,
      });

      if (error) throw error;

      toast({
        title: "Mensaje enviado",
        description: targetAll
          ? "El mensaje se mostrará a todos los usuarios."
          : `El mensaje se mostrará a ${selectedUserIds.length} usuario(s).`,
      });
      setTitle("");
      setBody("");
      setSelectedUserIds([]);
      setTargetAll(true);
      await loadData();
    } catch (error: any) {
      console.error("Error sending admin message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo enviar el mensaje.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 pb-24">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-glow">
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold md:text-3xl">Mensajes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Envía avisos que aparecerán como pop-up cuando el usuario entre.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border border-border/50 bg-card/60 shadow-strong">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-5 w-5 text-primary" />
              Nuevo mensaje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="space-y-2">
              <Label htmlFor="message-title">Título</Label>
              <Input
                id="message-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej. Aviso importante"
                maxLength={120}
                className="bg-muted/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message-body">Mensaje</Label>
              <Textarea
                id="message-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Escribe el mensaje que verá el usuario..."
                maxLength={1200}
                className="min-h-40 resize-none bg-muted/30"
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Label>Destinatarios</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={targetAll ? "default" : "secondary"}>
                    {targetAll ? "Todos" : `${selectedUserIds.length} seleccionados`}
                  </Badge>
                  <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectIncomplete}
                    disabled={incompleteUserIds.length === 0}
                  >
                    Porras incompletas ({incompleteUserIds.length})
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar usuario"
                  className="bg-muted/30 pl-9"
                />
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border/40 bg-muted/10 p-2">
                {loading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Cargando usuarios...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No hay usuarios.</div>
                ) : (
                  filteredUsers.map((user) => {
                    const selected = !targetAll && selectedUserIds.includes(user.user_id);
                    return (
                      <button
                        key={user.user_id}
                        type="button"
                        onClick={() => toggleUser(user.user_id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left transition-colors ${
                          selected ? "bg-primary/15 text-foreground" : "hover:bg-muted/40"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {user.display_name || user.email || "Usuario"}
                          </span>
                          {user.email && (
                            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                          )}
                        </span>
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                          }`}
                        >
                          {selected && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <Button onClick={sendMessage} disabled={sending} className="w-full gap-2">
              <Send className="h-4 w-4" />
              {sending ? "Enviando..." : "Enviar mensaje"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/60 shadow-strong">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" />
              Últimos mensajes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Cargando mensajes...</div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Todavía no hay mensajes.</div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="rounded-xl border border-border/40 bg-muted/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{message.title}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{message.body}</div>
                    </div>
                    <Badge variant={message.target_all ? "default" : "secondary"} className="shrink-0">
                      {message.target_all ? "Todos" : message.recipientCount}
                    </Badge>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {new Date(message.created_at).toLocaleString("es-ES")}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded-lg border border-border/40 bg-background/40 px-2 py-1.5">
                      <div className="text-muted-foreground">Dest.</div>
                      <div className="font-bold text-foreground">{message.recipientCount}</div>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 px-2 py-1.5">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        Visto
                      </div>
                      <div className="font-bold text-foreground">{message.seenCount}</div>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 px-2 py-1.5">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Check className="h-3 w-3" />
                        Confirm.
                      </div>
                      <div className="font-bold text-foreground">{message.readCount}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
