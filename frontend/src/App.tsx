// frontend/src/App.tsx
// Warunkowy render: jeśli jest token → Dashboard, w przeciwnym razie Login/Register z przełącznikiem.

import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";

function InnerApp() {
  const { token } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

  // Jeśli pojawi się token (po zalogowaniu/rejestracji), pokaż Dashboard
  if (token) return <Dashboard />;

  return mode === "login" ? (
    <Login onSwitchToRegister={() => setMode("register")} />
  ) : (
    <Register onSwitchToLogin={() => setMode("login")} />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}
