import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Dashboard v2:
 * - /auth/me       → dane użytkownika
 * - /thermostats   → lista urządzeń
 * - /thermostats/{tid}/readings?limit=1 → ostatni odczyt (temp/wilg/ciśnienie/okno)
 * - auto-odświeżanie co 5 s (polling) + przycisk "Odśwież"
 *
 * Uwaga: endpoint /device/{tid}/reading zapisuje dane bez auth,
 * ale żeby je ZOBACZYĆ na froncie, korzystamy z /thermostats/... (wymaga tokenu).
 */

type UserMe = { id: number; email: string };

type ThermostatApi = {
  id: number;
  name: string;
  settings: { target_temp_c: number; mode: "auto" | "heat" | "off" };
};

type ReadingOut = {
  id: number;
  temperature_c: number;
  humidity_pct?: number | null;
  pressure_hpa?: number | null;
  window_open_detected?: boolean | null;
  created_at: string;
};

type ThermostatView = ThermostatApi & {
  lastReading: ReadingOut | null;
  loading: boolean;
  error: string | null;
};

function formatDate(iso: string | undefined) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso ?? "-";
  }
}

export default function Dashboard() {
  const { token, apiBase, logout } = useAuth();

  const [me, setMe] = useState<UserMe | null>(null);
  const [meErr, setMeErr] = useState<string | null>(null);

  const [thermos, setThermos] = useState<ThermostatView[]>([]);
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [pollMs, setPollMs] = useState<number>(5000); // interwał auto-odśw.
  const timerRef = useRef<number | null>(null);

  // ---- helpers fetch z auth ----
  async function authFetch(input: string, init?: RequestInit) {
    const res = await fetch(input, {
      ...(init || {}),
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 401) {
      // token nieważny → wyloguj
      logout();
      throw new Error("Sesja wygasła. Zaloguj się ponownie.");
    }
    return res;
  }

  // ---- pobierz /auth/me ----
  useEffect(() => {
    let alive = true;
    (async () => {
      setMeErr(null);
      try {
        const r = await authFetch(`${apiBase}/auth/me`);
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          throw new Error(t || `Błąd /auth/me (${r.status})`);
        }
        const data = (await r.json()) as UserMe;
        if (alive) setMe(data);
      } catch (e: any) {
        if (alive) setMeErr(e?.message || "Nie udało się pobrać danych użytkownika.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [apiBase, token, logout]);

  // ---- pobierz listę termostatów ----
  const loadThermostats = async () => {
    setGlobalErr(null);
    try {
      const r = await authFetch(`${apiBase}/thermostats`);
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `Błąd /thermostats (${r.status})`);
      }
      const list = (await r.json()) as ThermostatApi[];
      // zainicjuj stan z flagami
      setThermos((prev) => {
        const mapPrev = new Map(prev.map((x) => [x.id, x]));
        return list.map((t) => {
          const old = mapPrev.get(t.id);
          return {
            ...t,
            lastReading: old?.lastReading ?? null,
            loading: false,
            error: null,
          } as ThermostatView;
        });
      });
    } catch (e: any) {
      setGlobalErr(e?.message || "Nie udało się pobrać listy termostatów.");
    }
  };

  // ---- pobierz ostatni odczyt dla jednego termostatu ----
  const loadLastReading = async (tid: number) => {
    setThermos((arr) => arr.map((t) => (t.id === tid ? { ...t, loading: true, error: null } : t)));
    try {
      const r = await authFetch(`${apiBase}/thermostats/${tid}/readings?limit=1`);
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `Błąd /thermostats/${tid}/readings (${r.status})`);
      }
      const data = (await r.json()) as ReadingOut[];
      const last = data.length ? data[0] : null;
      setThermos((arr) =>
        arr.map((t) => (t.id === tid ? { ...t, lastReading: last, loading: false, error: null } : t))
      );
    } catch (e: any) {
      setThermos((arr) =>
        arr.map((t) =>
          t.id === tid ? { ...t, loading: false, error: e?.message || "Błąd pobierania odczytu." } : t
        )
      );
    }
  };

  // ---- pierwsze pobranie listy + odczytów ----
  useEffect(() => {
    (async () => {
      await loadThermostats();
    })();
  }, [apiBase, token]); // po logowaniu/zmianie hosta zrób re-load

  // kiedy mamy listę, od razu pobierz ostatnie odczyty
  useEffect(() => {
    thermos.forEach((t) => {
      loadLastReading(t.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thermos.length]); // tylko kiedy zmienia się liczba termostatów

  // ---- auto-polling ostatnich odczytów ----
  useEffect(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollMs > 0) {
      timerRef.current = window.setInterval(() => {
        // pobierz ostatni odczyt dla wszystkich znanych termostatów
        setThermos((arr) => {
          arr.forEach((t) => {
            loadLastReading(t.id);
          });
          return arr;
        });
      }, pollMs) as unknown as number;
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pollMs, apiBase, token]);

  const hasThermo = useMemo(() => thermos.length > 0, [thermos.length]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Pasek nagłówka */}
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-600" />
            <h1 className="text-lg font-semibold">HeatBeat • Dashboard</h1>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 hidden md:block">Auto-odświeżanie:</label>
            <select
              value={pollMs}
              onChange={(e) => setPollMs(Number(e.target.value))}
              className="px-2 py-1 rounded border border-gray-300 text-sm"
              title="Interwał odświeżania"
            >
              <option value={0}>wyłączone</option>
              <option value={3000}>co 3 s</option>
              <option value={5000}>co 5 s</option>
              <option value={10000}>co 10 s</option>
              <option value={30000}>co 30 s</option>
            </select>

            <button
              onClick={() => {
                loadThermostats().then(() =>
                  setTimeout(() => {
                    // po liście dociągnij od razu ostatnie odczyty
                    thermos.forEach((t) => loadLastReading(t.id));
                  }, 100)
                );
              }}
              className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition"
            >
              Odśwież
            </button>

            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition"
              title="Wyloguj"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </header>

      {/* Treść */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Błędy globalne */}
        {meErr && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{meErr}</div>
        )}
        {globalErr && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{globalErr}</div>
        )}

        {/* Nagłówek powitalny */}
        <section className="mb-6">
          <h2 className="text-xl font-bold">Witaj{me?.email ? `, ${me.email}` : ""}!</h2>
          <p className="text-sm text-gray-600">Podgląd Twoich termostatów i ostatnich odczytów.</p>
        </section>

        {/* Lista termostatów */}
        {!hasThermo ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
            Brak termostatów. Zarejestruj urządzenie lub dodaj w bazie. (Po rejestracji użytkownika
            domyślnie tworzony jest jeden termostat.)
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {thermos.map((t) => (
              <div key={t.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">
                    {t.name} <span className="text-gray-500">#{t.id}</span>
                  </h3>
                  <button
                    onClick={() => loadLastReading(t.id)}
                    className="text-sm px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
                    disabled={t.loading}
                  >
                    {t.loading ? "…" : "Odśwież"}
                  </button>
                </div>

                {/* Ustawienia */}
                <div className="text-sm text-gray-600 mb-3">
                  Tryb: <span className="font-medium">{t.settings.mode}</span>, zadana:{" "}
                  <span className="font-medium">{t.settings.target_temp_c.toFixed(1)}°C</span>
                </div>

                {/* Ostatni odczyt */}
                {t.error && (
                  <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                    {t.error}
                  </div>
                )}
                {t.lastReading ? (
                  <div className="text-sm">
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <div className="text-gray-500 text-xs">Temperatura</div>
                        <div className="text-base font-semibold">
                          {t.lastReading.temperature_c.toFixed(1)}°C
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Wilgotność</div>
                        <div className="text-base font-semibold">
                          {t.lastReading.humidity_pct ?? "-"}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Ciśnienie</div>
                        <div className="text-base font-semibold">
                          {t.lastReading.pressure_hpa ?? "-"} hPa
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Okno</div>
                        <div className="text-base font-semibold">
                          {t.lastReading.window_open_detected ? "OTWARTE" : "zamknięte"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Ostatnia aktualizacja: {formatDate(t.lastReading.created_at)}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Brak odczytów dla tego termostatu.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
