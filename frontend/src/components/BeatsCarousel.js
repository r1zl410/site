import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Placeholder images from design guidelines
const PLACEHOLDER_COVERS = [
  "https://images.unsplash.com/photo-1706720095318-e3538cae10bf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHw0fHxhYnN0cmFjdCUyMDNkJTIwcmVuZGVyJTIwc3F1YXJlfGVufDB8fHx8MTc3NDE5NjU4Nnww&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1751401581427-8a4814881712?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMDNkJTIwcmVuZGVyJTIwc3F1YXJlfGVufDB8fHx8MTc3NDE5NjU4Nnww&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?crop=entropy&cs=srgb&fm=jpg&w=400&q=80",
  "https://images.unsplash.com/photo-1557672172-298e090bd0f1?crop=entropy&cs=srgb&fm=jpg&w=400&q=80"
];

export const BeatsCarousel = ({ beats, onBeatSelect }) => {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  
  // Duplicate beats for infinite scroll effect
  const duplicatedBeats = beats.length > 0 ? [...beats, ...beats] : [];
  
  // Calculate duration based on number of beats (slower = more premium feel)
  const scrollDuration = Math.max(40, beats.length * 10);

  const handleMouseEnter = useCallback((beat, index) => {
    setIsPaused(true);
    // Debounce 150ms before opening modal
    hoverTimeoutRef.current = setTimeout(() => {
      onBeatSelect(beat, index % beats.length);
    }, 150);
  }, [beats.length, onBeatSelect]);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, []);

  const getCoverUrl = (beat) => {
    if (beat.cover_path) {
      return `${API}/files/${beat.cover_path}`;
    }
    return PLACEHOLDER_COVERS[0];
  };

  if (beats.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center" data-testid="no-beats-message">
        <p className="text-white/50 text-lg font-light" style={{ fontFamily: 'Manrope, sans-serif' }}>
          No beats available yet
        </p>
      </div>
    );
  }

  return (
    <div 
      className="relative h-screen w-full overflow-hidden flex items-center"
      data-testid="beats-carousel"
    >
      <div
        ref={containerRef}
        className={`flex gap-12 animate-scroll ${isPaused ? 'paused' : ''}`}
        style={{ 
          "--scroll-duration": `${scrollDuration}s`,
        }}
      >
        {duplicatedBeats.map((beat, index) => (
          <BeatCard
            key={`${beat.id}-${index}`}
            beat={beat}
            coverUrl={getCoverUrl(beat)}
            onMouseEnter={() => handleMouseEnter(beat, index)}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      </div>
      
      {/* Gradient overlays for smooth edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent pointer-events-none z-10" />
    </div>
  );
};

const BeatCard = ({ beat, coverUrl, onMouseEnter, onMouseLeave }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.button
      onMouseEnter={() => {
        setIsHovered(true);
        onMouseEnter();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onMouseLeave();
      }}
      className="group relative flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-xl"
      aria-label={`View ${beat.title}`}
      data-testid={`beat-card-${beat.id}`}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div 
        className="relative w-72 h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 overflow-hidden rounded-xl"
        style={{
          boxShadow: isHovered 
            ? "0 30px 60px -15px rgba(0, 0, 0, 0.8)" 
            : "0 15px 35px -10px rgba(0, 0, 0, 0.5)"
        }}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-white/5 animate-pulse" />
        )}
        <img
          src={coverUrl}
          alt={beat.title}
          className="w-full h-full object-cover"
          style={{
            transform: isHovered ? "scale(1.08)" : "scale(1)",
            transition: "transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)",
            opacity: imageLoaded ? 1 : 0
          }}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Hover overlay */}
        <div 
          className="absolute inset-0 bg-black/50"
          style={{ 
            opacity: isHovered ? 1 : 0,
            transition: "opacity 0.3s ease"
          }}
        />
        
        {/* Title overlay on hover */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            opacity: isHovered ? 1 : 0,
            transition: "opacity 0.3s ease"
          }}
        >
          <span 
            className="text-white text-xl font-medium tracking-wide px-6 text-center"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {beat.title}
          </span>
        </div>
      </div>
    </motion.button>
  );
};
