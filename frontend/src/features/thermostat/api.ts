// frontend/src/features/thermostat/api.ts
// Mapowanie na istniejący backend (Swagger):
//   GET  /thermostats/{tid}/readings
//   GET  /thermostats/{tid}/settings
//   PUT  /thermostats/{tid}/settings
//   POST /device/{tid}/reading

// --- Lokalne, proste helpery HTTP (bez zależności od ../../api) ---
async function httpGet(url: string, token?: string) {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

async function httpPost(url: string, body: any, token?: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json();
}

async function httpPut(url: string, body: any, token?: string) {
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status}`);
  return res.json();
}

// --- Typy spójne dla frontu ---
export type Telemetry = {
  device_id?: string;
  temperature_c: number;
  humidity_pct: number;
  pressure_hpa: number;
  ts?: string; // w backendzie bywa opcjonalne
};

export type ThermostatState = {
  device_id: string;
  last_telemetry: Telemetry | null;
  target_c: number | null;
};

export const ThermoAPI = {
  // Łączymy readings + settings w jeden obiekt, którego oczekuje UI
  state: async (base: string, id: string, token?: string): Promise<ThermostatState> => {
    const [readings, settings] = await Promise.all([
      httpGet(`${base}/thermostats/${id}/readings`, token),
      httpGet(`${base}/thermostats/${id}/settings`, token),
    ]);

    const arr: Telemetry[] = Array.isArray(readings) ? readings : [];
    const last = arr.length ? { ...arr[arr.length - 1], device_id: id } : null;

    // Dopasuj nazwę pola docelowej temperatury do swojego backendu
    const target =
      (settings &&
        (settings.target_temp ?? settings.setpoint ?? settings.targetC ?? settings.target)) ??
      null;

    return { device_id: id, last_telemetry: last, target_c: target };
  },

  // Ustaw docelową temperaturę (Twój backend używa PUT)
  setpoint: (base: string, id: string, targetC: number, token?: string) =>
    httpPut(`${base}/thermostats/${id}/settings`, { target_temp: targetC }, token),

  // (opcjonalnie) ręczne pchnięcie telemetrii z symulatora/urządzenia
  pushTelemetry: (base: string, id: string, data: Telemetry, token?: string) =>
    httpPost(`${base}/device/${id}/reading`, data, token),
};
