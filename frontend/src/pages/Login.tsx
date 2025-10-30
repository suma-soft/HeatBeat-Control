// frontend/src/pages/Login.tsx
// Formularz logowania: przyjmuje "Email lub login" i wysyła { username: <to_co_poda_użytkownik>, password }.

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FiThermometer, FiUser, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

export default function Login({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(identifier.trim(), password);
    } catch (err: any) {
      setError(err?.message || "Nie udało się zalogować.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/10 rounded-full animate-float"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/5 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30">
            <FiThermometer className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Witaj ponownie!</h1>
          <p className="text-white/70">Zaloguj się do HeatBeat Control</p>
        </div>

        <form onSubmit={onSubmit} className="floating-card p-8 space-y-6">
          {/* Email/Username Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Email lub nazwa użytkownika
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiUser className="h-5 w-5 text-gray-400" />
              </div>
              <input
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 bg-white/50"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                placeholder="Wprowadź email lub login"
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
                autoComplete="current-password"
                placeholder="Wprowadź hasło"
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
                <span>Logowanie...</span>
              </div>
            ) : (
              "Zaloguj się"
            )}
          </button>

          {/* Register Link */}
          <div className="text-center pt-4">
            <p className="text-gray-600 text-sm">
              Nie masz jeszcze konta?{" "}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-200"
              >
                Zarejestruj się
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
