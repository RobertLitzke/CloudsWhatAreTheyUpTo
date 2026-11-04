// @vitest-environment happy-dom
// Part D (lessons 14 to 16): the figures reach their goals and their models behave.
import { describe, expect, it } from 'vitest';
import { emptyProgress } from 'didactics/progress';
import { FIGURES } from '../src/figures';
import { freed, front, till } from '../src/figures/glacier';
import { counts, grow, STORMS } from '../src/figures/gaps';
import { fireYears, richness, CROWN } from '../src/figures/fires';

globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;

const context = () => ({ save: emptyProgress('metric'), closed: new AbortController().signal, score: () => {} });
const setSlider = (node: HTMLElement, n: number, value: number) => {
  const input = node.querySelectorAll('input[type=range]')[n] as HTMLInputElement;
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
};
const click = (node: HTMLElement, text: string) => {
  const b = [...node.querySelectorAll('button')].find((x) => x.textContent?.trim() === text);
  if (!b) throw new Error(`no button "${text}"`);
  b.dispatchEvent(new Event('click'));
};
const guess = (node: HTMLElement, choice: string) => {
  click(node, choice);
  click(node, 'Lock it in');
};

describe('part D', () => {
  it('lesson 14: the ice pulls back up the bay, and alder speeds the spruce', async () => {
    expect(front(1879)).toBeCloseTo(77, 0);
    expect(freed(front(1900))).toBeCloseTo(1900, 0);
    const withA = till({ alder: true, seedNear: true });
    const without = till({ alder: false, seedNear: true });
    expect(withA[100].spruce).toBeGreaterThan(without[100].spruce * 1.2);
    const far = till({ alder: true, seedNear: false });
    expect(far[60].alderCover).toBeGreaterThan(0.6);
    expect(far[100].nitrogen).toBeGreaterThan(withA[100].nitrogen * 1.5);
    const g = FIGURES.glacier(context(), 'walk');
    setSlider(g.node, 0, 1930);
    for (const km of [98, 90, 60, 2]) setSlider(g.node, 1, km);
    await expect(g.done).resolves.toBeUndefined();
    const a = FIGURES.alder(context(), 'grown');
    guess(a.node, 'Taller with alder');
    setSlider(a.node, 0, 100);
    await expect(a.done).resolves.toBeUndefined();
  });

  it('lesson 15: storms bring birch unless every species is alike in shade', async () => {
    const birchAfter = (equal: boolean) => STORMS.reduce((n, [y, from, width]) => n + grow({ seed: 1, equal })[y + 15].slice(from, from + width).filter((p) => p.sp === 0).length, 0);
    expect(birchAfter(false)).toBeGreaterThan(birchAfter(true) * 1.5);
    expect(counts(grow({ seed: 1, equal: false })[200])[2]).toBeGreaterThan(15);
    const w = FIGURES.whittaker(context(), 'compare');
    click(w.node, 'Clements’s communities');
    await expect(w.done).resolves.toBeUndefined();
    const g = FIGURES.gaps(context(), 'storm');
    guess(g.node, 'Birch, which needs full sun');
    setSlider(g.node, 0, 230);
    await expect(g.done).resolves.toBeUndefined();
  });

  it('lesson 16: kinds peak at middling disturbance only with the trade-off; suppression makes crown fires', async () => {
    expect(richness(0.4)).toBeGreaterThan(richness(0.02) + 1);
    expect(richness(0.4)).toBeGreaterThan(richness(10) + 1);
    expect(richness(0.4, false)).toBeLessThan(richness(0.02, false) + 0.1);
    const free = fireYears({ suppress: false, growth: 1 });
    const held = fireYears({ suppress: true, growth: 1 });
    expect(free.burns.every((b) => b.fuel < CROWN)).toBe(true);
    expect(held.burns.filter((b) => b.year >= 100).every((b) => b.fuel > CROWN)).toBe(true);
    const b = FIGURES.boulders(context(), 'hump');
    guess(b.node, 'The middling ones');
    for (const v of [0, 1.3, 3]) setSlider(b.node, 0, v);
    await expect(b.done).resolves.toBeUndefined();
    const f = FIGURES.fire(context(), 'suppress');
    click(f.node, 'Put out every fire you can, from year 100');
    setSlider(f.node, 0, 199);
    await expect(f.done).resolves.toBeUndefined();
  });
});
