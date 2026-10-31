// A lesson's check: multiple-choice questions, one at a time, each with a
// picture of its subject when it names one (a photo, or the drawing that
// stands in for it). The questions are the block's `items` in the lesson JSON;
// asking them, keeping the answers for a reader who leaves part way, the
// score, and keeping each answered question for review are Didactics' check.ts.

import { check } from 'didactics/check';
import { makeRng, shuffle } from 'didactics/rng';
import type { Question } from '../../core/lessons';
import { isSubjectId } from '../../core/photos';
import { picture } from '../picture';
import type { Options } from './kit';

export const checkFigure = check((_ctx, options, rng) =>
  ((options?.items ?? []) as Question[]).map((q) => {
    // The right answer moves about, so it is never always the first.
    const order = shuffle(q.options.map((_, k) => k), rng);
    // Drawn only when its question comes up, with its own seed so the same
    // picture comes back for a reader who returns.
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
  { options: checkOptions },
);

/** What is wrong with a check's questions: none at all, an answer that is not one of the options, a short why, or a picture of nothing. */
function checkOptions(o: Options | undefined): string[] {
  const items = (o?.items ?? []) as Question[];
  if (!items.length) return ['a check needs questions in "items"'];
  return items.flatMap((q) => [
    ...(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length ? [] : [`"${q.question}": answer ${q.answer} is not one of its ${q.options.length} options`]),
    ...(q.why?.length > 10 ? [] : [`"${q.question}": needs a why`]),
    ...(q.picture === undefined || isSubjectId(q.picture) ? [] : [`"${q.question}": no subject "${q.picture}"`]),
  ]);
}
