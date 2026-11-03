// @vitest-environment happy-dom
// Every figure the lessons name builds, in both unit systems, and the ones
// with a task can reach it.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { emptyProgress } from 'didactics/progress';
import type { Units } from 'didactics/units';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';
import { jar } from '../src/figures/willow';
import { breakEven, CANDLE, mintJar } from '../src/figures/air';
import { absorbed, autumn, uses } from '../src/figures/green';
import { lollipop } from '../src/figures/oxygen';
import { cell, rise } from '../src/figures/cells';
import { column } from '../src/figures/xylem';
import { stoma } from '../src/figures/stomata';
import { day } from '../src/figures/cam';
import { girdled, munch } from '../src/figures/phloem';
import { pot } from '../src/figures/peas';

globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;

const context = (units: Units = 'metric') => ({ save: emptyProgress(units), closed: new AbortController().signal, score: () => {} });

function setSlider(node: HTMLElement, n: number, value: number): void {
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

  it('lesson 1: the willow is taken apart, and a sealed jar stops growth', async () => {
    const tub = FIGURES.tub(context(), 'split');
    guess(tub.node, 'The air');
    click(tub.node, 'Take the willow apart');
    expect(tub.node.textContent).toContain('carbon dioxide');
    await expect(tub.done).resolves.toBeUndefined();
    const sealed = jar(true, 20);
    expect(sealed[20].co2).toBeLessThan(60);
    expect(sealed[20].grown).toBeLessThan(jar(false, 20)[20].grown / 2);
    const bj = FIGURES.belljar(context(), 'stall');
    click(bj.node, 'Seal the jar');
    setSlider(bj.node, 0, 20);
    await expect(bj.done).resolves.toBeUndefined();
  });

  it('lesson 2: mint restores the air only in light, and a shade leaf breaks even lower', async () => {
    expect(mintJar(true, 10)[10].o2).toBeGreaterThan(CANDLE);
    expect(mintJar(false, 10)[10].o2).toBeLessThan(16);
    expect(breakEven('shade')).toBeLessThan(breakEven('sun') / 3);
    const m = FIGURES.mint(context(), 'both');
    guess(m.node, 'Makes it worse');
    setSlider(m.node, 0, 10);
    click(m.node, 'Keep it dark');
    setSlider(m.node, 0, 10);
    await expect(m.done).resolves.toBeUndefined();
    const l = FIGURES.light(context(), 'shade');
    setSlider(l.node, 0, 20);
    await expect(l.done).resolves.toBeUndefined();
  });

  it('lesson 3: chlorophyll uses red and blue, a bouncing leaf catches green, and red needs sun and cool nights', async () => {
    expect(uses('green', 550)).toBeLessThan(uses('green', 670) / 3);
    expect(uses('red', 550)).toBeGreaterThan(uses('red', 670));
    expect(absorbed('green', 4, false)).toBeLessThan(0.5);
    expect(absorbed('green', 4, true)).toBeGreaterThan(0.75);
    expect(autumn(8, 1, 5).red).toBeGreaterThan(0.6);
    expect(autumn(8, 0.1, 14).red).toBeLessThan(0.2);
    const e = FIGURES.engelmann(context(), 'red');
    guess(e.node, 'Under the red and blue light');
    click(e.node, 'Red seaweed');
    await expect(e.done).resolves.toBeUndefined();
    const l = FIGURES.leaf(context(), 'green');
    click(l.node, 'Light bounces inside');
    await expect(l.done).resolves.toBeUndefined();
    const a = FIGURES.autumn(context(), 'red');
    setSlider(a.node, 1, 1);
    setSlider(a.node, 2, 4);
    setSlider(a.node, 0, 8);
    await expect(a.done).resolves.toBeUndefined();
  });

  it('lesson 4: heavy oxygen is traced both ways, and carbon goes into PGA first', async () => {
    expect(lollipop(2).pga).toBeGreaterThan(0.7);
    expect(lollipop(300).sucrose).toBeGreaterThan(lollipop(300).pga);
    const l = FIGURES.label(context(), 'traced');
    guess(l.node, 'In the oxygen gas');
    click(l.node, 'Heavy oxygen in the CO₂');
    await expect(l.done).resolves.toBeUndefined();
    const p = FIGURES.lollipop(context(), 'first');
    setSlider(p.node, 0, 1);
    await expect(p.done).resolves.toBeUndefined();
  });

  it('lesson 5: water rises on the sugar side, and saltier water plasmolyses a cell', async () => {
    expect(rise(0.6, 60, false)).toBeGreaterThan(30);
    expect(rise(0.6, 60, true)).toBe(0);
    expect(cell(0).turgor).toBeGreaterThan(0.5);
    expect(cell(1.5).volume).toBeLessThan(1);
    const o = FIGURES.osmosis(context(), 'rise');
    guess(o.node, 'Into the sugar side');
    setSlider(o.node, 0, 60);
    await expect(o.done).resolves.toBeUndefined();
    const c = FIGURES.cell(context(), 'plasmolysed');
    setSlider(c.node, 0, 1.5);
    await expect(c.done).resolves.toBeUndefined();
  });

  it('lesson 6: height, dry air and dry soil raise the pull until pipes break', async () => {
    expect(column(100, 0.5, 0.2).tension).toBeGreaterThan(column(20, 0.5, 0.2).tension);
    expect(column(40, 0.5, 0.2).broken).toBe(0);
    expect(column(110, 1, 0.9).broken).toBeGreaterThan(0.3);
    const c = FIGURES.column(context(), 'embolism');
    guess(c.node, 'It gets stronger');
    setSlider(c.node, 0, 110);
    setSlider(c.node, 1, 1);
    setSlider(c.node, 2, 0.9);
    await expect(c.done).resolves.toBeUndefined();
  });

  it('lesson 7: a leaf trades about a hundred waters per CO₂, more in dry air, through a pore that closes', async () => {
    const mild = stoma({ light: 0.8, dryAir: 0.3, soil: 0.8, co2: 400 });
    const dry = stoma({ light: 0.8, dryAir: 1, soil: 0.8, co2: 400 });
    expect(mild.ratio).toBeGreaterThan(80);
    expect(mild.ratio).toBeLessThan(250);
    expect(dry.ratio).toBeGreaterThan(300);
    expect(dry.open).toBeLessThan(mild.open);
    const s = FIGURES.stoma(context(), 'trade');
    guess(s.node, 'Closes them partly');
    setSlider(s.node, 1, 1);
    await expect(s.done).resolves.toBeUndefined();
  });

  it('lesson 8: corn makes most sugar, the cactus most per water, and without the mistake wheat catches up', async () => {
    const c3 = day('C3');
    const c4 = day('C4');
    const cam = day('CAM');
    expect(c4.sugar).toBeGreaterThan(c3.sugar * 1.3);
    expect(cam.perWater).toBeGreaterThan(c4.perWater * 1.5);
    expect(day('C3', 24, false).sugar).toBeGreaterThanOrEqual(c4.sugar * 0.95);
    const p = FIGURES.pathways(context(), 'mistake');
    guess(p.node, 'The cactus');
    setSlider(p.node, 0, 24);
    click(p.node, 'Take away rubisco’s mistake');
    await expect(p.done).resolves.toBeUndefined();
  });

  it('lesson 9: a ringed tree starves its roots before its leaves, and Münch flow stops when the sink fills', async () => {
    const ringed = girdled('bark', 30);
    const firstRootLoss = ringed.findIndex((s) => s.roots < 1);
    const firstLeafLoss = ringed.findIndex((s) => s.leaves < 1);
    expect(firstRootLoss).toBeGreaterThan(0);
    expect(firstLeafLoss).toBeGreaterThan(firstRootLoss);
    expect(girdled('wood', 1)[1].leaves).toBe(0);
    expect(munch(0.6, true, 60)[60].flow).toBeGreaterThan(0.05);
    expect(munch(0.6, false, 60)[60].flow).toBeLessThan(0.01);
    const g = FIGURES.girdle(context(), 'roots');
    guess(g.node, 'The roots');
    setSlider(g.node, 0, 30);
    await expect(g.done).resolves.toBeUndefined();
    const m = FIGURES.munch(context(), 'stops');
    click(m.node, 'Stop the sink using sugar');
    setSlider(m.node, 0, 60);
    await expect(m.done).resolves.toBeUndefined();
  });

  it('lesson 10: soil wash feeds peas but not oats, and shortages show on old or new leaves', async () => {
    expect(pot('peas', 'wash').growth).toBeGreaterThan(0.8);
    expect(pot('oats', 'wash').growth).toBeLessThan(0.3);
    expect(pot('peas', 'wash').nodules).toBe(true);
    const p = FIGURES.pots(context(), 'nodules');
    guess(p.node, 'Only the peas');
    click(p.node, 'Oats');
    await expect(p.done).resolves.toBeUndefined();
    const k = FIGURES.knop(context(), 'mobile');
    click(k.node, 'No N');
    click(k.node, 'No Fe');
    await expect(k.done).resolves.toBeUndefined();
  });
});
