import { useState, useEffect } from "react";
import { User, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AliasSetupDialogProps {
  open: boolean;
  userId: string;
  onComplete: () => void;
}

export function AliasSetupDialog({ open, userId, onComplete }: AliasSetupDialogProps) {
  const [alias, setAlias] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Debounced alias check
  useEffect(() => {
    if (!alias.trim() || alias.trim().length < 3) {
      setIsAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const { data, error } = await supabase.rpc('is_display_name_available', {
          p_display_name: alias.trim()
        });

        if (error) {
          console.error('Error checking alias:', error);
          setIsAvailable(null);
        } else {
          setIsAvailable(data);
        }
      } catch (error) {
        console.error('Error:', error);
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [alias]);

  const handleSave = async () => {
    if (!alias.trim() || !isAvailable) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: alias.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo guardar el alias. Intenta nuevamente.",
        });
        return;
      }

      toast({
        title: "¡Alias guardado!",
        description: "Tu alias ha sido configurado correctamente.",
      });
      onComplete();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ha ocurrido un error inesperado.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Configura tu Alias
          </DialogTitle>
          <DialogDescription>
            Elige un alias único que aparecerá en las clasificaciones públicas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="alias">Alias</Label>
            <div className="relative">
              <Input
                id="alias"
                type="text"
                placeholder="Tu nombre de usuario"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="pr-10"
                maxLength={30}
              />
              {isChecking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                </div>
              )}
              {!isChecking && alias.trim().length >= 3 && isAvailable === true && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              )}
              {!isChecking && alias.trim().length >= 3 && isAvailable === false && (
                <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
              )}
            </div>

            {/* Alias warnings */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                El alias debe ser único y no contener palabras ofensivas o malsonantes.
              </p>
              {!isChecking && alias.trim().length >= 3 && isAvailable === false && (
                <p className="text-xs text-destructive">
                  Este alias ya está en uso. Por favor, elige otro.
                </p>
              )}
              {alias.trim().length > 0 && alias.trim().length < 3 && (
                <p className="text-xs text-destructive">
                  El alias debe tener al menos 3 caracteres.
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!alias.trim() || alias.trim().length < 3 || !isAvailable || isSaving}
            className="w-full"
          >
            {isSaving ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                <span>Guardando...</span>
              </div>
            ) : (
              "Guardar Alias"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
