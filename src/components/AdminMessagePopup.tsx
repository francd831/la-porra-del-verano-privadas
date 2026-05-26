import { useEffect, useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type AdminMessage = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export function AdminMessagePopup() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [open, setOpen] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const currentMessage = useMemo(() => messages[0] || null, [messages]);

  useEffect(() => {
    const loadUnreadMessages = async () => {
      if (!user) {
        setMessages([]);
        setOpen(false);
        return;
      }

      const { data, error } = await (supabase as any).rpc("get_unread_admin_messages");
      if (error) {
        console.error("Error loading admin messages:", error);
        return;
      }

      const unreadMessages = (data || []) as AdminMessage[];
      setMessages(unreadMessages);
      setOpen(unreadMessages.length > 0);
    };

    loadUnreadMessages();
  }, [user]);

  const markCurrentAsRead = async () => {
    if (!currentMessage || markingRead) return;

    setMarkingRead(true);
    const messageId = currentMessage.id;
    setMessages((prev) => prev.slice(1));

    const { error } = await (supabase as any).rpc("mark_admin_message_read", {
      p_message_id: messageId,
    });

    if (error) {
      console.error("Error marking admin message as read:", error);
    }

    setMarkingRead(false);
  };

  const handleOpenChange = async (nextOpen: boolean) => {
    if (!nextOpen) {
      await markCurrentAsRead();
      setOpen(messages.length > 1);
      return;
    }

    setOpen(true);
  };

  const handleAccept = async () => {
    await markCurrentAsRead();
    setOpen(messages.length > 1);
  };

  if (!currentMessage) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border border-primary/20 bg-card/95 shadow-strong sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <MessageSquare className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl">{currentMessage.title}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {currentMessage.body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleAccept} disabled={markingRead} className="w-full sm:w-auto">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
