import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  FiThermometer, 
  FiDroplet, 
  FiWind, 
  FiHome, 
  FiRefreshCw, 
  FiLogOut, 
  FiPlus, 
  FiMinus,
  FiClock,
  FiActivity,
  FiUser
} from "react-icons/fi";

/**
 * Dashboard v5 – sterowanie zadaną bez przycisku „Zapisz” i bez wyboru trybu.
 * Zasada konfliktu:
 *  - Jeśli editTemp === backend.settings.target_temp_c → wysyłamy nową wartość.
 *  - Jeśli różne → nie wysyłamy, pobieramy z backendu i wyświetlamy jego wartość.
 */

type UserMe = { id: number; email: string };
type Mode = "auto" | "heat" | "off";

type ThermostatApi = {
  id: number;
  name: string;
  settings: { target_temp_c: number; mode: Mode; last_source?: string };
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
  loading: boolean;        // loading odczytu
  error: string | null;
  editTemp: number;        // lokalnie edytowana „zadana” (to co widzimy między + / −)
  saving: boolean;         // gdy akurat wysyłamy nową wartość
  infoMsg: string | null;  // komunikat po akcji (zapis, konflikt, itp.)
};

const MIN_C = 10.0;
const MAX_C = 30.0;
const STEP  = 0.5;
const EPS   = 0.01;

function clampStep(v: number) {
  const snapped = Math.round(v / STEP) * STEP;
  return Math.min(MAX_C, Math.max(MIN_C, snapped));
}
function approxEq(a: number, b: number) {
  return Math.abs(a - b) < EPS;
}
function formatDate(iso?: string) {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function getTemperatureStatus(current: number, target: number) {
  const diff = Math.abs(current - target);
  if (diff <= 1) return { status: 'optimal', text: 'Optymalna', color: 'text-green-600' };
  if (current > target + 1) return { status: 'hot', text: 'Za ciepło', color: 'text-red-600' };
  return { status: 'cold', text: 'Za zimno', color: 'text-blue-600' };
}

export default function Dashboard() {
  const { token, apiBase, logout } = useAuth();

  const [me, setMe] = useState<UserMe | null>(null);
  const [meErr, setMeErr] = useState<string | null>(null);

  const [thermos, setThermos] = useState<ThermostatView[]>([]);
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [pollMs, setPollMs] = useState<number>(5000);
  const timerRef = useRef<number | null>(null);

  // --- fetch z autoryzacją ---
  async function authFetch(url: string, init?: RequestInit) {
    const res = await fetch(url, {
      ...(init || {}),
      headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      logout();
      throw new Error("Sesja wygasła. Zaloguj się ponownie.");
    }
    return res;
  }

  // --- /auth/me ---
  useEffect(() => {
    let alive = true;
    (async () => {
      setMeErr(null);
      try {
        const r = await authFetch(`${apiBase}/auth/me`);
        if (!r.ok) throw new Error((await r.text().catch(()=>"")) || `Błąd /auth/me (${r.status})`);
        const data = (await r.json()) as UserMe;
        if (alive) setMe(data);
      } catch (e:any) {
        if (alive) setMeErr(e?.message || "Nie udało się pobrać danych użytkownika.");
      }
    })();
    return () => { alive = false; };
  }, [apiBase, token, logout]);

  // --- lista termostatów ---
  const loadThermostats = async () => {
    setGlobalErr(null);
    try {
      const r = await authFetch(`${apiBase}/thermostats`);
      if (!r.ok) throw new Error((await r.text().catch(()=>"")) || `Błąd /thermostats (${r.status})`);
      const list = (await r.json()) as ThermostatApi[];
      setThermos(list.map(t => ({
        ...t,
        lastReading: null,
        loading: false,
        error: null,
        editTemp: Number.isFinite(t.settings.target_temp_c) ? Number(t.settings.target_temp_c) : 21.0,
        saving: false,
        infoMsg: null,
      })));
    } catch (e:any) {
      setGlobalErr(e?.message || "Nie udało się pobrać listy termostatów.");
    }
  };

  // --- ostatni odczyt jednego termostatu ---
  const loadLastReading = async (tid: number) => {
    setThermos(arr => arr.map(t => t.id===tid ? {...t, loading:true, error:null} : t));
    try {
      const r = await authFetch(`${apiBase}/thermostats/${tid}/readings?limit=1`);
      if (!r.ok) throw new Error((await r.text().catch(()=>"")) || `Błąd /thermostats/${tid}/readings (${r.status})`);
      const data = (await r.json()) as ReadingOut[];
      const last = data.length ? data[0] : null;
      setThermos(arr => arr.map(t => t.id===tid ? {...t, lastReading:last, loading:false, error:null} : t));
    } catch (e:any) {
      setThermos(arr => arr.map(t => t.id===tid ? {...t, loading:false, error:e?.message || "Błąd pobierania odczytu."} : t));
    }
  };

  // --- pobierz settings (do synchronizacji przy konflikcie) ---
  const refreshSettings = async (tid: number) => {
    try {
      const r = await authFetch(`${apiBase}/thermostats/${tid}/settings`);
      if (!r.ok) throw new Error((await r.text().catch(()=>"")) || `Błąd /thermostats/${tid}/settings (${r.status})`);
      const data = await r.json() as { target_temp_c:number; mode:Mode; last_source?:string; updated_at:string };
      setThermos(arr => arr.map(t => t.id===tid ? {
        ...t,
        settings: { target_temp_c: data.target_temp_c, mode: t.settings.mode, last_source: data.last_source }, // zachowujemy bieżący mode z backendu (ukryty)
        editTemp: data.target_temp_c,
        infoMsg: "Wartość z backendu została przywrócona (wykryto zmianę po stronie serwera).",
      } : t));
    } catch (e:any) {
      setThermos(arr => arr.map(t => t.id===tid ? { ...t, infoMsg: e?.message || "Nie udało się zsynchronizować ustawień." } : t));
    }
  };

  // --- wysyłka nowej zadanej (bez UI trybu; używamy aktualnego mode z backendu) ---
  const pushSetpoint = async (tid: number, newTemp: number) => {
    console.log(`[FRONTEND] Wysyłam temperaturę ${newTemp}°C do backendu...`);
    setThermos(arr => arr.map(t => t.id===tid ? { ...t, saving:true, infoMsg:null } : t));
    try {
      // odczytaj "ukryty" mode z bieżącego stanu
      const current = thermos.find(t => t.id === tid);
      const mode: Mode = current?.settings.mode ?? "auto";

      const r = await authFetch(`${apiBase}/thermostats/${tid}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_temp_c: newTemp, mode }),
      });
      if (!r.ok) throw new Error((await r.text().catch(()=>"")) || `Błąd zapisu ustawień (${r.status})`);
      const data = await r.json() as { target_temp_c:number; mode:Mode; last_source?:string; updated_at:string };

      console.log(`[FRONTEND] Backend odpowiedział:`, {
        temp: data.target_temp_c,
        source: data.last_source,
        updated: data.updated_at
      });

      setThermos(arr => arr.map(t => t.id===tid ? {
        ...t,
        settings: { target_temp_c: data.target_temp_c, mode: data.mode, last_source: data.last_source },
        editTemp: data.target_temp_c,
        saving:false,
        infoMsg:`Zapisano (${formatDate(data.updated_at)})`,
      } : t));
    } catch (e:any) {
      setThermos(arr => arr.map(t => t.id===tid ? { ...t, saving:false, infoMsg: e?.message || "Nie udało się zapisać." } : t));
    }
  };

  // --- sprawdź czy ustawienia się zmieniły (np. z urządzenia) ---
  const checkSettingsUpdate = async (tid: number) => {
    try {
      const r = await authFetch(`${apiBase}/thermostats/${tid}/settings`);
      if (!r.ok) return; // Ignoruj błędy w tle
      const data = await r.json() as { target_temp_c:number; mode:Mode; last_source?:string; updated_at:string };
      
      setThermos(arr => arr.map(t => {
        if (t.id !== tid) return t;
        
        // Sprawdź czy temperatura z backendu różni się od lokalnej
        const backendTemp = data.target_temp_c;
        const localTemp = t.editTemp;
        
        if (!approxEq(backendTemp, localTemp)) {
          // Temperatura się zmieniła - aktualizuj
          const sourceMsg = data.last_source === 'device' 
            ? `Temperatura zmieniona z termostatu: ${backendTemp.toFixed(1)}°C`
            : `Temperatura zmieniona z aplikacji: ${backendTemp.toFixed(1)}°C`;
            
          return {
            ...t,
            settings: { ...t.settings, target_temp_c: data.target_temp_c, last_source: data.last_source },
            editTemp: data.target_temp_c,
            infoMsg: sourceMsg,
          };
        }
        
        // Jeśli temperatura taka sama, tylko zaktualizuj last_source bez komunikatu
        if (t.settings.last_source !== data.last_source) {
          console.log(`[DEBUG] Aktualizuję tylko last_source: ${data.last_source}`);
          return {
            ...t,
            settings: { ...t.settings, last_source: data.last_source }
          };
        }
        
        return t;
      }));
    } catch (e:any) {
      // Ignoruj błędy w tle - nie przeszkadzaj użytkownikowi
      console.log(`[DEBUG] Błąd checkSettingsUpdate:`, e.message);
    }
  };

  // --- kliknięcia + / − z logiką konfliktu ---
  const bump = (tid: number, delta: number) => {
    setThermos(arr => {
      const out = arr.map(t => {
        if (t.id !== tid) return t;
        if (t.saving) return t; // w trakcie zapisu – ignorujemy klik
        const backendVal = t.settings.target_temp_c;
        const localVal   = t.editTemp;

        // Sprawdź czy lokalna i backendowa temperatura się różnią
        if (!approxEq(localVal, backendVal)) {
          // Różnica wykryta - sprawdź źródło ostatniej zmiany
          if (t.settings.last_source === "device") {
            // Zmiana pochodzi z termostatu → pobierz z backendu
            setTimeout(() => refreshSettings(tid), 0);
            return { ...t, infoMsg: "Temperatura zmieniona z termostatu — synchronizuję…" };
          } else {
            // Zmiana pochodzi z aplikacji lub nieznane źródło → wyślij nową wartość
            const next = clampStep(localVal + delta);
            setTimeout(() => pushSetpoint(tid, next), 0);
            return { ...t, editTemp: next, infoMsg: "Wysyłam nową wartość (nadpisanie)…" };
          }
        }

        // są takie same → można wyliczyć nową i wysłać
        const next = clampStep(localVal + delta);
        // optymistycznie pokaż od razu nową wartość
        setTimeout(() => pushSetpoint(tid, next), 0);
        return { ...t, editTemp: next, infoMsg: "Zapisuję nową wartość…" };
      });
      return out;
    });
  };

  // --- inicjalny load + odczyty ---
  useEffect(() => { (async () => { await loadThermostats(); })(); }, [apiBase, token]);
  useEffect(() => { thermos.forEach(t => loadLastReading(t.id)); /* eslint-disable-next-line */ }, [thermos.length]);

  // --- auto-polling odczytów i ustawień ---
  useEffect(() => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    if (pollMs > 0) {
      timerRef.current = window.setInterval(() => {
        setThermos(arr => { 
          arr.forEach(t => {
            loadLastReading(t.id);
            // Sprawdź także czy ustawienia się zmieniły (np. z urządzenia)
            checkSettingsUpdate(t.id);
          }); 
          return arr; 
        });
      }, pollMs) as unknown as number;
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [pollMs, apiBase, token]);

  const hasThermo = useMemo(() => thermos.length > 0, [thermos.length]);

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Modern Navigation Header */}
      <header className="nav-modern">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="nav-brand">
              <div className="nav-icon">
                <FiThermometer className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">HeatBeat</h1>
                <p className="text-xs text-white/70">Smart Control</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Auto-refresh selector */}
              <div className="hidden md:flex items-center gap-3">
                <FiClock className="w-4 h-4 text-white/70" />
                <select
                  value={pollMs}
                  onChange={(e) => setPollMs(Number(e.target.value))}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value={0} className="text-gray-800">Wyłączone</option>
                  <option value={3000} className="text-gray-800">Co 3s</option>
                  <option value={5000} className="text-gray-800">Co 5s</option>
                  <option value={10000} className="text-gray-800">Co 10s</option>
                  <option value={30000} className="text-gray-800">Co 30s</option>
                </select>
              </div>

              <button
                onClick={() => {
                  loadThermostats().then(() => setTimeout(() => {
                    thermos.forEach((t) => loadLastReading(t.id));
                  }, 100));
                }}
                className="btn-secondary flex items-center gap-2"
              >
                <FiRefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Odśwież</span>
              </button>

              <button
                onClick={logout}
                className="btn-ghost flex items-center gap-2"
              >
                <FiLogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Wyloguj</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Messages */}
        {meErr && (
          <div className="mb-6 glass-card p-4 rounded-xl border-red-300/30 bg-red-500/20 text-white animate-fade-in">
            <div className="flex items-center gap-2">
              <FiActivity className="w-5 h-5 text-red-300" />
              <span>{meErr}</span>
            </div>
          </div>
        )}
        
        {globalErr && (
          <div className="mb-6 glass-card p-4 rounded-xl border-red-300/30 bg-red-500/20 text-white animate-fade-in">
            <div className="flex items-center gap-2">
              <FiActivity className="w-5 h-5 text-red-300" />
              <span>{globalErr}</span>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <section className="mb-8 animate-fade-in">
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <FiUser className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Witaj{me?.email ? `, ${me.email.split('@')[0]}` : ""}! 👋
                </h2>
                <p className="text-white/70">Zarządzaj swoimi termostatami w jednym miejscu</p>
              </div>
            </div>
          </div>
        </section>

        {!hasThermo ? (
          <div className="floating-card p-8 text-center animate-slide-up">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center">
              <FiHome className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Brak termostatów</h3>
            <p className="text-gray-600">Zarejestruj urządzenie lub dodaj w bazie danych</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {thermos.map((t, index) => (
              <div 
                key={t.id} 
                className="floating-card p-6 animate-fade-in relative overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-400/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      {t.name}
                    </h3>
                    <span className="text-sm text-gray-500">#{t.id}</span>
                  </div>
                  <button
                    onClick={() => loadLastReading(t.id)}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
                    disabled={t.loading}
                  >
                    <FiRefreshCw className={`w-4 h-4 text-gray-600 ${t.loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Temperature Control */}
                <div className="temp-controls mb-6">
                  <button
                    onClick={() => bump(t.id, -STEP)}
                    className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-white text-xl font-bold
                               transition-colors duration-300 shadow-lg
                               ${t.saving 
                                 ? 'bg-gray-400 border-gray-500 cursor-not-allowed opacity-50' 
                                 : 'bg-purple-500 border-purple-600 hover:bg-purple-600'
                               }`}
                    disabled={t.saving}
                  >
                    {t.saving ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <FiMinus className="w-6 h-6" />
                    )}
                  </button>
                  
                  <div className="text-center">
                    <div className="temp-display mb-1">
                      {t.editTemp.toFixed(1)}°C
                    </div>
                    <span className="text-white/60 text-xs">Zadana temperatura</span>
                    {t.settings.last_source && (
                      <div className="text-white/40 text-xs mt-1">
                        Źródło: {t.settings.last_source === 'app' ? 'Aplikacja' : 'Termostat'}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => bump(t.id, +STEP)}
                    className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-white text-xl font-bold
                               transition-colors duration-300 shadow-lg
                               ${t.saving 
                                 ? 'bg-gray-400 border-gray-500 cursor-not-allowed opacity-50' 
                                 : 'bg-purple-500 border-purple-600 hover:bg-purple-600'
                               }`}
                    disabled={t.saving}
                  >
                    {t.saving ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <FiPlus className="w-6 h-6" />
                    )}
                  </button>
                </div>

                {/* Status Messages Container - Fixed Height */}
                <div className="mb-4 min-h-[3.5rem] flex flex-col justify-center">
                  {/* Status Message */}
                  {t.infoMsg && (
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-sm text-purple-700">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>{t.infoMsg}</span>
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {t.error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>{t.error}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sensor Readings */}
                {t.lastReading ? (
                  <div className="space-y-4">
                    <div className="relative p-6 rounded-xl border border-orange-200 overflow-hidden">
                      {/* Temperature indicator background */}
                      <div className={`absolute inset-0 opacity-10 temp-indicator ${getTemperatureStatus(t.lastReading.temperature_c, t.editTemp).status}`}></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <FiThermometer className="w-5 h-5 text-orange-600" />
                            <span className="text-sm font-medium text-orange-700">Temperatura</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full status-dot ${getTemperatureStatus(t.lastReading.temperature_c, t.editTemp).status === 'optimal' ? 'online bg-green-500' : 'offline bg-red-500'}`}></div>
                            <span className={`text-xs font-medium ${getTemperatureStatus(t.lastReading.temperature_c, t.editTemp).color}`}>
                              {getTemperatureStatus(t.lastReading.temperature_c, t.editTemp).text}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-3xl font-bold text-orange-800 mb-1">
                              {t.lastReading.temperature_c.toFixed(1)}°C
                            </div>
                            <div className="text-sm text-orange-600">
                              Zadana: {t.editTemp.toFixed(1)}°C
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm text-orange-600 mb-1">Różnica</div>
                            <div className={`text-lg font-semibold ${getTemperatureStatus(t.lastReading.temperature_c, t.editTemp).color}`}>
                              {(t.lastReading.temperature_c - t.editTemp).toFixed(1)}°C
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl border border-blue-200 hover-lift">
                        <div className="flex items-center gap-2 mb-2">
                          <FiDroplet className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-medium text-blue-700">Wilgotność</span>
                        </div>
                        <div className="text-xl font-bold text-blue-800">
                          {t.lastReading.humidity_pct ?? "-"}%
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-xl border border-purple-200 hover-lift">
                        <div className="flex items-center gap-2 mb-2">
                          <FiWind className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-medium text-purple-700">Ciśnienie</span>
                        </div>
                        <div className="text-lg font-bold text-purple-800">
                          {t.lastReading.pressure_hpa ? Math.round(t.lastReading.pressure_hpa) : "-"}
                        </div>
                        <div className="text-xs text-purple-600">hPa</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-xl border border-green-200 hover-lift">
                        <div className="flex items-center gap-2 mb-2">
                          <FiHome className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium text-green-700">Okno</span>
                        </div>
                        <div className={`text-sm font-bold ${t.lastReading.window_open_detected ? 'text-red-600' : 'text-green-800'}`}>
                          {t.lastReading.window_open_detected ? "OTWARTE" : "Zamknięte"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FiClock className="w-3 h-3" />
                        <span>Ostatnia aktualizacja: {formatDate(t.lastReading.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FiActivity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Brak odczytów</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
