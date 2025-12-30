// frontend/src/features/schedule/api.ts
// API functions dla systemu harmonogramów
import { API_CONFIG } from '../../config';
const API_BASE = ""; // używamy proxy Vite lub config
// Helper function dla autoryzacji
async function apiCall(url, options = {}, token) {
    const fullUrl = url.startsWith('http') ? url : API_CONFIG.getUrl(url);
    const response = await fetch(fullUrl, {
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
    list: (thermostatId, templateId, token) => {
        const params = new URLSearchParams();
        if (templateId !== undefined)
            params.set('template_id', templateId.toString());
        const url = `${API_BASE}/thermostats/${thermostatId}/schedule${params.toString() ? '?' + params.toString() : ''}`;
        return apiCall(url, {}, token);
    },
    // Dodaj wpis
    create: (thermostatId, entry, token) => {
        return apiCall(`${API_BASE}/thermostats/${thermostatId}/schedule`, {
            method: 'POST',
            body: JSON.stringify(entry),
        }, token);
    },
    // Bulk dodawanie (wiele dni naraz)
    createBulk: (thermostatId, bulk, token) => {
        return apiCall(`${API_BASE}/thermostats/${thermostatId}/schedule/bulk`, {
            method: 'POST',
            body: JSON.stringify(bulk),
        }, token);
    },
    // Aktualizuj wpis
    update: (thermostatId, entryId, entry, token) => {
        return apiCall(`${API_BASE}/thermostats/${thermostatId}/schedule/${entryId}`, {
            method: 'PUT',
            body: JSON.stringify(entry),
        }, token);
    },
    // Usuń wpis
    delete: (thermostatId, entryId, token) => {
        return apiCall(`${API_BASE}/thermostats/${thermostatId}/schedule/${entryId}`, {
            method: 'DELETE',
        }, token);
    },
};
// Schedule Template API
export const scheduleTemplateAPI = {
    // Lista szablonów
    list: (thermostatId, token) => {
        return apiCall(`${API_BASE}/thermostats/${thermostatId}/schedule/templates`, {}, token);
    },
    // Stwórz szablon
    create: (thermostatId, template, token) => {
        return apiCall(`${API_BASE}/thermostats/${thermostatId}/schedule/templates`, {
            method: 'POST',
            body: JSON.stringify(template),
        }, token);
    },
    // Aktualizuj szablon
    update: (thermostatId, templateId, template, token) => {
        return apiCall(`${API_BASE}/thermostats/${thermostatId}/schedule/templates/${templateId}`, {
            method: 'PUT',
            body: JSON.stringify(template),
        }, token);
    },
    // Usuń szablon
    delete: (thermostatId, templateId, deleteEntries = false, token) => {
        const params = new URLSearchParams();
        if (deleteEntries)
            params.set('delete_entries', 'true');
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
    getWeekdayName: (weekday, short = false) => {
        const names = short ? scheduleUtils.weekdayShort : scheduleUtils.weekdayNames;
        return names[weekday] || 'Nieznany';
    },
    // Sortowanie wpisów po dniu i godzinie
    sortEntries: (entries) => {
        return [...entries].sort((a, b) => {
            if (a.weekday !== b.weekday)
                return a.weekday - b.weekday;
            return a.start.localeCompare(b.start);
        });
    },
    // Walidacja godziny
    isValidTime: (time) => {
        const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        return regex.test(time);
    },
    // Walidacja przedziału czasowego
    isValidTimeRange: (start, end) => {
        if (!scheduleUtils.isValidTime(start) || !scheduleUtils.isValidTime(end))
            return false;
        return start < end;
    },
    // Formatowanie temperatury
    formatTemp: (temp) => {
        return `${temp.toFixed(1)}°C`;
    },
    // Konwersja listy dni na text
    weekdaysToText: (weekdays) => {
        if (weekdays.length === 0)
            return 'Brak dni';
        if (weekdays.length === 7)
            return 'Codziennie';
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
    },
    // Sprawdź czy wpisy czasowe się nakładają
    checkTimeOverlap: (entries, newEntry, excludeId) => {
        const timeToMinutes = (time) => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
        };
        const newStart = timeToMinutes(newEntry.start);
        const newEnd = timeToMinutes(newEntry.end);
        // Określ dni do sprawdzenia
        const daysToCheck = newEntry.weekdays && newEntry.weekdays.length > 0
            ? newEntry.weekdays
            : [newEntry.weekday || 0];
        for (const day of daysToCheck) {
            // Znajdź wpisy dla tego dnia
            const dayEntries = entries.filter(e => e.weekday === day &&
                (excludeId === undefined || e.id !== excludeId));
            for (const entry of dayEntries) {
                const entryStart = timeToMinutes(entry.start);
                const entryEnd = timeToMinutes(entry.end);
                // Sprawdź nakładanie się
                if (newStart < entryEnd && newEnd > entryStart) {
                    return {
                        hasOverlap: true,
                        conflictingEntry: entry
                    };
                }
            }
        }
        return { hasOverlap: false };
    }
};
