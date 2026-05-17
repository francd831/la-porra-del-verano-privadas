import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthGuard } from "./components/AuthGuard";
import { AdminGuard } from "./components/AdminGuard";
import { UserGuard } from "./components/UserGuard";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { ScrollToTop } from "./components/ScrollToTop";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import RecuperarPassword from "./pages/RecuperarPassword";
import MiPorra from "./pages/MiPorra";
import MisLigas from "./pages/MisLigas";
import CrearLiga from "./pages/CrearLiga";
import LigaDetalle from "./pages/LigaDetalle";
import Pronosticos from "./pages/Pronosticos";
import Resultados from "./pages/Resultados";
import Clasificacion from "./pages/Clasificacion";
import Bases from "./pages/Bases";
import PoliticaPrivacidad from "./pages/PoliticaPrivacidad";
import CondicionesServicio from "./pages/CondicionesServicio";

import Perfil from "./pages/Perfil";

import MonitorCola from "./pages/MonitorCola";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen pb-16 md:pb-0">
            <Header />
            <BottomNav />
            <ScrollToTop />
            <PWAInstallBanner />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Registro />} />
              <Route path="/recuperar-password" element={<RecuperarPassword />} />
              <Route path="/mi-porra" element={<UserGuard><MiPorra /></UserGuard>} />
              <Route path="/ligas" element={<AuthGuard><MisLigas /></AuthGuard>} />
              <Route path="/ligas/crear" element={<AuthGuard><CrearLiga /></AuthGuard>} />
              <Route path="/ligas/:leagueId" element={<AuthGuard><LigaDetalle /></AuthGuard>} />
              <Route path="/pronosticos" element={<AuthGuard><Pronosticos /></AuthGuard>} />
              <Route path="/resultados" element={<AdminGuard><Resultados /></AdminGuard>} />
              <Route path="/clasificacion" element={<AuthGuard><Clasificacion /></AuthGuard>} />
              <Route path="/bases" element={<Bases />} />
              <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
              <Route path="/condiciones-servicio" element={<CondicionesServicio />} />
               
              <Route path="/perfil" element={<AuthGuard><Perfil /></AuthGuard>} />
              
              <Route path="/monitor-cola" element={<AdminGuard><MonitorCola /></AdminGuard>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
