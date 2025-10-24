import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

/**
 * Ustalanie URL backendu:
 * - jeśli podasz VITE_API_BASE → użyjemy go,
 * - w przeciwnym razie zgadujemy runtime'owo na podstawie okna przeglądarki,
 *   np. http://localhost:8000 lub http://127.0.0.1:8000.
 * Dzięki temu NIE używamy "http://backend:8000", którego przeglądarka nie zna.
 */
function resolveApiBase(): string {
  // 1) build-time env (Vite)
  const fromEnv =
    // @ts-ignore
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) || "";

  // 2) runtime host (przeglądarka)
  const host =
    typeof window !== "undefined" && window.location?.hostname
      ? window.location.hostname
      : "localhost";

  // Jeśli w env ktoś podał "backend:8000", zamieniamy na runtime-host:8000
  const sanitize = (url: string): string => {
    if (!url) return "";
    try {
      const u = new URL(url);
      if (u.hostname === "backend") {
        u.hostname = host;
      }
      return u.toString().replace(/\/+$/, "");
    } catch {
      return url.replace("backend", host).replace(/\/+$/, "");
    }
  };

  const envClean = sanitize(String(fromEnv).trim());
  if (envClean) return envClean;

  // 3) opcjonalny global
  // @ts-ignore
  const fromGlobal = (typeof window !== "undefined" && (window as any).__API_BASE__) || "";

  const globalClean = sanitize(String(fromGlobal).trim());
  if (globalClean) return globalClean;

  // 4) domyślnie zgadujemy po hoście (localhost / 127.0.0.1 / nazwa kompa)
  return `http://${host}:8000`;
}

const DEFAULT_API_BASE = resolveApiBase();

/** Typ kontekstu uwierzytelniania */
type AuthContextType = {
  token: string | null;
  apiBase: string;
  login: (identifier: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  });

  // Debug pomocniczy – możesz zakomentować po testach
  if (typeof window !== "undefined") {
    console.info("[Auth] API_BASE =", DEFAULT_API_BASE);
  }

  // Synchronizacja tokena między kartami
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token") {
        setToken(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = async (identifier: string, password: string) => {
    const form = new URLSearchParams();
    form.set("username", identifier);
    form.set("password", password);

    let res = await fetch(`${DEFAULT_API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    if (res.status === 415 || res.status === 422) {
      res = await fetch(`${DEFAULT_API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier, password }),
      });
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Błąd logowania (${res.status})`);
    }

    const data = await res.json().catch(() => ({} as any));
    const accessToken: string | null = data?.access_token ?? data?.token ?? null;

    if (!accessToken) {
      throw new Error("Brak access_token w odpowiedzi backendu.");
    }

    localStorage.setItem("token", accessToken);
    setToken(accessToken);
  };

  const register = async (email: string, password: string) => {
    let res = await fetch(`${DEFAULT_API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username: email }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Błąd rejestracji (${res.status})`);
    }

    const data = await res.json().catch(() => ({} as any));
    const accessToken: string | null = data?.access_token ?? data?.token ?? null;

    if (accessToken) {
      localStorage.setItem("token", accessToken);
      setToken(accessToken);
    } else {
      await login(email, password);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem("token");
    } catch {}
    setToken(null);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      token,
      apiBase: DEFAULT_API_BASE,
      login,
      register,
      logout,
    }),
    [token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth musi być użyty wewnątrz <AuthProvider>.");
  return ctx;
}
