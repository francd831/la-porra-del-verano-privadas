import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CondicionesServicio() {
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
          <CardTitle className="text-3xl font-bold font-heading">Condiciones de servicio</CardTitle>
          <p className="text-sm text-muted-foreground">Última actualización: 18 de mayo de 2026</p>
        </CardHeader>
        <CardContent className="space-y-6 text-sm leading-7 text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Objeto</h2>
            <p>
              La Porra del Verano permite a los usuarios realizar pronósticos deportivos del Mundial 2026, consultar clasificaciones y crear o participar
              en ligas privadas con otros usuarios.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. Uso de la plataforma</h2>
            <p>
              El usuario se compromete a utilizar la plataforma de forma lícita, respetuosa y conforme a estas condiciones. No está permitido manipular
              resultados, suplantar a otros usuarios, intentar acceder a datos ajenos o usar la aplicación para actividades abusivas.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. Registro y cuenta</h2>
            <p>
              Para guardar pronósticos y participar en clasificaciones es necesario crear una cuenta o iniciar sesión mediante los proveedores disponibles,
              como Google. El usuario es responsable de mantener el control de su cuenta.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. Pronósticos y clasificaciones</h2>
            <p>
              Los pronósticos guardados por cada usuario son únicos y pueden computar en la clasificación general y en las ligas privadas en las que participe.
              La plataforma puede recalcular puntuaciones cuando se actualicen resultados oficiales o reglas internas de puntuación.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. Ligas privadas</h2>
            <p>
              Los usuarios pueden crear ligas privadas e invitar a otras personas mediante código. El propietario de una liga puede gestionar miembros,
              comentarios y ajustes disponibles. La plataforma podrá eliminar ligas que incumplan estas condiciones o generen abuso.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">6. Sin apuestas ni premios económicos</h2>
            <p>
              La plataforma no organiza apuestas, botes ni premios económicos. Cualquier acuerdo privado entre usuarios queda fuera del control y responsabilidad
              de La Porra del Verano.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">7. Disponibilidad</h2>
            <p>
              Intentamos mantener la plataforma disponible y funcionando correctamente, pero no garantizamos disponibilidad ininterrumpida. Pueden producirse
              interrupciones por mantenimiento, incidencias técnicas o servicios de terceros.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">8. Propiedad intelectual y marcas</h2>
            <p>
              La Porra del Verano no está afiliada oficialmente a FIFA ni a los organizadores del Mundial 2026. Las referencias a selecciones, partidos
              o competiciones se usan únicamente para identificar el contexto deportivo del juego.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">9. Cambios</h2>
            <p>
              Podemos actualizar estas condiciones para reflejar cambios técnicos, legales o funcionales. La versión publicada en esta página será la vigente.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">10. Contacto</h2>
            <p>
              Para consultas sobre estas condiciones puedes escribir a
              <a className="ml-1 text-primary underline-offset-4 hover:underline" href="mailto:hola@laporradelverano.es">hola@laporradelverano.es</a>.
            </p>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
