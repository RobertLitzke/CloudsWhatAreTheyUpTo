// The save file: what has been learned and how it went. Kept in localStorage by
// app/store.ts. Every field is Didactics' progress.ts for now; Circuitry's
// own fields, when it has some (a saved bench circuit, say), go on top here,
// repaired in migrate.

import { emptyProgress, migrateProgress, type Progress } from 'didactics/progress';

export { finishLesson, type LessonRecord } from 'didactics/progress';

export type SaveData = Progress;

export function emptySave(): SaveData {
  // Electronics is metric throughout. Circuitry tells no story, so the save has no radio.
  return emptyProgress('metric', { radio: false, fixedUnits: true });
}

/** Repair whatever was stored into a valid save, keeping all that can be kept. */
export function migrate(raw: unknown): SaveData {
  return migrateProgress(raw, emptySave());
}
