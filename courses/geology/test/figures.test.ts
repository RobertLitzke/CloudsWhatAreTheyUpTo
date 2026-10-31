// @vitest-environment happy-dom
// Every figure the lessons name builds, in both unit systems, and the ones
// with a task can reach it.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { emptyProgress } from 'didactics/progress';
import type { Units } from 'didactics/units';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';

const context = (units: Units = 'imperial') => ({ save: emptyProgress(units), closed: new AbortController().signal, score: () => {} });

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

  it('lesson 1: settling levels out, and the cliff reads in order', async () => {
    const settle = FIGURES.settle(context(), 'flat');
    guess(settle.node, 'They fill the hollows and level out');
    setSlider(settle.node, 1, 100);
    setSlider(settle.node, 0, 8);
    await expect(settle.done).resolves.toBeUndefined();
    const order = FIGURES.order(context(), 'ordered');
    for (const e of ['Layer A settles', 'Layer B settles', 'Layer C settles', 'A crack (fault) shifts A, B and C', 'The top is worn level, and layer D settles on it', 'Melted rock fills a crack (dike) through everything']) click(order.node, e);
    await expect(order.done).resolves.toBeUndefined();
  });

  it('lesson 2: a river leaves clean sand, and a dune builds its beds', async () => {
    const sort = FIGURES.sorting(context(), 'sand-bed');
    setSlider(sort.node, 0, 0.15);
    await expect(sort.done).resolves.toBeUndefined();
    expect(sort.node.textContent).toContain('clean sandstone');
    const dune = FIGURES.dune(context(), 'built');
    guess(dune.node, 'From the left');
    setSlider(dune.node, 0, 90);
    await expect(dune.done).resolves.toBeUndefined();
  });

  it('lesson 3: layers tie up by their fossils, and steep layers V downstream', async () => {
    const cor = FIGURES.correlate(context(), 'matched');
    const rects = () => [...cor.node.querySelectorAll('rect[role=button]')];
    const tap = (col: string, rock: string) => {
      const r = rects().find((x) => x.getAttribute('aria-label') === `${col}: ${rock}`);
      if (!r) throw new Error(`no ${col}: ${rock}`);
      r.dispatchEvent(new Event('click'));
    };
    // A wrong match first: same rock, different fossils.
    tap('Canal cutting', 'cream limestone with sea lily stems');
    tap('Hill quarry', 'cream limestone with lamp shells');
    expect(cor.node.textContent).toContain('Same rock');
    for (const [col, rock] of [
      ['Canal cutting', 'blue clay with no fossils'],
      ['Canal cutting', 'cream limestone with sea lily stems'],
      ['Well shaft', 'blue clay with ammonites'],
      ['Well shaft', 'cream limestone with lamp shells'],
    ]) {
      tap(col, rock);
      tap('Hill quarry', rock);
    }
    await expect(cor.done).resolves.toBeUndefined();
    const vees = FIGURES.vees(context(), 'downstream');
    guess(vees.node, 'A V pointing upstream');
    setSlider(vees.node, 0, 2);
    expect(vees.node.textContent).toContain('still points upstream');
    setSlider(vees.node, 0, 20);
    await expect(vees.done).resolves.toBeUndefined();
  });

  it('lesson 4: slow cooling grows crystals, and deep in a flow the columns are hexagons', async () => {
    const furnace = FIGURES.furnace(context(), 'crystals');
    guess(furnace.node, 'Black glass');
    expect(furnace.node.textContent).toContain('glass');
    setSlider(furnace.node, 0, 8);
    await expect(furnace.done).resolves.toBeUndefined();
    expect(furnace.node.textContent).toContain('Basalt');
    const columns = FIGURES.columns(context(), 'hexagons');
    setSlider(columns.node, 0, 12);
    await expect(columns.done).resolves.toBeUndefined();
  });

  it('lesson 5: buried mud grows garnets, and squeezed flakes line up', async () => {
    const burial = FIGURES.burial(context(), 'garnet');
    setSlider(burial.node, 0, 20);
    await expect(burial.done).resolves.toBeUndefined();
    setSlider(burial.node, 0, 30);
    setSlider(burial.node, 1, 8);
    expect(burial.node.textContent).toContain('Blueschist');
    const squeeze = FIGURES.squeeze(context(), 'cleavage');
    setSlider(squeeze.node, 0, 90);
    await expect(squeeze.done).resolves.toBeUndefined();
  });
});
