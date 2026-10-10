// A loop the player recorded in free play, and the arithmetic that turns key
// presses into one. No Web Audio here: times come in as plain seconds.
//
// The synth has one voice, so a loop is one line. A key that goes down while
// another is held takes over (as it does when playing live), and the loop
// stores what was heard, not which keys were down.

/** A note on the sixteenth grid. Recorded unquantised, `start` and `len` are fractional. */
export interface LoopNote {
  start: number;
  len: number;
  midi: number;
}

export interface UserLoop {
  name: string;
  bpm: number;
  /** Bars of four quarter notes. */
  bars: number;
  notes: LoopNote[];
}

export interface KeyEvent {
  /** Seconds from the first beat of the recording. Negative during the count-in. */
  t: number;
  midi: number;
  down: boolean;
}

export const SIXTEENTHS_PER_BAR = 16;
/** Shorter than this, in sixteenths, a note is a slip of the finger. */
const SHORTEST = 0.1;

export function sixteenthSeconds(bpm: number): number {
  return 60 / bpm / 4;
}

/**
 * Turn the key events of one take into the notes of a loop.
 *
 * @param quantise snap every start and end to the nearest sixteenth
 */
export function recordLoop(events: readonly KeyEvent[], opts: { bpm: number; bars: number; quantise: boolean }): LoopNote[] {
  const six = sixteenthSeconds(opts.bpm);
  const total = opts.bars * SIXTEENTHS_PER_BAR;
  // A key held through the count-in sounds from the first beat.
  const at = (t: number) => Math.max(0, t / six);

  // Replay the keys with last-note priority to find what sounded when.
  const sounded: LoopNote[] = [];
  const held: number[] = [];
  let open: { start: number; midi: number } | null = null;
  const close = (when: number) => {
    if (open && when - open.start > 0) sounded.push({ start: open.start, len: when - open.start, midi: open.midi });
    open = null;
  };
  for (const e of [...events].sort((a, b) => a.t - b.t)) {
    const when = at(e.t);
    if (when >= total) break;
    if (e.down) {
      close(when);
      held.push(e.midi);
      open = { start: when, midi: e.midi };
    } else {
      const i = held.lastIndexOf(e.midi);
      if (i < 0) continue;
      held.splice(i, 1);
      if (!open || open.midi !== e.midi) continue;
      close(when);
      // Lifting the top key hands the voice back to the one still held under it.
      if (held.length > 0) open = { start: when, midi: held[held.length - 1] };
    }
  }
  close(total);

  let notes = sounded;
  if (opts.quantise) {
    notes = sounded.map((n) => {
      let start = Math.round(n.start);
      let end = Math.round(n.start + n.len);
      // Played a hair before the loop comes round: it belongs to the first beat.
      if (start >= total) {
        end -= start;
        start = 0;
      }
      return { start, len: Math.max(1, end - start), midi: n.midi };
    });
  }

  // One voice: the later note at a place wins, and a note ends where the next begins.
  notes = notes.filter((n) => n.len >= SHORTEST).sort((a, b) => a.start - b.start);
  const out: LoopNote[] = [];
  for (const n of notes) {
    const prev = out[out.length - 1];
    if (prev && prev.start === n.start) out.pop();
    else if (prev && prev.start + prev.len > n.start) prev.len = n.start - prev.start;
    out.push({ ...n, len: Math.min(n.len, total - n.start) });
  }
  return out.filter((n) => n.len >= SHORTEST);
}

/** A loop's notes in seconds, each held exactly as long as it was played. */
export function loopSeconds(loop: UserLoop): { notes: { on: number; off: number; midi: number }[]; duration: number; barSeconds: number; sixSeconds: number } {
  const six = sixteenthSeconds(loop.bpm);
  return {
    notes: loop.notes.map((n) => ({ on: n.start * six, off: (n.start + n.len) * six, midi: n.midi })),
    duration: loop.bars * SIXTEENTHS_PER_BAR * six,
    barSeconds: SIXTEENTHS_PER_BAR * six,
    sixSeconds: six,
  };
}
