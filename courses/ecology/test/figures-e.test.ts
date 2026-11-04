// @vitest-environment happy-dom
// Part E (lessons 17 to 19): the figures reach their goals and their models behave.
import { describe, expect, it } from 'vitest';
import { emptyProgress } from 'didactics/progress';
import { FIGURES } from '../src/figures';
import { bands, biome, PLACES, BIOMES } from '../src/figures/humboldt';
import { balance, misfit, refill } from '../src/figures/islands';
import { keptShare, left, settled } from '../src/figures/half';

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

describe('part E', () => {
  it('lesson 17: zones climb about 180 m a degree, and rain splits Seattle from Ritzville', async () => {
    expect(bands(1)[1].from - bands(0)[1].from).toBeCloseTo(1000 / 5.5, 0);
    const name = (p: (typeof PLACES)[number]) => BIOMES[biome(p.temp, p.rain)].name;
    expect(name(PLACES[0])).toBe('Temperate broadleaf forest');
    expect(name(PLACES[1])).toBe('Temperate rainforest');
    expect(name(PLACES[2])).toBe('Temperate grassland or desert');
    expect(name(PLACES[4])).toBe('Tropical seasonal forest');
    const m = FIGURES.mountain(context(), 'shift');
    guess(m.node, 'About 550 m');
    setSlider(m.node, 0, 3);
    await expect(m.done).resolves.toBeUndefined();
    const b = FIGURES.biomes(context(), 'three');
    click(b.node, 'Hoh rainforest');
    click(b.node, 'Ritzville (Harrow)');
    await expect(b.done).resolves.toBeUndefined();
  });

  it('lesson 18: far islands hold fewer, the count holds while the list turns over, and z near 0.3 fits', async () => {
    expect(balance(0.8, 1)).toBeLessThan(balance(0.1, 1) / 2);
    expect(balance(0.1, 4)).toBeGreaterThan(balance(0.1, 1));
    const r = refill(0.1, 1);
    const turned = r.present[40].filter((v, i) => v && !r.present[30][i]).length;
    expect(turned).toBeGreaterThan(3);
    expect(misfit(0.3)).toBeLessThan(0.05);
    const f = FIGURES.refill(context(), 'farther');
    guess(f.node, 'Fewer: fewer arrive');
    setSlider(f.node, 1, 0.5);
    setSlider(f.node, 0, 30);
    await expect(f.done).resolves.toBeUndefined();
    const a = FIGURES.area(context(), 'fit');
    setSlider(a.node, 0, 0.3);
    await expect(a.done).resolves.toBeUndefined();
  });

  it('lesson 19: squares lose species for decades, small ones faster; half the land keeps about 80%', async () => {
    expect(left(100, 100, 0)).toBeCloseTo(100, 0);
    expect(left(100, 100, 20)).toBeGreaterThan(settled(100, 100) + 20);
    expect(left(10, 100, 20)).toBeLessThan(left(100, 100, 20));
    expect(keptShare(0.5, false)).toBeCloseTo(0.81, 2);
    expect(keptShare(0.1, false)).toBeCloseTo(0.5, 1);
    expect(keptShare(0.5, true)).toBeGreaterThan(0.9);
    const f = FIGURES.fragment(context(), 'debt');
    guess(f.node, 'Gradually, over decades');
    setSlider(f.node, 0, 30);
    expect(f.node.textContent).toContain('extinction debt');
    await expect(f.done).resolves.toBeUndefined();
    const h = FIGURES.half(context(), 'half');
    setSlider(h.node, 0, 0.5);
    await expect(h.done).resolves.toBeUndefined();
  });
});
