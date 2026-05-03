import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Users, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
        title: "¡Liga creada! 🎉",
        description: "Comparte el código de invitación con tu grupo.",
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
    <div className="container mx-auto px-4 py-6 max-w-lg pb-24">
      <Button variant="ghost" className="mb-6 gap-2 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => navigate("/ligas")}>
        <ArrowLeft className="h-4 w-4" />
        Mis ligas
      </Button>

      {/* Hero header */}
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-glow">
          <Trophy className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Crear liga privada</h1>
        <p className="text-muted-foreground text-sm">
          Compite con amigos, familia o compañeros en tu propio ranking.
        </p>
      </div>

      <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-strong overflow-hidden">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="league-name" className="text-sm font-semibold">
                Nombre de la liga
              </Label>
              <Input
                id="league-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. La Porra del Curro 🏆"
                maxLength={80}
                required
                className="h-12 text-base bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Elige algo memorable — tus amigos lo verán al unirse.
              </p>
            </div>

            {/* Plan info */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Plan inicial: Free</span>
                <Badge variant="secondary" className="text-xs">Gratis</Badge>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-primary/60" />
                  Hasta 10 miembros
                </li>
                <li className="flex items-center gap-2">
                  <Trophy className="h-3.5 w-3.5 text-primary/60" />
                  Ranking y estadísticas completas
                </li>
              </ul>
              <p className="text-xs text-muted-foreground/70 border-t border-border/30 pt-2">
                Podrás ampliar a Pro, Max o Business después.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 gap-2 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow transition-all duration-300 hover:shadow-strong"
              disabled={saving}
            >
              <Plus className="h-5 w-5" />
              {saving ? "Creando tu liga..." : "Crear liga"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
