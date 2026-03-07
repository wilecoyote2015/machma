/**
 * React hook that polls the project directory for external file changes
 * and triggers a project reload when changes are detected.
 */

import { useEffect, useRef } from "react";
import { useProjectStore } from "@/stores/project-store";
import { buildSnapshot, diffSnapshots, type TimestampSnapshot } from "@/lib/watcher";

const POLL_INTERVAL_MS = 3000;

export function useFileWatcher() {
  const dirHandle = useProjectStore((s) => s.dirHandle);
  const reloadProject = useProjectStore((s) => s.reloadProject);
  const snapshotRef = useRef<TimestampSnapshot | null>(null);

  useEffect(() => {
    if (!dirHandle) return;

    let active = true;

    // Take an initial snapshot
    buildSnapshot(dirHandle).then((snap) => {
      if (active) snapshotRef.current = snap;
    });

    const interval = setInterval(async () => {
      if (!active || !snapshotRef.current) return;

      try {
        const newSnap = await buildSnapshot(dirHandle);
        const changed = diffSnapshots(snapshotRef.current, newSnap);

        if (changed.length > 0) {
          console.log("[watcher] External changes detected:", changed);
          snapshotRef.current = newSnap;
          await reloadProject();
        }
      } catch (e) {
        console.warn("[watcher] Error polling for changes:", e);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [dirHandle, reloadProject]);
}
