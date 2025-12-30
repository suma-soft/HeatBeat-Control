import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// frontend/src/pages/Login.tsx
// Formularz logowania: przyjmuje "Email lub login" i wysyła { username: <to_co_poda_użytkownik>, password }.
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FiThermometer, FiUser, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
export default function Login({ onSwitchToRegister }) {
    const { login } = useAuth();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const onSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
            await login(identifier.trim(), password);
        }
        catch (err) {
            setError(err?.message || "Nie udało się zalogować.");
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-gradient-primary flex items-center justify-center p-6", children: [_jsxs("div", { className: "absolute inset-0 overflow-hidden", children: [_jsx("div", { className: "absolute -top-32 -left-32 w-64 h-64 bg-white/10 rounded-full animate-float" }), _jsx("div", { className: "absolute -bottom-32 -right-32 w-96 h-96 bg-white/5 rounded-full animate-float", style: { animationDelay: '2s' } }), _jsx("div", { className: "absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full animate-float", style: { animationDelay: '4s' } })] }), _jsxs("div", { className: "relative z-10 w-full max-w-md", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("div", { className: "inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30", children: _jsx(FiThermometer, { className: "w-8 h-8 text-white" }) }), _jsx("h1", { className: "text-3xl font-bold text-white mb-2", children: "Witaj ponownie!" }), _jsx("p", { className: "text-white/70", children: "Zaloguj si\u0119 do HeatBeat Control" })] }), _jsxs("form", { onSubmit: onSubmit, className: "floating-card p-8 space-y-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700", children: "Email lub nazwa u\u017Cytkownika" }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: _jsx(FiUser, { className: "h-5 w-5 text-gray-400" }) }), _jsx("input", { className: "w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 bg-white/50", value: identifier, onChange: (e) => setIdentifier(e.target.value), autoComplete: "username", placeholder: "Wprowad\u017A email lub login", required: true })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700", children: "Has\u0142o" }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: _jsx(FiLock, { className: "h-5 w-5 text-gray-400" }) }), _jsx("input", { type: showPassword ? "text" : "password", className: "w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 bg-white/50", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "current-password", placeholder: "Wprowad\u017A has\u0142o", required: true }), _jsx("button", { type: "button", className: "absolute inset-y-0 right-0 pr-3 flex items-center", onClick: () => setShowPassword(!showPassword), children: showPassword ? (_jsx(FiEyeOff, { className: "h-5 w-5 text-gray-400 hover:text-gray-600" })) : (_jsx(FiEye, { className: "h-5 w-5 text-gray-400 hover:text-gray-600" })) })] })] }), error && (_jsx("div", { className: "p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in", children: error })), _jsx("button", { type: "submit", disabled: busy, className: "btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none", children: busy ? (_jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsx("div", { className: "w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" }), _jsx("span", { children: "Logowanie..." })] })) : ("Zaloguj się") }), _jsx("div", { className: "text-center pt-4", children: _jsxs("p", { className: "text-gray-600 text-sm", children: ["Nie masz jeszcze konta?", " ", _jsx("button", { type: "button", onClick: onSwitchToRegister, className: "font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-200", children: "Zarejestruj si\u0119" })] }) })] })] })] }));
}
