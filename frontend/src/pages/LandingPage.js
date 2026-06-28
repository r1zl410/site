import { useState, useEffect } from "react";
import { Header } from "@/components/Header";

const backgrounds = [
  "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1920&q=80",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1920&q=80",
  "https://images.unsplash.com/photo-1634017839464-5c339afa40e6?w=1920&q=80"
];

export default function LandingPage() {
  const [currentBg, setCurrentBg] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentBg((prev) => (prev + 1) % backgrounds.length);
        setIsTransitioning(false);
      }, 500);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-black overflow-hidden relative" data-testid="landing-page">
      {/* Background layers */}
      {backgrounds.map((bg, index) => (
        <div
          key={index}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            opacity: currentBg === index ? (isTransitioning ? 0 : 1) : 0,
            backgroundImage: `url(${bg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(30px) brightness(0.4)",
            transform: "scale(1.1)"
          }}
        />
      ))}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

      <Header />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
        <h1 
          className="text-6xl md:text-8xl font-bold text-white tracking-tighter mb-4"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          R1ZL410
        </h1>
        <p className="text-white/50 text-lg md:text-xl tracking-widest uppercase mb-12">
          Producer • Beats • Sound Kits
        </p>
        
        {/* CTA Buttons */}
        <div className="flex gap-6">
          <a
            href="/beats"
            className="px-8 py-4 bg-white text-black font-semibold uppercase tracking-wider rounded-full hover:bg-red-500 hover:text-white transition-all duration-300"
          >
            Explore Beats
          </a>
          <a
            href="/packs"
            className="px-8 py-4 bg-transparent border-2 border-white/30 text-white font-semibold uppercase tracking-wider rounded-full hover:border-red-500 hover:text-red-500 transition-all duration-300"
          >
            Sound Packs
          </a>
        </div>

        {/* Background indicator dots */}
        <div className="absolute bottom-12 flex gap-2">
          {backgrounds.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsTransitioning(true);
                setTimeout(() => {
                  setCurrentBg(index);
                  setIsTransitioning(false);
                }, 500);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentBg === index ? "bg-white w-6" : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
