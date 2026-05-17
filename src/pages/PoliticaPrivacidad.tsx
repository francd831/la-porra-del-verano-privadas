import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PoliticaPrivacidad() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-10 pb-24">
      <Button variant="ghost" className="mb-4 gap-2 -ml-2 text-muted-foreground hover:text-foreground" asChild>
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>
      </Button>

      <Card className="border border-border/50 bg-card/70 shadow-soft">
        <CardHeader>
          <CardTitle className="text-3xl font-bold font-heading">Política de privacidad</CardTitle>
          <p className="text-sm text-muted-foreground">Última actualización: 18 de mayo de 2026</p>
        </CardHeader>
        <CardContent className="space-y-6 text-sm leading-7 text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Responsable</h2>
            <p>
              La Porra del Verano es una plataforma online para crear pronósticos del Mundial 2026 y competir en clasificaciones generales o ligas privadas.
              Para cualquier consulta sobre privacidad puedes escribir a <a className="text-primary underline-offset-4 hover:underline" href="mailto:hola@laporradelverano.es">hola@laporradelverano.es</a>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. Datos que tratamos</h2>
            <p>
              Tratamos los datos necesarios para que puedas usar la aplicación: identificador de usuario, email, nombre o alias, imagen de perfil cuando proceda,
              ligas a las que perteneces, pronósticos guardados, puntuaciones y actividad básica necesaria para mantener tu sesión.
            </p>
            <p>
              Si accedes con Google, recibimos la información básica que Google comparte para identificarte, como tu email, nombre y avatar, según los permisos que aceptes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. Finalidad</h2>
            <p>
              Usamos tus datos para crear y mantener tu cuenta, guardar tus pronósticos, calcular clasificaciones, permitir la participación en ligas privadas,
              prevenir usos abusivos y resolver incidencias técnicas o solicitudes de soporte.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. Base jurídica</h2>
            <p>
              El tratamiento se basa en tu consentimiento al registrarte o iniciar sesión y en la necesidad de prestar el servicio solicitado.
              Puedes retirar tu consentimiento solicitando la eliminación de tu cuenta.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. Proveedores técnicos</h2>
            <p>
              Utilizamos servicios de terceros para operar la plataforma, entre ellos Supabase para autenticación, base de datos y almacenamiento técnico,
              y proveedores de despliegue web para publicar la aplicación.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">6. Conservación</h2>
            <p>
              Conservaremos tus datos mientras mantengas una cuenta activa o mientras sean necesarios para prestar el servicio. Puedes solicitar la eliminación
              de tus datos escribiendo al email de contacto.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">7. Cesión de datos</h2>
            <p>
              No vendemos tus datos personales. Solo compartimos información con proveedores técnicos cuando es necesario para que la plataforma funcione
              o cuando exista una obligación legal.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">8. Derechos</h2>
            <p>
              Puedes solicitar acceso, rectificación, eliminación, oposición, limitación o portabilidad de tus datos escribiendo a
              <a className="ml-1 text-primary underline-offset-4 hover:underline" href="mailto:hola@laporradelverano.es">hola@laporradelverano.es</a>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">9. Seguridad</h2>
            <p>
              Aplicamos medidas técnicas razonables para proteger la información, incluyendo autenticación gestionada por proveedores especializados
              y políticas de acceso a datos en la base de datos.
            </p>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
