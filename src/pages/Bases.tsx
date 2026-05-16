import { FileText, Target, Trophy, Award, Calendar, Users, Clock, CheckCircle, XCircle, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
export default function Bases() {
  return <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center shadow-glow">
            <FileText className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Bases del Juego</h1>
            <p className="text-muted-foreground">Reglas y sistema de puntuación</p>
          </div>
        </div>
      </div>

      {/* Objetivo del Concurso */}
      <div className="space-y-6 mb-8">
        

        <Card className="shadow-soft border-0 bg-gradient-card">
          <CardContent className="space-y-4 pt-[8px]">
            
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="flex items-center space-x-3 p-4 bg-gold/10 rounded-lg border border-gold/20">
                  <Trophy className="w-8 h-8 text-gold" />
                  <div>
                    <h4 className="font-semibold">Ligas privadas</h4>
                    <p className="text-sm text-muted-foreground">Compite con tus amigos</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <Clock className="w-8 h-8 text-destructive" />
                  <div>
                    <h4 className="font-semibold">Fecha Límite</h4>
                    <p className="text-sm text-muted-foreground">10 Jun 2026, 23:59</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-primary/5 rounded-lg">
                  <Calendar className="w-8 h-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">Fechas del Concurso</h4>
                    <p className="text-sm text-muted-foreground">11 Jun - 19 Jul 2026</p>
                  </div>
                </div>
              </div>
          </CardContent>
        </Card>
      </div>

      {/* Ligas privadas */}
      <div className="space-y-6 mb-8">
        <h2 className="text-2xl font-bold flex items-center space-x-2">
          <Users className="w-6 h-6 text-gold" />
          <span>Ligas Privadas</span>
        </h2>

        <Card className="shadow-soft border-0 bg-gradient-card">
          <CardContent className="pt-6">
            <p className="text-foreground leading-relaxed mb-4">
              Crea tu propia liga privada e invita a amigos, familia o compañeros para competir juntos.
            </p>
            <ul className="space-y-2 text-foreground">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-gold rounded-full mt-2 flex-shrink-0"></span>
                <span>Crea una liga privada para tu grupo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-gold rounded-full mt-2 flex-shrink-0"></span>
                <span>Únete a ligas mediante código de invitación</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-gold rounded-full mt-2 flex-shrink-0"></span>
                <span>Cada liga tiene su propia clasificación privada</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-gold rounded-full mt-2 flex-shrink-0"></span>
                <span>Tus predicciones son únicas y cuentan para todas tus ligas</span>
              </li>
            </ul>
            <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-muted/30 text-xs text-muted-foreground space-y-1">
              <p>La plataforma no organiza apuestas, botes ni premios económicos.</p>
              <p>Cualquier incentivo privado entre miembros de una liga queda fuera de la responsabilidad de la plataforma.</p>
            </div>
          </CardContent>
        </Card>
      </div>





      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center space-x-2">
          <Target className="w-6 h-6 text-primary" />
          <span>Sistema de Puntuación</span>
        </h2>

        {/* Fase de Grupos */}
        <Card className="shadow-soft border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">1</span>
              </div>
              <span>Fase de Grupos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg text-primary-foreground">
                  <span className="text-primary-foreground">Acertar goles local</span>
                  <Badge variant="outline" className="bg-success text-success-foreground">+ 2 + nº goles</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span>Acertar goles visitante</span>
                  <Badge variant="outline" className="bg-success text-success-foreground">+ 2 + nº goles</Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="text-primary-foreground">Acertar signo (1X2)</span>
                  <Badge variant="outline" className="bg-success text-success-foreground">+ 5</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg border border-success/20">
                  <span className="font-medium">Resultado exacto</span>
                  <Badge className="bg-success text-success-foreground">+ 6</Badge>
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="flex justify-between items-center p-3 bg-gold/10 rounded-lg border border-gold/20">
                  <span className="font-medium">Acertar el orden exacto en la clasificación final de cada grupo</span>
                  <div className="flex flex-col items-end">
                    <Badge className="bg-gold text-gold-foreground">+20</Badge>
                    <span className="text-xs text-muted-foreground mt-1">por grupo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ejemplos visuales */}
            <div className="mt-6 space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ejemplos</h4>
              
              {/* Ejemplo 1 - Resultado exacto */}
              <div className="p-3 bg-success/10 rounded-lg border border-success/20 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                    <span className="font-semibold text-success text-sm">Resultado Exacto</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <Badge variant="outline" className="text-xs px-2 py-0.5">Pronóstico: 3-1</Badge>
                    <span className="text-muted-foreground text-xs">→</span>
                    <Badge variant="outline" className="text-xs px-2 py-0.5">Resultado: 3-1</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">5 (signo) + 5 (2+3 local) + 3 (2+1 visitante) + 6 (exacto)</p>
                </div>
                <Badge className="text-success-foreground text-base px-3 py-1.5 flex-shrink-0 bg-[#004db3]">+19</Badge>
              </div>

              {/* Ejemplo 2 - Aciertas signo y local */}
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-semibold text-primary text-sm">Aciertas signo y goles local</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <Badge variant="outline" className="text-xs px-2 py-0.5">Pronóstico: 2-1</Badge>
                    <span className="text-muted-foreground text-xs">→</span>
                    <Badge variant="outline" className="text-xs px-2 py-0.5">Resultado: 2-0</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">5 (signo) + 4 (2+2 local)</p>
                </div>
                <Badge className="bg-primary text-primary-foreground text-base px-3 py-1.5 flex-shrink-0">+9</Badge>
              </div>

              {/* Ejemplo 3 - Aciertas signo y visitante */}
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-semibold text-primary text-sm">Aciertas signo y goles visitante</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <Badge variant="outline" className="text-xs px-2 py-0.5">Pronóstico: 2-1</Badge>
                    <span className="text-muted-foreground text-xs">→</span>
                    <Badge variant="outline" className="text-xs px-2 py-0.5">Resultado: 3-1</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">5 (signo) + 3 (2+1 visitante)</p>
                </div>
                <Badge className="bg-primary text-primary-foreground text-base px-3 py-1.5 flex-shrink-0">+8</Badge>
              </div>

              {/* Ejemplo 4 - Solo aciertas visitante */}
              <div className="p-3 bg-muted/30 rounded-lg border flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-semibold text-muted-foreground text-sm">Solo aciertas goles visitante</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <Badge variant="outline" className="text-xs px-2 py-0.5">Pronóstico: 2-1</Badge>
                    <span className="text-muted-foreground text-xs">→</span>
                    <Badge variant="outline" className="text-xs px-2 py-0.5">Resultado: 0-1</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">3 (2+1 visitante)</p>
                </div>
                <Badge variant="outline" className="text-base px-3 py-1.5 flex-shrink-0 bg-[#004db3] text-white">+3</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fase Eliminatoria */}
        <Card className="shadow-soft border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                  <span className="text-secondary-foreground font-bold text-sm">2</span>
                </div>
                <span>Fase Eliminatoria</span>
              </span>
              <Badge className="bg-primary/20 text-primary-foreground border-primary/30">
                Puntos por equipo clasificado
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Por cada equipo que hayas predicho correctamente en cada ronda:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span>Dieciseisavos de final</span>
                  <Badge variant="outline" className="bg-success text-success-foreground">+ 10</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span>Octavos de final</span>
                  <Badge variant="outline" className="bg-success text-success-foreground">+ 15</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span>Cuartos de final</span>
                  <Badge variant="outline" className="bg-success text-success-foreground">+ 20</Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span>Semifinales</span>
                  <Badge variant="outline" className="bg-success text-success-foreground">+ 30</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span>Final</span>
                  <Badge variant="outline" className="bg-success text-success-foreground">+ 40</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gold/20 rounded-lg border border-gold/30">
                  <span className="font-bold">Campeón</span>
                  <Badge className="bg-gold text-gold-foreground">+ 50</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premios Individuales */}
        <Card className="shadow-soft border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-gold-foreground" />
                </div>
                <span>Premios Individuales</span>
              </span>
              <Badge className="bg-gold/20 text-gold border-gold/30">
                30 puntos cada uno
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center p-4 bg-gold/10 rounded-lg border border-gold/20">
                <div className="flex items-center space-x-3">
                  <Trophy className="w-6 h-6 text-gold" />
                  <span className="font-medium">Balón de Oro</span>
                </div>
                <Badge className="bg-gold text-gold-foreground">+ 30</Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-gold/10 rounded-lg border border-gold/20">
                <div className="flex items-center space-x-3">
                  <Target className="w-6 h-6 text-gold" />
                  <span className="font-medium">Bota de Oro</span>
                </div>
                <Badge className="bg-gold text-gold-foreground">+ 30</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacto */}
      <div className="mt-8 mb-4">
        <Card className="shadow-soft border-0 bg-gradient-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">¿Tienes dudas?</h3>
                <p className="text-sm text-muted-foreground">Escríbenos a nuestro email</p>
              </div>
            </div>
            <a href="mailto:info@laporradelverano.es" className="text-primary hover:underline font-medium">
              info@laporradelverano.es
            </a>
          </CardContent>
        </Card>
      </div>
    </div>;}
