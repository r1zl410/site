import { useState, useEffect } from "react";
import axios from "axios";
import { Header } from "@/components/Header";
import { BeatsCarousel } from "@/components/BeatsCarousel";
import { BeatModal } from "@/components/BeatModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function HomePage() {
  const [beats, setBeats] = useState([]);
  const [selectedBeat, setSelectedBeat] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBeats() {
      try {
        const response = await axios.get(`${API}/beats`);
        setBeats(response.data);
      } catch (error) {
        console.error("Error fetching beats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBeats();
  }, []);

  const handleBeatSelect = (beat, index) => {
    setSelectedBeat(beat);
    setSelectedIndex(index);
  };

  const handleNavigate = (index) => {
    setSelectedIndex(index);
    setSelectedBeat(beats[index]);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-black" data-testid="loading-screen">
        <Header />
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black overflow-hidden" data-testid="home-page">
      <Header />
      
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
      />
    </main>
  );
}
