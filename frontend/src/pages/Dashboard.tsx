// frontend/src/pages/Dashboard.tsx
import React from "react";
import { ThermostatPanel } from "../features/thermostat";


export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {/* Możesz dodać więcej paneli dla wielu urządzeń */}
      <div className="grid gap-6 md:grid-cols-2">
        <ThermostatPanel deviceId="001" />
      </div>
    </div>
  );
}
