// frontend/src/features/thermostat/useThermostat.ts
// Hook oparty na POLLINGU (co 5 s) – bez WebSocketów.

import { useEffect, useRef, useState } from "react";
import { ThermoAPI, ThermostatState } from "./api";

export function useThermostat(baseUrl: string, deviceId: string, token?: string) {
  const [state, setState] = useState<ThermostatState | null>(null);
  const timerRef = useRef<number | null>(null);

  // Jednorazowe pobranie + start interwału
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const s = await ThermoAPI.state(baseUrl, deviceId, token);
        if (!cancelled) setState(s);
      } catch (e) {
        // opcjonalnie: console.warn(e);
      }
    };

    load();
    timerRef.current = window.setInterval(load, 5000);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [baseUrl, deviceId, token]);

  const setSetpoint = async (targetC: number) => {
    await ThermoAPI.setpoint(baseUrl, deviceId, targetC, token);
    // Optymistyczna aktualizacja; za 5 s i tak przyjdzie stan z backendu
    setState((s) => (s ? { ...s, target_c: targetC } : s));
  };

  return { state, setSetpoint };
}
