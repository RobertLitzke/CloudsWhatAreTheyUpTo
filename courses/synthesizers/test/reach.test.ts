import { describe, expect, it } from 'vitest';
import { LATEST_RULES } from '../src/core/gen';
import { resolve, type Patch } from '../src/core/params';
import { reach } from '../src/core/reach';

const R = LATEST_RULES;
const at = (set: Partial<Patch>) => reach(resolve({ ...R.defaults, ...set }, R.steps));

describe('how far a sound gets', () => {
  it('an open saw is heard', () => {
    expect(at({}).dies).toBeNull();
    expect(Math.abs(at({}).osc)).toBeLessThan(0.5);
  });
  it('dies at the oscillators with nothing turned up', () => {
    expect(at({ oscLevel: 0 }).dies).toBe('osc');
    expect(at({ oscLevel: 0, noise: 4 }).dies).toBeNull();
  });
  it('dies at the filter: a sine under a high-pass, or a low-pass far below the note', () => {
    expect(at({ wave: 3, filterMode: 3, cutoff: 7 }).dies).toBe('filter');
    expect(at({ wave: 3, cutoff: 0 }).dies).not.toBe('filter');
    expect(at({ wave: 0, filterMode: 3, cutoff: 7 }).dies).not.toBe('filter');
  });
  it('fades at the amp: an attack longer than the note', () => {
    expect(at({ attack: 4 }).fades).toBe('amp');
    expect(at({}).fades).toBeNull();
    expect(at({ attack: 4, sustain: 4 }).amp).toBeLessThan(at({}).amp);
  });
});
