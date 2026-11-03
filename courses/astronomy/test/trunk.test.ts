// @vitest-environment happy-dom
// The tasks of lessons 8 and 12-25 can each be done, and the physics behind
// their figures gives the numbers the text quotes.
import { describe, expect, it } from 'vitest';
import { emptyProgress } from 'didactics/progress';
import { FIGURES } from '../src/figures';
import { lifetime, starAt } from '../src/figures/clusters';
import { balmerLine, band, fallNm } from '../src/figures/ladder';

const context = () => ({ save: emptyProgress('metric'), closed: new AbortController().signal, score: () => {} });

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

const guess = (node: HTMLElement, choice: string) => {
  click(node, choice);
  click(node, 'Lock it in');
};

describe('trunk lessons', () => {
  it('lesson 8: Balmer’s rule and Bohr’s falls agree, and the four visible lines can be found', async () => {
    expect(balmerLine(3)).toBeCloseTo(656.3, 0);
    expect(balmerLine(6)).toBeCloseTo(410.2, 0);
    expect(fallNm(3, 2)).toBeCloseTo(656.3, -1);
    expect(band(fallNm(2, 1))).toBe('ultraviolet');
    expect(band(fallNm(4, 3))).toBe('infrared');
    const r = FIGURES.rungs(context(), 'balmer');
    guess(r.node, 'They all end on the second rung');
    setSlider(r.node, 1, 2);
    for (const n of [3, 4, 5, 6]) setSlider(r.node, 0, n);
    await expect(r.done).resolves.toBeUndefined();
  });

  it('lesson 12: heavy stars die young, and the cluster clock matches the Pleiades and M67', async () => {
    expect(lifetime(1)).toBeCloseTo(1e10, -8);
    expect(lifetime(10) / 1e6).toBeGreaterThan(20);
    expect(lifetime(10) / 1e6).toBeLessThan(50);
    expect(starAt(1, 4.6e9).stage).toBe('main');
    expect(starAt(1, 10.5e9).stage).toBe('giant');
    expect(starAt(20, 1e8).stage).toBe('gone');
    const c = FIGURES.clusters(context(), 'both');
    guess(c.node, 'M67');
    setSlider(c.node, 0, Math.log10(1.1e8));
    click(c.node, 'Match M67');
    setSlider(c.node, 0, Math.log10(4e9));
    await expect(c.done).resolves.toBeUndefined();
  });
});
