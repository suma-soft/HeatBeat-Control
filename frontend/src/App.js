import { jsx as _jsx } from "react/jsx-runtime";
// frontend/src/App.tsx
// Warunkowy render: jeśli jest token → Dashboard, w przeciwnym razie Login/Register z przełącznikiem.
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
function InnerApp() {
    const { token, isAdmin } = useAuth();
    const [mode, setMode] = useState("login");
    const [view, setView] = useState("user");
    // Jeśli pojawi się token (po zalogowaniu/rejestracji), pokaż odpowiedni Dashboard
    if (token) {
        // Sprawdź czy URL zawiera parametr admin
        const urlParams = new URLSearchParams(window.location.search);
        const adminParam = urlParams.get('admin');
        // Jeśli admin jest w URL i użytkownik ma uprawnienia, pokaż panel admina
        if (adminParam === 'true' && isAdmin) {
            return _jsx(AdminDashboard, {});
        }
        return _jsx(Dashboard, {});
    }
    return mode === "login" ? (_jsx(Login, { onSwitchToRegister: () => setMode("register") })) : (_jsx(Register, { onSwitchToLogin: () => setMode("login") }));
}
export default function App() {
    return (_jsx(AuthProvider, { children: _jsx(InnerApp, {}) }));
}
