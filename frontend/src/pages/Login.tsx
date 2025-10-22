import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await login(email, password);
    } catch (e: any) {
      setErr(e.message || "Błąd logowania");
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 360 }}>
      <label>
        E-mail
        <input value={email} onChange={e => setEmail(e.target.value)} />
      </label>
      <label>
        Hasło
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </label>
      <button type="submit">Zaloguj</button>
      {err && <div style={{ color: "crimson" }}>{err}</div>}
    </form>
  );
}
