// frontend/src/pages/Register.tsx
// Formularz rejestracji: wysyła { email, password, username: email }.

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FiMail, FiLock, FiThermometer, FiEye, FiEyeOff, FiCheck } from "react-icons/fi";

export default function Register({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 2) return "bg-red-500";
    if (score <= 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = (score: number) => {
    if (score <= 2) return "Słabe";
    if (score <= 3) return "Średnie";
    return "Silne";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Hasła nie są takie same.");
      return;
    }
    setBusy(true);
    try {
      await register(email.trim(), password);
      // Po sukcesie token zapisany → App pokaże Dashboard
    } catch (err: any) {
      setError(err?.message || "Nie udało się utworzyć konta.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/10 rounded-full animate-float"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full animate-float" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-white/5 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30">
            <FiThermometer className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Dołącz do nas!</h1>
          <p className="text-white/70">Utwórz konto w HeatBeat Control</p>
        </div>

        <form onSubmit={onSubmit} className="floating-card p-8 space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Adres email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 bg-white/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="Wprowadź swój email"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Hasło
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 bg-white/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Utwórz bezpieczne hasło"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength(password))}`}
                      style={{ width: `${(passwordStrength(password) / 5) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">
                    {getPasswordStrengthText(passwordStrength(password))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Powtórz hasło
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showConfirm ? "text" : "password"}
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 bg-white/50"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="Powtórz hasło"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? (
                  <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            
            {/* Password Match Indicator */}
            {confirm && (
              <div className="flex items-center gap-2 text-sm animate-fade-in">
                {password === confirm ? (
                  <>
                    <FiCheck className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Hasła są identyczne</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-red-500"></div>
                    <span className="text-red-600">Hasła nie są identyczne</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {busy ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                <span>Tworzę konto...</span>
              </div>
            ) : (
              "Utwórz konto"
            )}
          </button>

          {/* Login Link */}
          <div className="text-center pt-4">
            <p className="text-gray-600 text-sm">
              Masz już konto?{" "}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-200"
              >
                Zaloguj się
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
