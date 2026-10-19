// The save file: what has been learned and how it went. Kept in localStorage by
// app/store.ts; everything about its shape and repair lives here, so it can be
// tested without a browser.

export interface ShiftRecord {
  done: boolean;
  /** Best photo-call score, as right answers out of `of`. */
  best: number;
  of: number;
  /** ISO date of the first time it was finished. */
  finishedAt?: string;
}

export interface SaveData {
  v: 1;
  /** The watcher's name, as signed on the logbook. Empty until given. */
  name: string;
  shifts: Record<string, ShiftRecord>;
  /** Journal entries unlocked, by id. */
  journal: string[];
  units: 'metric' | 'imperial';
}

export function emptySave(): SaveData {
  // Metric by default, because Juniper talks in metres; feet are a setting away.
  return { v: 1, name: '', shifts: {}, journal: [], units: 'metric' };
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Repair whatever was stored into a valid save, keeping all that can be kept. */
export function migrate(raw: unknown): SaveData {
  const out = emptySave();
  if (!isObj(raw)) return out;
  if (typeof raw.name === 'string') out.name = raw.name.slice(0, 40);
  if (raw.units === 'metric' || raw.units === 'imperial') out.units = raw.units;
  if (Array.isArray(raw.journal)) out.journal = [...new Set(raw.journal.filter((j): j is string => typeof j === 'string'))];
  if (isObj(raw.shifts)) {
    for (const [id, rec] of Object.entries(raw.shifts)) {
      if (!isObj(rec)) continue;
      const of = Number(rec.of) > 0 ? Math.floor(Number(rec.of)) : 0;
      const best = Math.min(of, Math.max(0, Math.floor(Number(rec.best) || 0)));
      out.shifts[id] = {
        done: rec.done === true,
        best,
        of,
        ...(typeof rec.finishedAt === 'string' ? { finishedAt: rec.finishedAt } : {}),
      };
    }
  }
  return out;
}

/** Record a finished shift, keeping the best score and the first finish date. */
export function finishShift(save: SaveData, id: string, right: number, of: number, journal: readonly string[], now: Date): SaveData {
  const prev = save.shifts[id];
  const better = !prev || prev.of === 0 || right / Math.max(1, of) > prev.best / Math.max(1, prev.of);
  return {
    ...save,
    shifts: {
      ...save.shifts,
      [id]: {
        done: true,
        best: better ? right : prev.best,
        of: better ? of : prev.of,
        finishedAt: prev?.finishedAt ?? now.toISOString().slice(0, 10),
      },
    },
    journal: [...new Set([...save.journal, ...journal])],
  };
}
