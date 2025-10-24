// frontend/src/pages/Register.tsx
// Formularz rejestracji: wysyła { email, password, username: email }.

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Register({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm p-6 rounded-2xl border border-gray-300/40 shadow">
        <h1 className="text-2xl font-bold mb-4">Rejestracja</h1>

        <label className="block mb-2 text-sm">Email</label>
        <input
          type="email"
          className="w-full mb-4 p-2 rounded border border-gray-300"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <label className="block mb-2 text-sm">Hasło</label>
        <input
          type="password"
          className="w-full mb-4 p-2 rounded border border-gray-300"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <label className="block mb-2 text-sm">Powtórz hasło</label>
        <input
          type="password"
          className="w-full mb-4 p-2 rounded border border-gray-300"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />

        {error && <div className="mb-3 text-sm text-red-600 whitespace-pre-wrap">{error}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Rejestruję…" : "Utwórz konto"}
        </button>

        <div className="mt-4 text-sm">
          Masz już konto?{" "}
          <button type="button" onClick={onSwitchToLogin} className="text-emerald-700 underline">
            Zaloguj się
          </button>
        </div>
      </form>
    </div>
  );
}
