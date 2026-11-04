// @vitest-environment happy-dom
// Branches H, N and T: the figures reach their goals and their models behave.
import { describe, expect, it } from 'vitest';
import { emptyProgress } from 'didactics/progress';
import { FIGURES } from '../src/figures';
import { chainPpm, THIN, WOODWELL } from '../src/figures/eggs';
import { fate, releases } from '../src/figures/arrivals';
import { fishery } from '../src/figures/cod';
import { shortShare } from '../src/figures/trails';
import { helping } from '../src/figures/kin';
import { garden } from '../src/figures/farmers';
import { dryShare } from '../src/figures/stripes';
import { coast } from '../src/figures/melted';
import { otters } from '../src/figures/olympic';
import { cover, CELLS } from '../src/figures/undersnow';
import { plain } from '../src/figures/lupine';
import { lake, FISH } from '../src/figures/spirit';

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

describe('branch H', () => {
  it('H1: a lasting poison multiplies near Woodwell\'s numbers; a short-lived one stays low', async () => {
    const p = chainPpm(0.9, 10);
    expect(p[4]).toBeGreaterThan(WOODWELL[4]);
    expect(p[4]).toBeLessThan(WOODWELL[4] * 4);
    expect(chainPpm(0.2, 10)[4]).toBeLessThan(THIN);
    const f = FIGURES.magnify(context(), 'breaks');
    guess(f.node, 'About 30 ppm');
    setSlider(f.node, 0, 0.2);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('H2: most releases with their enemies fizzle; freed of them, more take over', async () => {
    const withE = fate(releases({ founders: 10, enemies: true }));
    const free = fate(releases({ founders: 10, enemies: false }));
    const few = fate(releases({ founders: 3, enemies: false }));
    expect(withE.boom).toBeLessThan(free.boom);
    expect(few.gone).toBeGreaterThan(free.gone);
    const f = FIGURES.release(context(), 'boom');
    click(f.node, 'Its enemies came too');
    await expect(f.done).resolves.toBeUndefined();
  });

  it('H3: a fixed catch collapses after a bad year; a fixed share recovers', async () => {
    const fixed = fishery({ rule: 'catch', effort: 0.9, bad: true });
    const calm = fishery({ rule: 'catch', effort: 0.9, bad: false });
    const share = fishery({ rule: 'share', effort: 0.9, bad: true });
    expect(fixed.stock.indexOf(0)).toBeGreaterThan(15);
    expect(calm.stock[50]).toBeGreaterThan(50);
    expect(share.stock[50]).toBeGreaterThan(40);
    const f = FIGURES.cod(context(), 'share');
    guess(f.node, 'It collapses');
    click(f.node, 'Fixed share');
    await expect(f.done).resolves.toBeUndefined();
  });
});

describe('branch N', () => {
  it('N1: a lasting trail traps the colony; a fading one lets it switch', async () => {
    expect(shortShare(0.02)[59]).toBeLessThan(0.3);
    expect(shortShare(0.2)[59]).toBeGreaterThan(0.7);
    const f = FIGURES.trail(context(), 'switch');
    guess(f.node, 'Mostly stays on the long path');
    setSlider(f.node, 1, 0.2);
    setSlider(f.node, 0, 55);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('N2: Hamilton\'s rule decides whether helping spreads', async () => {
    expect(helping(0.5, 3, 1)[200]).toBeGreaterThan(0.5);
    expect(helping(0.125, 3, 1)[200]).toBeLessThan(0.05);
    expect(helping(0.125, 10, 1)[200]).toBeGreaterThan(0.05);
    const f = FIGURES.kin(context(), 'cousin');
    click(f.node, 'Cousin: r = 1/8');
    setSlider(f.node, 0, 10);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('N3: without the bacteria the garden fails', async () => {
    expect(garden({ leaves: 1, spores: 1, bacteria: true }).crop[120]).toBeGreaterThan(0.4);
    expect(garden({ leaves: 1, spores: 1, bacteria: false }).crop[120]).toBeLessThan(0.1);
    const f = FIGURES.garden(context(), 'fails');
    click(f.node, 'Bacteria on the ants');
    await expect(f.done).resolves.toBeUndefined();
  });
});

describe('branch T', () => {
  it('T1: higher rock spends longer dry', async () => {
    expect(dryShare(3)).toBeGreaterThan(0.9);
    expect(dryShare(0)).toBeLessThan(0.1);
    expect(dryShare(1)).toBeLessThan(dryShare(2));
    const f = FIGURES.tide(context(), 'zones');
    for (const h of [3.2, 2.4, 1.5, 0.5]) setSlider(f.node, 0, h);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('T2: losing sunflower stars turns kelp into urchin barrens', async () => {
    const both = coast({ ochre: true, sunflower: true, warm: false });
    const noSun = coast({ ochre: true, sunflower: false, warm: false });
    const noOchre = coast({ ochre: false, sunflower: true, warm: false });
    const n = both.kelp.length - 1;
    expect(both.kelp[n]).toBeGreaterThan(70);
    expect(noSun.kelp[n]).toBeLessThan(20);
    expect(noOchre.mussels[n]).toBeGreaterThan(both.mussels[n] + 15);
    const f = FIGURES.melted(context(), 'kelp');
    guess(f.node, 'Urchins multiplied and ate the kelp');
    click(f.node, 'Sunflower stars survive');
    await expect(f.done).resolves.toBeUndefined();
  });

  it('T3: otters grow from nineteen to about two thousand', async () => {
    const run = otters();
    const total = (y: number) => run[y - 1977].reduce((a, b) => a + b, 0);
    expect(total(2017)).toBeGreaterThan(1500);
    expect(total(2017)).toBeLessThan(2600);
    const f = FIGURES.coast(context(), 'spread');
    setSlider(f.node, 0, 2017);
    await expect(f.done).resolves.toBeUndefined();
  });
});

describe('branch M', () => {
  it('M1: a May blast leaves more survivors than an August one', async () => {
    const blast = CELLS.map((c, i) => [c, i] as const).filter(([c]) => c.zone !== 'forest');
    const alive = (m: number) => blast.filter(([, i]) => cover(m, 0)[i] > 0.05).length;
    expect(alive(4)).toBeGreaterThan(alive(7) * 1.5);
    const f = FIGURES.snow(context(), 'season');
    guess(f.node, 'Fewer');
    setSlider(f.node, 0, 7);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('M2: caterpillars slow the lupine and open ground for others', async () => {
    const share = (e: number, v: number) => plain(e)[30].filter((x) => x === v).length;
    expect(share(0.7, 1)).toBeLessThan(share(0, 1));
    expect(share(0.7, 3)).toBeGreaterThan(share(0, 3));
    const f = FIGURES.lupine(context(), 'edge');
    setSlider(f.node, 0, 20);
    setSlider(f.node, 1, 0);
    setSlider(f.node, 1, 0.6);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('M3: the lake regains oxygen within a few years, later with more dead matter', async () => {
    const when = (load: number) => lake(load).oxygen.findIndex((v, i) => i > 6 && v >= FISH);
    expect(when(1)).toBeGreaterThan(24);
    expect(when(1)).toBeLessThan(72);
    expect(when(2)).toBeGreaterThan(when(1));
    const f = FIGURES.spirit(context(), 'clear');
    guess(f.node, 'A few years');
    setSlider(f.node, 0, 80);
    await expect(f.done).resolves.toBeUndefined();
  });
});
