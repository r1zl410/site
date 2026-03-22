import { Instagram } from "lucide-react";
import { Link } from "react-router-dom";

export const Header = ({ siteName = "r1zl410", instagramUrl = "https://www.instagram.com/r1zl410/" }) => {
  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 glass"
      data-testid="header"
    >
      <Link 
        to="/" 
        className="text-2xl font-bold tracking-tighter text-white hover:opacity-70"
        data-testid="site-logo"
        style={{ fontFamily: 'Outfit, sans-serif' }}
      >
        {siteName}
      </Link>
      
      <a
        href={instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-white/70 hover:text-white hover:scale-110"
        aria-label="Instagram"
        data-testid="instagram-link"
      >
        <Instagram className="h-5 w-5" strokeWidth={1.5} />
      </a>
    </header>
  );
};
