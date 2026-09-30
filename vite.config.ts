import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/citytreeclub-junior/",
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
});
