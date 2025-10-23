// frontend/src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// ⚙️ BASE URL API: z env Vite lub fallback na localhost:8000
const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

type AuthCtx = {
  token: string | null;
  setToken: (t: string | null) => void;
  apiBaseUrl: string;
};

const Ctx = createContext<AuthCtx>({ token: null, setToken: () => {}, apiBaseUrl: DEFAULT_API_BASE });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    // jeśli przechowujesz token w localStorage
    const t = localStorage.getItem("token");
    if (t) setToken(t);
  }, []);

  const value = useMemo(() => ({ token, setToken, apiBaseUrl: DEFAULT_API_BASE }), [token]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);
