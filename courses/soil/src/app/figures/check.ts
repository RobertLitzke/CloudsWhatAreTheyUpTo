// A lesson's check: multiple-choice questions, one at a time, each with a
// picture of its subject when it names one (a photo, or the drawing that
// stands in for it). The questions are the block's `items` in the lesson JSON;
// asking them, keeping the answers for a reader who leaves part way, and the
// score are Didactics' check.ts. The content test checks every question
// through `options` below (lessonProblems).

import { check } from 'didactics/check';
import type { Options } from 'didactics/figure';
import { makeRng, shuffle } from 'didactics/rng';
import type { Question } from '../../core/lessons';
import { isSubjectId } from '../../core/photos';
import { picture } from '../picture';

const items = (options: Options | undefined) => (options?.items ?? []) as Question[];

/** What is wrong with a check's questions, for the content test. */
function problems(options: Options | undefined): string[] {
  const qs = items(options);
  if (!qs.length) return ['has no questions'];
  return qs.flatMap((q) => [
    ...(q.answer >= 0 && q.answer < q.options.length ? [] : [`"${q.question}": answer ${q.answer} is not one of its options`]),
    ...(q.why.length > 10 ? [] : [`"${q.question}": says too little about why`]),
    ...(!q.picture || isSubjectId(q.picture) ? [] : [`"${q.question}": no subject "${q.picture}"`]),
  ]);
}

export const checkFigure = check((_ctx, options, rng) =>
  items(options).map((q) => {
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
  { options: problems },
);
