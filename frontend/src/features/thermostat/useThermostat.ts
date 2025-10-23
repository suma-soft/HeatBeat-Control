// frontend/src/features/thermostat/useThermostat.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { ThermoAPI } from "./api";

type Telemetry = {
  device_id: string;
  temperature_c: number;
  humidity_pct: number;
  pressure_hpa: number;
  battery_v?: number | null;
  rssi_dbm?: number | null;
  ts: string;
};

type ThermoState = {
  device_id: string;
  target_c?: number | null;
  last_telemetry?: Telemetry | null;
};

export function useThermostat(baseUrl: string, deviceId: string, token?: string) {
  const [state, setState] = useState<ThermoState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const wsUrl = useMemo(() => {
    const u = new URL(baseUrl);
    u.protocol = u.protocol.replace("http", "ws");
    u.pathname = `/api/v1/ws/thermostats/${deviceId}`;
    return u.toString();
  }, [baseUrl, deviceId]);

  useEffect(() => {
    let cancelled = false;

    ThermoAPI.state(baseUrl, deviceId, token).then((s) => {
      if (!cancelled) setState(s);
    });

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type === "telemetry") {
        setState((prev) => prev ? { ...prev, last_telemetry: msg.data } : null);
      } else if (msg.type === "setpoint") {
        setState((prev) => prev ? { ...prev, target_c: msg.target_c } : null);
      }
    };
    ws.onopen = () => {
      const ping = setInterval(() => ws.readyState === 1 && ws.send("ping"), 30000);
      (ws as any)._ping = ping;
    };
    ws.onclose = () => {
      const ping = (ws as any)._ping;
      if (ping) clearInterval(ping);
    };

    return () => {
      cancelled = true;
      try { ws.close(); } catch {}
    };
  }, [baseUrl, deviceId, token, wsUrl]);

  const setSetpoint = async (targetC: number) => {
    await ThermoAPI.setpoint(baseUrl, deviceId, targetC, token);
    setState((s) => (s ? { ...s, target_c: targetC } : s));
  };

  return { state, setSetpoint };
}
