// @vitest-environment happy-dom
// Every figure builds, in both unit systems, and the pages that show them render.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { FIGURES } from '../src/app/figures';
import { drawSubject } from '../src/app/scene/subjects';
import { makeGarden } from '../src/app/scene/garden';
import { LESSONS, type FigureId } from '../src/core/lessons';
import { SUBJECTS, type SubjectId } from '../src/core/photos';
import { emptySave } from '../src/core/save';

describe('figures', () => {
  for (const units of ['imperial', 'metric'] as const) {
    it(`all build (${units})`, () => {
      const save = { ...emptySave(), units };
      const ctx = { save, closed: new AbortController().signal, score: () => {} };
      for (const l of LESSONS) for (const p of l.parts) for (const b of p.blocks) {
        if (!isDiagram(b)) continue;
        const handle = FIGURES[b.id as FigureId](ctx, b.goal, b.options);
        expect(handle.node, b.id).toBeInstanceOf(HTMLElement);
      }
    });
  }

  it('the triangle reads a jar and meets its goal', async () => {
    const ctx = { save: emptySave(), closed: new AbortController().signal, score: () => {} };
    const tri = FIGURES.triangle(ctx, 'loam');
    const [sand, silt, clay] = tri.node.querySelectorAll('input');
    for (const [input, mm] of [[sand, 16], [silt, 16], [clay, 8]] as const) {
      input.value = String(mm);
      input.dispatchEvent(new Event('input'));
    }
    await expect(tri.done).resolves.toBeUndefined();
    expect(tri.node.textContent).toContain('Sand 40%, silt 40%, clay 20%: a loam');
  });

  it('the pores and web figures meet their goals', async () => {
    const ctx = { save: emptySave(), closed: new AbortController().signal, score: () => {} };
    const pores = FIGURES.pores(ctx, 'more');
    const om = pores.node.querySelector('input')!;
    om.value = '5';
    om.dispatchEvent(new Event('input'));
    await expect(pores.done).resolves.toBeUndefined();
    const web = FIGURES.web(ctx, 'out');
    web.node.querySelector('.web-node')!.dispatchEvent(new Event('click'));
    web.node.querySelector('button')!.dispatchEvent(new Event('click'));
    await expect(web.done).resolves.toBeUndefined();
  });

  it('the heat, settle and pot figures meet their goals', async () => {
    const ctx = { save: emptySave(), closed: new AbortController().signal, score: () => {} };
    const set = (node: HTMLElement, i: number, v: number) => {
      const input = node.querySelectorAll('input')[i];
      input.value = String(v);
      input.dispatchEvent(new Event('input'));
    };
    const heat = FIGURES.heat(ctx, 'hot');
    set(heat.node, 0, 1);
    const chips = heat.node.querySelectorAll('button.chip');
    chips[1].dispatchEvent(new Event('click'));
    chips[5].dispatchEvent(new Event('click'));
    await expect(heat.done).resolves.toBeUndefined();
    const settle = FIGURES.settle(ctx, 'firm');
    set(settle.node, 0, 30);
    await expect(settle.done).resolves.toBeUndefined();
    const pot = FIGURES.pot(ctx, 'air');
    pot.node.querySelectorAll('button.chip')[1].dispatchEvent(new Event('click'));
    set(pot.node, 0, 30);
    await expect(pot.done).resolves.toBeUndefined();
  });
});

describe('drawings', () => {
  it('cover every subject', () => {
    for (const id of Object.keys(SUBJECTS) as SubjectId[]) expect(drawSubject(id).childNodes.length, id).toBeGreaterThan(1);
  });

  it('draw the same garden from the same seed', () => {
    expect(makeGarden({ seed: 3 }).outerHTML).toBe(makeGarden({ seed: 3 }).outerHTML);
  });
});
