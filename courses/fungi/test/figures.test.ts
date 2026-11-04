// @vitest-environment happy-dom
// Every figure the lessons name builds, in both unit systems, and the ones
// with a task can reach it.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { emptyProgress } from 'didactics/progress';
import type { Units } from 'didactics/units';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';
import { grass, holder } from '../src/figures/rings';
import { digest } from '../src/figures/tips';
import { grow } from '../src/figures/mycelium';
import { blocks } from '../src/figures/tips';
import { drift, escape, fallSpeed } from '../src/figures/spores';
import { mateChance } from '../src/figures/sexes';
import { SPECIMENS, GROUPS } from '../src/figures/groups';
import { flask } from '../src/figures/yeast';
import { buried, rotted } from '../src/figures/rot';
import { meanRange, transfer } from '../src/figures/network';
import { lichenDay } from '../src/figures/lichens';
import { BACTERIA, colony, zone } from '../src/figures/mould';
import { clearWin, decoys } from '../src/figures/glow';

globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;

const context = (units: Units = 'metric') => ({ save: emptyProgress(units), closed: new AbortController().signal, score: () => {} });

export function setSlider(node: HTMLElement, n: number, value: number): void {
  const input = node.querySelectorAll('input[type=range]')[n] as HTMLInputElement;
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

const click = (node: HTMLElement, text: string) => {
  const b = [...node.querySelectorAll('button')].find((x) => x.textContent?.trim() === text);
  if (!b) throw new Error(`no button "${text}"`);
  b.dispatchEvent(new Event('click'));
};

/** Pick a guess and lock it in. */
const guess = (node: HTMLElement, choice: string) => {
  click(node, choice);
  click(node, 'Lock it in');
};

describe('figures', () => {
  for (const units of ['imperial', 'metric'] as const) {
    it(`all build (${units})`, () => {
      for (const l of WRITTEN) for (const p of l.parts) for (const b of p.blocks) {
        if (!isDiagram(b)) continue;
        const handle = FIGURES[b.id](context(units), b.goal, b.options);
        expect(handle.node, `${l.id}: ${b.id}`).toBeInstanceOf(HTMLElement);
      }
    });
  }

  it('lesson 1: a ring spreads outward, and two rings stop where they meet', async () => {
    const one = [{ x: 0, y: 0, start: 0, speed: 0.2 }];
    expect(holder(one, 3, 0, 10)).toBeNull();
    expect(holder(one, 1, 0, 10)?.since).toBeCloseTo(5);
    expect(grass(0.5)).toBe('lush');
    expect(grass(2)).toBe('dead');
    const two = [...one, { x: 10, y: 0, start: 0, speed: 0.2 }];
    // A patch just past the midpoint belongs to the second fungus, however long the first grows.
    expect(holder(two, 5.5, 0, 200)?.ring).toBe(1);
    const m = FIGURES.meadow(context(), 'meet');
    guess(m.node, 'Both stop where they meet');
    click(m.node, 'A second fungus nearby');
    setSlider(m.node, 0, 100);
    await expect(m.done).resolves.toBeUndefined();
  });

  it('lesson 2: fungi sit beside animals once the guess is in', async () => {
    const r = FIGURES.relatives(context(), 'genes');
    guess(r.node, 'The horse');
    click(r.node, 'By genes (1993 on)');
    await expect(r.done).resolves.toBeUndefined();
  });

  it('lesson 3: wood needs lignin broken open, and a searching mycelium finds both blocks', async () => {
    expect(digest(2, [false, true, false])).toBeLessThan(0.1);
    expect(digest(2, [false, true, true])).toBeGreaterThan(0.5);
    expect(digest(0, [true, false, false])).toBeGreaterThan(0.5);
    const run = grow({ x: 40, y: 100, w: 400, h: 200, food: blocks(true), days: 40, seed: 11 });
    expect(run[40].found.every((d) => d !== null)).toBe(true);
    const d = FIGURES.digest(context(), 'wood');
    click(d.node, 'Lignin breakers');
    await expect(d.done).resolves.toBeUndefined();
    const f = FIGURES.forage(context(), 'found');
    setSlider(f.node, 0, 40);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('lesson 4: small spores drift far, and a tilt of a few degrees traps most spores', async () => {
    expect(fallSpeed(10)).toBeGreaterThan(2.5);
    expect(fallSpeed(10)).toBeLessThan(4);
    expect(fallSpeed(5)).toBeCloseTo(fallSpeed(10) / 4);
    expect(drift(3, 8, 1)).toBeGreaterThan(100);
    expect(escape(0)).toBe(1);
    expect(escape(5)).toBeLessThan(0.5);
    const f = FIGURES.fall(context(), 'tiny');
    setSlider(f.node, 0, 2);
    setSlider(f.node, 0, 30);
    await expect(f.done).resolves.toBeUndefined();
    const g = FIGURES.gills(context(), 'tilt');
    guess(g.node, 'A few degrees');
    setSlider(g.node, 0, 8);
    await expect(g.done).resolves.toBeUndefined();
  });

  it('lesson 5: many mating types make strangers mates but not siblings', async () => {
    expect(mateChance(2, 1).stranger).toBe(0.5);
    expect(mateChance(300, 2).stranger).toBeGreaterThan(0.99);
    expect(mateChance(300, 2).sibling).toBe(0.25);
    const m = FIGURES.mating(context(), 'many');
    click(m.node, 'Two genes');
    setSlider(m.node, 0, 300);
    await expect(m.done).resolves.toBeUndefined();
  });

  it('lesson 6: six fungi sorted by spore-maker', async () => {
    const f = FIGURES.sort(context(), 'sorted');
    for (const sp of SPECIMENS) click(f.node, GROUPS[sp.group]);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('lesson 7: a fermenting yeast beats the bacterium, a respiring one does not', async () => {
    const fer = flask(true, true, 100, 72);
    const res = flask(false, true, 100, 72);
    expect(fer[72].bacteria).toBeLessThan(0.1);
    expect(res[72].bacteria).toBeGreaterThan(res[72].yeast);
    expect(fer[72].yeast).toBeGreaterThan(res[72].yeast);
    expect(fer[72].alcohol).toBeLessThan(fer[48].alcohol);
    const f = FIGURES.flask(context(), 'ferment');
    click(f.node, 'Burn sugar fully');
    click(f.node, 'Ferment to alcohol');
    setSlider(f.node, 0, 60);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('lesson 8: brown rot leaves lignin; no white rot or much swamp makes more coal', async () => {
    expect(rotted('brown', 24).lignin).toBeGreaterThan(rotted('white', 24).lignin * 3);
    expect(rotted('white', 24).cellulose).toBeGreaterThan(rotted('brown', 24).cellulose);
    expect(buried(0.05, false) / buried(0.05, true)).toBeGreaterThan(2.5);
    expect(buried(0.3, true) / buried(0.05, true)).toBeGreaterThan(4);
    const r = FIGURES.rots(context(), 'cubes');
    guess(r.node, 'Lignin');
    click(r.node, 'Brown rot');
    setSlider(r.node, 0, 20);
    await expect(r.done).resolves.toBeUndefined();
    const c = FIGURES.coal(context(), 'both');
    click(c.node, 'White rot fungi exist');
    click(c.node, 'White rot fungi exist');
    setSlider(c.node, 0, 0.4);
    await expect(c.done).resolves.toBeUndefined();
  });

  it('lesson 9: shade raises transfer clear of zero; a trench leaves it in the scatter', async () => {
    const sun = meanRange(transfer(0, false));
    const shade = meanRange(transfer(0.8, false));
    const cut = meanRange(transfer(0.8, true));
    expect(sun.mean - sun.half).toBeLessThan(0);
    expect(shade.mean - shade.half).toBeGreaterThan(0);
    expect(cut.mean - cut.half).toBeLessThan(0);
    const f = FIGURES.transfer(context(), 'plots');
    guess(f.node, 'More');
    setSlider(f.node, 0, 0.8);
    click(f.node, 'Dig a trench between them');
    await expect(f.done).resolves.toBeUndefined();
  });

  it('lesson 10: wet in daylight gains, wet only at night loses, dry does nothing', async () => {
    expect(lichenDay(20, 4)[24]).toBeLessThan(0);
    expect(lichenDay(6, 4)[24]).toBeGreaterThan(0);
    expect(lichenDay(0, 0)[24]).toBe(0);
    const f = FIGURES.day(context(), 'timing');
    guess(f.node, 'It loses');
    setSlider(f.node, 0, 7);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('lesson 11: a clear ring for Staphylococcus, none for E. coli', async () => {
    expect(zone(4, BACTERIA[0].stop)).toBeGreaterThan(colony(4) + 5);
    expect(zone(7, BACTERIA[1].stop)).toBe(0);
    const f = FIGURES.zone(context(), 'clear');
    guess(f.node, 'A clear ring with no bacteria');
    setSlider(f.node, 0, 5);
    click(f.node, 'E. coli');
    await expect(f.done).resolves.toBeUndefined();
  });

  it('lesson 12: a few nights are chance, many show the lit decoy wins', async () => {
    const few = decoys(3);
    const many = decoys(20);
    expect(clearWin(few.litNights, few.darkNights)).toBe(false);
    expect(clearWin(many.litNights, many.darkNights)).toBe(true);
    const f = FIGURES.decoys(context(), 'nights');
    guess(f.node, 'Yes');
    setSlider(f.node, 0, 16);
    await expect(f.done).resolves.toBeUndefined();
  });
});
