import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Prosty kontroler temperatury: ±0.5°C
export default function TempControl({ value, onChange }) {
    const step = 0.5;
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("button", { onClick: () => onChange(Number((value - step).toFixed(1))), children: "-" }), _jsxs("div", { style: { fontSize: 32, minWidth: 120, textAlign: "center" }, children: [value.toFixed(1), "\u00B0C"] }), _jsx("button", { onClick: () => onChange(Number((value + step).toFixed(1))), children: "+" })] }));
}
