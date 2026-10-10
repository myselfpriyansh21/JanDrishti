import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { ShieldCheck, X, Eye, EyeOff, Loader2 } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: string, deptId?: string) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  // Default demo selection set to 'citizen'
  const [selectedRole, setSelectedRole] = useState<"citizen" | "department_officer" | "admin">("citizen");
  const [email, setEmail] = useState("citizen@jandrishti.gov.in");
  const [password, setPassword] = useState("Demo@12345");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRoleSelect = (role: "citizen" | "department_officer" | "admin") => {
    setSelectedRole(role);
    if (role === "citizen") {
      setEmail("citizen@jandrishti.gov.in");
      setPassword("Demo@12345");
    } else if (role === "department_officer") {
      setEmail("officer@jandrishti.gov.in");
      setPassword("Demo@12345");
    } else {
      setEmail("admin@jandrishti.gov.in");
      setPassword("Demo@12345");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      let role = selectedRole;
      let deptId: string | undefined = undefined;

      if (authData.user) {
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("role, department_id")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (profile?.role) {
          role = profile.role;
          deptId = profile.department_id;
        }
      }

      onSuccess(role, deptId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-white/95 backdrop-blur-2xl p-6 sm:p-7 shadow-2xl border border-white/80 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight text-slate-900">
              Municipal Access Portal
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Sign in with verified credentials or select a demo role
            </p>
          </div>
        </div>

        {/* Quick Demo Access Bar */}
        <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-amber-900">
            <span>✨ QUICK DEMO ACCESS</span>
            <span className="font-mono text-amber-700">Pass: Demo@12345</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 bg-white/80 p-1 rounded-xl border border-amber-100 text-center text-xs font-bold">
            <button
              type="button"
              onClick={() => handleRoleSelect("citizen")}
              className={`py-1.5 rounded-lg transition ${
                selectedRole === "citizen"
                  ? "bg-[#101C2C] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Citizen
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect("department_officer")}
              className={`py-1.5 rounded-lg transition ${
                selectedRole === "department_officer"
                  ? "bg-[#101C2C] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              PWD Officer
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect("admin")}
              className={`py-1.5 rounded-lg transition ${
                selectedRole === "admin"
                  ? "bg-[#101C2C] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              City Admin
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSignIn} className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Email ID
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-700 font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs p-2.5 pr-8 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-700 font-semibold"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 font-semibold">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#101C2C] to-[#1e3452] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In to Workspace"}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-400 font-mono">
          JANDrishti Civic Intelligence Network • Govt of India
        </p>
      </div>
    </div>
  );
}