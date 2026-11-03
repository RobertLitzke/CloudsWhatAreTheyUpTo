import { describe, expect, it } from 'vitest';
import { loopSeconds, recordLoop, sixteenthSeconds, type KeyEvent } from '../src/core/loop';

// At 150 bpm a sixteenth is exactly a tenth of a second.
const BPM = 150;
const press = (at: number, midi: number, len: number): KeyEvent[] => [
  { t: at, midi, down: true },
  { t: at + len, midi, down: false },
];

describe('recording a loop', () => {
  it('a sixteenth at 150 bpm is a tenth of a second', () => {
    expect(sixteenthSeconds(BPM)).toBeCloseTo(0.1, 12);
  });

  it('keeps what was played, in sixteenths', () => {
    const notes = recordLoop([...press(0, 60, 0.2), ...press(0.4, 62, 0.35)], { bpm: BPM, bars: 1, quantise: false });
    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({ midi: 60 });
    expect(notes[0].start).toBeCloseTo(0, 9);
    expect(notes[0].len).toBeCloseTo(2, 9);
    expect(notes[1].start).toBeCloseTo(4, 9);
    expect(notes[1].len).toBeCloseTo(3.5, 9);
  });

  it('snaps starts and ends to the grid when asked, and never to nothing', () => {
    const notes = recordLoop([...press(0.04, 60, 0.19), ...press(0.38, 62, 0.02)], { bpm: BPM, bars: 1, quantise: true });
    expect(notes).toEqual([
      { start: 0, len: 2, midi: 60 },
      { start: 4, len: 1, midi: 62 },
    ]);
  });

  it('a note played a hair before the loop comes round lands on the first beat', () => {
    const notes = recordLoop(press(1.57, 64, 0.03), { bpm: BPM, bars: 1, quantise: true });
    expect(notes).toEqual([{ start: 0, len: 1, midi: 64 }]);
  });

  it('a key held through the count-in sounds from the first beat', () => {
    const notes = recordLoop(press(-0.3, 60, 0.5), { bpm: BPM, bars: 1, quantise: false });
    expect(notes).toHaveLength(1);
    expect(notes[0].start).toBe(0);
    expect(notes[0].len).toBeCloseTo(2, 9);
  });

  it('a key still down at the end is cut at the end', () => {
    const notes = recordLoop([{ t: 1.2, midi: 60, down: true }], { bpm: BPM, bars: 1, quantise: true });
    expect(notes).toEqual([{ start: 12, len: 4, midi: 60 }]);
  });

  it('is one voice: a new key takes over, and lifting it hands back to the key under it', () => {
    const events: KeyEvent[] = [
      { t: 0, midi: 60, down: true },
      { t: 0.4, midi: 64, down: true },
      { t: 0.8, midi: 64, down: false },
      { t: 1.2, midi: 60, down: false },
    ];
    expect(recordLoop(events, { bpm: BPM, bars: 1, quantise: true })).toEqual([
      { start: 0, len: 4, midi: 60 },
      { start: 4, len: 4, midi: 64 },
      { start: 8, len: 4, midi: 60 },
    ]);
  });

  it('never overlaps, whatever is thrown at it', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
    for (let round = 0; round < 300; round++) {
      const events: KeyEvent[] = [];
      for (let i = 0; i < 30; i++) events.push(...press(rnd() * 3.6 - 0.2, 48 + Math.floor(rnd() * 24), rnd() * 0.5));
      for (const quantise of [true, false]) {
        const notes = recordLoop(events, { bpm: BPM, bars: 2, quantise });
        for (let i = 0; i < notes.length; i++) {
          const n = notes[i];
          expect(n.len).toBeGreaterThan(0);
          expect(n.start).toBeGreaterThanOrEqual(0);
          expect(n.start + n.len).toBeLessThanOrEqual(32 + 1e-9);
          if (i > 0) expect(notes[i - 1].start + notes[i - 1].len).toBeLessThanOrEqual(n.start + 1e-9);
          if (quantise) expect(Number.isInteger(n.start) && Number.isInteger(n.len)).toBe(true);
        }
      }
    }
  });

  it('takes nothing from silence', () => {
    expect(recordLoop([], { bpm: BPM, bars: 4, quantise: true })).toEqual([]);
  });
});

describe('playing a loop back', () => {
  it('holds each note exactly as long as it was played', () => {
    const played = loopSeconds({ name: 'x', bpm: BPM, bars: 2, notes: [{ start: 4, len: 3, midi: 60 }] });
    expect(played.duration).toBeCloseTo(3.2, 9);
    expect(played.barSeconds).toBeCloseTo(1.6, 9);
    expect(played.notes[0].on).toBeCloseTo(0.4, 9);
    expect(played.notes[0].off).toBeCloseTo(0.7, 9);
  });
});
