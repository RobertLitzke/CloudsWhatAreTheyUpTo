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
});
