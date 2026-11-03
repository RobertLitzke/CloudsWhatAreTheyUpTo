// What is kept between visits, as plain data. Where it is kept (localStorage
// today) is the app's business: it hands this module a parsed blob and gets a
// SaveData back. A sync backend later only has to move the same blob.

import type { LoopNote, UserLoop } from './loop';
import { PARAM_IDS, type ParamId } from './params';
import type { PuzzleRecord } from './round';

export const SAVE_VERSION = 1;

export interface RoundEntry {
  /** The round key as text. */
  key: string;
  /** Best score against goal. */
  best: number;
  goal: number;
  plays: number;
  /** ISO date of the last finish. */
  last: string;
  /** Kept in the saved list, and never pruned. */
  saved: boolean;
}

/** Per knob, how play went on the puzzles where it was scored. */
export interface ParamStat {
  /** Puzzles where this knob started off the target. */
  puzzles: number;
  /** Moves the direct route needed. */
  needed: number;
  /** Moves actually spent on it, on any puzzle. */
  spent: number;
  /** Steps still wrong at commit. */
  left: number;
}

/** A free-play sound: knob positions, fractional. Knobs added since it was saved are simply absent. */
export interface SavedPatch {
  name: string;
  patch: Partial<Record<ParamId, number>>;
}

export interface SaveData {
  v: typeof SAVE_VERSION;
  /** Skip the course's gating. */
  unlockAll: boolean;
  /** Stages whose lesson has been read. */
  lessons: number[];
  rounds: RoundEntry[];
  stats: Partial<Record<ParamId, ParamStat>>;
  /** 0 to 1. */
  volume: number;
  /** A round in progress: its key and the puzzles finished so far. */
  resume: { key: string; records: PuzzleRecord[] } | null;
  /** Free play: named sounds and recorded loops, newest first. */
  patches: SavedPatch[];
  loops: UserLoop[];
  /** Arcade: the best run so far, and how many have been played. */
  arcade: ArcadeBest;
  /** Buzz the phone on each knob click. */
  haptics: boolean;
}

export interface ArcadeBest {
  score: number;
  /** Levels cleared in that run. */
  cleared: number;
  runs: number;
}

/** Unsaved rounds beyond this many are forgotten, oldest first. */
const HISTORY_LIMIT = 60;
/** Patches and loops kept, each. */
export const SHELF_LIMIT = 40;
const NAME_LIMIT = 40;

export function emptySave(): SaveData {
  return {
    v: SAVE_VERSION,
    unlockAll: false,
    lessons: [],
    rounds: [],
    stats: {},
    volume: 0.8,
    resume: null,
    patches: [],
    loops: [],
    arcade: { score: 0, cleared: 0, runs: 0 },
    haptics: true,
  };
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * Turn whatever was stored into a valid SaveData. Unknown or damaged input
 * yields a fresh save rather than an exception: losing progress is bad, a page
 * that will not load is worse.
 */
export function migrate(raw: unknown): SaveData {
  const save = emptySave();
  if (!isObject(raw) || typeof raw.v !== 'number' || raw.v > SAVE_VERSION) return save;
  // Version 1 is the only one so far; later versions upgrade `raw` step by step here.
  if (typeof raw.unlockAll === 'boolean') save.unlockAll = raw.unlockAll;
  if (typeof raw.volume === 'number' && raw.volume >= 0 && raw.volume <= 1) save.volume = raw.volume;
  if (typeof raw.haptics === 'boolean') save.haptics = raw.haptics;
  if (isObject(raw.arcade)) {
    const count = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
    save.arcade = { score: count(raw.arcade.score), cleared: count(raw.arcade.cleared), runs: count(raw.arcade.runs) };
  }
  if (Array.isArray(raw.lessons)) save.lessons = raw.lessons.filter((n): n is number => Number.isInteger(n));
  if (Array.isArray(raw.rounds)) {
    for (const r of raw.rounds) {
      if (!isObject(r) || typeof r.key !== 'string' || typeof r.best !== 'number') continue;
      save.rounds.push({
        key: r.key,
        best: r.best,
        // `par`, `holes` and `strokes` below are the names the first build saved under.
        goal: typeof r.goal === 'number' ? r.goal : typeof r.par === 'number' ? r.par : 0,
        plays: typeof r.plays === 'number' ? r.plays : 1,
        last: typeof r.last === 'string' ? r.last : '',
        saved: r.saved === true,
      });
    }
  }
  if (isObject(raw.stats)) {
    for (const id of PARAM_IDS) {
      const s = raw.stats[id];
      if (!isObject(s)) continue;
      const num = (x: unknown) => (typeof x === 'number' && x >= 0 ? x : 0);
      save.stats[id] = { puzzles: num(s.puzzles ?? s.holes), needed: num(s.needed), spent: num(s.spent), left: num(s.left) };
    }
  }
  if (isObject(raw.resume) && typeof raw.resume.key === 'string' && Array.isArray(raw.resume.records)) {
    const records = raw.resume.records
      .map((r: unknown) => (isObject(r) ? { ...r, goal: r.goal ?? r.par, moves: r.moves ?? r.strokes } : r))
      .filter(
        (r): r is PuzzleRecord =>
          isObject(r) && ['index', 'riffId', 'goal', 'moves', 'penalty'].every((k) => typeof r[k] === 'number'),
      )
      .map(({ index, riffId, goal, moves, penalty }) => ({ index, riffId, goal, moves, penalty }));
    save.resume = { key: raw.resume.key, records };
  }
  const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
  const named = (x: unknown): x is Record<string, unknown> & { name: string } =>
    isObject(x) && typeof x.name === 'string' && x.name.trim() !== '';
  if (Array.isArray(raw.patches)) {
    for (const p of raw.patches.slice(0, SHELF_LIMIT)) {
      if (!named(p) || !isObject(p.patch)) continue;
      const patch: Partial<Record<ParamId, number>> = {};
      for (const id of PARAM_IDS) {
        const pos = p.patch[id];
        if (finite(pos) && pos >= 0) patch[id] = pos;
      }
      save.patches.push({ name: cleanName(p.name), patch });
    }
  }
  if (Array.isArray(raw.loops)) {
    for (const l of raw.loops.slice(0, SHELF_LIMIT)) {
      if (!named(l) || !finite(l.bpm) || l.bpm < 30 || l.bpm > 300) continue;
      if (!Number.isInteger(l.bars) || (l.bars as number) < 1 || (l.bars as number) > 8 || !Array.isArray(l.notes)) continue;
      const end = (l.bars as number) * 16;
      const notes: LoopNote[] = [];
      for (const n of l.notes) {
        if (!isObject(n) || !finite(n.start) || !finite(n.len) || !finite(n.midi)) continue;
        if (n.start < 0 || n.len <= 0 || n.start + n.len > end + 1e-6 || n.midi < 0 || n.midi > 127) continue;
        notes.push({ start: n.start, len: n.len, midi: Math.round(n.midi) });
      }
      if (notes.length > 0) save.loops.push({ name: cleanName(l.name), bpm: l.bpm, bars: l.bars as number, notes });
    }
  }
  return save;
}

function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, NAME_LIMIT);
}

/** Put `item` at the front of a shelf, replacing one of the same name. */
function shelve<T extends { name: string }>(shelf: readonly T[], item: T): T[] {
  const name = cleanName(item.name);
  return [{ ...item, name }, ...shelf.filter((x) => x.name !== name)].slice(0, SHELF_LIMIT);
}

export function savePatch(save: SaveData, name: string, patch: Partial<Record<ParamId, number>>): SaveData {
  return { ...save, patches: shelve(save.patches, { name, patch: { ...patch } }) };
}

export function deletePatch(save: SaveData, name: string): SaveData {
  return { ...save, patches: save.patches.filter((p) => p.name !== name) };
}

export function saveLoop(save: SaveData, loop: UserLoop): SaveData {
  return { ...save, loops: shelve(save.loops, { ...loop, notes: loop.notes.map((n) => ({ ...n })) }) };
}

export function deleteLoop(save: SaveData, name: string): SaveData {
  return { ...save, loops: save.loops.filter((l) => l.name !== name) };
}

/** Record a finished arcade run, keeping the best score. */
export function recordArcade(save: SaveData, score: number, cleared: number): SaveData {
  const best = score > save.arcade.score ? { score, cleared } : { score: save.arcade.score, cleared: save.arcade.cleared };
  return { ...save, arcade: { ...best, runs: save.arcade.runs + 1 } };
}

/** Record a finished round, keeping the best score for its key. */
export function recordRound(save: SaveData, key: string, diff: number, goal: number, when: string): SaveData {
  const rounds = save.rounds.slice();
  const at = rounds.findIndex((r) => r.key === key);
  if (at >= 0) {
    const old = rounds[at];
    rounds.splice(at, 1);
    rounds.unshift({ ...old, best: Math.min(old.best, diff), goal, plays: old.plays + 1, last: when });
  } else {
    rounds.unshift({ key, best: diff, goal, plays: 1, last: when, saved: false });
  }
  // Newest first; drop the oldest unsaved ones past the limit.
  let unsaved = 0;
  const kept = rounds.filter((r) => r.saved || ++unsaved <= HISTORY_LIMIT);
  return { ...save, rounds: kept };
}

export function setSaved(save: SaveData, key: string, saved: boolean): SaveData {
  return { ...save, rounds: save.rounds.map((r) => (r.key === key ? { ...r, saved } : r)) };
}

export function addStats(
  save: SaveData,
  delta: Partial<Record<ParamId, ParamStat>>,
): SaveData {
  const stats = { ...save.stats };
  for (const [id, d] of Object.entries(delta) as [ParamId, ParamStat][]) {
    const old = stats[id] ?? { puzzles: 0, needed: 0, spent: 0, left: 0 };
    stats[id] = {
      puzzles: old.puzzles + d.puzzles,
      needed: old.needed + d.needed,
      spent: old.spent + d.spent,
      left: old.left + d.left,
    };
  }
  return { ...save, stats };
}
