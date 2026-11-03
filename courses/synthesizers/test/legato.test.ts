// Slurs in the riff notation, and the envelope of a note played over a held one.

import { describe, expect, it } from 'vitest';
import { legatoEnvelope, levelAt } from '../src/core/envelope';
import { parseNotation } from '../src/core/riffs/notation';
import { riffById, timedNotes } from '../src/core/riffs';

describe('slurs', () => {
  it('parse with velocity and pressure', () => {
    const { notes } = parseNotation('A3:4@0.5~1_ B3:12');
    expect(notes[0]).toMatchObject({ len: 4, vel: 0.5, press: 1, slur: true });
    expect(notes[1].slur).toBeUndefined();
  });

  it('hold a note to the next, which is then legato', () => {
    const notes = timedNotes(riffById(107)!);
    const i = notes.findIndex((n) => n.legato);
    expect(i).toBeGreaterThan(0);
    expect(notes[i - 1].off).toBeCloseTo(notes[i].on, 9);
    expect(notes.filter((n) => n.legato)).toHaveLength(2);
  });
});

describe('a legato note', () => {
  it('carries on from its level without a new attack', () => {
    const adsr = { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.1 };
    const { events } = legatoEnvelope(0.8, 1, 2, 3, adsr);
    expect(levelAt(events, 1)).toBeCloseTo(0.8, 6);
    expect(levelAt(events, 1.05)).toBeLessThan(0.8);
    expect(levelAt(events, 1.9)).toBeCloseTo(0.5, 2);
  });
});
