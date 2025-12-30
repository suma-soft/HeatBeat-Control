import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// frontend/src/features/thermostat/ThermostatPanel.jsx
import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useThermostat } from "./useThermostat";
export default function ThermostatPanel({ deviceId = "thermo-001" }) {
    const { token } = useAuth();
    const apiBaseUrl = "http://localhost:8000"; // TODO: get from config
    const { state, setSetpoint } = useThermostat(apiBaseUrl, deviceId, token || undefined);
    const [localTarget, setLocalTarget] = useState(null);
    const temp = state?.last_telemetry?.temperature_c ?? null;
    const hum = state?.last_telemetry?.humidity_pct ?? null;
    const pres = state?.last_telemetry?.pressure_hpa ?? null;
    const target = useMemo(() => {
        if (localTarget !== null)
            return localTarget;
        return state?.target_c ?? null;
    }, [state?.target_c, localTarget]);
    const apply = async () => {
        if (target === null)
            return;
        await setSetpoint(target);
        setLocalTarget(null);
    };
    return (_jsxs("div", { className: "p-4 rounded-2xl shadow-md bg-white/5 border border-white/10", children: [_jsxs("h2", { className: "text-xl font-semibold mb-3", children: ["Termostat \u2014 ", deviceId] }), _jsxs("div", { className: "grid grid-cols-3 gap-3 mb-4", children: [_jsxs("div", { className: "p-3 rounded-lg bg-white/10", children: [_jsx("div", { className: "text-sm opacity-80", children: "Temperatura" }), _jsx("div", { className: "text-2xl", children: temp !== null ? `${temp.toFixed(1)}°C` : "—" })] }), _jsxs("div", { className: "p-3 rounded-lg bg-white/10", children: [_jsx("div", { className: "text-sm opacity-80", children: "Wilgotno\u015B\u0107" }), _jsx("div", { className: "text-2xl", children: hum !== null ? `${hum.toFixed(0)}%` : "—" })] }), _jsxs("div", { className: "p-3 rounded-lg bg-white/10", children: [_jsx("div", { className: "text-sm opacity-80", children: "Ci\u015Bnienie" }), _jsx("div", { className: "text-2xl", children: pres !== null ? `${pres.toFixed(1)} hPa` : "—" })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { className: "px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20", onClick: () => setLocalTarget((t) => (t ?? state?.target_c ?? 20) - 0.5), children: "\u2212" }), _jsx("div", { className: "text-2xl min-w-32 text-center", children: target !== null ? `${Number(target).toFixed(1)}°C` : "—" }), _jsx("button", { className: "px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20", onClick: () => setLocalTarget((t) => (t ?? state?.target_c ?? 20) + 0.5), children: "+" }), _jsx("button", { className: "ml-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700", onClick: apply, disabled: target === null, children: "Ustaw" })] }), _jsxs("div", { className: "text-xs opacity-70 mt-3", children: ["Ostatni odczyt: ", state?.last_telemetry?.ts ? new Date(state.last_telemetry.ts).toLocaleString() : "—"] })] }));
}
