import { useState, useEffect } from "react";
import { User, Edit, Save, Calendar, Gift, ExternalLink, AlertTriangle, CheckCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NotificationSettings } from "@/components/NotificationSettings";

export default function Perfil() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCheckingAlias, setIsCheckingAlias] = useState(false);
  const [aliasAvailable, setAliasAvailable] = useState<boolean | null>(null);
  const [originalAlias, setOriginalAlias] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const [userData, setUserData] = useState({
    display_name: "",
    email: "",
    fechaRegistro: ""
  });

  const [estadisticas, setEstadisticas] = useState({
    posicionActual: 0,
    puntosTotal: 0,
    puntosGrupos: 0,
    puntosEliminatorias: 0,
    puntosPremios: 0,
    participantes: 0,
  });

  const [prizeStatus, setPrizeStatus] = useState({
    participationRequested: false,
    paymentCompleted: false
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
      fetchPrizeStatus();
    }
  }, [user]);

  const fetchPrizeStatus = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_submissions')
        .select('prize_participation_requested, prize_payment_completed')
        .eq('user_id', user.id)
        .eq('tournament_id', '11111111-1111-1111-1111-111111111111')
        .single();
      
      if (data) {
        setPrizeStatus({
          participationRequested: data.prize_participation_requested || false,
          paymentCompleted: data.prize_payment_completed || false
        });
      }
    } catch (error) {
      console.error('Error fetching prize status:', error);
    }
  };

  const handleAccessPrizes = () => {
    window.open('https://buy.stripe.com/test_00w00j7n3fq4c2z30o43S00', '_blank');
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar el perfil.",
        });
        return;
      }

      if (data) {
        const displayName = data.display_name || '';
        setUserData({
          display_name: displayName,
          email: data.email || user?.email || '',
          fechaRegistro: new Date(data.created_at).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        });
        setOriginalAlias(displayName);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Load user submission
      const { data: submissionData } = await supabase
        .from('user_submissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('tournament_id', '11111111-1111-1111-1111-111111111111')
        .single();

      // Load all submissions for ranking
      const { data: allSubmissions } = await supabase
        .from('user_submissions')
        .select('user_id, points_total')
        .eq('tournament_id', '11111111-1111-1111-1111-111111111111')
        .order('points_total', { ascending: false });

      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      const adminIds = new Set(admins?.map(a => a.user_id) || []);
      const nonAdminSubmissions = allSubmissions?.filter(s => !adminIds.has(s.user_id)) || [];
      const userRank = nonAdminSubmissions.findIndex(s => s.user_id === user.id) + 1;

      setEstadisticas({
        posicionActual: userRank || 0,
        puntosTotal: submissionData?.points_total || 0,
        puntosGrupos: submissionData?.points_groups || 0,
        puntosEliminatorias: submissionData?.points_playoffs || 0,
        puntosPremios: submissionData?.points_awards || 0,
        participantes: nonAdminSubmissions.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
    
    // Reset alias validation when alias changes
    if (field === 'display_name') {
      setAliasAvailable(null);
    }
  };

  // Debounced alias availability check
  useEffect(() => {
    if (!isEditing) return;
    
    const alias = userData.display_name.trim();
    
    // If alias hasn't changed or is the same as original, don't check
    if (alias === originalAlias || alias.length < 3) {
      setAliasAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingAlias(true);
      try {
        const { data, error } = await supabase.rpc('is_display_name_available', {
          p_display_name: alias
        });

        if (error) {
          console.error('Error checking alias:', error);
          setAliasAvailable(null);
        } else {
          setAliasAvailable(data);
        }
      } catch (error) {
        console.error('Error:', error);
        setAliasAvailable(null);
      } finally {
        setIsCheckingAlias(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [userData.display_name, isEditing, originalAlias]);

  const handleSave = async () => {
    if (!user) return;
    
    const alias = userData.display_name.trim();
    
    // Check if alias changed and is not available
    if (alias !== originalAlias && alias.length >= 3 && aliasAvailable === false) {
      toast({
        variant: "destructive",
        title: "Alias no disponible",
        description: "Este alias ya está en uso. Por favor, elige otro.",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: alias,
          email: userData.email,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo guardar el perfil.",
        });
        return;
      }

      setOriginalAlias(alias);
      setAliasAvailable(null);
      toast({
        title: "Perfil actualizado",
        description: "Tus cambios han sido guardados correctamente.",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        variant: "destructive", 
        title: "Error",
        description: "Ocurrió un error inesperado.",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-hero rounded-2xl flex items-center justify-center shadow-glow flex-shrink-0">
              <User className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold truncate">{userData.display_name || 'Usuario'}</h1>
              <p className="text-muted-foreground text-sm truncate">{userData.email}</p>
            </div>
          </div>
          <Button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            variant={isEditing ? "default" : "outline"}
            className="flex items-center space-x-2 w-full sm:w-auto flex-shrink-0"
          >
            {isEditing ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
            <span>{isEditing ? "Guardar" : "Editar"}</span>
          </Button>
        </div>
      </div>


      <Tabs defaultValue="datos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted/30">
          <TabsTrigger value="datos" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Datos</span>
          </TabsTrigger>
          <TabsTrigger value="notificaciones" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span>Notificaciones</span>
          </TabsTrigger>
          <TabsTrigger value="premios" className="flex items-center space-x-2">
            <Gift className="w-4 h-4" />
            <span>Premios</span>
          </TabsTrigger>
        </TabsList>

        {/* Datos Personales */}
        <TabsContent value="datos" className="space-y-6">
          <Card className="shadow-soft border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Alias (Nombre de Usuario)</Label>
                <div className="relative">
                  <Input
                    id="display_name"
                    value={userData.display_name}
                    onChange={(e) => handleInputChange("display_name", e.target.value)}
                    disabled={!isEditing}
                    placeholder="Ingresa tu alias"
                    className="pr-10"
                    maxLength={30}
                  />
                  {isEditing && isCheckingAlias && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    </div>
                  )}
                  {isEditing && !isCheckingAlias && userData.display_name.trim() !== originalAlias && userData.display_name.trim().length >= 3 && aliasAvailable === true && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  )}
                  {isEditing && !isCheckingAlias && userData.display_name.trim() !== originalAlias && userData.display_name.trim().length >= 3 && aliasAvailable === false && (
                    <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    El alias debe ser único y no contener palabras ofensivas o malsonantes.
                  </p>
                  {isEditing && !isCheckingAlias && userData.display_name.trim() !== originalAlias && userData.display_name.trim().length >= 3 && aliasAvailable === false && (
                    <p className="text-xs text-destructive">
                      Este alias ya está en uso. Por favor, elige otro.
                    </p>
                  )}
                  {isEditing && userData.display_name.trim().length > 0 && userData.display_name.trim().length < 3 && (
                    <p className="text-xs text-destructive">
                      El alias debe tener al menos 3 caracteres.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha de Registro</Label>
                <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{userData.fechaRegistro}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificaciones */}
        <TabsContent value="notificaciones" className="space-y-6">
          <NotificationSettings />
        </TabsContent>

        {/* Acceso a Premios */}
        <TabsContent value="premios" className="space-y-6">
          <Card className="shadow-soft border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-gold" />
                Participación en Premios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div>
                    <div className="font-semibold">Estado de participación</div>
                    <div className="text-sm text-muted-foreground">
                      {prizeStatus.paymentCompleted 
                        ? "Estás participando en los premios" 
                        : "No estás participando en los premios"}
                    </div>
                  </div>
                  {prizeStatus.paymentCompleted ? (
                    <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">
                      <Gift className="w-4 h-4 mr-1" />
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inactivo
                    </Badge>
                  )}
                </div>

                {!prizeStatus.paymentCompleted && (
                  <div className="flex flex-col items-center p-6 bg-gold/10 rounded-lg border border-gold/30">
                    <Gift className="w-12 h-12 text-gold mb-3" />
                    <h4 className="font-semibold text-lg mb-2">¿Quieres optar a los premios?</h4>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Por solo <span className="font-bold text-primary">5 €</span> podrás participar en el reparto de premios del concurso.
                    </p>
                    <Button 
                      onClick={handleAccessPrizes}
                      className="bg-gradient-to-r from-gold to-gold/80 text-gold-foreground hover:opacity-90"
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Acceder a premios (5 €)
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información adicional sobre premios */}
          <Card className="shadow-soft border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle>¿Cómo funcionan los premios?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>• El pago de <span className="font-semibold text-foreground">5 €</span> te da acceso a participar en el reparto de premios.</p>
                <p>• Los premios se repartirán entre los participantes con mejor puntuación que hayan activado esta opción.</p>
                <p>• Puedes ver quién participa en premios en la clasificación (icono 🎁).</p>
                <p>• El pago es único para todo el torneo.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
