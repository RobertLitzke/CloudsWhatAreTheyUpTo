// @vitest-environment happy-dom
// Every figure the lessons name builds, the synth's goals are reachable from
// its knobs, and the sums behind the new figures are right.

import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { emptyProgress } from 'didactics/progress';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';
import { STAGE_LESSONS, STAGES } from '../src/core/campaign';
import { LATEST_RULES } from '../src/core/gen';
import type { ParamId, Patch } from '../src/core/params';
import { goalFor, type SynthOptions } from '../src/figures/synth';
import { partials, sumAt } from '../src/figures/harmonics';
import { nearestVowel } from '../src/figures/vowel';
import { beatEnvelope } from '../src/figures/beats';
import { bessel, fmSpectrum } from '../src/figures/sidebands';
import { clipHarmonics } from '../src/figures/clip';
import { echoDelay, FUSE } from '../src/figures/echo';

globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;

const context = () => ({ save: emptyProgress('metric'), closed: new AbortController().signal, score: () => {} });
const blocks = WRITTEN.flatMap((l) => l.parts.flatMap((p) => p.blocks.filter(isDiagram).map((b) => ({ lesson: l.id, b }))));

describe('the figures', () => {
  it('all build', () => {
    for (const { lesson, b } of blocks) {
      const make = FIGURES[b.id];
      expect(make, `${lesson}: ${b.id}`).toBeTruthy();
      const handle = make(context(), 'goal' in b ? (b.goal as string | undefined) : undefined, b.options);
      expect(handle.node, `${lesson}: ${b.id}`).toBeInstanceOf(HTMLElement);
    }
  });

  it('give each PatchMatch stage a lesson', () => {
    expect(STAGE_LESSONS.length).toBe(STAGES.length);
    STAGE_LESSONS.forEach((id, i) => {
      const l = WRITTEN.find((x) => x.id === id);
      expect(l, id).toBeTruthy();
      expect(l!.n).toBe(i + 1);
    });
  });
});

describe('the synth figure', () => {
  // Every goal a lesson sets must be reachable by turning only the figure's own controls
  // from where it starts: a walk over each control's positions, one at a time and (for a pad) both.
  const synthBlocks = blocks.filter(({ b }) => b.id === 'synth');
  it.each(synthBlocks.map(({ lesson, b }) => [`${lesson}: ${'goal' in b ? b.goal : ''}`, b] as const))('%s can be met', (_, b) => {
    const o = b.options as unknown as SynthOptions;
    const name = (b as { goal: string }).goal;
    const goal = goalFor(name, o);
    expect(goal).toBeTruthy();
    const ids: ParamId[] = [...(o.knobs ?? []), ...(o.pad ?? [])];
    if (o.panel) ids.push('chain', 'drive', 'cutoff', ...(o.also ?? []));
    const start: Patch = { ...LATEST_RULES.defaults, ...o.start };
    if (name === 'match') {
      // A sound to make: not where it starts, and every knob it sets is one the reader can turn.
      expect(goal!(start, [start])).toBe(false);
      for (const id of Object.keys(o.target!.set)) expect(ids, id).toContain(id);
      const there = { ...start, ...o.target!.set };
      expect(goal!(there, [start, there])).toBe(true);
      return;
    }
    const log: Patch[] = [start];
    let now = start;
    let met = goal!(now, log);
    // Visit every position of every control, then every pair, in order.
    for (const id of ids) {
      for (let p = 0; p < LATEST_RULES.steps[id].length && !met; p++) {
        now = { ...now, [id]: p };
        log.push(now);
        met = goal!(now, log);
      }
    }
    for (const a of ids) for (const c of ids) {
      for (let p = 0; p < LATEST_RULES.steps[a].length && !met; p++) for (let q = 0; q < LATEST_RULES.steps[c].length && !met; q++) {
        now = { ...now, [a]: p, [c]: q };
        log.push(now);
        met = goal!(now, log);
      }
    }
    expect(met).toBe(true);
  });
});

describe('the sums', () => {
  it('build a square from odd harmonics only', () => {
    expect(partials('Square', 6)).toEqual([1, 0, 1 / 3, 0, 1 / 5, 0]);
    expect(Math.abs(sumAt(partials('Square', 41), 0.25) * 1.9 - Math.PI / 4)).toBeLessThan(0.02);
  });

  it('name the vowels from their formants', () => {
    expect(nearestVowel(280, 2250).name).toBe('ee');
    expect(nearestVowel(740, 1100).name).toBe('ah');
  });

  it('beat at the difference', () => {
    // 440 and 443 Hz: loud at 0, silent at 1/6 s, loud again at 1/3 s.
    expect(beatEnvelope(440, 443, 0)).toBeCloseTo(1);
    expect(beatEnvelope(440, 443, 1 / 6)).toBeCloseTo(0);
    expect(beatEnvelope(440, 443, 1 / 3)).toBeCloseTo(1);
  });

  it('size FM sidebands by Bessel functions', () => {
    expect(bessel(0, 0)).toBeCloseTo(1);
    expect(bessel(0, 2.405)).toBeCloseTo(0, 3);
    expect(bessel(1, 1.8412)).toBeCloseTo(0.5819, 3);
    expect(fmSpectrum(1, 0)).toEqual([{ at: 1, size: 1 }]);
    // Ratio 2: carrier and sidebands at 1, 3, 5... (folded -1 lands on 1).
    expect(fmSpectrum(2, 1).every((l) => Math.round(l.at) % 2 === 1)).toBe(true);
  });

  it('clip a sine into odd harmonics, or even ones when lopsided', () => {
    const sym = clipHarmonics(6, false);
    const lop = clipHarmonics(6, true);
    expect(sym[1] / sym[0]).toBeLessThan(1e-6);
    expect(sym[2] / sym[0]).toBeGreaterThan(0.1);
    expect(lop[1] / lop[0]).toBeGreaterThan(0.05);
  });

  it('time an echo there and back', () => {
    expect(echoDelay(34.3)).toBeCloseTo(0.2);
    expect(echoDelay(3)).toBeLessThan(FUSE);
    expect(echoDelay(10)).toBeGreaterThan(FUSE);
  });
});
