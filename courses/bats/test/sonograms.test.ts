// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { CALLERS, callSound, nearest, passesForYuma, slope } from '../src/figures/sonograms';
import { click, context, setSlider } from './helpers';

describe('lesson L2: sonograms', () => {
  it('each caller is nearest to itself, and slopes order as expected', () => {
    for (const c of CALLERS) expect(nearest(c.sweep).name).toBe(c.name);
    const by = (n: string) => CALLERS.find((c) => c.name.startsWith(n))!;
    expect(slope(by('50 kHz').sweep)).toBeGreaterThan(slope(by('Hoary').sweep) * 5);
    expect(by('Hoary').sweep.end).toBeLessThan(by('Big brown').sweep.end);
    expect(by('Little brown').sweep.end).toBe(40);
  });

  it("Townsend's call carries a second harmonic at twice the frequency", () => {
    const t = CALLERS.find((c) => c.harmonic)!;
    const [one, two] = callSound(t);
    expect(two.from).toBe(one.from * 2);
  });

  it('a Yuma call is short, steep and ends near 50 kHz', () => {
    expect(passesForYuma({ start: 95, end: 50, dur: 4, bend: 2.5 })).toBe(true);
    expect(passesForYuma({ start: 85, end: 40, dur: 5, bend: 2.5 })).toBe(false);
    expect(passesForYuma({ start: 95, end: 50, dur: 10, bend: 2.5 })).toBe(false);
  });

  it('building a Yuma call meets the goal', async () => {
    const f = FIGURES['sono-build'](context(), 'yuma');
    setSlider(f.node, 0, 95);
    setSlider(f.node, 1, 50);
    setSlider(f.node, 2, 4);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('naming every group meets the drill goal', async () => {
    const f = FIGURES['sono-drill'](context(), 'named');
    const svg = f.node.querySelector('svg')!;
    for (let k = 0; k < 20; k++) {
      click(f.node, svg.getAttribute('data-caller')!);
      click(f.node, 'Next call');
    }
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the stills draw', () => {
    for (const id of ['sono-methods', 'sono-anatomy']) expect(FIGURES[id](context()).node).toBeTruthy();
  });
});
