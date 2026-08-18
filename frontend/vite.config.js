import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Évite les soucis CORS en dev : le frontend appelle /api/... et Vite
      // relaie vers l'API Django réelle. En prod, adapter via nginx/reverse proxy.
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
