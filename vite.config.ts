import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    watch: {
      // Ignore everything outside src/ to prevent full-page reloads
      // when the app writes to project data files (e.g. .md, .json)
      // that happen to live inside the Vite workspace root.
      ignored: ["**/example_project/**", "**/dist/**", "**/docs/**"],
    },
  },
});
