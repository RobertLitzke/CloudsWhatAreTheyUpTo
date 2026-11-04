// @vitest-environment happy-dom
// Part C's later lessons (11 to 13): the figures reach their goals and their models behave.
import { describe, expect, it } from 'vitest';
import { emptyProgress } from 'didactics/progress';
import { FIGURES } from '../src/figures';
import { extremes, reading, STATIONS } from '../src/figures/breathes';

globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;

const context = () => ({ save: emptyProgress('metric'), closed: new AbortController().signal, score: () => {} });
export const setSlider = (node: HTMLElement, n: number, value: number) => {
  const input = node.querySelectorAll('input[type=range]')[n] as HTMLInputElement;
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
};
export const click = (node: HTMLElement, text: string) => {
  const b = [...node.querySelectorAll('button')].find((x) => x.textContent?.trim() === text);
  if (!b) throw new Error(`no button "${text}"`);
  b.dispatchEvent(new Event('click'));
};
const guess = (node: HTMLElement, choice: string) => {
  click(node, choice);
  click(node, 'Lock it in');
};

describe('part C', () => {
  it('lesson 11: CO₂ peaks in May and bottoms out in late September; Barrow swings most', async () => {
    const e = extremes({ growth: 1, shift: 0 });
    expect(e.high).toBeGreaterThan(4);
    expect(e.high).toBeLessThan(5);
    expect(e.low).toBeGreaterThan(8.4);
    expect(e.low).toBeLessThan(9.2);
    expect(e.swing).toBeCloseTo(6.5, 1);
    expect(extremes({ growth: 1.4, shift: 0 }).swing).toBeGreaterThan(8);
    expect(extremes({ growth: 1, shift: -1 }).low).toBeLessThan(e.low - 0.8);
    expect(reading(STATIONS[0], 2024.5)).toBeGreaterThan(420);
    const k = FIGURES.keeling(context(), 'barrow');
    click(k.node, 'One year’s wave');
    click(k.node, 'Barrow');
    await expect(k.done).resolves.toBeUndefined();
    const f = FIGURES.flow(context(), 'lowest');
    guess(f.node, 'September or October');
    setSlider(f.node, 0, e.low);
    expect(f.node.textContent).toContain('lowest point of the year');
    await expect(f.done).resolves.toBeUndefined();
  });
});

import { cutValley, soil, uncutValley } from '../src/figures/hubbard';
import { bloom, deepOxygen, lakeChain } from '../src/figures/curtain';

describe('part C, lessons 12 and 13', () => {
  it('lesson 12: the cut valley runs more water and about forty times the nitrate; no plants leaks most', async () => {
    const c = cutValley(1967, true);
    const u = uncutValley(1967);
    expect(c.runoff / u.runoff).toBeGreaterThan(1.3);
    expect(c.nitrate / u.nitrate).toBeGreaterThan(35);
    expect(c.lost).toBeGreaterThan(100);
    expect(cutValley(1975, true).nitrate).toBeLessThan(2);
    const all = { fixers: true, decomposers: true, waterlogged: false, plants: true };
    expect(soil(all).leached).toBeLessThan(1);
    expect(soil({ ...all, plants: false }).leached).toBeGreaterThan(30);
    expect(soil({ ...all, decomposers: false }).plants).toBeLessThan(soil(all).plants / 2);
    expect(soil({ ...all, waterlogged: true }).toAir).toBeGreaterThan(3);
    const w = FIGURES.weir(context(), 'cut');
    guess(w.node, 'More water');
    setSlider(w.node, 0, 1969);
    await expect(w.done).resolves.toBeUndefined();
    const n = FIGURES.ncycle(context(), 'leak');
    for (const b of ['No nitrogen fixers', 'No decomposers', 'Waterlogged soil', 'No plants']) click(n.node, b);
    expect(n.node.textContent).toContain('washes out');
    await expect(n.done).resolves.toBeUndefined();
  });

  it('lesson 13: only phosphorus makes a bloom, blooms empty the deep water, and the top decides who gains', async () => {
    expect(bloom({ carbon: true, nitrogen: true, phosphorus: false }, 10)).toBeLessThan(4);
    expect(bloom({ carbon: true, nitrogen: true, phosphorus: true }, 10)).toBeGreaterThan(30);
    expect(bloom({ carbon: false, nitrogen: false, phosphorus: true }, 10)).toBeGreaterThan(20);
    expect(deepOxygen(0, 23)).toBeGreaterThan(8);
    expect(deepOxygen(40, 23)).toBeLessThan(1);
    const three = [lakeChain(3, 60), lakeChain(3, 300)];
    expect(three[1][0]).toBeGreaterThan(three[0][0] * 3);
    expect(three[1][1]).toBeCloseTo(three[0][1], 5);
    const four = [lakeChain(4, 60), lakeChain(4, 300)];
    expect(four[1][0]).toBeCloseTo(four[0][0], 5);
    expect(four[1][1]).toBeGreaterThan(four[0][1] * 1.2);
    const c = FIGURES.curtain(context(), 'bloom');
    guess(c.node, 'Only the north-east half turns green');
    setSlider(c.node, 0, 8);
    expect(c.node.textContent).toContain('Only the north-east basin has bloomed');
    await expect(c.done).resolves.toBeUndefined();
    const o = FIGURES.oxygen(context(), 'limit');
    setSlider(o.node, 0, 16);
    setSlider(o.node, 1, 24);
    await expect(o.done).resolves.toBeUndefined();
    const k = FIGURES.control(context(), 'both');
    setSlider(k.node, 0, 240);
    click(k.node, 'Four levels (add bass)');
    await expect(k.done).resolves.toBeUndefined();
  });
});
