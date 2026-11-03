// A lesson's check: its questions are the block's `items` in the lesson JSON.
// Asking them, keeping the answers for a reader who leaves part way, and the
// score are Didactics' check.ts.

import { check } from 'didactics/check';
import type { Options } from 'didactics/figure';
import { shuffle } from 'didactics/rng';

export interface Question {
  ask: string;
  choices: string[];
  /** Which of `choices` is right, from 0. */
  answer: number;
  why: string;
}

const items = (o: Options | undefined) => (o?.items ?? []) as Question[];

function problems(o: Options | undefined): string[] {
  const qs = items(o);
  if (!qs.length) return ['has no questions'];
  return qs.flatMap((q) => [
    ...(typeof q.ask === 'string' && q.ask ? [] : ['a question with no "ask"']),
    ...(Array.isArray(q.choices) && q.choices.length >= 2 ? [] : [`"${q.ask}": needs two or more choices`]),
    ...(q.answer >= 0 && q.answer < (q.choices?.length ?? 0) ? [] : [`"${q.ask}": answer ${q.answer} is not one of its choices`]),
    ...(typeof q.why === 'string' && q.why.length > 10 ? [] : [`"${q.ask}": says too little about why`]),
  ]);
}

export const checkFigure = check(
  (_ctx, options, rng) =>
    items(options).map((q) => {
      // The right answer moves about, so it is never always the first.
      const order = shuffle(q.choices.map((_, k) => k), rng);
      return {
        ask: q.ask,
        choices: order.map((k) => q.choices[k]),
        answer: order.indexOf(q.answer),
        why: q.why,
      };
    }),
  { options: problems },
);
