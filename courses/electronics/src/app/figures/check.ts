// A lesson's check: multiple-choice questions, one at a time. The questions
// are the block's `items` in the lesson JSON; asking them, keeping the answers
// for a reader who leaves part way, and the score are Didactics' check.ts.

import { check } from 'didactics/check';
import { shuffle } from 'didactics/rng';
import type { Question } from '../../core/lessons';

export const checkFigure = check((_ctx, options, rng) =>
  ((options?.items as Question[]) ?? []).map((q) => {
    // The right answer moves about, so it is never always the first.
    const order = shuffle(q.options.map((_, k) => k), rng);
    return { ask: q.question, choices: order.map((k) => q.options[k]), answer: order.indexOf(q.answer), why: q.why };
  }),
);
