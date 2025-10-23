// frontend/src/features/thermostat/api.ts
export async function apiGet(url: string, token?: string) {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

export async function apiPost(url: string, body: any, token?: string) {
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

export const ThermoAPI = {
  state: (base: string, id: string, token?: string) =>
    apiGet(`${base}/api/v1/thermostats/${id}/state`, token),
  setpoint: (base: string, id: string, targetC: number, token?: string) =>
    apiPost(`${base}/api/v1/thermostats/${id}/setpoint`, { target_c: targetC }, token),
};
