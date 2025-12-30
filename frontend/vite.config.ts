import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';

// Prosty proxy do FastAPI na porcie 8000
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      },
      includeAssets: ['icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'HeatBeat Control',
        short_name: 'HeatBeat',
        description: 'Aplikacja do sterowania systemem grzewczym',
        theme_color: '#667eea',
        background_color: '#667eea',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'fullscreen'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['utilities', 'productivity'],
        lang: 'pl',
        icons: [
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
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
