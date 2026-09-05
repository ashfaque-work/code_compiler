/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Monaco is far larger than the app itself. The lazy `import()` in
  // components/Editor.tsx is what splits it into its own chunk, so the initial
  // payload stays small — no manual chunking needed.
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
