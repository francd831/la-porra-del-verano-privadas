import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function CrearLiga() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || saving) return;

    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      toast({
        variant: "destructive",
        title: "Nombre demasiado corto",
        description: "La liga necesita al menos 3 caracteres.",
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("leagues")
        .insert({
          name: trimmedName,
          owner_id: user.id,
          plan: "free",
          max_members: 10,
        })
        .select("id")
        .single();

      if (error) throw error;

      toast({
        title: "Liga creada",
        description: "Ya puedes compartir el codigo de invitacion.",
      });
      navigate(`/ligas/${data.id}`);
    } catch (error) {
      console.error("Error creating league:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la liga.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/ligas")}>
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Button>

      <Card className="border-0 bg-gradient-card shadow-strong">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <Users className="h-6 w-6" />
          </div>
          <CardTitle>Crear liga privada</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="league-name">Nombre de la liga</Label>
              <Input
                id="league-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Amigos del verano"
                maxLength={80}
                required
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">Plan inicial</div>
              <div>Free, hasta 10 miembros. Los pronosticos actuales se aplican a todas tus ligas.</div>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={saving}>
              <Plus className="h-4 w-4" />
              {saving ? "Creando..." : "Crear liga"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
