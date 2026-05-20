import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getAuthRedirectUrl } from "@/lib/appMode";
import { supabase } from "@/integrations/supabase/client";

export default function RecuperarPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const isRecoveryUrl =
      urlParams.get("type") === "recovery" ||
      hashParams.get("type") === "recovery" ||
      urlParams.has("code") ||
      hashParams.has("access_token");

    if (isRecoveryUrl) {
      setIsRecoveryMode(true);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl("/recuperar-password"),
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Ha ocurrido un error. Intenta nuevamente.",
        });
      } else {
        setEmailSent(true);
        toast({
          title: "Email enviado",
          description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ha ocurrido un error inesperado. Intenta nuevamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Contraseña demasiado corta",
        description: "La contraseña debe tener al menos 6 caracteres.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Las contraseñas no coinciden",
        description: "Revisa ambos campos e inténtalo de nuevo.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "No hemos podido actualizar la contraseña.",
        });
        return;
      }

      toast({
        title: "Contraseña actualizada",
        description: "Ya puedes iniciar sesión con tu nueva contraseña.",
      });

      await supabase.auth.signOut({ scope: "local" });
      navigate("/login", { replace: true });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ha ocurrido un error inesperado. Intenta nuevamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-muted/30 to-muted/60">
      <div className="w-full max-w-md">
        <Card className="shadow-strong border-0 bg-gradient-card">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto shadow-glow">
              <KeyRound className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {isRecoveryMode ? "Nueva contraseña" : "Recuperar contraseña"}
            </CardTitle>
            <CardDescription>
              {isRecoveryMode
                ? "Introduce una nueva contraseña para tu cuenta"
                : emailSent
                  ? "Te hemos enviado un email con instrucciones para restablecer tu contraseña"
                  : "Introduce tu email y te enviaremos instrucciones para restablecer tu contraseña"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {isRecoveryMode ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Nueva contraseña"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirma la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </div>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 mr-2" />
                      Guardar nueva contraseña
                    </>
                  )}
                </Button>
              </form>
            ) : !emailSent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Enviando...</span>
                    </div>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Enviar instrucciones
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-muted-foreground mb-4">
                  Revisa tu bandeja de entrada y sigue las instrucciones del email.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setEmailSent(false)}
                  className="w-full"
                >
                  Enviar de nuevo
                </Button>
              </div>
            )}

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-primary hover:text-primary-glow font-medium transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver a iniciar sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
