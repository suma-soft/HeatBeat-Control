export const api = {
  async login(email: string, password: string) {
    const form = new URLSearchParams();
    form.set("username", email);
    form.set("password", password);
    const res = await fetch("/auth/login", { method: "POST", body: form });
    if (!res.ok) throw new Error("Błędny login/hasło");
    return res.json() as Promise<{ access_token: string }>;
  },

  async me(token: string) {
    const res = await fetch("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Błąd /auth/me");
    return res.json();
  },

  async listThermostats(token: string) {
    const res = await fetch("/thermostats", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Błąd listy termostatów");
    return res.json();
  },

  async getSettings(token: string, tid: number) {
    const res = await fetch(`/thermostats/${tid}/settings`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Błąd pobierania ustawień");
    return res.json();
  },

  async updateSettings(token: string, tid: number, body: { target_temp_c: number; mode: string }) {
    const res = await fetch(`/thermostats/${tid}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("Błąd zapisu ustawień");
    return res.json();
  },

  async getReadings(token: string, tid: number, limit = 10) {
    const res = await fetch(`/thermostats/${tid}/readings?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Błąd pobierania odczytów");
    return res.json();
  }
};
