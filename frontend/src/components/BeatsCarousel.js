import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const BeatsCarousel = ({ beats, onBeatSelect }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);
  const animationRef = useRef(null);
  
  const duplicatedBeats = beats.length > 0 ? [...beats, ...beats, ...beats, ...beats] : [];
  const scrollSpeed = 0.5; // pixels per frame

  // Auto-scroll animation
  useEffect(() => {
    if (!scrollRef.current || beats.length === 0) return;

    const scroll = () => {
      if (!isPaused && !isDragging && scrollRef.current) {
        scrollRef.current.scrollLeft += scrollSpeed;
        
        // Reset scroll position for infinite loop
        const scrollWidth = scrollRef.current.scrollWidth;
        const clientWidth = scrollRef.current.clientWidth;
        const maxScroll = scrollWidth - clientWidth;
        const quarterScroll = scrollWidth / 4;
        
        if (scrollRef.current.scrollLeft >= quarterScroll * 2) {
          scrollRef.current.scrollLeft = quarterScroll;
        }
      }
      animationRef.current = requestAnimationFrame(scroll);
    };

    animationRef.current = requestAnimationFrame(scroll);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, isDragging, beats.length]);

  // Initialize scroll position
  useEffect(() => {
    if (scrollRef.current && beats.length > 0) {
      const scrollWidth = scrollRef.current.scrollWidth;
      scrollRef.current.scrollLeft = scrollWidth / 4;
    }
  }, [beats.length]);

  const handleMouseDown = (e) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    dragStartX.current = e.pageX;
    scrollStartX.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const dx = e.pageX - dragStartX.current;
    scrollRef.current.scrollLeft = scrollStartX.current - dx;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    setIsDragging(false);
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
    }
  };

  // Touch events for mobile
  const handleTouchStart = (e) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setIsPaused(true);
    dragStartX.current = e.touches[0].pageX;
    scrollStartX.current = scrollRef.current.scrollLeft;
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !scrollRef.current) return;
    const dx = e.touches[0].pageX - dragStartX.current;
    scrollRef.current.scrollLeft = scrollStartX.current - dx;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Keep paused for a moment after touch ends
    setTimeout(() => setIsPaused(false), 1000);
  };

  const handleClick = useCallback((beat, index) => {
    if (isDragging) return; // Don't open modal if dragging
    onBeatSelect(beat, index % beats.length);
  }, [beats.length, onBeatSelect, isDragging]);

  const getCoverUrl = (beat) => {
    if (beat.cover_url) return beat.cover_url;
    if (beat.cover_path) return `${API}/files/${beat.cover_path}`;
    return "https://images.unsplash.com/photo-1706720095318-e3538cae10bf?w=400&q=80";
  };

  if (beats.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center pt-20" data-testid="no-beats-message">
        <p className="text-white/50 text-lg font-light tracking-widest uppercase">
          No beats available yet
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden flex items-center"
      data-testid="beats-carousel"
    >
      <div
        ref={scrollRef}
        className="flex gap-8 overflow-x-auto scrollbar-hide cursor-grab select-none"
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Spacer for initial padding */}
        <div className="flex-shrink-0 w-8" />
        
        {duplicatedBeats.map((beat, index) => (
          <BeatCard
            key={`${beat.id}-${index}`}
            beat={beat}
            coverUrl={getCoverUrl(beat)}
            onClick={() => handleClick(beat, index)}
            isDragging={isDragging}
          />
        ))}
        
        {/* Spacer for end padding */}
        <div className="flex-shrink-0 w-8" />
      </div>
      
      {/* Gradient overlays */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent pointer-events-none z-10" />
    </div>
  );
};

const BeatCard = ({ beat, coverUrl, onClick, isDragging }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const clickStartTime = useRef(0);

  const handleMouseDown = () => {
    clickStartTime.current = Date.now();
  };

  const handleClick = () => {
    // Only trigger click if it wasn't a drag (less than 200ms and minimal movement)
    if (Date.now() - clickStartTime.current < 200 && !isDragging) {
      onClick();
    }
  };

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className="group relative flex-shrink-0 cursor-pointer rounded-xl overflow-hidden"
      aria-label={`View ${beat.title}`}
      data-testid={`beat-card-${beat.id}`}
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
          alt={beat.title}
          className="w-full h-full object-cover rounded-xl pointer-events-none"
          style={{
            transform: isHovered ? "scale(1.08)" : "scale(1)",
            transition: "transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)",
            opacity: imageLoaded ? 1 : 0
          }}
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />
        
        {/* Hover overlay */}
        <div 
          className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center pointer-events-none"
          style={{ 
            opacity: isHovered ? 1 : 0,
            transition: "opacity 0.3s ease"
          }}
        >
          <span 
            className="text-white text-xl font-bold tracking-wider uppercase"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {beat.title}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
