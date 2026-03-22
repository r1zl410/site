"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"

export interface Beat {
  id: string
  title: string
  cover_url: string
  audio_url: string
  price_in_cents: number
  is_sold: boolean
}

interface BeatsCarouselProps {
  beats: Beat[]
  onBeatSelect: (beat: Beat, index: number) => void
}

export function BeatsCarousel({ beats, onBeatSelect }: BeatsCarouselProps) {
  const [isPaused, setIsPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Duplicate beats for infinite scroll effect
  const duplicatedBeats = [...beats, ...beats]
  
  // Calculate duration based on number of beats (slower = more premium feel)
  const scrollDuration = Math.max(40, beats.length * 8)
  
  if (beats.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-lg font-light">No beats available yet</p>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden flex items-center">
      <div
        ref={containerRef}
        className="flex gap-6 animate-scroll"
        style={{ 
          "--scroll-duration": `${scrollDuration}s`,
          animationPlayState: isPaused ? "paused" : "running"
        } as React.CSSProperties}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {duplicatedBeats.map((beat, index) => (
          <BeatCard
            key={`${beat.id}-${index}`}
            beat={beat}
            onClick={() => onBeatSelect(beat, index % beats.length)}
          />
        ))}
      </div>
      
      {/* Gradient overlays for smooth edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
    </div>
  )
}

interface BeatCardProps {
  beat: Beat
  onClick: () => void
}

function BeatCard({ beat, onClick }: BeatCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
      aria-label={`View ${beat.title}`}
    >
      <div 
        className="relative w-64 h-64 md:w-80 md:h-80 overflow-hidden rounded-lg transition-all duration-500 ease-out"
        style={{
          transform: isHovered ? "scale(1.05)" : "scale(1)",
          boxShadow: isHovered 
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" 
            : "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
        }}
      >
        <Image
          src={beat.cover_url}
          alt={beat.title}
          fill
          className="object-cover transition-transform duration-700 ease-out"
          style={{
            transform: isHovered ? "scale(1.1)" : "scale(1)"
          }}
          sizes="(max-width: 768px) 256px, 320px"
        />
        
        {/* Overlay on hover */}
        <div 
          className="absolute inset-0 bg-black/40 transition-opacity duration-300"
          style={{ opacity: isHovered ? 1 : 0 }}
        />
        
        {/* Title overlay */}
        <div 
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
          style={{ opacity: isHovered ? 1 : 0 }}
        >
          <span className="text-white text-lg font-medium tracking-wide px-4 text-center">
            {beat.title}
          </span>
        </div>
      </div>
    </button>
  )
}
