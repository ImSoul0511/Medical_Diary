import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
  },
  esbuild: {
    sourcemap: false,
  },
  server: {
    host: "localhost",
    port: 5174,
  },
});
