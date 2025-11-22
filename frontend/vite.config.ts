import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import { VitePWA } from 'vite-plugin-pwa';

// Prosty proxy do FastAPI na porcie 8000
export default defineConfig({
  plugins: [
    react(),
    // TODO: Dodać PWA plugin po zainstalowaniu pakietu
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   manifest: {
    //     name: 'HeatBeat Control',
    //     short_name: 'HeatBeat',
    //     description: 'Aplikacja do sterowania systemem grzewczym',
    //     theme_color: '#059669',
    //     background_color: '#ffffff',
    //     display: 'standalone',
    //     scope: '/',
    //     start_url: '/',
    //     icons: [
    //       {
    //         src: 'pwa-192x192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       },
    //       {
    //         src: 'pwa-512x512.png',
    //         sizes: '512x512',
    //         type: 'image/png'
    //       }
    //     ]
    //   }
    // })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      "/auth": {
        target: "http://192.168.55.252:8000",
        changeOrigin: true,
        secure: false
      },
      "/thermostats": {
        target: "http://192.168.55.252:8000",
        changeOrigin: true,
        secure: false
      },
      "/device": {
        target: "http://192.168.55.252:8000",
        changeOrigin: true,
        secure: false
      },
      "/healthz": {
        target: "http://192.168.55.252:8000",
        changeOrigin: true,
        secure: false
      },
      "/available-ids": {
        target: "http://192.168.55.252:8000",
        changeOrigin: true,
        secure: false
      },
      "/admin": {
        target: "http://192.168.55.252:8000",
        changeOrigin: true,
        secure: false
      }
    }
  }
});
