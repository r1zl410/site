import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Check } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [adminExists, setAdminExists] = useState(true);
  const [showVerification, setShowVerification] = useState(false);
  
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAdmin() {
      try {
        const response = await axios.get(`${API}/admin/check`);
        setAdminExists(response.data.exists);
        setIsRegister(!response.data.exists);
      } catch (error) {
        console.error("Error checking admin:", error);
      }
    }
    checkAdmin();

    const token = localStorage.getItem("admin_token");
    if (token) {
      navigate("/admin");
    }
  }, [navigate]);

  useEffect(() => {
    setPasswordChecks({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  }, [password]);

  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isRegister && !isPasswordStrong) {
      toast.error("Crea una password più forte");
      return;
    }
    
    setIsLoading(true);

    try {
      const endpoint = isRegister ? "/admin/register" : "/admin/login";
      const response = await axios.post(`${API}${endpoint}`, { email, password });

      if (response.data.requires_verification) {
        setShowVerification(true);
        if (response.data.email_sent) {
          toast.success("Codice di verifica inviato alla tua email!");
        } else {
          toast.error("Errore invio email. Riprova.");
        }
      }
    } catch (error) {
      const message = error.response?.data?.detail || "Autenticazione fallita";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/admin/verify`, {
        email,
        code: verificationCode
      });

      localStorage.setItem("admin_token", response.data.token);
      toast.success("Login effettuato!");
      navigate("/admin");
    } catch (error) {
      const message = error.response?.data?.detail || "Codice non valido";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Verification screen
  if (showVerification) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6" data-testid="verification-page">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Mail className="h-12 w-12 text-red-500" />
            </div>
            <h1 
              className="text-2xl font-bold text-white tracking-tighter mb-2"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Controlla la tua email
            </h1>
            <p className="text-white/50 text-sm">
              Abbiamo inviato un codice a 6 cifre a<br/>
              <span className="text-white">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-white/70">Codice di verifica</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                className="bg-white/5 border-white/10 text-white text-center text-2xl tracking-[0.5em] placeholder:text-white/30 focus:border-white/30"
                data-testid="verification-code-input"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full bg-white text-black hover:bg-white/90 font-semibold rounded-full py-6"
              data-testid="verify-btn"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  Verifica...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Verifica e Accedi
                </span>
              )}
            </Button>
          </form>

          <div className="text-center space-y-4">
            <button
              onClick={() => {
                setShowVerification(false);
                setVerificationCode("");
              }}
              className="text-white/50 text-sm hover:text-white"
            >
              ← Torna indietro
            </button>
            
            <p className="text-white/30 text-xs">
              Il codice scade tra 10 minuti
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6" data-testid="admin-login-page">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 
            className="text-3xl font-bold text-white tracking-tighter mb-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            r1zl410
          </h1>
          <p className="text-white/50 text-sm">
            {isRegister ? "Crea account admin" : "Admin login"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/70">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
              data-testid="email-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/70">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 pr-12"
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {isRegister && password.length > 0 && (
              <div className="space-y-1 mt-2">
                <PasswordCheck label="Almeno 8 caratteri" checked={passwordChecks.length} />
                <PasswordCheck label="Una lettera maiuscola" checked={passwordChecks.uppercase} />
                <PasswordCheck label="Una lettera minuscola" checked={passwordChecks.lowercase} />
                <PasswordCheck label="Un numero" checked={passwordChecks.number} />
                <PasswordCheck label="Un carattere speciale (!@#$%^&*)" checked={passwordChecks.special} />
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading || (isRegister && !isPasswordStrong)}
            className="w-full bg-white text-black hover:bg-white/90 font-semibold rounded-full py-6"
            data-testid="login-submit-btn"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                {isRegister ? "Creazione..." : "Accesso..."}
              </span>
            ) : (
              isRegister ? "Crea Account" : "Accedi"
            )}
          </Button>
        </form>

        {isRegister && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400 text-sm flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
              Riceverai un codice di verifica via email ad ogni login
            </p>
          </div>
        )}

        <div className="text-center">
          <a href="/" className="text-white/50 text-sm hover:text-white">
            ← Torna al sito
          </a>
        </div>
      </div>
    </div>
  );
}

function PasswordCheck({ label, checked }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${checked ? 'text-green-400' : 'text-white/40'}`}>
      <div className={`h-1.5 w-1.5 rounded-full ${checked ? 'bg-green-400' : 'bg-white/40'}`} />
      {label}
    </div>
  );
}
