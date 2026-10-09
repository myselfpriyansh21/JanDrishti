import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { X, Lock, Mail, Loader2, ShieldCheck, Eye, EyeOff, UserCheck, Sparkles } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: string, deptId?: string) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [selectedRole, setSelectedRole] = useState<"citizen" | "department_officer" | "admin">("department_officer");
  const [email, setEmail] = useState("officer@jandrishti.gov.in");
  const [password, setPassword] = useState("Demo@12345");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Demo Persona Quick Fill
  const handleSelectPersona = (role: "citizen" | "department_officer" | "admin") => {
    setSelectedRole(role);
    if (role === "citizen") {
      setEmail("citizen@jandrishti.gov.in");
    } else if (role === "department_officer") {
      setEmail("officer@jandrishti.gov.in");
    } else if (role === "admin") {
      setEmail("admin@jandrishti.gov.in");
    }
    setPassword("Demo@12345");
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, department_id")
          .eq("id", data.user.id)
          .maybeSingle();

        const role = profile?.role || selectedRole;
        onSuccess(role, profile?.department_id);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity" 
      />

      {/* Main Glassmorphic Modal Container */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white/85 p-8 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] backdrop-blur-3xl transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Animated Indian Tricolour (Tiranga) High-Visibility Waves */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Saffron Wave (Top) */}
          <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-[#FF9933]/35 blur-3xl animate-pulse" />
          
          {/* White & Navy Glow (Middle) */}
          <div className="absolute top-1/3 left-1/4 h-48 w-48 rounded-full bg-blue-600/15 blur-2xl animate-pulse" />
          
          {/* India Green Wave (Bottom) */}
          <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-[#138808]/35 blur-3xl animate-pulse" />

          {/* Diagonal Tricolour Stripe Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF9933]/25 via-white/40 to-[#138808]/25 opacity-75 mix-blend-multiply" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-20 rounded-full p-2 text-slate-500 hover:bg-slate-100/90 hover:text-slate-800 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="relative z-10 mb-5 flex flex-col items-center text-center">
          <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#101C2C] to-[#1E3A8A] text-white shadow-lg shadow-blue-950/25">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-900">
            Municipal Access Portal
          </h2>
          <p className="text-xs font-medium text-slate-600">
            Sign in with verified credentials or select a demo role
          </p>
        </div>

        {/* Demo Persona Quick Selectors */}
        <div className="relative z-10 mb-5 rounded-2xl border border-white/80 bg-white/60 p-3 shadow-xs backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Quick Demo Access
            </span>
            <span className="text-[10px] font-mono text-slate-500">Pass: Demo@12345</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSelectPersona("citizen")}
              className={`rounded-xl py-1.5 text-xs font-bold transition-all shadow-xs ${
                selectedRole === "citizen"
                  ? "bg-[#101C2C] text-white shadow-md shadow-slate-900/20"
                  : "bg-white/80 text-slate-700 hover:bg-white border border-slate-200"
              }`}
            >
              Citizen
            </button>
            <button
              type="button"
              onClick={() => handleSelectPersona("department_officer")}
              className={`rounded-xl py-1.5 text-xs font-bold transition-all shadow-xs ${
                selectedRole === "department_officer"
                  ? "bg-[#101C2C] text-white shadow-md shadow-slate-900/20"
                  : "bg-white/80 text-slate-700 hover:bg-white border border-slate-200"
              }`}
            >
              PWD Officer
            </button>
            <button
              type="button"
              onClick={() => handleSelectPersona("admin")}
              className={`rounded-xl py-1.5 text-xs font-bold transition-all shadow-xs ${
                selectedRole === "admin"
                  ? "bg-[#101C2C] text-white shadow-md shadow-slate-900/20"
                  : "bg-white/80 text-slate-700 hover:bg-white border border-slate-200"
              }`}
            >
              City Admin
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="relative z-10 space-y-3.5">
          
          {/* Role Dropdown */}
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Authority Level
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <UserCheck className="h-4 w-4" />
              </div>
              <select
                value={selectedRole}
                onChange={(e) => handleSelectPersona(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300/80 bg-white/90 py-2.5 pl-10 pr-3 text-xs font-semibold text-slate-800 shadow-inner backdrop-blur-md transition focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="department_officer">Department Officer (PWD / Jal / Nagar Nigam)</option>
                <option value="admin">City Administrator (Command Center)</option>
                <option value="citizen">Verified Citizen</option>
              </select>
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Email ID
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@jandrishti.gov.in"
                className="w-full rounded-xl border border-slate-300/80 bg-white/90 py-2.5 pl-10 pr-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 shadow-inner backdrop-blur-md transition focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-slate-300/80 bg-white/90 py-2.5 pl-10 pr-10 text-xs font-semibold text-slate-900 placeholder:text-slate-400 shadow-inner backdrop-blur-md transition focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-800 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50/90 p-2.5 text-center text-xs font-bold text-red-700 shadow-xs">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#101C2C] to-[#1E3A8A] py-3 text-xs font-bold text-white shadow-lg shadow-blue-950/25 transition-all duration-200 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Workspace</span>
            )}
          </button>
        </form>

        {/* Footer info badge */}
        <div className="relative z-10 mt-5 border-t border-slate-300/60 pt-3.5 text-center">
          <p className="text-[10px] font-semibold text-slate-500">
            JANDrishti Civic Intelligence Network • Govt of India Initiative
          </p>
        </div>
      </div>
    </div>
  );
}