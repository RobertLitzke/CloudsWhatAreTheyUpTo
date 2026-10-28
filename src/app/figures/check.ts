// A lesson's check: multiple-choice questions, one at a time, each with a
// picture of its subject when it names one (a photo, or the drawing that
// stands in for it). The questions are the block's `items` in the lesson JSON;
// asking them, keeping the answers for a reader who leaves part way, and the
// score are Didactics' check.ts.

import { check } from 'didactics/check';
import { makeRng, shuffle } from 'didactics/rng';
import type { Question } from '../../core/lessons';
import { isSubjectId } from '../../core/photos';
import { picture } from '../picture';

export const checkFigure = check((_ctx, options, rng) =>
  ((options?.items as Question[]) ?? []).map((q) => {
    // The right answer moves about, so it is never always the first.
    const order = shuffle(q.options.map((_, k) => k), rng);
    // Drawn only when its question comes up, with its own seed so the same
    // photo comes back for a reader who returns.
    const seed = Math.floor(rng() * 2 ** 32);
    const subject = q.picture && isSubjectId(q.picture) ? q.picture : null;
    return {
      picture: subject ? () => picture(subject, makeRng(seed), q.question) : undefined,
      ask: q.question,
      choices: order.map((k) => q.options[k]),
      answer: order.indexOf(q.answer),
      why: q.why,
    };
  }),
);
