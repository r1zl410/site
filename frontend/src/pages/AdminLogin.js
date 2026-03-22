import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Shield, Check } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [adminExists, setAdminExists] = useState(true);
  
  // 2FA Setup state
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [setupCode, setSetupCode] = useState("");
  
  // Password strength indicators
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

  // Check password strength
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
      toast.error("Please create a stronger password");
      return;
    }
    
    setIsLoading(true);

    try {
      if (isRegister) {
        // Registration flow
        const response = await axios.post(`${API}/admin/register`, {
          email,
          password,
        });

        if (response.data.requires_2fa_setup) {
          setTempToken(response.data.temp_token);
          setQrCode(response.data.qr_code);
          setManualCode(response.data.manual_code);
          setShow2FASetup(true);
          toast.success("Account created! Now set up 2FA for security.");
        }
      } else {
        // Login flow
        const response = await axios.post(`${API}/admin/login`, {
          email,
          password,
          totp_code: totpCode || undefined
        });

        localStorage.setItem("admin_token", response.data.token);
        toast.success("Logged in successfully!");
        navigate("/admin");
      }
    } catch (error) {
      const message = error.response?.data?.detail || "Authentication failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API}/admin/verify-2fa-setup`,
        { totp_code: setupCode },
        { headers: { Authorization: `Bearer ${tempToken}` } }
      );

      localStorage.setItem("admin_token", response.data.token);
      toast.success("2FA setup complete! Your account is now secure.");
      navigate("/admin");
    } catch (error) {
      const message = error.response?.data?.detail || "Invalid code";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2FA Setup Screen
  if (show2FASetup) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6" data-testid="2fa-setup-page">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-green-500" />
            </div>
            <h1 
              className="text-2xl font-bold text-white tracking-tighter mb-2"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Set Up 2FA
            </h1>
            <p className="text-white/50 text-sm">
              Scan this QR code with Google Authenticator or Authy
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-xl">
              <img 
                src={`data:image/png;base64,${qrCode}`} 
                alt="2FA QR Code"
                className="w-48 h-48"
                data-testid="2fa-qr-code"
              />
            </div>
          </div>

          {/* Manual code */}
          <div className="text-center">
            <p className="text-white/50 text-xs mb-2">Or enter this code manually:</p>
            <code className="bg-white/10 px-4 py-2 rounded-lg text-white font-mono text-sm">
              {manualCode}
            </code>
          </div>

          {/* Verify code */}
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setupCode" className="text-white/70">Enter 6-digit code from app</Label>
              <Input
                id="setupCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                className="bg-white/5 border-white/10 text-white text-center text-2xl tracking-[0.5em] placeholder:text-white/30 focus:border-white/30"
                data-testid="2fa-setup-code-input"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || setupCode.length !== 6}
              className="w-full bg-green-600 text-white hover:bg-green-700 font-semibold rounded-full py-6"
              data-testid="verify-2fa-btn"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Activate 2FA
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6" data-testid="admin-login-page">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 
            className="text-3xl font-bold text-white tracking-tighter mb-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            r1zl410
          </h1>
          <p className="text-white/50 text-sm">
            {isRegister ? "Create secure admin account" : "Admin login"}
          </p>
        </div>

        {/* Form */}
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
                data-testid="toggle-password-btn"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {/* Password strength indicators for registration */}
            {isRegister && password.length > 0 && (
              <div className="space-y-1 mt-2">
                <PasswordCheck label="At least 8 characters" checked={passwordChecks.length} />
                <PasswordCheck label="One uppercase letter" checked={passwordChecks.uppercase} />
                <PasswordCheck label="One lowercase letter" checked={passwordChecks.lowercase} />
                <PasswordCheck label="One number" checked={passwordChecks.number} />
                <PasswordCheck label="One special character (!@#$%^&*)" checked={passwordChecks.special} />
              </div>
            )}
          </div>

          {/* 2FA Code for login */}
          {!isRegister && adminExists && (
            <div className="space-y-2">
              <Label htmlFor="totp" className="text-white/70 flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                2FA Code
              </Label>
              <Input
                id="totp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="bg-white/5 border-white/10 text-white text-center text-xl tracking-[0.3em] placeholder:text-white/30 focus:border-white/30"
                data-testid="totp-input"
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || (isRegister && !isPasswordStrong)}
            className="w-full bg-white text-black hover:bg-white/90 font-semibold rounded-full py-6"
            data-testid="login-submit-btn"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                {isRegister ? "Creating..." : "Signing in..."}
              </span>
            ) : (
              isRegister ? "Create Secure Account" : "Sign In"
            )}
          </Button>
        </form>

        {/* Info text */}
        {isRegister && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <p className="text-green-400 text-sm flex items-start gap-2">
              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
              Your account will be protected with 2FA (Two-Factor Authentication)
            </p>
          </div>
        )}

        {/* Back to site */}
        <div className="text-center">
          <a 
            href="/" 
            className="text-white/50 text-sm hover:text-white"
          >
            ← Back to site
          </a>
        </div>
      </div>
    </div>
  );
}

// Password check component
function PasswordCheck({ label, checked }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${checked ? 'text-green-400' : 'text-white/40'}`}>
      <div className={`h-1.5 w-1.5 rounded-full ${checked ? 'bg-green-400' : 'bg-white/40'}`} />
      {label}
    </div>
  );
}
