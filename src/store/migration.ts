import {
  clearLegacySubtitles,
  migrateLegacyProject,
  readLegacySubtitles,
} from "#/lib/migration";
import {
  deleteLegacyHandle,
  readLegacyHandle,
  storeHandle,
} from "#/lib/videoHandleStore";

import { projectsStore } from "./projectsStore";

let started = false;

/**
 * One-time legacy migration, now store-backed. Idempotent (module guard): the
 * commit point is clearing the legacy keys; any crash before that is swept on
 * the next load. Runs once at app start from the root layout.
 */
export function runMigration(): void {
  if (started) return;
  started = true;
  void (async () => {
    try {
      const legacy = readLegacySubtitles();
      const projects = projectsStore.getSnapshot().context.projects;
      if (legacy.length === 0 || projects.length > 0) {
        clearLegacySubtitles();
        void deleteLegacyHandle();
        projectsStore.trigger.setMigrating({ isMigrating: false });
        return;
      }
      const legacyHandle = await readLegacyHandle();
      const { project } = migrateLegacyProject(projects, {
        subtitles: legacy,
        videoName: legacyHandle?.name ?? null,
      });
      if (project) {
        if (legacyHandle) await storeHandle(project.id, legacyHandle);
        projectsStore.trigger.createProject({ project });
      }
    } catch {
      // Corrupt legacy data — drop it and continue.
    } finally {
      clearLegacySubtitles();
      void deleteLegacyHandle();
      projectsStore.trigger.setMigrating({ isMigrating: false });
    }
  })();
}
