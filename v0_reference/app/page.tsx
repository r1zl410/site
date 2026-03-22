"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { BeatsCarousel, type Beat } from "@/components/beats-carousel"
import { BeatModal } from "@/components/beat-modal"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function Home() {
  const [beats, setBeats] = useState<Beat[]>([])
  const [selectedBeat, setSelectedBeat] = useState<Beat | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchBeats() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("beats")
        .select("*")
        .order("created_at", { ascending: false })
      
      if (error) {
        console.error("Error fetching beats:", error)
      } else {
        setBeats(data || [])
      }
      setIsLoading(false)
    }

    fetchBeats()
  }, [])

  const handleBeatSelect = (beat: Beat, index: number) => {
    setSelectedBeat(beat)
    setSelectedIndex(index)
  }

  const handleNavigate = (index: number) => {
    setSelectedIndex(index)
    setSelectedBeat(beats[index])
  }

  const handlePurchase = (beat: Beat) => {
    router.push(`/checkout/${beat.id}`)
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Header siteName="BEATS" instagramUrl="https://instagram.com" />
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background overflow-hidden">
      <Header siteName="BEATS" instagramUrl="https://instagram.com" />
      
      <BeatsCarousel 
        beats={beats} 
        onBeatSelect={handleBeatSelect}
      />
      
      <BeatModal
        beat={selectedBeat}
        beats={beats}
        currentIndex={selectedIndex}
        onClose={() => setSelectedBeat(null)}
        onNavigate={handleNavigate}
        onPurchase={handlePurchase}
      />
    </main>
  )
}
