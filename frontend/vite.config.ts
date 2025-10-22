import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Prosty proxy do FastAPI na porcie 8000
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/auth": "http://localhost:8000",
      "/thermostats": "http://localhost:8000",
      "/device": "http://localhost:8000",
      "/healthz": "http://localhost:8000"
    }
  }
});
