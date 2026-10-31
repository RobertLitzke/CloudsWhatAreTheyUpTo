// The save file: what has been learned and how it went. Kept in localStorage
// by app/store.ts. Every field is Didactics' progress.ts for now; this
// course's own fields, when it has some, go on top here, repaired in migrate.

import { emptyProgress, migrateProgress, type Progress } from 'didactics/progress';

export { finishLesson, type LessonRecord } from 'didactics/progress';

export type SaveData = Progress;

export function emptySave(): SaveData {
  // Metres by default: lens and sensor sizes are metric whatever you measure a
  // field in, so the two agree. Feet are a setting away. There is no story
  // here, so the save has no radio.
  return emptyProgress('metric', { radio: false });
}

/** Repair whatever was stored into a valid save, keeping all that can be kept. */
export function migrate(raw: unknown): SaveData {
  return migrateProgress(raw, emptySave());
}
