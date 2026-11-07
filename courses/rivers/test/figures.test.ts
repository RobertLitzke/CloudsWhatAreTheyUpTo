// @vitest-environment happy-dom
// Every figure the lessons name builds, in both unit systems. Each lesson's
// own figures are tested in test/<lesson id>.test.ts.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';
import { context } from './helpers';

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

  it('each lesson names its own figures by its own id', () => {
    const own = Object.keys(FIGURES).filter((id) => id.includes('-') && WRITTEN.some((l) => id.startsWith(`${l.id}-`)));
    for (const id of own) expect(id).toMatch(/^[a-z]+-[a-z0-9-]+$/);
  });
});
