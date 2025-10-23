// frontend/src/features/thermostat/ThermostatPanel.jsx
import React, { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useThermostat } from "./useThermostat";

export default function ThermostatPanel({ deviceId = "thermo-001" }) {
  const { token, apiBaseUrl } = useAuth();
  const { state, setSetpoint } = useThermostat(apiBaseUrl, deviceId, token || undefined);
  const [localTarget, setLocalTarget] = useState<number | null>(null);

  const temp = state?.last_telemetry?.temperature_c ?? null;
  const hum = state?.last_telemetry?.humidity_pct ?? null;
  const pres = state?.last_telemetry?.pressure_hpa ?? null;

  const target = useMemo(() => {
    if (localTarget !== null) return localTarget;
    return state?.target_c ?? null;
  }, [state?.target_c, localTarget]);

  const apply = async () => {
    if (target === null) return;
    await setSetpoint(target);
    setLocalTarget(null);
  };

  return (
    <div className="p-4 rounded-2xl shadow-md bg-white/5 border border-white/10">
      <h2 className="text-xl font-semibold mb-3">Termostat — {deviceId}</h2>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-white/10">
          <div className="text-sm opacity-80">Temperatura</div>
          <div className="text-2xl">{temp !== null ? `${temp.toFixed(1)}°C` : "—"}</div>
        </div>
        <div className="p-3 rounded-lg bg-white/10">
          <div className="text-sm opacity-80">Wilgotność</div>
          <div className="text-2xl">{hum !== null ? `${hum.toFixed(0)}%` : "—"}</div>
        </div>
        <div className="p-3 rounded-lg bg-white/10">
          <div className="text-sm opacity-80">Ciśnienie</div>
          <div className="text-2xl">{pres !== null ? `${pres.toFixed(1)} hPa` : "—"}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
          onClick={() => setLocalTarget((t) => (t ?? state?.target_c ?? 20) - 0.5)}
        >
          −
        </button>
        <div className="text-2xl min-w-32 text-center">
          {target !== null ? `${Number(target).toFixed(1)}°C` : "—"}
        </div>
        <button
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
          onClick={() => setLocalTarget((t) => (t ?? state?.target_c ?? 20) + 0.5)}
        >
          +
        </button>
        <button
          className="ml-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700"
          onClick={apply}
          disabled={target === null}
        >
          Ustaw
        </button>
      </div>

      <div className="text-xs opacity-70 mt-3">
        Ostatni odczyt: {state?.last_telemetry?.ts ? new Date(state.last_telemetry.ts).toLocaleString() : "—"}
      </div>
    </div>
  );
}
