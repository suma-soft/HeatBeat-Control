// frontend/src/features/thermostat/api.ts
// Mapowanie na istniejący backend (Swagger):
//   GET  /thermostats/{tid}/readings
//   GET  /thermostats/{tid}/settings
//   PUT  /thermostats/{tid}/settings
//   POST /device/{tid}/reading
// --- Lokalne, proste helpery HTTP (bez zależności od ../../api) ---
async function httpGet(url, token) {
    const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok)
        throw new Error(`GET ${url} failed: ${res.status}`);
    return res.json();
}
async function httpPost(url, body, token) {
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
    if (!res.ok)
        throw new Error(`POST ${url} failed: ${res.status}`);
    return res.json();
}
async function httpPut(url, body, token) {
    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
    if (!res.ok)
        throw new Error(`PUT ${url} failed: ${res.status}`);
    return res.json();
}
export const ThermoAPI = {
    // Łączymy readings + settings w jeden obiekt, którego oczekuje UI
    state: async (base, id, token) => {
        const [readings, settings] = await Promise.all([
            httpGet(`${base}/thermostats/${id}/readings`, token),
            httpGet(`${base}/thermostats/${id}/settings`, token),
        ]);
        const arr = Array.isArray(readings) ? readings : [];
        const last = arr.length ? { ...arr[arr.length - 1], device_id: id } : null;
        // Dopasuj nazwę pola docelowej temperatury do swojego backendu
        const target = (settings &&
            (settings.target_temp ?? settings.setpoint ?? settings.targetC ?? settings.target)) ??
            null;
        return { device_id: id, last_telemetry: last, target_c: target };
    },
    // Ustaw docelową temperaturę (Twój backend używa PUT)
    setpoint: (base, id, targetC, token) => httpPut(`${base}/thermostats/${id}/settings`, { target_temp: targetC }, token),
    // (opcjonalnie) ręczne pchnięcie telemetrii z symulatora/urządzenia
    pushTelemetry: (base, id, data, token) => httpPost(`${base}/device/${id}/reading`, data, token),
};
