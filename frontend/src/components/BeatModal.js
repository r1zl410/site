import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Music } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const BeatModal = ({ 
  beat, 
  beats, 
  currentIndex, 
  onClose, 
  onNavigate 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState("mp3");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [paypalConfig, setPaypalConfig] = useState(null);
  const audioRef = useRef(null);

  // Fetch PayPal config
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch(`${API}/paypal/config`);
        const data = await response.json();
        setPaypalConfig(data);
      } catch (error) {
        console.error("Failed to fetch PayPal config:", error);
      }
    }
    fetchConfig();
  }, []);

  const navigatePrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else {
      onNavigate(beats.length - 1);
    }
  }, [currentIndex, beats.length, onNavigate]);

  const navigateNext = useCallback(() => {
    if (currentIndex < beats.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      onNavigate(0);
    }
  }, [currentIndex, beats.length, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!beat) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          navigatePrev();
          break;
        case "ArrowRight":
          navigateNext();
          break;
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [beat, navigatePrev, navigateNext, onClose]);

  // Reset when beat changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
    setSelectedLicense("mp3");
  }, [beat?.id]);

  // Prevent body scroll
  useEffect(() => {
    if (beat) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [beat]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const getCoverUrl = () => {
    if (beat?.cover_url) return beat.cover_url;
    if (beat?.cover_path) return `${API}/files/${beat.cover_path}`;
    return "https://images.unsplash.com/photo-1706720095318-e3538cae10bf?w=400&q=80";
  };

  const getAudioUrl = () => {
    if (beat?.audio_url) return beat.audio_url;
    if (beat?.audio_path) return `${API}/files/${beat.audio_path}`;
    return null;
  };

  const getPrice = () => {
    if (!beat) return 0;
    const prices = {
      mp3: beat.price_mp3 || 24.99,
      wav: beat.price_wav || 39.99,
      stems: beat.price_stems || 99.99
    };
    return prices[selectedLicense];
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR"
    }).format(amount);
  };

  const handlePayPalClick = async () => {
    if (!buyerEmail) {
      toast.error("Inserisci la tua email");
      return;
    }
    if (!paypalConfig?.paypal_me_username) {
      toast.error("Pagamento non configurato");
      return;
    }

    const price = getPrice();
    
    // Record payment
    try {
      await fetch(`${API}/payments/record-manual?beat_id=${beat.id}&price_type=${selectedLicense}&buyer_email=${encodeURIComponent(buyerEmail)}`, {
        method: "POST"
      });
    } catch (error) {
      console.error("Failed to record payment:", error);
    }

    // Open PayPal.me
    const paypalMeUrl = `https://paypal.me/${paypalConfig.paypal_me_username}/${price}EUR`;
    window.open(paypalMeUrl, '_blank');
    toast.success("PayPal aperto! Dopo il pagamento riceverai via email il link per scaricare il file (entro poche ore).", { duration: 8000 });
  };

  if (!beat) return null;

  const licenses = [
    { id: "mp3", label: "MP3 Lease", price: beat.price_mp3 || 24.99 },
    { id: "wav", label: "WAV Lease", price: beat.price_wav || 39.99 },
    { id: "stems", label: "Stems (Trackout)", price: beat.price_stems || 99.99 }
  ];

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-testid="beat-modal"
      >
        {/* Backdrop */}
        <motion.div 
          className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          onClick={onClose}
        />
        
        {/* Modal Content - Two Column Layout */}
        <motion.div 
          className="relative z-10 flex flex-col md:flex-row bg-transparent max-w-4xl w-full max-h-[90vh]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Left - Cover Art with Play Button */}
          <div className="relative w-full md:w-1/2 aspect-square flex-shrink-0">
            <img
              src={getCoverUrl()}
              alt={beat.title}
              className="w-full h-full object-cover rounded-2xl"
            />
            
            {/* Play Button Overlay */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center group"
              data-testid="audio-play-btn"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                isPlaying 
                  ? "bg-red-500 scale-100" 
                  : "bg-red-500/80 group-hover:bg-red-500 group-hover:scale-110"
              }`}>
                <Music className="h-8 w-8 text-white" />
              </div>
            </button>

            {/* Playing indicator */}
            {isPlaying && (
              <div className="absolute bottom-4 left-4 bg-red-500 text-white text-xs px-3 py-1 rounded-full">
                In riproduzione
              </div>
            )}

            {/* Hidden audio */}
            {getAudioUrl() && (
              <audio
                ref={audioRef}
                src={getAudioUrl()}
                onEnded={() => setIsPlaying(false)}
                preload="metadata"
              />
            )}
          </div>

          {/* Right - Details */}
          <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
              data-testid="modal-close-btn"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Beat Type Label */}
            <span className="text-red-500 text-sm font-medium tracking-widest uppercase mb-2">
              BEAT
            </span>

            {/* Title */}
            <h2 
              className="text-3xl md:text-4xl font-bold text-white uppercase tracking-tight mb-2"
              style={{ fontFamily: 'Outfit, sans-serif' }}
              data-testid="modal-beat-title"
            >
              {beat.title}
            </h2>

            {/* BPM & Key */}
            <p className="text-white/50 text-sm mb-4">
              {beat.bpm || "140"} BPM · Key: {beat.key || "C Minor"}
            </p>

            {/* Description */}
            <p className="text-white/60 text-sm mb-6">
              Beat originale '{beat.title}', mixato e masterizzato.
            </p>

            {/* License Selection */}
            <div className="mb-6">
              <span className="text-white/50 text-xs font-medium tracking-widest uppercase mb-3 block">
                SCEGLI LA LICENZA
              </span>
              
              <div className="space-y-2">
                {licenses.map((license) => (
                  <button
                    key={license.id}
                    onClick={() => setSelectedLicense(license.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                      selectedLicense === license.id
                        ? "border-red-500 bg-red-500/10"
                        : "border-white/20 hover:border-white/40"
                    }`}
                    data-testid={`license-${license.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {selectedLicense === license.id && (
                        <span className="text-red-500">✓</span>
                      )}
                      <span className="text-white">{license.label}</span>
                    </div>
                    <span className="text-white font-semibold">
                      {formatPrice(license.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Email Input */}
            <div className="mb-4">
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="La tua email (per ricevere i file)"
                className="w-full bg-transparent border-b border-white/30 text-white py-3 px-0 placeholder:text-white/40 focus:outline-none focus:border-white/60"
                data-testid="buyer-email-input"
              />
            </div>

            {/* PayPal Button */}
            <button
              onClick={handlePayPalClick}
              className="w-full py-4 bg-[#C4A052] text-black font-semibold rounded-lg hover:bg-[#D4B062] transition-colors duration-200"
              data-testid="paypal-btn"
            >
              Paga con PayPal · {formatPrice(getPrice())}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
