import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// frontend/src/pages/Register.tsx
// Formularz rejestracji: wysyła { email, password, username: email }.
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FiMail, FiLock, FiThermometer, FiEye, FiEyeOff, FiCheck } from "react-icons/fi";
export default function Register({ onSwitchToLogin }) {
    const { register } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const passwordStrength = (password) => {
        let score = 0;
        if (password.length >= 8)
            score++;
        if (/[A-Z]/.test(password))
            score++;
        if (/[a-z]/.test(password))
            score++;
        if (/[0-9]/.test(password))
            score++;
        if (/[^A-Za-z0-9]/.test(password))
            score++;
        return score;
    };
    const getPasswordStrengthColor = (score) => {
        if (score <= 2)
            return "bg-red-500";
        if (score <= 3)
            return "bg-yellow-500";
        return "bg-green-500";
    };
    const getPasswordStrengthText = (score) => {
        if (score <= 2)
            return "Słabe";
        if (score <= 3)
            return "Średnie";
        return "Silne";
    };
    const onSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (password !== confirm) {
            setError("Hasła nie są takie same.");
            return;
        }
        setBusy(true);
        try {
            await register(email.trim(), password);
            // Po sukcesie token zapisany → App pokaże Dashboard
        }
        catch (err) {
            setError(err?.message || "Nie udało się utworzyć konta.");
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-gradient-primary flex items-center justify-center p-6", children: [_jsxs("div", { className: "absolute inset-0 overflow-hidden", children: [_jsx("div", { className: "absolute -top-32 -right-32 w-64 h-64 bg-white/10 rounded-full animate-float" }), _jsx("div", { className: "absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full animate-float", style: { animationDelay: '3s' } }), _jsx("div", { className: "absolute top-1/3 right-1/4 w-32 h-32 bg-white/5 rounded-full animate-float", style: { animationDelay: '1s' } })] }), _jsxs("div", { className: "relative z-10 w-full max-w-md", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("div", { className: "inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30", children: _jsx(FiThermometer, { className: "w-8 h-8 text-white" }) }), _jsx("h1", { className: "text-3xl font-bold text-white mb-2", children: "Do\u0142\u0105cz do nas!" }), _jsx("p", { className: "text-white/70", children: "Utw\u00F3rz konto w HeatBeat Control" })] }), _jsxs("form", { onSubmit: onSubmit, className: "floating-card p-8 space-y-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700", children: "Adres email" }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: _jsx(FiMail, { className: "h-5 w-5 text-gray-400" }) }), _jsx("input", { type: "email", className: "w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 bg-white/50", value: email, onChange: (e) => setEmail(e.target.value), autoComplete: "email", placeholder: "Wprowad\u017A sw\u00F3j email", required: true })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700", children: "Has\u0142o" }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: _jsx(FiLock, { className: "h-5 w-5 text-gray-400" }) }), _jsx("input", { type: showPassword ? "text" : "password", className: "w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 bg-white/50", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "new-password", placeholder: "Utw\u00F3rz bezpieczne has\u0142o", required: true }), _jsx("button", { type: "button", className: "absolute inset-y-0 right-0 pr-3 flex items-center", onClick: () => setShowPassword(!showPassword), children: showPassword ? (_jsx(FiEyeOff, { className: "h-5 w-5 text-gray-400 hover:text-gray-600" })) : (_jsx(FiEye, { className: "h-5 w-5 text-gray-400 hover:text-gray-600" })) })] }), password && (_jsx("div", { className: "space-y-2 animate-fade-in", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex-1 bg-gray-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength(password))}`, style: { width: `${(passwordStrength(password) / 5) * 100}%` } }) }), _jsx("span", { className: "text-xs text-gray-600", children: getPasswordStrengthText(passwordStrength(password)) })] }) }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700", children: "Powt\u00F3rz has\u0142o" }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: _jsx(FiLock, { className: "h-5 w-5 text-gray-400" }) }), _jsx("input", { type: showConfirm ? "text" : "password", className: "w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 bg-white/50", value: confirm, onChange: (e) => setConfirm(e.target.value), autoComplete: "new-password", placeholder: "Powt\u00F3rz has\u0142o", required: true }), _jsx("button", { type: "button", className: "absolute inset-y-0 right-0 pr-3 flex items-center", onClick: () => setShowConfirm(!showConfirm), children: showConfirm ? (_jsx(FiEyeOff, { className: "h-5 w-5 text-gray-400 hover:text-gray-600" })) : (_jsx(FiEye, { className: "h-5 w-5 text-gray-400 hover:text-gray-600" })) })] }), confirm && (_jsx("div", { className: "flex items-center gap-2 text-sm animate-fade-in", children: password === confirm ? (_jsxs(_Fragment, { children: [_jsx(FiCheck, { className: "w-4 h-4 text-green-600" }), _jsx("span", { className: "text-green-600", children: "Has\u0142a s\u0105 identyczne" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-4 h-4 rounded-full border-2 border-red-500" }), _jsx("span", { className: "text-red-600", children: "Has\u0142a nie s\u0105 identyczne" })] })) }))] }), error && (_jsx("div", { className: "p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in", children: error })), _jsx("button", { type: "submit", disabled: busy, className: "btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none", children: busy ? (_jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsx("div", { className: "w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" }), _jsx("span", { children: "Tworz\u0119 konto..." })] })) : ("Utwórz konto") }), _jsx("div", { className: "text-center pt-4", children: _jsxs("p", { className: "text-gray-600 text-sm", children: ["Masz ju\u017C konto?", " ", _jsx("button", { type: "button", onClick: onSwitchToLogin, className: "font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-200", children: "Zaloguj si\u0119" })] }) })] })] })] }));
}
