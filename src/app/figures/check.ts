// A lesson's check: multiple-choice questions, one at a time, each with a
// picture of its subject when it names one (a photo, or the drawing that
// stands in for it). The questions are the block's `items` in the lesson JSON.

import { el } from 'lesson-kit/dom';
import { makeRng, shuffle } from 'lesson-kit/rng';
import { freshSeed } from 'lesson-kit/ui';
import type { Question } from '../../core/lessons';
import { isSubjectId } from '../../core/photos';
import { picture } from '../picture';
import { quiz } from './kit';

export const checkFigure = quiz((ctx, t, options) => {
  const items = (options?.items as Question[]) ?? [];
  const rng = makeRng(freshSeed());
  const body = el('div');
  const node = el('div.fig-body.check', {}, body);
  let right = 0;
  let i = 0;
  const next = () => {
    if (i >= items.length) {
      body.replaceChildren(el('p.fig-readout', {}, `Done: ${right} of ${items.length} right.`));
      ctx.score(right, items.length);
      t.done();
      return;
    }
    const q = items[i];
    // The right answer moves about, so it is never always the first.
    const order = shuffle(q.options.map((_, k) => k), rng);
    const buttons = order.map((k) => {
      const b = el('button.btn.btn-ghost.wide', { type: 'button' }, q.options[k]) as HTMLButtonElement;
      b.addEventListener('click', () => {
        const good = k === q.answer;
        if (good) right++;
        buttons.forEach((x, j) => {
          x.disabled = true;
          if (order[j] === q.answer) x.classList.add('right');
        });
        if (!good) b.classList.add('wrong');
        body.append(
          el('div.verdict', { className: `verdict ${good ? 'good' : 'bad'}` }, el('p', {}, q.why)),
          el('div.actions', {}, el('span.count', {}, `${i + 1} / ${items.length}`), el('button.btn', { type: 'button', onclick: () => { i++; next(); } }, i === items.length - 1 ? 'Finish' : 'Next')),
        );
      });
      return b;
    });
    body.replaceChildren(
      q.picture && isSubjectId(q.picture) ? picture(q.picture, rng, q.question) : '',
      el('p.task', {}, q.question),
      el('div.answer-list', {}, buttons),
    );
  };
  next();
  return node;
});
