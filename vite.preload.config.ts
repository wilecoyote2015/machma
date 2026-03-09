/**
 * Vite configuration for the Electron **preload script**.
 *
 * The preload script runs in a special Chromium context with access to both
 * browser globals and a limited set of Node.js/Electron APIs (via contextBridge).
 * Like the main process, `electron` must be declared external.
 */

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      /** Do not bundle electron – provided by the Electron runtime. */
      external: ["electron"],
    },
  },
});
