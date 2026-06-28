import { Link, useLocation } from "react-router-dom";
import { Instagram } from "lucide-react";

export const Header = () => {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) => {
    const base = "text-sm font-medium tracking-widest uppercase transition-colors duration-200";
    if (isActive(path)) {
      return `${base} text-white border-b-2 border-red-500 pb-1`;
    }
    return `${base} text-white/70 hover:text-red-500`;
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 bg-black/60 backdrop-blur-xl border-b border-white/5"
      data-testid="header"
    >
      {/* Logo */}
      <Link 
        to="/" 
        className="text-2xl font-bold tracking-tighter text-white hover:text-red-500 transition-colors duration-200"
        data-testid="site-logo"
        style={{ fontFamily: 'Outfit, sans-serif' }}
      >
        R1ZL410
      </Link>
      
      {/* Navigation */}
      <nav className="flex items-center gap-8">
        <Link 
          to="/beats" 
          className={navLinkClass("/beats")}
          data-testid="nav-beats"
        >
          BEATS
        </Link>
        <Link 
          to="/packs" 
          className={navLinkClass("/packs")}
          data-testid="nav-packs"
        >
          PACKS
        </Link>
      </nav>

      {/* Instagram */}
      <a
        href="https://www.instagram.com/r1zl410/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-white/70 hover:text-red-500 hover:scale-110 transition-all duration-200"
        aria-label="Instagram"
        data-testid="instagram-link"
      >
        <Instagram className="h-5 w-5" strokeWidth={1.5} />
      </a>
    </header>
  );
};
