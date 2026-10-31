// The save file: what has been learned and how it went. Kept in localStorage by
// app/store.ts. Every field is Didactics' progress.ts for now; Dirt's own
// fields, when it has some, go on top here, repaired in migrate.

import { emptyProgress, migrateProgress, type Progress } from 'didactics/progress';

export { finishLesson, type LessonRecord } from 'didactics/progress';

export type SaveData = Progress;

export function emptySave(): SaveData {
  // Inches and feet by default, as on most seed packets in the US; metric is a
  // setting away. Dirt tells no story, so the save has no radio.
  return emptyProgress('imperial', { radio: false });
}

/** Repair whatever was stored into a valid save, keeping all that can be kept. */
export function migrate(raw: unknown): SaveData {
  return migrateProgress(raw, emptySave());
}
