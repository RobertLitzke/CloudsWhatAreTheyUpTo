// A training shift, read as an illustrated article on paper: a view from the
// tower at the top, then the shift's parts one after another. Each part is
// paragraphs, words from Juniper over the radio, and live figures from
// app/figures. The next part opens once every task in this one is done, so the
// lesson is read in order the first time; a finished shift opens in full. The
// last part is the radio check, and its score goes into the log at the end.

import { genus } from '../../core/clouds';
import { finishShift } from '../../core/save';
import { shiftById, type Block, type Part, type Shift } from '../../core/shifts';
import { el, svg } from '../dom';
import { FIGURES } from '../figures';
import { prose, type FigureContext } from '../figures/kit';
import type { View } from '../router';
import { placeCloud, SKY_SPOTS } from '../scene/drawn';
import { makeScene, W } from '../scene/landscape';
import { getSave, updateSave } from '../store';

const WHO = { juniper: 'Juniper · District', you: 'You · Anvil Peak' } as const;

function radioIcon(): SVGElement {
  return svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' },
    svg('rect', { x: 6, y: 7, width: 12, height: 15, rx: 2 }),
    svg('line', { x1: 9, y1: 7, x2: 7, y2: 1 }),
    svg('rect', { x: 8.5, y: 9.5, width: 7, height: 4, rx: 0.5, class: 'screen' }),
    svg('circle', { cx: 12, cy: 18, r: 1.8, class: 'screen' }),
  );
}

/** The view from the tower, with the clouds this shift is about. */
function hero(shift: Shift): HTMLElement {
  const scene = makeScene({ time: shift.n % 2 ? 'dawn' : 'day', seed: 10 + shift.n, sun: [0.78, 0.62] });
  const xs = shift.clouds.length === 1 ? [W * 0.55] : shift.clouds.map((_, i) => 70 + (i * (W - 140)) / (shift.clouds.length - 1));
  shift.clouds.forEach((id, i) => {
    const spot = SKY_SPOTS[id];
    scene.sky.append(placeCloud(id, scene.palette, xs[i], spot.y, spot.scale, i + shift.n));
  });
  return el('div.article-hero', {}, scene.root);
}

function renderBlock(block: Block, ctx: FigureContext, tasks: Promise<void>[]): HTMLElement {
  switch (block.kind) {
    case 'text':
      return prose(block.text);
    case 'radio':
      return el('aside.radio-call', { className: `radio-call ${block.who}` },
        el('div.radio-icon', {}, radioIcon()),
        el('div', {}, el('p.who', {}, WHO[block.who]), prose(block.text)));
    case 'figure': {
      const handle = FIGURES[block.figure](ctx, block.goal, block.options);
      const status = block.task ? el('p.fig-task', {}, el('span.tick', { 'aria-hidden': 'true' }), block.task) : null;
      const fig = el('figure.fig', {}, status, handle.node, el('figcaption', {}, block.caption));
      if (handle.done) {
        tasks.push(handle.done);
        void handle.done.then(() => fig.classList.add('done'));
      }
      return fig;
    }
  }
}

export const shiftView: View = (root, nav) => {
  const shift = shiftById(nav.params.id);
  if (!shift) {
    nav.replace('/home');
    return;
  }
  let alive = true;
  const save = getSave();
  const replay = save.shifts[shift.id]?.done === true;
  const score = { right: 0, of: 0 };
  const ctx: FigureContext = {
    save,
    alive: () => alive,
    score: (right, of) => {
      score.right += right;
      score.of += of;
    },
  };

  const progress = el('div.article-progress', {}, el('i'));
  const bar = progress.firstElementChild as HTMLElement;
  const article = el('article.article');
  const total = shift.parts.length + 1;
  const reached = (n: number) => (bar.style.width = `${(100 * n) / total}%`);

  root.append(
    el('div.shift', {},
      el('header.shift-head', {},
        el('a.back', { href: '#/home', 'aria-label': 'Back to the lookout' }, '‹'),
        el('div', {}, el('p.eyebrow', {}, `Shift ${shift.n} · Anvil Peak`), el('h1', {}, shift.title)),
        progress,
      ),
      hero(shift),
      el('div.paper', {},
        el('div.article-intro', {},
          el('p.eyebrow', {}, `Training shift ${shift.n} of 5`),
          el('h1.poster-type', {}, shift.title),
          el('p.lede', {}, shift.teaches + '.'),
          el('ul.meet', {}, shift.clouds.map((id) => el('li', {}, genus(id).name))),
        ),
        article,
      ),
    ),
  );

  const renderPart = (part: Part, i: number): Promise<void> => {
    const tasks: Promise<void>[] = [];
    const section = el('section.part', {},
      el('h2', {}, el('span.part-n', {}, String(i + 1)), part.title),
      part.blocks.map((b) => renderBlock(b, ctx, tasks)));
    article.append(section);
    return Promise.all(tasks).then(() => undefined);
  };

  /** A button at the end of a part, enabled once its tasks are done. */
  const gate = (ready: Promise<void>, last: boolean): Promise<void> => {
    const btn = el('button.btn.btn-big', { type: 'button', disabled: true }, last ? 'Write up the log' : 'Continue') as HTMLButtonElement;
    const hint = el('p.gate-hint', {}, 'Finish the tasks above to go on.');
    const box = el('div.gate', {}, hint, btn);
    article.append(box);
    void ready.then(() => {
      btn.disabled = false;
      hint.textContent = last ? 'Radio check done.' : 'Done. On to the next part.';
    });
    return new Promise((resolve) => btn.addEventListener('click', () => {
      box.remove();
      resolve();
    }));
  };

  const renderLog = () => {
    const name = el('input.sign', { type: 'text', maxLength: 40, placeholder: 'Your name', value: save.name, 'aria-label': 'Your name' }) as HTMLInputElement;
    const sign = el('button.btn.btn-big', { type: 'button' }, 'Sign the log') as HTMLButtonElement;
    const section = el('section.part.log', {},
      el('div.logbook', {},
        el('p.eyebrow', {}, `Shift ${shift.n} log · Anvil Peak`),
        el('h2', {}, shift.title),
        score.of ? el('p.score', {}, `Radio check: ${score.right} of ${score.of} called right`) : null,
        el('ul', {}, shift.learned.map((l) => el('li', {}, l))),
        el('p.next', {}, shift.next),
        el('label', {}, 'Signed, ', name),
      ),
      el('div.gate', {}, sign),
    );
    article.append(section);
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    sign.addEventListener('click', () => {
      updateSave((s) => ({ ...finishShift(s, shift.id, score.right, score.of, shift.journal, new Date()), name: name.value.trim() || s.name }));
      nav.navigate('/home');
    });
  };

  void (async () => {
    if (replay) {
      // Everything at once; only the radio check (the last part) gates the log.
      let last: Promise<void> = Promise.resolve();
      shift.parts.forEach((p, i) => (last = renderPart(p, i)));
      reached(total - 1);
      await gate(last, true);
    } else {
      for (const [i, part] of shift.parts.entries()) {
        reached(i);
        const ready = renderPart(part, i);
        if (i > 0) article.lastElementChild!.scrollIntoView({ behavior: 'smooth', block: 'start' });
        await gate(ready, i === shift.parts.length - 1);
        if (!alive) return;
      }
    }
    if (!alive) return;
    reached(total);
    renderLog();
  })();

  return () => {
    alive = false;
  };
};
