// @vitest-environment happy-dom
// Every figure the lessons use, built once in a browser-like page: none may
// throw, and every task a lesson sets must be one its figure can finish.

import { beforeAll, describe, expect, it } from 'vitest';
import { FIGURES } from '../src/app/figures';
import type { FigureContext } from '../src/app/figures/kit';
import { emptySave } from '../src/core/save';
import { FIGURE_IDS, SHIFTS, type Block } from '../src/core/shifts';

type FigureBlock = Extract<Block, { kind: 'figure' }>;
const uses: { shift: string; block: FigureBlock }[] = SHIFTS.flatMap((s) =>
  s.parts.flatMap((p) => p.blocks.filter((b): b is FigureBlock => b.kind === 'figure').map((block) => ({ shift: s.id, block }))),
);

beforeAll(() => {
  // happy-dom has no IntersectionObserver; figures only need it to start animating.
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
});

describe('lesson tasks', () => {
  it('ask each figure only for a goal it knows', () => {
    for (const { shift, block } of uses) {
      if (!block.goal) continue;
      expect(FIGURES[block.figure].goals, `${shift}: ${block.figure} goal "${block.goal}"`).toContain(block.goal);
    }
  });

  it('give a goal to every task on a live figure', () => {
    // A task on a figure that is not a quiz never finishes without a goal, and the lesson would stall.
    for (const { shift, block } of uses) {
      if (!block.task || block.goal) continue;
      expect(FIGURES[block.figure].quiz, `${shift}: ${block.figure} has a task but no goal`).toBe(true);
    }
  });
});

describe('figures', () => {
  for (const units of ['metric', 'imperial'] as const) {
    it(`all build without throwing (${units})`, () => {
      const save = { ...emptySave(), units };
      const ctx: FigureContext = { save, alive: () => false, score: () => {}, local: () => undefined };
      for (const id of FIGURE_IDS) {
        const use = uses.find((u) => u.block.figure === id)?.block;
        const handle = FIGURES[id](ctx, use?.goal, use?.options);
        expect(handle.node, id).toBeInstanceOf(HTMLElement);
        expect(handle.node.querySelector('svg, img, button'), id).not.toBeNull();
        expect(Boolean(handle.done), `${id} is a task only when the lesson sets one`).toBe(Boolean(use?.goal) || FIGURES[id].quiz === true);
      }
    });
  }
});
