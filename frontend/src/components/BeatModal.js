import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, ChevronLeft, ChevronRight, ExternalLink, Mail } from "lucide-react";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [showPayment, setShowPayment] = useState(false);
  const [paypalConfig, setPaypalConfig] = useState(null);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [paymentSent, setPaymentSent] = useState(false);
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  // Fetch PayPal config on mount
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

  // Reset audio when beat changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    }
    setShowPayment(false);
    setPaymentSent(false);
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
    if (beat?.cover_url) {
      return beat.cover_url;
    }
    if (beat?.cover_path) {
      return `${API}/files/${beat.cover_path}`;
    }
    return "https://images.unsplash.com/photo-1706720095318-e3538cae10bf?crop=entropy&cs=srgb&fm=jpg&w=400&q=80";
  };

  const getAudioUrl = () => {
    if (beat?.audio_url) {
      return beat.audio_url;
    }
    if (beat?.audio_path) {
      return `${API}/files/${beat.audio_path}`;
    }
    return null;
  };

  const handlePayPalMeClick = async () => {
    if (!paypalConfig?.paypal_me_username) {
      toast.error("Payment not configured");
      return;
    }

    const price = getSelectedPrice();
    const description = `${beat.title} - ${selectedPriceType.toUpperCase()}`;
    
    // Record the pending payment
    try {
      await fetch(`${API}/payments/record-manual?beat_id=${beat.id}&price_type=${selectedPriceType}&buyer_email=${encodeURIComponent(buyerEmail)}`, {
        method: "POST"
      });
    } catch (error) {
      console.error("Failed to record payment:", error);
    }

    // Open PayPal.me link
    const paypalMeUrl = `https://paypal.me/${paypalConfig.paypal_me_username}/${price}USD`;
    window.open(paypalMeUrl, '_blank');
    
    setPaymentSent(true);
    toast.success("PayPal opened! Complete the payment there.");
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
        setShowPayment(false);
      } else {
        toast.error("Payment recording failed. Please contact support.");
      }
    } catch (error) {
      toast.error("Payment error. Please try again.");
    }
  };

  if (!beat) return null;

  const usePayPalMe = paypalConfig?.use_paypal_me || !paypalConfig?.client_id;

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
          className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Album art */}
          <motion.div 
            className="relative w-72 h-72 md:w-96 md:h-96 rounded-2xl overflow-hidden flex-shrink-0"
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
          {!showPayment ? (
            <div className="w-full space-y-4">
              <div className="flex gap-3 justify-center flex-wrap">
                {[
                  { type: "mp3", label: "MP3", price: beat.price_mp3 },
                  { type: "wav", label: "WAV", price: beat.price_wav },
                  { type: "stems", label: "STEMS", price: beat.price_stems }
                ].map(({ type, label, price }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedPriceType(type)}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium uppercase tracking-wider ${
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
                onClick={() => setShowPayment(true)}
                className="w-full py-4 bg-white text-black font-semibold rounded-full hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
                data-testid="purchase-btn"
              >
                Purchase for {formatPrice(getSelectedPrice())}
              </button>
            </div>
          ) : paymentSent ? (
            /* Payment confirmation screen */
            <div className="w-full space-y-4 text-center">
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6">
                <h3 className="text-green-400 font-semibold text-lg mb-2">Payment Initiated!</h3>
                <p className="text-white/70 text-sm mb-4">
                  Complete the payment in the PayPal window that opened.
                  After payment, send your email to receive the beat files.
                </p>
                <a 
                  href={`mailto:r1zl410@gmail.com?subject=Beat Purchase: ${beat.title}&body=I purchased ${beat.title} (${selectedPriceType.toUpperCase()}) for ${formatPrice(getSelectedPrice())}. My PayPal email is: ${buyerEmail}`}
                  className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-white/90"
                >
                  <Mail className="h-4 w-4" />
                  Send Confirmation Email
                </a>
              </div>
              <button
                onClick={() => {
                  setShowPayment(false);
                  setPaymentSent(false);
                }}
                className="text-white/50 hover:text-white text-sm"
              >
                ← Back
              </button>
            </div>
          ) : usePayPalMe ? (
            /* PayPal.me payment flow (for personal accounts) */
            <div className="w-full space-y-4">
              <button
                onClick={() => setShowPayment(false)}
                className="text-white/50 hover:text-white text-sm"
                data-testid="back-to-options-btn"
              >
                ← Back to options
              </button>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                <h3 className="text-white font-semibold text-center">Complete Purchase</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="buyerEmail" className="text-white/70">Your Email (to receive beat files)</Label>
                  <Input
                    id="buyerEmail"
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                    data-testid="buyer-email-input"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                  <p className="text-white/70 text-sm mb-2">You'll pay:</p>
                  <p className="text-2xl font-bold text-white">{formatPrice(getSelectedPrice())}</p>
                  <p className="text-white/50 text-xs mt-1">{beat.title} - {selectedPriceType.toUpperCase()}</p>
                </div>

                <button
                  onClick={handlePayPalMeClick}
                  disabled={!buyerEmail}
                  className="w-full py-4 bg-[#0070ba] text-white font-semibold rounded-full hover:bg-[#005ea6] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  data-testid="paypal-me-btn"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.65h6.765c2.237 0 3.944.62 5.07 1.845.33.357.594.749.785 1.17.192.422.311.877.352 1.358.006.065.009.13.009.193 0 .065-.003.129-.009.193-.182 1.969-1.2 3.327-2.664 4.1-.83.44-1.778.685-2.818.748.478.318.87.783 1.124 1.363.247.564.383 1.199.407 1.882l.12 5.608a.64.64 0 0 1-.633.707h-4.05a.642.642 0 0 1-.633-.707l.1-4.696c.03-.627-.127-1.095-.469-1.393-.34-.299-.852-.448-1.52-.448H8.39a.77.77 0 0 0-.757.65l-1.19 6.945a.641.641 0 0 1-.633.54l.266-.001Z"/>
                  </svg>
                  Pay with PayPal
                  <ExternalLink className="h-4 w-4" />
                </button>

                <p className="text-white/40 text-xs text-center">
                  You'll be redirected to PayPal to complete the payment
                </p>
              </div>
            </div>
          ) : (
            /* Standard PayPal Buttons (for business accounts) */
            <div className="w-full space-y-4">
              <button
                onClick={() => setShowPayment(false)}
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
