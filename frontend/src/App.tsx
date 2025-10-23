﻿// frontend/src/App.tsx
import React from "react";
import { AuthProvider } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
