// @vitest-environment happy-dom
// Every figure the lessons name builds, in both unit systems, and the ones
// with a task can reach it.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { emptyProgress } from 'didactics/progress';
import type { Units } from 'didactics/units';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';
import { erwinTotal, ERWIN } from '../src/figures/kinds';
import { kindsOn, shore } from '../src/figures/seastar';
import { chain } from '../src/figures/otters';
import { acacia, bestReward } from '../src/figures/acacia';
import { standing, supported } from '../src/figures/pyramid';
import { tube } from '../src/figures/gause';
import { averages } from '../src/figures/lynx';
import { delayed, island } from '../src/figures/reindeer';
import { CARLSON, elephants, logistic } from '../src/figures/elephants';

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

  it('lesson 1: Erwin’s chain gives thirty million, and the specialists can bring it under five', async () => {
    expect(erwinTotal(ERWIN.specialists, ERWIN.beetleShare, ERWIN.canopyShare)).toBeCloseTo(30.4e6, -5);
    const erwin = FIGURES.erwin(context(), 'low');
    guess(erwin.node, 'Beetles found on one tree species only');
    setSlider(erwin.node, 1, 50);
    setSlider(erwin.node, 2, 80);
    expect(erwin.node.textContent).toContain('million');
    setSlider(erwin.node, 0, 2);
    await expect(erwin.done).resolves.toBeUndefined();
    const sampler = FIGURES.sampler(context(), 'curve');
    for (let i = 0; i < 4; i++) click(sampler.node, 'Search five');
    await expect(sampler.done).resolves.toBeUndefined();
    expect(sampler.node.textContent).toMatch(/20 squares searched, \d+ kinds found/);
  });

  it('lesson 2: elephants reach millions, the tub holds, the brake fits the yeast, and fish are counted', async () => {
    expect(elephants(30, 6, 750)[750]).toBeGreaterThan(1e6);
    expect(elephants(30, 2, 750)[750]).toBeLessThan(4);
    expect(Math.abs(logistic(0.54, 660, CARLSON[0], 18) - CARLSON[18])).toBeLessThan(15);
    const darwin = FIGURES.darwin(context(), 'run');
    guess(darwin.node, 'Millions');
    setSlider(darwin.node, 0, 750);
    await expect(darwin.done).resolves.toBeUndefined();
    const tub = FIGURES.bathtub(context(), 'steady');
    click(tub.node, 'Taps tied to the level');
    setSlider(tub.node, 1, 8);
    setSlider(tub.node, 2, 8);
    setSlider(tub.node, 0, 50);
    await expect(tub.done).resolves.toBeUndefined();
    const brake = FIGURES.brake(context(), 'fit');
    setSlider(brake.node, 0, 0.54);
    setSlider(brake.node, 1, 660);
    await expect(brake.done).resolves.toBeUndefined();
    const fish = FIGURES.recapture(context(), 'estimate');
    click(fish.node, 'Catch and tag 50');
    click(fish.node, 'Second catch of 40');
    await expect(fish.done).resolves.toBeUndefined();
    expect(fish.node.textContent).toContain('the pond holds about');
  });

  it('lesson 3: slow lichen overshoots and crashes, fast lichen levels off, and a late brake overshoots', async () => {
    const slow = island(40, true);
    const at = (r: typeof slow, y: number) => r.find((x) => x.year === y)!.herd;
    expect(at(slow, 1963)).toBeGreaterThan(4000);
    expect(at(slow, 1966)).toBeLessThan(150);
    const fast = island(5, true);
    expect(at(fast, 1970)).toBeGreaterThan(2500);
    expect(Math.max(...delayed(0))).toBeLessThan(101);
    expect(Math.max(...delayed(2))).toBeGreaterThan(200);
    const fig = FIGURES.island(context(), 'fast');
    guess(fig.node, 'Wobble, then level off');
    setSlider(fig.node, 1, 5);
    setSlider(fig.node, 0, 1970);
    await expect(fig.done).resolves.toBeUndefined();
    const delay = FIGURES.delay(context(), 'overshoot');
    setSlider(delay.node, 0, 1.2);
    await expect(delay.done).resolves.toBeUndefined();
  });

  it('lesson 4: hares and lynx cycle with lynx behind, and fishing raises the prey', async () => {
    expect(averages(0.3).prey).toBeGreaterThan(averages(0).prey);
    expect(averages(0.3).predators).toBeLessThan(averages(0).predators);
    const cyc = FIGURES.cycle(context(), 'loop');
    guess(cyc.node, 'Still rising');
    setSlider(cyc.node, 0, 25);
    await expect(cyc.done).resolves.toBeUndefined();
    expect(cyc.node.textContent).toMatch(/lynx about [\d.]+ years later/);
    const fish = FIGURES.fishing(context(), 'fished');
    guess(fish.node, 'It rises');
    setSlider(fish.node, 0, 0.35);
    await expect(fish.done).resolves.toBeUndefined();
  });

  it('lesson 5: the drought sorts the finches, and the chicks keep the shift only if it is inherited', async () => {
    const d = FIGURES.drought(context(), 'shift');
    guess(d.node, 'No: finches with deep beaks survived');
    click(d.node, 'A drought year');
    expect(d.node.textContent).toContain('survived');
    click(d.node, 'Survivors breed');
    await expect(d.done).resolves.toBeUndefined();
    const h = FIGURES.herit(context(), 'none');
    setSlider(h.node, 0, 0);
    await expect(h.done).resolves.toBeUndefined();
  });

  it('lesson 6: full overlap excludes one kind, partial overlap keeps both', async () => {
    const full = tube({ overlap: 1, swings: false }, 40);
    expect(full[full.length - 1][1]).toBeLessThan(5);
    const half = tube({ overlap: 0.5, swings: false }, 40);
    expect(half[half.length - 1][1]).toBeGreaterThan(40);
    const fig = FIGURES.tube(context(), 'coexist');
    guess(fig.node, 'Only one kind');
    setSlider(fig.node, 0, 40);
    expect(fig.node.textContent).toContain('kind B is gone');
    setSlider(fig.node, 1, 0.5);
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('lesson 7: without sea stars the mussels take over and kinds are lost', async () => {
    const keep = shore({ stars: true, strongMussels: true }, 15);
    const gone = shore({ stars: false, strongMussels: true }, 15);
    expect(kindsOn(keep[10], true)).toBeGreaterThanOrEqual(12);
    expect(kindsOn(gone[10], false)).toBeLessThanOrEqual(8);
    const fig = FIGURES.pool(context(), 'fewer');
    guess(fig.node, 'Fewer');
    click(fig.node, 'Throw out the sea stars');
    setSlider(fig.node, 0, 10);
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('lesson 8: plants flip with each level added to the chain', async () => {
    const kelp = [1, 2, 3, 4].map((n) => chain(n)[0]);
    expect(kelp[1]).toBeLessThan(kelp[0] / 4);
    expect(kelp[2]).toBeGreaterThan(kelp[1] * 4);
    expect(kelp[3]).toBeLessThan(kelp[2] / 4);
    const fig = FIGURES.chain(context(), 'flip');
    guess(fig.node, 'Less kelp');
    click(fig.node, '+ orcas');
    expect(fig.node.textContent).toContain('flips every level');
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('lesson 9: without ants the acacia is eaten, and cheaters make paying not pay', async () => {
    expect(acacia(false)[12].leaf).toBeLessThan(acacia(true)[12].leaf / 3);
    expect(bestReward(0).gain).toBeGreaterThan(0.3);
    expect(bestReward(0.9).gain).toBeLessThan(0.05);
    const g = FIGURES.guards(context(), 'eaten');
    guess(g.node, 'Much worse');
    click(g.node, 'Take the ants away');
    setSlider(g.node, 0, 12);
    await expect(g.done).resolves.toBeUndefined();
    const t = FIGURES.trade(context(), 'cheat');
    setSlider(t.node, 1, 0.9);
    await expect(t.done).resolves.toBeUndefined();
  });

  it('lesson 10: a tenth a step feeds four levels, and short-lived algae turn the pyramid of mass over', async () => {
    expect(supported(0.1)).toBe(4);
    expect(supported(0.02)).toBe(2);
    expect(supported(0.2)).toBe(5);
    expect(standing(365)[0]).toBeGreaterThan(standing(365)[1]);
    expect(standing(3)[0]).toBeLessThan(standing(3)[1]);
    const p = FIGURES.pyramid(context(), 'five');
    guess(p.node, 'About 10');
    setSlider(p.node, 0, 0.2);
    await expect(p.done).resolves.toBeUndefined();
    const s = FIGURES.standing(context(), 'flip');
    setSlider(s.node, 0, 3);
    click(s.node, 'Show what each level makes in a year');
    await expect(s.done).resolves.toBeUndefined();
  });
});
