import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FiDroplet, FiWind, FiHome, FiRefreshCw, FiLogOut, FiPlus, FiMinus, FiClock, FiActivity, FiUser, FiCalendar, FiEdit, FiTrash2, FiServer, FiThermometer } from "react-icons/fi";
import { ScheduleManager } from "../features/schedule";
const MIN_C = 10.0;
const MAX_C = 30.0;
const STEP = 0.5;
const EPS = 0.01;
function clampStep(v) {
    const snapped = Math.round(v / STEP) * STEP;
    return Math.min(MAX_C, Math.max(MIN_C, snapped));
}
function approxEq(a, b) {
    return Math.abs(a - b) < EPS;
}
function formatDate(iso) {
    if (!iso)
        return "-";
    try {
        return new Date(iso).toLocaleString('pl-PL', {
            timeZone: 'Europe/Warsaw',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
    catch {
        return iso;
    }
}
function getTemperatureStatus(current, target) {
    const diff = Math.abs(current - target);
    if (diff <= 1)
        return { status: 'optimal', text: 'Optymalna', color: 'text-green-600' };
    if (current > target + 1)
        return { status: 'hot', text: 'Za ciepło', color: 'text-red-600' };
    return { status: 'cold', text: 'Za zimno', color: 'text-blue-600' };
}
export default function Dashboard() {
    const { token, apiBase, logout, isAdmin } = useAuth();
    const [me, setMe] = useState(null);
    const [meErr, setMeErr] = useState(null);
    const [thermos, setThermos] = useState([]);
    const [globalErr, setGlobalErr] = useState(null);
    const [pollMs, setPollMs] = useState(5000);
    const [activeView, setActiveView] = useState("dashboard");
    const [selectedThermo, setSelectedThermo] = useState(null);
    const timerRef = useRef(null);
    // --- fetch z autoryzacją ---
    async function authFetch(url, init) {
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
                if (!r.ok)
                    throw new Error((await r.text().catch(() => "")) || `Błąd /auth/me (${r.status})`);
                const data = (await r.json());
                if (alive)
                    setMe(data);
            }
            catch (e) {
                if (alive)
                    setMeErr(e?.message || "Nie udało się pobrać danych użytkownika.");
            }
        })();
        return () => { alive = false; };
    }, [apiBase, token, logout]);
    // --- lista termostatów ---
    const loadThermostats = async () => {
        setGlobalErr(null);
        try {
            const r = await authFetch(`${apiBase}/thermostats`);
            if (!r.ok)
                throw new Error((await r.text().catch(() => "")) || `Błąd /thermostats (${r.status})`);
            const list = (await r.json());
            setThermos(list.map(t => ({
                ...t,
                lastReading: null,
                loading: false,
                error: null,
                editTemp: Number.isFinite(t.settings.target_temp_c) ? Number(t.settings.target_temp_c) : 21.0,
                saving: false,
                infoMsg: null,
            })));
        }
        catch (e) {
            setGlobalErr(e?.message || "Nie udało się pobrać listy termostatów.");
        }
    };
    // --- ostatni odczyt jednego termostatu ---
    const loadLastReading = async (tid) => {
        setThermos(arr => arr.map(t => t.id === tid ? { ...t, loading: true, error: null } : t));
        try {
            const r = await authFetch(`${apiBase}/thermostats/${tid}/readings?limit=1`);
            if (!r.ok)
                throw new Error((await r.text().catch(() => "")) || `Błąd /thermostats/${tid}/readings (${r.status})`);
            const data = (await r.json());
            const last = data.length ? data[0] : null;
            setThermos(arr => arr.map(t => t.id === tid ? { ...t, lastReading: last, loading: false, error: null } : t));
        }
        catch (e) {
            setThermos(arr => arr.map(t => t.id === tid ? { ...t, loading: false, error: e?.message || "Błąd pobierania odczytu." } : t));
        }
    };
    // --- pobierz settings (do synchronizacji przy konflikcie) ---
    const refreshSettings = async (tid) => {
        try {
            const r = await authFetch(`${apiBase}/thermostats/${tid}/settings`);
            if (!r.ok)
                throw new Error((await r.text().catch(() => "")) || `Błąd /thermostats/${tid}/settings (${r.status})`);
            const data = await r.json();
            setThermos(arr => arr.map(t => t.id === tid ? {
                ...t,
                settings: { target_temp_c: data.target_temp_c, mode: t.settings.mode, last_source: data.last_source }, // zachowujemy bieżący mode z backendu (ukryty)
                editTemp: data.target_temp_c,
                infoMsg: "Wartość z backendu została przywrócona (wykryto zmianę po stronie serwera).",
            } : t));
        }
        catch (e) {
            setThermos(arr => arr.map(t => t.id === tid ? { ...t, infoMsg: e?.message || "Nie udało się zsynchronizować ustawień." } : t));
        }
    };
    // --- wysyłka nowej zadanej (bez UI trybu; używamy aktualnego mode z backendu) ---
    const pushSetpoint = async (tid, newTemp) => {
        console.log(`[FRONTEND] Wysyłam temperaturę ${newTemp}°C do backendu...`);
        setThermos(arr => arr.map(t => t.id === tid ? { ...t, saving: true, infoMsg: null } : t));
        try {
            // odczytaj "ukryty" mode z bieżącego stanu
            const current = thermos.find(t => t.id === tid);
            const mode = current?.settings.mode ?? "auto";
            const r = await authFetch(`${apiBase}/thermostats/${tid}/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ target_temp_c: newTemp, mode }),
            });
            if (!r.ok)
                throw new Error((await r.text().catch(() => "")) || `Błąd zapisu ustawień (${r.status})`);
            const data = await r.json();
            console.log(`[FRONTEND] Backend odpowiedział:`, {
                temp: data.target_temp_c,
                source: data.last_source,
                updated: data.updated_at
            });
            setThermos(arr => arr.map(t => t.id === tid ? {
                ...t,
                settings: { target_temp_c: data.target_temp_c, mode: data.mode, last_source: data.last_source },
                editTemp: data.target_temp_c,
                saving: false,
                infoMsg: `Zapisano (${formatDate(data.updated_at)})`,
            } : t));
        }
        catch (e) {
            setThermos(arr => arr.map(t => t.id === tid ? { ...t, saving: false, infoMsg: e?.message || "Nie udało się zapisać." } : t));
        }
    };
    // --- sprawdź czy ustawienia się zmieniły (np. z urządzenia) ---
    const checkSettingsUpdate = async (tid) => {
        try {
            const r = await authFetch(`${apiBase}/thermostats/${tid}/settings`);
            if (!r.ok)
                return; // Ignoruj błędy w tle
            const data = await r.json();
            setThermos(arr => arr.map(t => {
                if (t.id !== tid)
                    return t;
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
        }
        catch (e) {
            // Ignoruj błędy w tle - nie przeszkadzaj użytkownikowi
            console.log(`[DEBUG] Błąd checkSettingsUpdate:`, e.message);
        }
    };
    // --- zarządzanie termostatami ---
    const [showAddThermostat, setShowAddThermostat] = useState(false);
    const [newThermostatName, setNewThermostatName] = useState("");
    const [selectedThermostatId, setSelectedThermostatId] = useState(null);
    const [useAutoId, setUseAutoId] = useState(true);
    const [availableIds, setAvailableIds] = useState([]);
    const [editingThermostat, setEditingThermostat] = useState(null);
    const loadAvailableIds = async () => {
        try {
            const r = await authFetch(`${apiBase}/available-ids`);
            if (r.ok) {
                const data = await r.json();
                setAvailableIds(data.available_ids || []);
            }
        }
        catch (e) {
            console.error("Nie udało się załadować dostępnych ID:", e);
        }
    };
    const addThermostat = async () => {
        if (!newThermostatName.trim())
            return;
        if (!useAutoId && !selectedThermostatId) {
            setGlobalErr("Wybierz ID termostatu");
            return;
        }
        setGlobalErr(null);
        try {
            let url;
            let body;
            if (useAutoId) {
                // Zwykłe dodawanie termostatu z automatycznym ID
                url = `${apiBase}/thermostats`;
                body = JSON.stringify({ name: newThermostatName.trim() });
            }
            else {
                // Admin endpoint z określonym ID
                url = `${apiBase}/admin/thermostats/create-with-id?thermostat_id=${selectedThermostatId}&name=${encodeURIComponent(newThermostatName.trim())}&user_id=${me.id}`;
                body = null;
            }
            const r = await authFetch(url, {
                method: "POST",
                headers: useAutoId ? { "Content-Type": "application/json" } : {},
                body: body,
            });
            if (!r.ok)
                throw new Error((await r.text().catch(() => "")) || `Błąd dodawania termostatu (${r.status})`);
            setNewThermostatName("");
            setSelectedThermostatId(null);
            setUseAutoId(true);
            setShowAddThermostat(false);
            await loadThermostats(); // Przeładuj listę
        }
        catch (e) {
            setGlobalErr(e?.message || "Nie udało się dodać termostatu.");
        }
    };
    const updateThermostat = async (tid, name) => {
        if (!name.trim())
            return;
        setGlobalErr(null);
        try {
            const r = await authFetch(`${apiBase}/thermostats/${tid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
            });
            if (!r.ok)
                throw new Error((await r.text().catch(() => "")) || `Błąd aktualizacji termostatu (${r.status})`);
            setEditingThermostat(null);
            await loadThermostats(); // Przeładuj listę
        }
        catch (e) {
            setGlobalErr(e?.message || "Nie udało się zaktualizować termostatu.");
        }
    };
    const deleteThermostat = async (tid, name) => {
        if (!confirm(`Czy na pewno chcesz usunąć termostat "${name}"?\n\nTo spowoduje usunięcie wszystkich odczytów, ustawień i harmonogramów tego termostatu.`)) {
            return;
        }
        setGlobalErr(null);
        try {
            const r = await authFetch(`${apiBase}/thermostats/${tid}`, {
                method: "DELETE",
            });
            if (!r.ok)
                throw new Error((await r.text().catch(() => "")) || `Błąd usuwania termostatu (${r.status})`);
            await loadThermostats(); // Przeładuj listę
            // Jeśli usuniętym termostatem był aktualnie wybrany, wyczyść selekcję
            if (selectedThermo?.id === tid) {
                setSelectedThermo(null);
                setActiveView("dashboard");
            }
        }
        catch (e) {
            setGlobalErr(e?.message || "Nie udało się usunąć termostatu.");
        }
    };
    // --- kliknięcia + / − z logiką konfliktu ---
    const bump = (tid, delta) => {
        setThermos(arr => {
            const out = arr.map(t => {
                if (t.id !== tid)
                    return t;
                if (t.saving)
                    return t; // w trakcie zapisu – ignorujemy klik
                const backendVal = t.settings.target_temp_c;
                const localVal = t.editTemp;
                // Sprawdź czy lokalna i backendowa temperatura się różnią
                if (!approxEq(localVal, backendVal)) {
                    // Różnica wykryta - sprawdź źródło ostatniej zmiany
                    if (t.settings.last_source === "device") {
                        // Zmiana pochodzi z termostatu → pobierz z backendu
                        setTimeout(() => refreshSettings(tid), 0);
                        return { ...t, infoMsg: "Temperatura zmieniona z termostatu — synchronizuję…" };
                    }
                    else {
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
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
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
            }, pollMs);
        }
        return () => { if (timerRef.current)
            window.clearInterval(timerRef.current); };
    }, [pollMs, apiBase, token]);
    const hasThermo = useMemo(() => thermos.length > 0, [thermos.length]);
    return (_jsxs("div", { className: "min-h-screen bg-gradient-primary", children: [_jsx("header", { className: "nav-modern", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 py-3 sm:px-6 sm:py-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "nav-brand", children: [_jsx("div", { className: "nav-icon", children: _jsx(FiHome, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold", children: "HeatBeat" }), _jsx("p", { className: "text-xs text-white/70", children: "Smart Control" })] })] }), _jsxs("div", { className: "flex items-center gap-2 sm:gap-4", children: [_jsxs("div", { className: "flex items-center gap-1 sm:gap-2", children: [_jsxs("button", { onClick: () => setActiveView("dashboard"), className: `px-2 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors ${activeView === "dashboard"
                                                    ? "bg-white/20 text-white"
                                                    : "text-white/70 hover:text-white hover:bg-white/10"}`, children: [_jsx(FiHome, { className: "w-4 h-4 inline mr-1 sm:mr-2" }), _jsx("span", { className: "hidden sm:inline", children: "Dashboard" }), _jsx("span", { className: "sm:hidden", children: "Dom" })] }), _jsxs("button", { onClick: () => {
                                                    setActiveView("schedule");
                                                    if (thermos.length > 0 && !selectedThermo) {
                                                        setSelectedThermo(thermos[0]);
                                                    }
                                                }, className: `px-2 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors ${activeView === "schedule"
                                                    ? "bg-white/20 text-white"
                                                    : "text-white/70 hover:text-white hover:bg-white/10"}`, children: [_jsx(FiCalendar, { className: "w-4 h-4 inline mr-1 sm:mr-2" }), _jsx("span", { className: "hidden sm:inline", children: "Harmonogram" }), _jsx("span", { className: "sm:hidden", children: "Plan" })] })] }), _jsxs("div", { className: "hidden md:flex items-center gap-3", children: [_jsx(FiClock, { className: "w-4 h-4 text-white/70" }), _jsxs("select", { value: pollMs, onChange: (e) => setPollMs(Number(e.target.value)), className: "bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-400", children: [_jsx("option", { value: 0, className: "text-gray-800", children: "Wy\u0142\u0105czone" }), _jsx("option", { value: 3000, className: "text-gray-800", children: "Co 3s" }), _jsx("option", { value: 5000, className: "text-gray-800", children: "Co 5s" }), _jsx("option", { value: 10000, className: "text-gray-800", children: "Co 10s" }), _jsx("option", { value: 30000, className: "text-gray-800", children: "Co 30s" })] })] }), _jsxs("button", { onClick: () => {
                                            loadThermostats().then(() => setTimeout(() => {
                                                thermos.forEach((t) => loadLastReading(t.id));
                                            }, 100));
                                        }, className: "btn-secondary flex items-center gap-2", children: [_jsx(FiRefreshCw, { className: "w-4 h-4" }), _jsx("span", { className: "hidden sm:inline", children: "Od\u015Bwie\u017C" })] }), isAdmin && (_jsxs("button", { onClick: () => window.location.href = "/?admin=true", className: "btn-secondary flex items-center gap-2", children: [_jsx(FiServer, { className: "w-4 h-4" }), _jsx("span", { className: "hidden sm:inline", children: "Admin" })] })), _jsxs("button", { onClick: logout, className: "btn-ghost flex items-center gap-2", children: [_jsx(FiLogOut, { className: "w-4 h-4" }), _jsx("span", { className: "hidden sm:inline", children: "Wyloguj" })] })] })] }) }) }), _jsxs("main", { className: "max-w-7xl mx-auto px-2 py-4 sm:px-6 sm:py-8", children: [meErr && (_jsx("div", { className: "mb-4 glass-card p-3 rounded-xl border-red-300/30 bg-red-500/20 text-white animate-fade-in sm:mb-6 sm:p-4", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FiActivity, { className: "w-4 h-4 text-red-300 sm:w-5 sm:h-5" }), _jsx("span", { className: "text-sm sm:text-base", children: meErr })] }) })), globalErr && (_jsx("div", { className: "mb-4 glass-card p-3 rounded-xl border-red-300/30 bg-red-500/20 text-white animate-fade-in sm:mb-6 sm:p-4", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FiActivity, { className: "w-4 h-4 text-red-300 sm:w-5 sm:h-5" }), _jsx("span", { className: "text-sm sm:text-base", children: globalErr })] }) })), activeView === "dashboard" && (_jsx("section", { className: "mb-6 animate-fade-in sm:mb-8", children: _jsx("div", { className: "glass-card p-4 rounded-2xl sm:p-6", children: _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3 sm:gap-4", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center sm:w-12 sm:h-12", children: _jsx(FiUser, { className: "w-5 h-5 text-white sm:w-6 sm:h-6" }) }), _jsxs("div", { children: [_jsxs("h2", { className: "text-lg font-bold text-white mobile-header sm:text-2xl", children: ["Witaj", me?.email ? `, ${me.email.split('@')[0]}` : "", "!"] }), _jsx("p", { className: "text-xs text-white/70 sm:text-base", children: "Zarz\u0105dzaj swoimi termostatami w jednym miejscu" })] })] }), _jsxs("button", { onClick: () => {
                                            setShowAddThermostat(true);
                                            loadAvailableIds();
                                        }, className: "btn-primary flex items-center justify-center gap-2 w-full sm:w-auto", children: [_jsx(FiPlus, { className: "w-4 h-4" }), _jsx("span", { className: "text-sm sm:text-base", children: "Dodaj termostat" })] })] }) }) })), activeView === "schedule" && (_jsx("section", { className: "mb-8 animate-fade-in", children: _jsx("div", { className: "glass-card p-6 rounded-2xl", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center", children: _jsx(FiCalendar, { className: "w-6 h-6 text-white" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-white", children: "Harmonogramy temperatury" }), _jsx("p", { className: "text-white/70", children: "Ustaw automatyczne zmiany temperatury w ci\u0105gu dnia" })] })] }), thermos.length > 1 && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("label", { className: "text-white/70 text-sm", children: "Termostat:" }), _jsx("select", { value: selectedThermo?.id || '', onChange: (e) => {
                                                    const thermo = thermos.find(t => t.id === Number(e.target.value));
                                                    setSelectedThermo(thermo || null);
                                                }, className: "bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-400", children: thermos.map(t => (_jsx("option", { value: t.id, className: "text-gray-800", children: t.name }, t.id))) })] }))] }) }) })), activeView === "dashboard" ? (
                    // Dashboard content
                    !hasThermo ? (_jsxs("div", { className: "floating-card p-8 text-center animate-slide-up", children: [_jsx("div", { className: "w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center", children: _jsx(FiHome, { className: "w-8 h-8 text-white" }) }), _jsx("h3", { className: "text-xl font-semibold text-gray-800 mb-2", children: "Brak termostat\u00F3w" }), _jsx("p", { className: "text-gray-600", children: "Zarejestruj urz\u0105dzenie lub dodaj w bazie danych" })] })) : (_jsx("div", { className: "grid gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 mobile-spacing", children: thermos.map((t, index) => (_jsx(ThermostatCard, { thermostat: t, index: index, onBump: bump, onRefresh: loadLastReading, onEdit: (id, name) => setEditingThermostat({ id, name }), onDelete: deleteThermostat }, t.id))) }))) : (
                    // Schedule content
                    selectedThermo ? (_jsx("div", { className: "floating-card p-6", children: _jsx(ScheduleManager, { thermostatId: selectedThermo.id, thermostatName: selectedThermo.name, token: token || undefined }) })) : (_jsxs("div", { className: "floating-card p-8 text-center", children: [_jsx(FiCalendar, { className: "w-16 h-16 mx-auto mb-4 text-gray-400" }), _jsx("h3", { className: "text-xl font-semibold text-gray-800 mb-2", children: "Wybierz termostat" }), _jsx("p", { className: "text-gray-600", children: "Aby zarz\u0105dza\u0107 harmonogramem, najpierw wybierz termostat" })] })))] }), showAddThermostat && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm", children: _jsxs("div", { className: "bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl", children: [_jsx("h3", { className: "text-xl font-bold text-gray-800 mb-4", children: "Dodaj nowy termostat" }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Nazwa termostatu" }), _jsx("input", { type: "text", value: newThermostatName, onChange: (e) => setNewThermostatName(e.target.value), className: "w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500", placeholder: "np. Salon, Sypialnia...", autoFocus: true })] }), _jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex items-center mb-3", children: [_jsx("input", { type: "checkbox", id: "useAutoId", checked: useAutoId, onChange: (e) => {
                                                setUseAutoId(e.target.checked);
                                                if (e.target.checked)
                                                    setSelectedThermostatId(null);
                                            }, className: "mr-2" }), _jsx("label", { htmlFor: "useAutoId", className: "text-sm font-medium text-gray-700", children: "Automatyczne ID" })] }), !useAutoId && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Wybierz ID termostatu" }), availableIds.length > 0 ? (_jsxs("select", { value: selectedThermostatId || "", onChange: (e) => setSelectedThermostatId(Number(e.target.value) || null), className: "w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500", children: [_jsx("option", { value: "", children: "Wybierz ID..." }), availableIds.map(id => (_jsxs("option", { value: id, children: ["ID ", id] }, id)))] })) : (_jsx("p", { className: "text-sm text-gray-500 p-3 border border-gray-300 rounded-lg bg-gray-50", children: "\u0141adowanie dost\u0119pnych ID..." })), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Wybierz konkretne ID dla urz\u0105dze\u0144 fizycznych lub innych specjalnych zastosowa\u0144." })] }))] }), _jsxs("div", { className: "flex justify-end gap-3", children: [_jsx("button", { onClick: () => {
                                        setShowAddThermostat(false);
                                        setNewThermostatName("");
                                        setSelectedThermostatId(null);
                                        setUseAutoId(true);
                                    }, className: "px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors", children: "Anuluj" }), _jsx("button", { onClick: addThermostat, disabled: !newThermostatName.trim() ||
                                        (!useAutoId && !selectedThermostatId), className: "btn-primary disabled:opacity-50 disabled:cursor-not-allowed", children: "Dodaj" })] })] }) })), editingThermostat && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm", children: _jsxs("div", { className: "bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl", children: [_jsx("h3", { className: "text-xl font-bold text-gray-800 mb-4", children: "Edytuj termostat" }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Nazwa termostatu" }), _jsx("input", { type: "text", value: editingThermostat.name, onChange: (e) => setEditingThermostat({ ...editingThermostat, name: e.target.value }), className: "w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500", placeholder: "np. Salon, Sypialnia...", autoFocus: true })] }), _jsxs("div", { className: "flex justify-end gap-3", children: [_jsx("button", { onClick: () => setEditingThermostat(null), className: "px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors", children: "Anuluj" }), _jsx("button", { onClick: () => updateThermostat(editingThermostat.id, editingThermostat.name), disabled: !editingThermostat.name.trim(), className: "btn-primary disabled:opacity-50 disabled:cursor-not-allowed", children: "Zapisz" })] })] }) }))] }));
}
// Komponent karty termostatu
function ThermostatCard({ thermostat: t, index, onBump, onRefresh, onEdit, onDelete }) {
    return (_jsxs("div", { className: "floating-card p-4 sm:p-6 animate-fade-in relative overflow-hidden mobile-thermostat-card", style: { animationDelay: `${index * 0.1}s` }, children: [_jsx("div", { className: "absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-400/20 to-transparent rounded-full -translate-y-16 translate-x-16" }), _jsxs("div", { className: "flex items-center justify-between mb-6 relative z-10", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xl font-bold text-gray-800 mb-1", children: t.name }), _jsxs("span", { className: "text-sm text-gray-500", children: ["#", t.id] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => onEdit(t.id, t.name), className: "p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors duration-200 border border-blue-300", title: "Edytuj termostat", children: _jsx(FiEdit, { className: "w-5 h-5 text-blue-600" }) }), _jsx("button", { onClick: () => onDelete(t.id, t.name), className: "p-2 rounded-lg bg-red-100 hover:bg-red-200 transition-colors duration-200 border border-red-300", title: "Usu\u0144 termostat", children: _jsx(FiTrash2, { className: "w-5 h-5 text-red-600" }) }), _jsx("button", { onClick: () => onRefresh(t.id), className: "p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 border border-gray-300", title: "Od\u015Bwie\u017C dane", disabled: t.loading, children: _jsx(FiRefreshCw, { className: `w-5 h-5 text-gray-600 ${t.loading ? 'animate-spin' : ''}` }) })] })] }), _jsxs("div", { className: "flex items-center justify-center gap-6 sm:gap-4 p-8 sm:p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 mb-6", children: [_jsx("button", { onClick: () => onBump(t.id, -STEP), className: `w-20 h-20 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center text-white text-3xl sm:text-xl font-bold
                     transition-colors duration-300 shadow-lg aspect-square
                     ${t.saving
                            ? 'bg-gray-400 border-gray-500 cursor-not-allowed opacity-50'
                            : 'bg-purple-500 border-purple-600 hover:bg-purple-600'}`, disabled: t.saving, style: { borderRadius: '50%' }, children: t.saving ? (_jsx("div", { className: "w-6 h-6 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" })) : (_jsx(FiMinus, { className: "w-8 h-8 sm:w-6 sm:h-6" })) }), _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "text-5xl sm:text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent mb-1", children: [t.editTemp.toFixed(1), "\u00B0C"] }), _jsx("span", { className: "text-white/60 text-xs", children: "Zadana temperatura" }), t.settings.last_source && (_jsxs("div", { className: "text-white/40 text-xs mt-1", children: ["\u0179r\u00F3d\u0142o: ", t.settings.last_source === 'app' ? 'Aplikacja' : 'Termostat'] }))] }), _jsx("button", { onClick: () => onBump(t.id, +STEP), className: `w-20 h-20 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center text-white text-3xl sm:text-xl font-bold
                     transition-colors duration-300 shadow-lg aspect-square
                     ${t.saving
                            ? 'bg-gray-400 border-gray-500 cursor-not-allowed opacity-50'
                            : 'bg-purple-500 border-purple-600 hover:bg-purple-600'}`, disabled: t.saving, style: { borderRadius: '50%' }, children: t.saving ? (_jsx("div", { className: "w-6 h-6 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" })) : (_jsx(FiPlus, { className: "w-8 h-8 sm:w-6 sm:h-6" })) })] }), _jsxs("div", { className: "mb-4 min-h-[3.5rem] flex flex-col justify-center", children: [t.infoMsg && (_jsx("div", { className: "p-3 rounded-lg bg-purple-50 border border-purple-200 text-sm text-purple-700", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-2 h-2 bg-purple-500 rounded-full" }), _jsx("span", { children: t.infoMsg })] }) })), t.error && (_jsx("div", { className: "p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-2 h-2 bg-red-500 rounded-full" }), _jsx("span", { children: t.error })] }) }))] }), t.lastReading ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "relative p-6 rounded-xl border border-orange-200 overflow-hidden", children: [_jsx("div", { className: `absolute inset-0 opacity-10 temp-indicator ${getTemperatureStatus(t.lastReading.temperature_c, t.editTemp).status}` }), _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FiThermometer, { className: "w-5 h-5 text-orange-600" }), _jsx("span", { className: "text-sm font-medium text-orange-700", children: "Temperatura" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `w-2 h-2 rounded-full status-dot ${getTemperatureStatus(t.lastReading.temperature_c, t.editTemp).status === 'optimal' ? 'online bg-green-500' : 'offline bg-red-500'}` }), _jsx("span", { className: `text-xs font-medium ${getTemperatureStatus(t.lastReading.temperature_c, t.editTemp).color}`, children: getTemperatureStatus(t.lastReading.temperature_c, t.editTemp).text })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "text-3xl font-bold text-orange-800 mb-1", children: [t.lastReading.temperature_c.toFixed(1), "\u00B0C"] }), _jsxs("div", { className: "text-sm text-orange-600", children: ["Zadana: ", t.editTemp.toFixed(1), "\u00B0C"] })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-sm text-orange-600 mb-1", children: "R\u00F3\u017Cnica" }), _jsxs("div", { className: `text-lg font-semibold ${getTemperatureStatus(t.lastReading.temperature_c, t.editTemp).color}`, children: [(t.lastReading.temperature_c - t.editTemp).toFixed(1), "\u00B0C"] })] })] })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsxs("div", { className: "bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl border border-blue-200 hover-lift", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(FiDroplet, { className: "w-4 h-4 text-blue-600" }), _jsx("span", { className: "text-xs font-medium text-blue-700", children: "Wilgotno\u015B\u0107" })] }), _jsxs("div", { className: "text-xl font-bold text-blue-800", children: [t.lastReading.humidity_pct ?? "-", "%"] })] }), _jsxs("div", { className: "bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-xl border border-purple-200 hover-lift", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(FiWind, { className: "w-4 h-4 text-purple-600" }), _jsx("span", { className: "text-xs font-medium text-purple-700", children: "Ci\u015Bnienie" })] }), _jsx("div", { className: "text-lg font-bold text-purple-800", children: t.lastReading.pressure_hpa ? Math.round(t.lastReading.pressure_hpa) : "-" }), _jsx("div", { className: "text-xs text-purple-600", children: "hPa" })] }), _jsxs("div", { className: "bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-xl border border-green-200 hover-lift", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(FiHome, { className: "w-4 h-4 text-green-600" }), _jsx("span", { className: "text-xs font-medium text-green-700", children: "Okno" })] }), _jsx("div", { className: `text-sm font-bold ${t.lastReading.window_open_detected ? 'text-red-600' : 'text-green-800'}`, children: t.lastReading.window_open_detected ? "OTWARTE" : "Zamknięte" })] }), _jsxs("div", { className: `p-3 rounded-xl border hover-lift ${t.lastReading.is_heating
                                    ? 'bg-gradient-to-br from-orange-50 to-red-100 border-orange-200'
                                    : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'}`, children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(FiThermometer, { className: `w-4 h-4 ${t.lastReading.is_heating ? 'text-orange-600' : 'text-blue-600'}` }), _jsx("span", { className: `text-xs font-medium ${t.lastReading.is_heating ? 'text-orange-700' : 'text-blue-700'}`, children: "Grzanie" })] }), _jsx("div", { className: `text-sm font-bold ${t.lastReading.is_heating ? 'text-red-600' : 'text-blue-800'}`, children: t.lastReading.is_heating ? "AKTYWNE" : "Nieaktywne" })] })] }), _jsx("div", { className: "pt-3 border-t border-gray-200", children: _jsxs("div", { className: "flex items-center gap-2 text-xs text-gray-500", children: [_jsx(FiClock, { className: "w-3 h-3" }), _jsxs("span", { children: ["Ostatnia aktualizacja: ", formatDate(t.lastReading.created_at)] })] }) })] })) : (_jsxs("div", { className: "text-center py-8 text-gray-500", children: [_jsx(FiActivity, { className: "w-8 h-8 mx-auto mb-2 opacity-50" }), _jsx("p", { className: "text-sm", children: "Brak odczyt\u00F3w" })] }))] }));
}
