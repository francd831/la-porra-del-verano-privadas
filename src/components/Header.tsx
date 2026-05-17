import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Target, Award, FileText, User, Menu, X, LogOut, Home, Trophy, LucideIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isPrivateLeaguesApp } from "@/lib/appMode";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon | null;
  userOnly?: boolean;
  requiresAuth?: boolean;
  adminOnly?: boolean;
}

const navigation: NavItem[] = [
  { name: "Inicio", href: "/dashboard", icon: Home, userOnly: true },
  { name: "Mi Porra", href: "/mi-porra", icon: Target, userOnly: true },
  { name: "Pronósticos", href: "/pronosticos", icon: Target, requiresAuth: true },
  { name: "Resultados", href: "/resultados", icon: Award, adminOnly: true },
  { name: "Clasificación", href: "/clasificacion", icon: Trophy, requiresAuth: true },
  { name: "¿Cómo funciona?", href: "/bases", icon: FileText },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ display_name?: string; email?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      checkAdminStatus();
    } else {
      setUserProfile(null);
      setIsAdmin(false);
    }
  }, [user]);

  // Scroll detection for header transparency
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsAtTop(scrollTop < 10);
      setIsScrolling(true);
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Set timeout to detect when scrolling stops
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  // Determine header opacity classes
  const getHeaderClasses = () => {
    const baseClasses = "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ease-in-out border-b border-border/50";
    
    if (isAtTop) {
      return `${baseClasses} bg-card/80 backdrop-blur-xl`;
    }
    
    if (isScrolling) {
      return `${baseClasses} bg-card/50 backdrop-blur-xl`;
    }
    
    return `${baseClasses} bg-card/70 backdrop-blur-xl`;
  };

  // Filter navigation items based on auth state
  const getVisibleNavItems = () => {
    return navigation.filter(item => {
      if (item.href.startsWith("/ligas") && !isPrivateLeaguesApp()) return false;
      if (item.adminOnly) return isAdmin;
      if (item.userOnly) return user && !isAdmin;
      if (item.requiresAuth) return !!user;
      return true;
    });
  };

  return (
    <>
      {/* Spacer to prevent content from going under fixed header */}
      <div className="h-16" />
      
      <header className={getHeaderClasses()}>
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2 group">
              <img src="/mundial-icon-64.webp" alt="Mundial 2026" width={40} height={40} className="w-10 h-10 rounded-full shadow-glow group-hover:shadow-strong transition-all duration-300" />
              <span className="font-bold text-lg bg-gradient-hero bg-clip-text text-transparent">
                Mundial 2026
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {getVisibleNavItems().map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "hover:bg-muted hover:shadow-soft"
                    }`}
                  >
                    {item.icon && <item.icon className="w-4 h-4" />}
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Profile/Auth Button */}
            <div className="hidden md:flex items-center space-x-2">
              {user ? (
                <>
                  <Link to="/perfil">
                    <Button variant="outline" size="sm" className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{userProfile?.display_name || 'Perfil'}</span>
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSignOut}
                    className="flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Salir</span>
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="outline" size="sm">
                      Iniciar Sesión
                    </Button>
                  </Link>
                  <Link to="/registro">
                    <Button size="sm">
                      Registrarse
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-border bg-card">
              <nav className="flex flex-col space-y-2">
                {getVisibleNavItems().map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      {item.icon && <item.icon className="w-5 h-5" />}
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
               
                {user ? (
                  <>
                    <Link
                      to="/perfil"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-all duration-200"
                    >
                      <User className="w-5 h-5" />
                      <span className="font-medium">{userProfile?.display_name || 'Perfil'}</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-all duration-200 text-left w-full"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Salir</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center px-4 py-3 rounded-lg bg-primary text-primary-foreground transition-all duration-200"
                    >
                      <span className="font-medium">Iniciar Sesión</span>
                    </Link>
                    <Link
                      to="/registro"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center px-4 py-3 rounded-lg border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                    >
                      <span className="font-medium">Registrarse</span>
                    </Link>
                  </>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
