import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import TempControl from "../components/TempControl";

export default function Dashboard() {
  const { token, user, logout } = useAuth();
  const [thermostats, setThermostats] = useState<any[]>([]);
  const [currentTid, setCurrentTid] = useState<number | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const tid = useMemo(() => currentTid ?? thermostats[0]?.id ?? null, [currentTid, thermostats]);

  // Auto-refresh co 10 sekund
  useEffect(() => {
    if (!token || !tid) return;
    
    const loadData = async () => {
      try {
        const [settingsData, readingsData] = await Promise.all([
          api.getSettings(token, tid),
          api.getReadings(token, tid, 10)
        ]);
        setSettings(settingsData);
        setReadings(readingsData);
        setLastUpdate(new Date());
      } catch (err) {
        console.error("Błąd ładowania danych:", err);
      }
    };

    loadData();
    const interval = setInterval(loadData, 10000); // Refresh co 10s
    return () => clearInterval(interval);
  }, [token, tid]);

  useEffect(() => {
    if (!token) return;
    api.listThermostats(token).then(ts => {
      setThermostats(ts);
    });
  }, [token]);

  const saveTemp = async (next: number) => {
    if (!token || !tid || !settings) return;
    setIsLoading(true);
    try {
      const updated = await api.updateSettings(token, tid, { 
        target_temp_c: next, 
        mode: settings.mode 
      });
      setSettings(updated);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Błąd zapisu temperatury:", err);
      alert("Nie udało się zapisać temperatury");
    } finally {
      setIsLoading(false);
    }
  };

  const changeMode = async (mode: string) => {
    if (!token || !tid || !settings) return;
    setIsLoading(true);
    try {
      const updated = await api.updateSettings(token, tid, { 
        target_temp_c: settings.target_temp_c, 
        mode 
      });
      setSettings(updated);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Błąd zmiany trybu:", err);
      alert("Nie udało się zmienić trybu");
    } finally {
      setIsLoading(false);
    }
  };

  // Ostatni odczyt do wyświetlenia
  const latestReading = readings[0];

  return (
    <div style={{ 
      maxWidth: 1200, 
      margin: "0 auto",
      padding: 20,
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      {/* Nagłówek */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        padding: 16,
        background: "#f8f9fa",
        borderRadius: 8
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>🌡️ HeatBeat - Panel termostatu</h1>
          <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 14 }}>
            Zalogowany: <b>{user?.email}</b>
          </p>
        </div>
        <button 
          onClick={logout}
          style={{
            padding: "8px 16px",
            background: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          Wyloguj
        </button>
      </div>

      {/* Wybór termostatu */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
          Wybierz termostat:
        </label>
        <select 
          value={tid ?? ""} 
          onChange={e => setCurrentTid(Number(e.target.value))}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            borderRadius: 6,
            border: "1px solid #ddd",
            background: "white"
          }}
        >
          {thermostats.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} (ID: {t.id})
            </option>
          ))}
        </select>
      </div>

      {/* Główna sekcja - kontrola */}
      {settings && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
          marginBottom: 24
        }}>
          {/* Panel kontroli temperatury */}
          <div>
            <TempControl
              value={settings.target_temp_c}
              onChange={saveTemp}
              disabled={isLoading}
              min={5}
              max={35}
              step={0.5}
            />
          </div>

          {/* Panel statusu i trybu */}
          <div style={{
            padding: 20,
            background: "white",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            <div>
              <h3 style={{ margin: "0 0 12px 0", fontSize: 18 }}>📊 Status termostatu</h3>
              
              {latestReading && (
                <div style={{
                  display: "grid",
                  gap: 12,
                  padding: 16,
                  background: "#f8f9fa",
                  borderRadius: 8
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>🌡️ Aktualna temperatura:</span>
                    <strong style={{ fontSize: 20, color: "#667eea" }}>
                      {latestReading.temperature_c.toFixed(1)}°C
                    </strong>
                  </div>
                  {latestReading.humidity_pct != null && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>💧 Wilgotność:</span>
                      <strong>{latestReading.humidity_pct.toFixed(0)}%</strong>
                    </div>
                  )}
                  {latestReading.pressure_hpa != null && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>🌀 Ciśnienie:</span>
                      <strong>{(latestReading.pressure_hpa / 100).toFixed(1)} hPa</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Tryb pracy:
              </label>
              <select 
                value={settings.mode} 
                onChange={e => changeMode(e.target.value)}
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 6,
                  border: "1px solid #ddd",
                  background: "white",
                  cursor: isLoading ? "not-allowed" : "pointer"
                }}
              >
                <option value="auto">🤖 Automatyczny</option>
                <option value="heat">🔥 Grzanie</option>
                <option value="off">❄️ Wyłączony</option>
              </select>
            </div>

            <div style={{
              fontSize: 12,
              color: "#666",
              paddingTop: 12,
              borderTop: "1px solid #eee"
            }}>
              <div>Ostatnia zmiana: {new Date(settings.updated_at).toLocaleString("pl-PL")}</div>
              {lastUpdate && (
                <div>Ostatnia aktualizacja: {lastUpdate.toLocaleTimeString("pl-PL")}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historia odczytów */}
      <div style={{
        background: "white",
        padding: 20,
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>📈 Historia odczytów</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6" }}>Czas</th>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6" }}>Temperatura</th>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6" }}>Wilgotność</th>
                <th style={{ padding: 12, borderBottom: "2px solid #dee2e6" }}>Ciśnienie</th>
              </tr>
            </thead>
            <tbody>
              {readings.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#999" }}>
                    Brak danych
                  </td>
                </tr>
              ) : (
                readings.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>
                      {new Date(r.created_at).toLocaleString("pl-PL")}
                    </td>
                    <td style={{ padding: 12 }}>
                      🌡️ {r.temperature_c.toFixed(2)}°C
                    </td>
                    <td style={{ padding: 12 }}>
                      {r.humidity_pct != null ? `💧 ${r.humidity_pct.toFixed(0)}%` : "—"}
                    </td>
                    <td style={{ padding: 12 }}>
                      {r.pressure_hpa != null ? `🌀 ${(r.pressure_hpa / 100).toFixed(1)} hPa` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}