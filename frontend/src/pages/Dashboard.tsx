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

  const tid = useMemo(() => currentTid ?? thermostats[0]?.id ?? null, [currentTid, thermostats]);

  useEffect(() => {
    if (!token) return;
    api.listThermostats(token).then(ts => {
      setThermostats(ts);
    });
  }, [token]);

  useEffect(() => {
    if (!token || !tid) return;
    api.getSettings(token, tid).then(setSettings);
    api.getReadings(token, tid, 10).then(setReadings);
  }, [token, tid]);

  const saveTemp = async (next: number) => {
    if (!token || !tid || !settings) return;
    const updated = await api.updateSettings(token, tid, { target_temp_c: next, mode: settings.mode });
    setSettings(updated);
  };

  const changeMode = async (mode: string) => {
    if (!token || !tid || !settings) return;
    const updated = await api.updateSettings(token, tid, { target_temp_c: settings.target_temp_c, mode });
    setSettings(updated);
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        Zalogowany: <b>{user?.email}</b>
        <button style={{ marginLeft: 12 }} onClick={logout}>Wyloguj</button>
      </div>

      <label>
        Termostat:
        <select value={tid ?? ""} onChange={e => setCurrentTid(Number(e.target.value))}>
          {thermostats.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>

      {settings && (
        <>
          <TempControl
            value={settings.target_temp_c}
            onChange={saveTemp}
          />
          <div>
            Tryb:
            <select value={settings.mode} onChange={e => changeMode(e.target.value)}>
              <option value="auto">auto</option>
              <option value="heat">grzanie</option>
              <option value="off">wył.</option>
            </select>
          </div>
          <small>Ostatnia zmiana: {new Date(settings.updated_at).toLocaleString()}</small>
        </>
      )}

      <div>
        <h3>Ostatnie odczyty</h3>
        <ul>
          {readings.map((r: any) => (
            <li key={r.id}>
              {new Date(r.created_at).toLocaleString()} – 🌡 {r.temperature_c.toFixed(2)}°C
              {r.humidity_pct != null && <> · 💧 {r.humidity_pct.toFixed(0)}%</>}
              {r.pressure_hpa != null && <> · ⏲ {r.pressure_hpa.toFixed(1)} hPa</>}
              {r.window_open_detected ? " · 🪟 Wietrzenie" : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
