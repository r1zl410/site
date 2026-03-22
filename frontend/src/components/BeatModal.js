import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { PayPalButtons } from "@paypal/react-paypal-js";
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
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedPriceType, setSelectedPriceType] = useState("mp3");
  const [showPayPal, setShowPayPal] = useState(false);
  const audioRef = useRef(null);
  const progressRef = useRef(null);

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

  // Reset audio when beat changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    }
    setShowPayPal(false);
    setSelectedPriceType("mp3");
  }, [beat?.id]);

  // Prevent body scroll when modal is open
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

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration;
    setProgress((current / total) * 100);
    setCurrentTime(current);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleProgressClick = (e) => {
    if (!audioRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audioRef.current.currentTime = percentage * audioRef.current.duration;
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount);
  };

  const getSelectedPrice = () => {
    if (!beat) return 0;
    const prices = {
      mp3: beat.price_mp3,
      wav: beat.price_wav,
      stems: beat.price_stems
    };
    return prices[selectedPriceType] || beat.price_mp3;
  };

  const getCoverUrl = () => {
    if (beat?.cover_path) {
      return `${API}/files/${beat.cover_path}`;
    }
    return "https://images.unsplash.com/photo-1706720095318-e3538cae10bf?crop=entropy&cs=srgb&fm=jpg&w=400&q=80";
  };

  const getAudioUrl = () => {
    if (beat?.audio_path) {
      return `${API}/files/${beat.audio_path}`;
    }
    return null;
  };

  const handlePaymentSuccess = async (orderID) => {
    try {
      const response = await fetch(`${API}/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beat_id: beat.id,
          price_type: selectedPriceType,
          paypal_order_id: orderID
        })
      });
      
      if (response.ok) {
        toast.success("Payment successful! Check your email for download link.");
        setShowPayPal(false);
      } else {
        toast.error("Payment recording failed. Please contact support.");
      }
    } catch (error) {
      toast.error("Payment error. Please try again.");
    }
  };

  if (!beat) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="beat-title"
        data-testid="beat-modal"
      >
        {/* Backdrop with blur */}
        <motion.div 
          className="absolute inset-0 glass-heavy"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="modal-backdrop"
        />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-20 p-3 text-white/50 hover:text-white hover:scale-110"
          aria-label="Close"
          data-testid="modal-close-btn"
        >
          <X className="h-7 w-7" strokeWidth={1.5} />
        </button>

        {/* Navigation arrows */}
        {beats.length > 1 && (
          <>
            <button
              onClick={navigatePrev}
              className="absolute left-6 z-20 p-3 text-white/30 hover:text-white hover:scale-110"
              aria-label="Previous beat"
              data-testid="modal-prev-btn"
            >
              <ChevronLeft className="h-12 w-12" strokeWidth={1} />
            </button>
            
            <button
              onClick={navigateNext}
              className="absolute right-6 z-20 p-3 text-white/30 hover:text-white hover:scale-110"
              aria-label="Next beat"
              data-testid="modal-next-btn"
            >
              <ChevronRight className="h-12 w-12" strokeWidth={1} />
            </button>
          </>
        )}

        {/* Modal content */}
        <motion.div 
          className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-lg w-full"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Album art */}
          <motion.div 
            className="relative w-72 h-72 md:w-96 md:h-96 rounded-2xl overflow-hidden"
            style={{
              boxShadow: "0 50px 100px -20px rgba(0, 0, 0, 0.8)"
            }}
            layoutId={`beat-cover-${beat.id}`}
          >
            <img
              src={getCoverUrl()}
              alt={beat.title}
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Beat info */}
          <div className="text-center space-y-2">
            <h2 
              id="beat-title" 
              className="text-2xl md:text-3xl font-semibold text-white tracking-tight"
              style={{ fontFamily: 'Outfit, sans-serif' }}
              data-testid="modal-beat-title"
            >
              {beat.title}
            </h2>
          </div>

          {/* Audio player */}
          {getAudioUrl() && (
            <div className="w-full space-y-4">
              {/* Progress bar */}
              <div 
                ref={progressRef}
                onClick={handleProgressClick}
                className="relative h-1 bg-white/20 rounded-full cursor-pointer group"
                data-testid="audio-progress-bar"
              >
                <div 
                  className="absolute h-full bg-white rounded-full"
                  style={{ width: `${progress}%` }}
                />
                <div 
                  className="absolute h-3 w-3 bg-white rounded-full -top-1 opacity-0 group-hover:opacity-100"
                  style={{ left: `calc(${progress}% - 6px)` }}
                />
              </div>

              {/* Time display */}
              <div className="flex justify-between text-sm text-white/40 font-light">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Play button */}
              <div className="flex justify-center">
                <button
                  onClick={togglePlay}
                  className="p-4 bg-white rounded-full text-black hover:bg-white/90 hover:scale-105 active:scale-95"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  data-testid="audio-play-btn"
                >
                  {isPlaying ? (
                    <Pause className="h-8 w-8" fill="currentColor" />
                  ) : (
                    <Play className="h-8 w-8 ml-1" fill="currentColor" />
                  )}
                </button>
              </div>

              {/* Hidden audio element */}
              <audio
                ref={audioRef}
                src={getAudioUrl()}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                preload="metadata"
              />
            </div>
          )}

          {/* Pricing options */}
          {!showPayPal ? (
            <div className="w-full space-y-4">
              <div className="flex gap-3 justify-center">
                {[
                  { type: "mp3", label: "MP3", price: beat.price_mp3 },
                  { type: "wav", label: "WAV", price: beat.price_wav },
                  { type: "stems", label: "STEMS", price: beat.price_stems }
                ].map(({ type, label, price }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedPriceType(type)}
                    className={`px-6 py-3 rounded-full text-sm font-medium uppercase tracking-wider ${
                      selectedPriceType === type 
                        ? "bg-white text-black" 
                        : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                    }`}
                    data-testid={`price-option-${type}`}
                  >
                    {label} - {formatPrice(price)}
                  </button>
                ))}
              </div>

              {/* Purchase button */}
              <button
                onClick={() => setShowPayPal(true)}
                className="w-full py-4 bg-white text-black font-semibold rounded-full hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
                data-testid="purchase-btn"
              >
                Purchase for {formatPrice(getSelectedPrice())}
              </button>
            </div>
          ) : (
            <div className="w-full space-y-4">
              <button
                onClick={() => setShowPayPal(false)}
                className="text-white/50 hover:text-white text-sm"
                data-testid="back-to-options-btn"
              >
                ← Back to options
              </button>
              <div className="bg-white rounded-xl p-4">
                <PayPalButtons
                  style={{ layout: "vertical", color: "black", shape: "pill" }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      purchase_units: [
                        {
                          amount: {
                            value: getSelectedPrice().toFixed(2),
                          },
                          description: `${beat.title} - ${selectedPriceType.toUpperCase()}`
                        },
                      ],
                    });
                  }}
                  onApprove={(data, actions) => {
                    return actions.order.capture().then(() => {
                      handlePaymentSuccess(data.orderID);
                    });
                  }}
                  onError={(err) => {
                    toast.error("Payment failed. Please try again.");
                  }}
                />
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
