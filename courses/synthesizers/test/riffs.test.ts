import { describe, expect, it } from 'vitest';
import { POOL_ALL, POOL_PD } from '../src/core/gen/v1';
import { RIFFS, riffById, timedNotes } from '../src/core/riffs';
import { midiOf, parseNotation } from '../src/core/riffs/notation';

describe('riff notation', () => {
  it('reads pitches, lengths, rests and bar lines', () => {
    const { notes, length } = parseNotation('E2:2 -:2 G2 A#2:3 Bb2:8 | C4:16');
    expect(length).toBe(32);
    expect(notes).toEqual([
      { start: 0, len: 2, midi: 40 },
      { start: 4, len: 1, midi: 43 },
      { start: 5, len: 3, midi: 46 },
      { start: 8, len: 8, midi: 46 },
      { start: 16, len: 16, midi: 60 },
    ]);
  });

  it('knows middle C and concert A', () => {
    expect(midiOf('C4')).toBe(60);
    expect(midiOf('A4')).toBe(69);
    expect(midiOf('H4')).toBeNull();
  });

  it('refuses a misplaced bar line, a ragged ending and nonsense', () => {
    expect(() => parseNotation('C4:3 | C4:13')).toThrow(/bar line/);
    expect(() => parseNotation('C4:15')).toThrow(/whole number/);
    expect(() => parseNotation('X4:16')).toThrow(/bad pitch/);
    expect(() => parseNotation('C4:0 C4:16')).toThrow(/bad length/);
    expect(() => parseNotation('-:16')).toThrow(/no notes/);
  });
});

describe('the riff list', () => {
  it('has seventy-two riffs with unique ids 1 to 72', () => {
    expect(RIFFS.map((r) => r.id)).toEqual(Array.from({ length: 72 }, (_, i) => i + 1));
  });

  it('every riff is one to four whole bars and sits in the common register', () => {
    for (const riff of RIFFS) {
      expect(Number.isInteger(riff.bars), riff.title).toBe(true);
      expect(riff.bars, riff.title).toBeGreaterThanOrEqual(1);
      expect(riff.bars, riff.title).toBeLessThanOrEqual(4);
      const mean = riff.notes.reduce((s, n) => s + n.midi, 0) / riff.notes.length;
      expect(Math.abs(mean - 57), riff.title).toBeLessThanOrEqual(6);
      for (const n of riff.notes) {
        expect(n.midi, riff.title).toBeGreaterThanOrEqual(36);
        expect(n.midi, riff.title).toBeLessThanOrEqual(84);
      }
    }
  });

  it('notes are in order and never overlap', () => {
    for (const riff of RIFFS) {
      const timed = timedNotes(riff);
      for (let i = 0; i < timed.length; i++) {
        expect(timed[i].off, riff.title).toBeGreaterThan(timed[i].on);
        if (i + 1 < timed.length) expect(timed[i].off, riff.title).toBeLessThanOrEqual(timed[i + 1].on);
      }
      expect(riff.longest, riff.title).toBeGreaterThan(0);
      expect(riff.gap, riff.title).toBeGreaterThan(0);
    }
  });

  it('sixteen are public domain', () => {
    expect(RIFFS.filter((r) => r.pd).map((r) => r.id)).toEqual(Array.from({ length: 16 }, (_, i) => i + 57));
  });

  it('the version-1 pools are exactly the riffs graded 2 or better', () => {
    const good = RIFFS.filter((r) => r.sure >= 2);
    expect([...POOL_ALL]).toEqual(good.map((r) => r.id));
    expect([...POOL_PD]).toEqual(good.filter((r) => r.pd).map((r) => r.id));
    for (const id of POOL_ALL) expect(riffById(id)).toBeDefined();
    // A round must not have to repeat a riff.
    expect(POOL_PD.length).toBeGreaterThanOrEqual(12);
  });
});
