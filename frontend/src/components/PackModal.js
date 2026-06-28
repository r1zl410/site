import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const PackModal = ({ 
  pack, 
  packs, 
  currentIndex, 
  onClose, 
  onNavigate 
}) => {
  const [buyerEmail, setBuyerEmail] = useState("");
  const [paypalConfig, setPaypalConfig] = useState(null);

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
      onNavigate(packs.length - 1);
    }
  }, [currentIndex, packs.length, onNavigate]);

  const navigateNext = useCallback(() => {
    if (currentIndex < packs.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      onNavigate(0);
    }
  }, [currentIndex, packs.length, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!pack) return;

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
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pack, navigatePrev, navigateNext, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (pack) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [pack]);

  const getCoverUrl = () => {
    if (pack?.cover_url) return pack.cover_url;
    if (pack?.cover_path) return `${API}/files/${pack.cover_path}`;
    return "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80";
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

    const price = pack.price || 29.99;
    
    // Open PayPal.me
    const paypalMeUrl = `https://paypal.me/${paypalConfig.paypal_me_username}/${price}EUR`;
    window.open(paypalMeUrl, '_blank');
    toast.success("PayPal aperto! Completa il pagamento.");
  };

  if (!pack) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-testid="pack-modal"
      >
        {/* Backdrop */}
        <motion.div 
          className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          onClick={onClose}
        />
        
        {/* Modal Content */}
        <motion.div 
          className="relative z-10 flex flex-col md:flex-row bg-transparent max-w-4xl w-full max-h-[90vh]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Left - Cover Art */}
          <div className="relative w-full md:w-1/2 aspect-square flex-shrink-0">
            <img
              src={getCoverUrl()}
              alt={pack.title}
              className="w-full h-full object-cover rounded-2xl"
            />
            
            {/* Pack icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500/80 flex items-center justify-center">
                <Package className="h-8 w-8 text-white" />
              </div>
            </div>
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

            {/* Pack Type Label */}
            <span className="text-red-500 text-sm font-medium tracking-widest uppercase mb-2">
              PACK
            </span>

            {/* Title */}
            <h2 
              className="text-3xl md:text-4xl font-bold text-white uppercase tracking-tight mb-4"
              style={{ fontFamily: 'Outfit, sans-serif' }}
              data-testid="modal-pack-title"
            >
              {pack.title}
            </h2>

            {/* Description */}
            <p className="text-white/60 text-sm mb-6">
              {pack.description || "Drum kit professionale con samples di alta qualità."}
            </p>

            {/* Contents */}
            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <span className="text-white/50 text-xs font-medium tracking-widest uppercase block mb-2">
                CONTENUTO
              </span>
              <p className="text-white/80 text-sm">
                {pack.description || "50+ Drums, 30+ Loops, 20+ One Shots"}
              </p>
            </div>

            {/* Price */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-white">Pack Completo</span>
                <span className="text-white font-bold text-xl">
                  {formatPrice(pack.price || 29.99)}
                </span>
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
              Paga con PayPal · {formatPrice(pack.price || 29.99)}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
