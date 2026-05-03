import { useState } from "react";
import { Mail, Send, MessageCircle, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function Contacto() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    mensaje: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulación del envío (aquí irá la integración real)
    setTimeout(() => {
      setIsLoading(false);
      alert("Mensaje enviado correctamente. Te responderemos pronto.");
      setFormData({
        nombre: "",
        email: "",
        mensaje: ""
      });
    }, 2000);
  };
  return <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center shadow-glow">
            <Mail className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Contacto</h1>
            <p className="text-muted-foreground">¿Tienes dudas? Estamos aquí para ayudarte</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Información de contacto */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-soft border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <span>Información</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Email</h4>
                    <p className="text-sm text-muted-foreground">info@laporradelverano.es</p>
                  </div>
                </div>

                

                
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-0 bg-gradient-field text-success-foreground">
            <CardContent className="p-6">
              <h3 className="font-bold mb-2">¿Necesitas ayuda rápida?</h3>
              <p className="text-sm opacity-90 mb-4">
                Consulta nuestras bases del concurso para resolver las dudas más frecuentes.
              </p>
              <Button variant="secondary" size="sm" className="w-full">
                Ver Bases del Concurso
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Formulario de contacto */}
        <div className="lg:col-span-2">
          <Card className="shadow-strong border-0 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-primary" />
                <span>Envíanos un mensaje</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre completo</Label>
                    <Input id="nombre" type="text" placeholder="Tu nombre completo" value={formData.nombre} onChange={(e) => handleInputChange("nombre", e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="tu@email.com" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mensaje">Mensaje</Label>
                  <Textarea id="mensaje" placeholder="Describe tu consulta o problema..." value={formData.mensaje} onChange={(e) => handleInputChange("mensaje", e.target.value)} className="min-h-[120px] resize-none" required />
                </div>

                <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isLoading}>
                  {isLoading ? <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      <span>Enviando...</span>
                    </div> : <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Mensaje
                    </>}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* FAQ rápido */}
          <Card className="shadow-soft border-0 bg-gradient-card mt-8">
            


            <CardContent className="">
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold mb-2">¿Puedo cambiar mis pronósticos?</h4>
                  <p className="text-sm text-muted-foreground">
                    Sí, puedes modificar tus pronósticos hasta 1 hora antes del inicio de cada partido.
                  </p>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold mb-2">¿Hay algún premio para los ganadores?</h4>
                  <p className="text-sm text-muted-foreground">
                    El concurso es principalmente por diversión y orgullo. Los premios se anunciarán antes del torneo.
                  </p>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold mb-2">¿Qué pasa si hay empate en puntos?</h4>
                  <p className="text-sm text-muted-foreground">
                    Los empates se resuelven por orden de registro en la plataforma.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
}