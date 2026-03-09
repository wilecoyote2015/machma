/**
 * Vite configuration for the Electron **main process**.
 *
 * Electron ships its own Node.js runtime, so the `electron` package must be
 * declared external (not bundled). All other imports are bundled into a single
 * output file that Electron loads as its entry point.
 */

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      /** Do not bundle electron – it is provided by the Electron runtime. */
      external: ["electron"],
    },
  },
  resolve: {
    /** Prefer Node.js-compatible exports when a package offers both. */
    conditions: ["node"],
    mainFields: ["module", "jsnext:main", "jsnext"],
  },
});
