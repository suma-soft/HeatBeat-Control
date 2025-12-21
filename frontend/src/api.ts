import { API_CONFIG } from './config';

export const api = {
  async login(email: string, password: string) {
    const form = new URLSearchParams();
    form.set("username", email);
    form.set("password", password);
    const res = await fetch(API_CONFIG.getUrl("/auth/login"), { method: "POST", body: form });
    if (!res.ok) throw new Error("Błędny login/hasło");
    return res.json() as Promise<{ access_token: string }>;
  },

  async me(token: string) {
    const res = await fetch(API_CONFIG.getUrl("/auth/me"), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Błąd /auth/me");
    return res.json();
  },

  async listThermostats(token: string) {
    const res = await fetch(API_CONFIG.getUrl("/thermostats"), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Błąd listy termostatów");
    return res.json();
  },

  async getSettings(token: string, tid: number) {
    const res = await fetch(API_CONFIG.getUrl(`/thermostats/${tid}/settings`), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Błąd pobierania ustawień");
    return res.json();
  },

  async updateSettings(token: string, tid: number, body: { target_temp_c: number; mode: string }) {
    const res = await fetch(API_CONFIG.getUrl(`/thermostats/${tid}/settings`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("Błąd zapisu ustawień");
    return res.json();
  },

  async getReadings(token: string, tid: number, limit = 10) {
    const res = await fetch(API_CONFIG.getUrl(`/thermostats/${tid}/readings?limit=${limit}`), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Błąd pobierania odczytów");
    return res.json();
  },

  // Admin API endpoints
  async adminListUsers(token: string) {
    const res = await fetch(API_CONFIG.getUrl("/admin/users"), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Błąd pobierania listy użytkowników");
    return res.json();
  },

  async adminDeleteUser(token: string, userId: number) {
    const res = await fetch(API_CONFIG.getUrl(`/admin/users/${userId}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Błąd usuwania użytkownika");
    return res.json();
  },

  async adminUpdateUserEmail(token: string, userId: number, newEmail: string) {
    const res = await fetch(API_CONFIG.getUrl(`/admin/users/${userId}/email`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ new_email: newEmail })
    });
    if (!res.ok) throw new Error("Błąd zmiany emaila użytkownika");
    return res.json();
  },

  async adminAssignThermostat(token: string, thermostatId: number, userId: number) {
    const res = await fetch(API_CONFIG.getUrl(`/admin/thermostats/${thermostatId}/owner/${userId}`), {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Błąd przypisywania termostatu");
    return res.json();
  },

  async adminListAllThermostats(token: string) {
    const res = await fetch(API_CONFIG.getUrl("/admin/thermostats"), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Błąd pobierania wszystkich termostatów");
    return res.json();
  },

  async adminGetUserThermostats(token: string, userId: number) {
    const res = await fetch(API_CONFIG.getUrl(`/admin/users/${userId}/thermostats`), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Błąd pobierania termostatów użytkownika");
    return res.json();
  },

  async adminDeleteThermostat(token: string, thermostatId: number) {
    const res = await fetch(API_CONFIG.getUrl(`/admin/thermostats/${thermostatId}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Błąd usuwania termostatu");
    return res.json();
  },

  async adminUnassignThermostat(token: string, thermostatId: number) {
    const res = await fetch(API_CONFIG.getUrl(`/admin/thermostats/${thermostatId}/unassign`), {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Błąd odłączania termostatu");
    return res.json();
  },

  async adminCreateUser(token: string, email: string, password: string) {
    const res = await fetch(API_CONFIG.getUrl("/admin/users"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error("Błąd tworzenia użytkownika");
    return res.json();
  },

  async adminCreateThermostat(token: string, name: string, ownerId?: number) {
    const res = await fetch(API_CONFIG.getUrl("/admin/thermostats"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, owner_id: ownerId })
    });
    if (!res.ok) throw new Error("Błąd tworzenia termostatu");
    return res.json();
  },

  async adminShareThermostat(token: string, thermostatId: number, userId: number) {
    const res = await fetch(API_CONFIG.getUrl(`/admin/thermostats/${thermostatId}/share/${userId}`), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Błąd udostępniania termostatu");
    return res.json();
  },

  async adminUnshareThermostat(token: string, thermostatId: number, userId: number) {
    const res = await fetch(API_CONFIG.getUrl(`/admin/thermostats/${thermostatId}/unshare/${userId}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Błąd usuwania dostępu do termostatu");
    return res.json();
  },

  async adminGetThermostatUsers(token: string, thermostatId: number) {
    const res = await fetch(API_CONFIG.getUrl(`/admin/thermostats/${thermostatId}/users`), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Błąd pobierania użytkowników termostatu");
    return res.json();
  },

  async adminGetUserSharedThermostats(token: string, userId: number) {
    const res = await fetch(API_CONFIG.getUrl(`/admin/users/${userId}/thermostats`), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Błąd pobierania współdzielonych termostatów użytkownika");
    return res.json();
  }
};
