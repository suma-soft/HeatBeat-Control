import React, { useEffect, useState } from "react";

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      padding: 12,
      background: "#dc3545",
      color: "white",
      textAlign: "center",
      fontWeight: 500,
      zIndex: 9999
    }}>
      ⚠️ Brak połączenia z internetem
    </div>
  );
}