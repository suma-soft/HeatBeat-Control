import React from "react";

// Prosty kontroler temperatury: ±0.5°C
export default function TempControl({
  value,
  onChange
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const step = 0.5;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={() => onChange(Number((value - step).toFixed(1)))}>-</button>
      <div style={{ fontSize: 32, minWidth: 120, textAlign: "center" }}>{value.toFixed(1)}°C</div>
      <button onClick={() => onChange(Number((value + step).toFixed(1)))}>+</button>
    </div>
  );
}
