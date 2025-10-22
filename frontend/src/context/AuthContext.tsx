import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api";

type AuthCtx = {
  token: string | null;
  user: { id: number; email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>(null as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<{ id: number; email: string } | null>(null);

  useEffect(() => {
    if (token) {
      api.me(token).then(setUser).catch(() => setUser(null));
    } else {
      setUser(null);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const { access_token } = await api.login(email, password);
    setToken(access_token);
    localStorage.setItem("token", access_token);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("token");
    setUser(null);
  };

  return <Ctx.Provider value={{ token, user, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);
