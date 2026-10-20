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
  /** The player's name, as signed on the logbook. Empty until given. */
  name: string;
  shifts: Record<string, ShiftRecord>;
  /** Journal entries unlocked, by id. */
  journal: string[];
  units: 'metric' | 'imperial';
  /** Radio talks on: the story. Off, the lessons are a plain workbook. */
  talk: boolean;
  /** The opening talk has been offered once. */
  introSeen: boolean;
  /** Talks heard to the end, with the reply picked at each turn. */
  heard: Record<string, number[]>;
}

export function emptySave(): SaveData {
  // Metric by default; feet are a setting away.
  return { v: 1, name: '', shifts: {}, journal: [], units: 'metric', talk: true, introSeen: false, heard: {} };
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Repair whatever was stored into a valid save, keeping all that can be kept. */
export function migrate(raw: unknown): SaveData {
  const out = emptySave();
  if (!isObj(raw)) return out;
  if (typeof raw.name === 'string') out.name = raw.name.slice(0, 40);
  if (raw.units === 'metric' || raw.units === 'imperial') out.units = raw.units;
  if (typeof raw.talk === 'boolean') out.talk = raw.talk;
  if (raw.introSeen === true) out.introSeen = true;
  if (isObj(raw.heard)) {
    for (const [id, picks] of Object.entries(raw.heard)) {
      if (Array.isArray(picks)) out.heard[id] = picks.map((n) => Math.max(0, Math.floor(Number(n) || 0)));
    }
  }
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
  // The first lesson, "textures", was split in two (fog, then heaps); having
  // done it counts for both.
  const old = out.shifts.textures;
  if (old) {
    out.shifts.fog ??= { ...old };
    out.shifts.heaps ??= { ...old };
    delete out.shifts.textures;
    if (old.done) out.journal = [...new Set([...out.journal, 'fog', 'rising-air'])];
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
