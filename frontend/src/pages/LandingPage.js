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
            filter: "blur(30px) brightness(0.35) saturate(0.7) sepia(0.3)",
            transform: "scale(1.1)"
          }}
        />
      ))}

      {/* Vintage grain overlay */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat"
        }}
      />

      {/* Vignette effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.6) 100%)"
        }}
      />

      {/* Vintage color overlay */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          background: "linear-gradient(180deg, rgba(139, 90, 43, 0.1) 0%, rgba(0,0,0,0) 50%, rgba(139, 90, 43, 0.15) 100%)"
        }}
      />

      <Header />
    </main>
  );
}
