// frontend/src/features/schedule/api.ts
// API functions dla systemu harmonogramów

const API_BASE = ""; // używamy proxy Vite

// Typy
export type ScheduleEntry = {
  id: number;
  weekday: number;
  start: string; // "HH:MM"
  end: string;   // "HH:MM" 
  target_temp_c: number;
  template_id?: number | null;
};

export type ScheduleTemplate = {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  entries_count: number;
};

export type ScheduleEntryInput = {
  weekday: number;
  start: string;
  end: string;
  target_temp_c: number;
  template_id?: number | null;
};

export type ScheduleTemplateInput = {
  name: string;
  description?: string | null;
  is_active: boolean;
};

export type ScheduleBulkInput = {
  weekdays: number[];
  start: string;
  end: string;
  target_temp_c: number;
  template_id?: number | null;
};

export type ScheduleBulkResult = {
  created_count: number;
  created_entries: ScheduleEntry[];
};

// Helper function dla autoryzacji
async function apiCall(url: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json();
}

// Schedule Entry API
export const scheduleEntryAPI = {
  // Lista wpisów harmonogramu
  list: (thermostatId: number, templateId?: number, token?: string): Promise<ScheduleEntry[]> => {
    const params = new URLSearchParams();
    if (templateId !== undefined) params.set('template_id', templateId.toString());
    const url = `${API_BASE}/thermostats/${thermostatId}/schedule${params.toString() ? '?' + params.toString() : ''}`;
    return apiCall(url, {}, token);
  },

  // Dodaj wpis
  create: (thermostatId: number, entry: ScheduleEntryInput, token?: string): Promise<ScheduleEntry> => {
    return apiCall(`${API_BASE}/thermostats/${thermostatId}/schedule`, {
      method: 'POST',
      body: JSON.stringify(entry),
    }, token);
  },

  // Bulk dodawanie (wiele dni naraz)
  createBulk: (thermostatId: number, bulk: ScheduleBulkInput, token?: string): Promise<ScheduleBulkResult> => {
    return apiCall(`${API_BASE}/thermostats/${thermostatId}/schedule/bulk`, {
      method: 'POST',
      body: JSON.stringify(bulk),
    }, token);
  },

  // Aktualizuj wpis
  update: (thermostatId: number, entryId: number, entry: ScheduleEntryInput, token?: string): Promise<ScheduleEntry> => {
    return apiCall(`${API_BASE}/thermostats/${thermostatId}/schedule/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    }, token);
  },

  // Usuń wpis
  delete: (thermostatId: number, entryId: number, token?: string): Promise<{ ok: boolean }> => {
    return apiCall(`${API_BASE}/thermostats/${thermostatId}/schedule/${entryId}`, {
      method: 'DELETE',
    }, token);
  },
};

// Schedule Template API
export const scheduleTemplateAPI = {
  // Lista szablonów
  list: (thermostatId: number, token?: string): Promise<ScheduleTemplate[]> => {
    return apiCall(`${API_BASE}/thermostats/${thermostatId}/schedule/templates`, {}, token);
  },

  // Stwórz szablon
  create: (thermostatId: number, template: ScheduleTemplateInput, token?: string): Promise<ScheduleTemplate> => {
    return apiCall(`${API_BASE}/thermostats/${thermostatId}/schedule/templates`, {
      method: 'POST',
      body: JSON.stringify(template),
    }, token);
  },

  // Aktualizuj szablon
  update: (thermostatId: number, templateId: number, template: ScheduleTemplateInput, token?: string): Promise<ScheduleTemplate> => {
    return apiCall(`${API_BASE}/thermostats/${thermostatId}/schedule/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    }, token);
  },

  // Usuń szablon
  delete: (thermostatId: number, templateId: number, deleteEntries = false, token?: string): Promise<{ ok: boolean; deleted_entries: number }> => {
    const params = new URLSearchParams();
    if (deleteEntries) params.set('delete_entries', 'true');
    const url = `${API_BASE}/thermostats/${thermostatId}/schedule/templates/${templateId}${params.toString() ? '?' + params.toString() : ''}`;
    return apiCall(url, { method: 'DELETE' }, token);
  },
};

// Utility functions
export const scheduleUtils = {
  // Nazwy dni tygodnia (0=Poniedziałek, 6=Niedziela)
  weekdayNames: ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'],
  
  // Krótkie nazwy dni
  weekdayShort: ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'],
  
  // Konwersja z liczby na nazwę dnia
  getWeekdayName: (weekday: number, short = false): string => {
    const names = short ? scheduleUtils.weekdayShort : scheduleUtils.weekdayNames;
    return names[weekday] || 'Nieznany';
  },
  
  // Sortowanie wpisów po dniu i godzinie
  sortEntries: (entries: ScheduleEntry[]): ScheduleEntry[] => {
    return [...entries].sort((a, b) => {
      if (a.weekday !== b.weekday) return a.weekday - b.weekday;
      return a.start.localeCompare(b.start);
    });
  },
  
  // Walidacja godziny
  isValidTime: (time: string): boolean => {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(time);
  },
  
  // Walidacja przedziału czasowego
  isValidTimeRange: (start: string, end: string): boolean => {
    if (!scheduleUtils.isValidTime(start) || !scheduleUtils.isValidTime(end)) return false;
    return start < end;
  },
  
  // Formatowanie temperatury
  formatTemp: (temp: number): string => {
    return `${temp.toFixed(1)}°C`;
  },
  
  // Konwersja listy dni na text
  weekdaysToText: (weekdays: number[]): string => {
    if (weekdays.length === 0) return 'Brak dni';
    if (weekdays.length === 7) return 'Codziennie';
    
    const sorted = [...weekdays].sort();
    
    // Sprawdź czy to weekendy
    if (sorted.length === 2 && sorted[0] === 5 && sorted[1] === 6) {
      return 'Weekendy';
    }
    
    // Sprawdź czy to dni robocze
    if (sorted.length === 5 && sorted.every((d, i) => d === i)) {
      return 'Dni robocze';
    }
    
    // W przeciwnym razie pokaż listę
    return sorted.map(d => scheduleUtils.getWeekdayName(d, true)).join(', ');
  }
};