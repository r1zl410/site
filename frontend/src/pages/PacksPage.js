import { useState, useEffect } from "react";
import axios from "axios";
import { Header } from "@/components/Header";
import { PacksCarousel } from "@/components/PacksCarousel";
import { PackModal } from "@/components/PackModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Demo packs for display when none in database
const demoPacks = [
  {
    id: "demo-pack-1",
    title: "DARK TRAP KIT",
    cover_url: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80",
    description: "50+ Drums, 30+ Loops, 20+ One Shots",
    price: 29.99
  },
  {
    id: "demo-pack-2", 
    title: "MELODIC WAVES",
    cover_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
    description: "40+ Melody Loops, 25+ Drum Patterns",
    price: 24.99
  },
  {
    id: "demo-pack-3",
    title: "808 ESSENTIALS",
    cover_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    description: "100+ 808s, 50+ Hi-Hats, 30+ Claps",
    price: 19.99
  },
  {
    id: "demo-pack-4",
    title: "VINTAGE SOUL",
    cover_url: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&q=80",
    description: "35+ Soul Samples, 20+ Drum Breaks",
    price: 34.99
  }
];

export default function PacksPage() {
  const [packs, setPacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPacks() {
      try {
        const response = await axios.get(`${API}/packs`);
        if (response.data && response.data.length > 0) {
          setPacks(response.data);
        } else {
          // Use demo packs if none exist in database
          setPacks(demoPacks);
        }
      } catch (error) {
        console.error("Error fetching packs:", error);
        // Use demo packs on error
        setPacks(demoPacks);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPacks();
  }, []);

  const handlePackSelect = (pack, index) => {
    setSelectedPack(pack);
    setSelectedIndex(index);
  };

  const handleNavigate = (index) => {
    setSelectedIndex(index);
    setSelectedPack(packs[index]);
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
    <main className="min-h-screen bg-black overflow-hidden" data-testid="packs-page">
      <Header />
      
      <PacksCarousel 
        packs={packs} 
        onPackSelect={handlePackSelect}
      />
      
      <PackModal
        pack={selectedPack}
        packs={packs}
        currentIndex={selectedIndex}
        onClose={() => setSelectedPack(null)}
        onNavigate={handleNavigate}
      />
    </main>
  );
}
