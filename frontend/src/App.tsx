import React from "react";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const { token } = useAuth();
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h1>HeatBeat – Panel termostatu</h1>
      {token ? <Dashboard /> : <Login />}
    </div>
  );
}
