"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Image from "next/image"
import { X, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react"
import type { Beat } from "./beats-carousel"

interface BeatModalProps {
  beat: Beat | null
  beats: Beat[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
  onPurchase: (beat: Beat) => void
}

export function BeatModal({ 
  beat, 
  beats, 
  currentIndex, 
  onClose, 
  onNavigate,
  onPurchase 
}: BeatModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const navigatePrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1)
    } else {
      onNavigate(beats.length - 1)
    }
  }, [currentIndex, beats.length, onNavigate])

  const navigateNext = useCallback(() => {
    if (currentIndex < beats.length - 1) {
      onNavigate(currentIndex + 1)
    } else {
      onNavigate(0)
    }
  }, [currentIndex, beats.length, onNavigate])

  // Keyboard navigation
  useEffect(() => {
    if (!beat) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose()
          break
        case "ArrowLeft":
          navigatePrev()
          break
        case "ArrowRight":
          navigateNext()
          break
        case " ":
          e.preventDefault()
          togglePlay()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [beat, navigatePrev, navigateNext, onClose])

  // Reset audio when beat changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setProgress(0)
    }
  }, [beat?.id])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (beat) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [beat])

  const togglePlay = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    const current = audioRef.current.currentTime
    const total = audioRef.current.duration
    setProgress((current / total) * 100)
  }

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return
    setDuration(audioRef.current.duration)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    audioRef.current.currentTime = percentage * audioRef.current.duration
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(cents / 100)
  }

  if (!beat) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="beat-title"
    >
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-2 text-white/70 transition-all duration-200 hover:text-white hover:scale-110"
        aria-label="Close"
      >
        <X className="h-6 w-6" strokeWidth={1.5} />
      </button>

      {/* Navigation arrows */}
      <button
        onClick={navigatePrev}
        className="absolute left-6 z-10 p-3 text-white/50 transition-all duration-200 hover:text-white hover:scale-110"
        aria-label="Previous beat"
      >
        <ChevronLeft className="h-10 w-10" strokeWidth={1} />
      </button>
      
      <button
        onClick={navigateNext}
        className="absolute right-6 z-10 p-3 text-white/50 transition-all duration-200 hover:text-white hover:scale-110"
        aria-label="Next beat"
      >
        <ChevronRight className="h-10 w-10" strokeWidth={1} />
      </button>

      {/* Modal content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 max-w-lg w-full animate-in fade-in zoom-in-95 duration-300">
        {/* Album art */}
        <div 
          className="relative w-72 h-72 md:w-96 md:h-96 rounded-xl overflow-hidden shadow-2xl"
          style={{
            boxShadow: "0 50px 100px -20px rgba(0, 0, 0, 0.7)"
          }}
        >
          <Image
            src={beat.cover_url}
            alt={beat.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 288px, 384px"
            priority
          />
        </div>

        {/* Beat info */}
        <div className="text-center space-y-2">
          <h2 id="beat-title" className="text-2xl md:text-3xl font-medium text-white tracking-tight">
            {beat.title}
          </h2>
          <p className="text-white/60 text-lg font-light">
            {formatPrice(beat.price_in_cents)}
          </p>
        </div>

        {/* Audio player */}
        <div className="w-full space-y-4">
          {/* Progress bar */}
          <div 
            ref={progressRef}
            onClick={handleProgressClick}
            className="relative h-1 bg-white/20 rounded-full cursor-pointer group"
          >
            <div 
              className="absolute h-full bg-white rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
            <div 
              className="absolute h-3 w-3 bg-white rounded-full -top-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>

          {/* Time display */}
          <div className="flex justify-between text-sm text-white/50 font-light">
            <span>{formatTime((progress / 100) * duration)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Play button */}
          <div className="flex justify-center">
            <button
              onClick={togglePlay}
              className="p-4 bg-white rounded-full text-black transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" fill="currentColor" />
              ) : (
                <Play className="h-8 w-8 ml-1" fill="currentColor" />
              )}
            </button>
          </div>
        </div>

        {/* Purchase button */}
        {!beat.is_sold && (
          <button
            onClick={() => onPurchase(beat)}
            className="w-full py-4 bg-white text-black font-medium rounded-full transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
          >
            Purchase for {formatPrice(beat.price_in_cents)}
          </button>
        )}

        {beat.is_sold && (
          <div className="w-full py-4 bg-white/10 text-white/50 font-medium rounded-full text-center">
            Sold
          </div>
        )}

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={beat.audio_url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      </div>
    </div>
  )
}
