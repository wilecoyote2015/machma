/**
 * Electron Forge configuration.
 *
 * Uses the Vite plugin to compile the main process, preload script, and
 * renderer (React app) in a single dev server / build pipeline.
 *
 * Makers produce platform-specific distributables:
 *   - Windows : Squirrel installer (.exe)
 *   - macOS   : ZIP archive (.zip)
 *   - Linux   : Debian package (.deb) and RPM package (.rpm)
 *
 * The GitHub publisher uploads all artifacts to a GitHub Release draft.
 * Set the repository owner/name below, and export GITHUB_TOKEN before running
 * `npm run publish` (GitHub Actions supplies this automatically).
 */

import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import VitePlugin from "@electron-forge/plugin-vite";

const config: ForgeConfig = {
  packagerConfig: {
    /** Bundle the app into an asar archive for smaller install size. */
    asar: true,
  },

  rebuildConfig: {},

  makers: [
    /** Windows: Squirrel.Windows installer (.exe) */
    new MakerSquirrel({}),

    /** macOS: plain ZIP – sufficient for distribution without notarisation. */
    new MakerZIP({}, ["darwin"]),

    /** Linux: Debian package (.deb) */
    new MakerDeb({}),

    /** Linux: RPM package (.rpm) */
    new MakerRpm({}),
  ],

  plugins: [
    new VitePlugin({
      build: [
        {
          /** Electron main process entry point. */
          entry: "electron/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          /** Preload script – bridges IPC to the renderer via contextBridge. */
          entry: "electron/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          /**
           * Renderer process (the React app).
           * The Forge plugin injects MAIN_WINDOW_VITE_DEV_SERVER_URL and
           * MAIN_WINDOW_VITE_NAME globals into the main process at build time.
           */
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
  ],

  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        /**
         * Update owner/name to match your GitHub repository.
         * The publisher reads GITHUB_TOKEN from the environment.
         */
        repository: {
          owner: "GITHUB_OWNER",
          name: "machma",
        },
        /** Create a draft release so you can review before publishing. */
        prerelease: false,
        draft: true,
      },
    },
  ],
};

export default config;
