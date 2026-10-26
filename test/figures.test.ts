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
      const ctx: FigureContext = { save, closed: AbortSignal.abort(), score: () => {} };
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

describe('guess-first figures', () => {
  // These figures turn on one threshold, so the reader says where it will be
  // before the controls that reach it unlock.
  const GUESS_FIRST = ['jar', 'parcel', 'front', 'storm', 'billow'] as const;
  it('lock their sliders until the guess is marked', () => {
    const ctx: FigureContext = { save: emptySave(), closed: AbortSignal.abort(), score: () => {} };
    for (const id of GUESS_FIRST) {
      const use = uses.find((u) => u.block.figure === id)!.block;
      const { node } = FIGURES[id](ctx, use.goal, use.options);
      const sliders = [...node.querySelectorAll<HTMLInputElement>('input[type=range]')];
      expect(sliders.length, id).toBeGreaterThan(0);
      expect(sliders.every((s) => s.disabled), `${id} sliders locked`).toBe(true);
      expect(node.querySelector('.fig-guess'), id).not.toBeNull();
    }
  });
});

describe('figures coming back after the reader left', () => {
  // Each figure keeps what it would lose on a reload (Task.keep in lesson-kit);
  // built again with what it kept, it is as it was.
  const GUESS_FIRST = ['jar', 'parcel', 'front', 'storm', 'billow'] as const;
  const memoCtx = (kept: unknown, onKeep: (v: unknown) => void = () => {}, score: FigureContext['score'] = () => {}): FigureContext =>
    ({ save: emptySave(), closed: AbortSignal.abort(), score, memo: { restored: false, kept, keep: onKeep } });
  const markGuess = (node: HTMLElement) => {
    // Make a guess where there is something to pick, then lock it in.
    const chips = [...node.querySelectorAll<HTMLButtonElement>('.fig-guess .chip')];
    chips.forEach((c) => c.click());
    [...node.querySelectorAll<HTMLButtonElement>('.fig-guess button.btn')].find((b) => !b.hidden && !b.disabled)?.click();
  };

  it('guess-first figures come back with their guess marked and their sliders free', () => {
    for (const id of GUESS_FIRST) {
      const use = uses.find((u) => u.block.figure === id)!.block;
      let kept: unknown;
      const first = FIGURES[id](memoCtx(undefined, (v) => (kept = v)), use.goal, use.options).node;
      markGuess(first);
      expect(kept, `${id} keeps its guess`).not.toBeUndefined();
      const again = FIGURES[id](memoCtx(JSON.parse(JSON.stringify(kept))), use.goal, use.options).node;
      const sliders = [...again.querySelectorAll<HTMLInputElement>('input[type=range]')];
      expect(sliders.some((s) => !s.disabled), `${id} sliders free`).toBe(true);
    }
  });

  it('checks come back with their answers, and finish with the same score', async () => {
    for (const id of ['radioCheck', 'forecast'] as const) {
      const use = uses.find((u) => u.block.figure === id)!.block;
      let kept: unknown;
      let score: [number, number] | undefined;
      const first = FIGURES[id](memoCtx(undefined, (v) => (kept = v), (r, n) => (score = [r, n])), use.goal, use.options).node;
      // Answer every question with the first option.
      for (let i = 0; i < 40 && !score; i++) {
        (first.querySelector<HTMLButtonElement>('.floor-buttons button:not([disabled]), .answer-list button:not([disabled])'))?.click();
        (first.querySelector<HTMLButtonElement>('.actions .btn'))?.click();
      }
      expect(score, id).toBeDefined();
      let again: [number, number] | undefined;
      const handle = FIGURES[id](memoCtx(JSON.parse(JSON.stringify(kept)), () => {}, (r, n) => (again = [r, n])), use.goal, use.options);
      expect(again, `${id} same score`).toEqual(score);
      await handle.done;
    }
  });
});
