import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [adminExists, setAdminExists] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin already exists
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

    // Check if already logged in
    const token = localStorage.getItem("admin_token");
    if (token) {
      navigate("/admin");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = isRegister ? "/admin/register" : "/admin/login";
      const response = await axios.post(`${API}${endpoint}`, {
        email,
        password,
      });

      localStorage.setItem("admin_token", response.data.token);
      toast.success(isRegister ? "Admin account created!" : "Logged in successfully!");
      navigate("/admin");
    } catch (error) {
      const message = error.response?.data?.detail || "Authentication failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

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
            {isRegister ? "Create admin account" : "Admin login"}
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
                minLength={6}
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
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black hover:bg-white/90 font-semibold rounded-full py-6"
            data-testid="login-submit-btn"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                {isRegister ? "Creating..." : "Signing in..."}
              </span>
            ) : (
              isRegister ? "Create Admin Account" : "Sign In"
            )}
          </Button>
        </form>

        {/* Toggle register/login */}
        {adminExists && (
          <p className="text-center text-white/40 text-sm">
            Only one admin account is allowed.
          </p>
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
