import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": import.meta.dirname + "/src",
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    // Docker on Windows doesn't pass file-change events into the container, so poll there instead.
    watch: process.env.VITE_USE_POLLING ? { usePolling: true, interval: 300 } : undefined,
    proxy: {
      // Lets a phone that scanned a certificate's QR code reach the API through this dev server. In Docker the API
      // runs in the "server" container, not on 127.0.0.1, so compose sets VITE_PROXY_TARGET.
      "/certificates": {
        target: process.env.VITE_PROXY_TARGET || "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
});