import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";

// KIT_FILE (opcional): plano de estudos em JSON embutido na build, oferecido na tela inicial.
const kit = process.env.KIT_FILE ? fs.readFileSync(process.env.KIT_FILE, "utf8") : "null";

export default defineConfig({
  base: "./",
  plugins: [react()],
  define: { __KIT__: kit },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
});
