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
    proxy: {
      "/certificates": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
});