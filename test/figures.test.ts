// @vitest-environment happy-dom
// Every figure builds, in both unit systems, and the pages that show them render.
import { describe, expect, it } from 'vitest';
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
        if (b.kind !== 'figure') continue;
        const handle = FIGURES[b.figure as FigureId](ctx, b.goal, b.options);
        expect(handle.node, b.figure).toBeInstanceOf(HTMLElement);
      }
    });
  }

  it('the triangle and jar meet their goals', async () => {
    const ctx = { save: emptySave(), closed: new AbortController().signal, score: () => {} };
    const tri = FIGURES.triangle(ctx, 'loam');
    const [sand, clay] = tri.node.querySelectorAll('input');
    clay.value = '20';
    clay.dispatchEvent(new Event('input'));
    sand.value = '40';
    sand.dispatchEvent(new Event('input'));
    await expect(tri.done).resolves.toBeUndefined();
    const jar = FIGURES.jar(ctx, 'read');
    const time = jar.node.querySelector('input')!;
    time.value = '100';
    time.dispatchEvent(new Event('input'));
    await expect(jar.done).resolves.toBeUndefined();
    expect(jar.node.textContent).toContain('a loam');
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
