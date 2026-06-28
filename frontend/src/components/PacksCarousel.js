import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const PacksCarousel = ({ packs, onPackSelect }) => {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef(null);
  
  // Duplicate packs for seamless infinite scroll
  const duplicatedPacks = packs.length > 0 ? [...packs, ...packs, ...packs, ...packs] : [];
  
  const scrollDuration = Math.max(30, packs.length * 8);

  const handleClick = useCallback((pack, index) => {
    onPackSelect(pack, index % packs.length);
  }, [packs.length, onPackSelect]);

  const getCoverUrl = (pack) => {
    if (pack.cover_url) return pack.cover_url;
    if (pack.cover_path) return `${API}/files/${pack.cover_path}`;
    return "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80";
  };

  if (packs.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center pt-20" data-testid="no-packs-message">
        <p className="text-white/50 text-lg font-light tracking-widest uppercase">
          No packs available yet
        </p>
      </div>
    );
  }

  return (
    <div 
      className="relative h-screen w-full overflow-hidden flex items-center"
      data-testid="packs-carousel"
    >
      <div
        ref={containerRef}
        className={`flex gap-8 animate-scroll ${isPaused ? 'paused' : ''}`}
        style={{ 
          "--scroll-duration": `${scrollDuration}s`,
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {duplicatedPacks.map((pack, index) => (
          <PackCard
            key={`${pack.id}-${index}`}
            pack={pack}
            coverUrl={getCoverUrl(pack)}
            onClick={() => handleClick(pack, index)}
          />
        ))}
      </div>
      
      {/* Gradient overlays */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent pointer-events-none z-10" />
    </div>
  );
};

const PackCard = ({ pack, coverUrl, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex-shrink-0 cursor-pointer focus:outline-none rounded-xl overflow-hidden"
      aria-label={`View ${pack.title}`}
      data-testid={`pack-card-${pack.id}`}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div 
        className="relative w-72 h-72 md:w-80 md:h-80 lg:w-96 lg:h-96"
        style={{
          boxShadow: isHovered 
            ? "0 30px 60px -15px rgba(0, 0, 0, 0.8)" 
            : "0 15px 35px -10px rgba(0, 0, 0, 0.5)"
        }}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-white/5 animate-pulse rounded-xl" />
        )}
        <img
          src={coverUrl}
          alt={pack.title}
          className="w-full h-full object-cover rounded-xl"
          style={{
            transform: isHovered ? "scale(1.08)" : "scale(1)",
            transition: "transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)",
            opacity: imageLoaded ? 1 : 0
          }}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Hover overlay */}
        <div 
          className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center"
          style={{ 
            opacity: isHovered ? 1 : 0,
            transition: "opacity 0.3s ease"
          }}
        >
          <span 
            className="text-white text-xl font-bold tracking-wider uppercase"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {pack.title}
          </span>
        </div>
      </div>
    </motion.button>
  );
};
