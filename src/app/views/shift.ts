// A lesson, read as an illustrated workbook chapter on paper: a sky at the
// top, then the lesson's parts one after another. Each part is paragraphs and
// live figures from app/figures. The next part opens once every task in this
// one is done, so the lesson is read in order the first time; a finished
// lesson opens in full. The last part is the check, and its score goes into
// the log at the end.
//
// With the radio on, talks with Walla Walla (core/talk.ts) come up over the
// page as it is read: one as the lesson opens, one or two as figures are
// done, and one in the check, once the photos are called and before the
// townsfolk's forecast questions, which wait for it to close. They play only
// the first time through.

import { genus } from '../../core/clouds';
import { finishShift } from '../../core/save';
import { SHIFTS, shiftById, type Block, type FigureId, type Part, type Shift } from '../../core/shifts';
import { el } from '../dom';
import { FIGURES } from '../figures';
import { prose, type FigureContext } from '../figures/kit';
import type { View } from '../router';
import { addToSky, placeCloud, SKY_SPOTS } from '../scene/drawn';
import { makeScene, W } from '../scene/landscape';
import { getSave, updateSave } from '../store';
import { cueKey, radioFor, type Cue } from '../../core/talk';
import { clearRadio, playTalk } from '../radio';

/** The sky over the fields, with the clouds this lesson is about. */
function hero(shift: Shift): HTMLElement {
  const scene = makeScene({ time: shift.n % 2 ? 'dawn' : 'day', seed: 10 + shift.n, sun: [0.78, 0.62] });
  const xs = shift.sky.length === 1 ? [W * 0.55] : shift.sky.map((_, i) => 70 + (i * (W - 140)) / (shift.sky.length - 1));
  shift.sky.forEach((id, i) => {
    const spot = SKY_SPOTS[id];
    addToSky(scene.sky, placeCloud(id, scene.palette, xs[i], spot.y, spot.scale, i + shift.n));
  });
  return el('div.article-hero', {}, scene.root);
}

function renderBlock(block: Block, ctx: FigureContext, tasks: Promise<void>[], onDone: (figure: string) => void): HTMLElement {
  switch (block.kind) {
    case 'text':
      return prose(block.text);
    case 'key':
      return el('section.key-ideas', {}, el('p.key-title', {}, block.title), el('ul', {}, ...block.points.map((p) => el('li', {}, prose(p)))));
    case 'figure': {
      const handle = FIGURES[block.figure](ctx, block.goal, block.options);
      const status = block.task ? el('p.fig-task', {}, el('span.tick', { 'aria-hidden': 'true' }), block.task) : null;
      // The caption opens the figure's one text box, above what the figure is
      // showing now; a still or a quiz has no live text, so it gets a box of its own.
      const caption = el('p.fig-lead', {}, block.caption);
      const box = handle.node.querySelector('.fig-text');
      if (box) box.prepend(caption);
      const fig = el('figure.fig', { 'data-figure': block.figure }, status, handle.node, box ? null : el('div.fig-text', {}, caption));
      if (handle.done) {
        tasks.push(handle.done);
        void handle.done.then(() => {
          fig.classList.add('done');
          onDone(block.figure);
        });
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
  const closed = new AbortController();
  const save = getSave();
  const replay = save.shifts[shift.id]?.done === true;
  const score = { right: 0, of: 0 };
  const radio = radioFor(shift.id);
  const talking = save.talk && !replay;
  /** Put on the radio whatever talk waits for this cue, once. */
  const cue = (c: Cue) => {
    if (!talking || !alive) return;
    for (const t of radio.talks) {
      if (t.cue !== 'check' && cueKey(t.cue) === cueKey(c) && !getSave().heard[t.id]) void playTalk(t);
    }
  };
  /** Talks cued by a finished figure, held until the reader presses Continue, so they have read the text after it first. */
  const held: Cue[] = [];
  const release = () => held.splice(0).forEach(cue);
  /** The check's talk, if the radio is on and it has not been heard. */
  const checkTalk = () => (talking ? radio.talks.find((t) => t.cue === 'check' && !getSave().heard[t.id]) : undefined);
  const ctx: FigureContext = {
    save,
    local: (id) => (save.talk ? radio.locals[id] : undefined),
    closed: closed.signal,
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
        el('a.back', { href: '#/home', 'aria-label': 'Back home' }, '‹'),
        el('div', {}, el('p.eyebrow', {}, `Lesson ${shift.n}`), el('h1', {}, shift.title)),
        progress,
      ),
      hero(shift),
      el('div.paper', {},
        el('div.article-intro', {},
          el('p.eyebrow', {}, `Lesson ${shift.n} of ${SHIFTS.length}`),
          el('h1.poster-type', {}, shift.title),
          el('p.lede', {}, shift.teaches + '.'),
          shift.clouds.length ? el('ul.meet', {}, shift.clouds.map((id) => el('li', {}, genus(id).name))) : null,
        ),
        article,
      ),
    ),
  );

  const renderPart = (part: Part, i: number): Promise<void> => {
    const tasks: Promise<void>[] = [];
    const render = (b: Block) => renderBlock(b, ctx, tasks, (figure) => held.push({ after: figure as FigureId }));
    const section = el('section.part', {}, el('h2', {}, el('span.part-n', {}, String(i + 1)), part.title));
    article.append(section);
    // In the check, the forecasts wait for the photos to be done and the
    // check talk to close, so two quizzes never run at once.
    const talk = i === shift.parts.length - 1 ? checkTalk() : undefined;
    const split = part.blocks.findIndex((b) => b.kind === 'figure' && b.figure === 'forecast');
    if (!talk || split < 0) {
      section.append(...part.blocks.map(render));
      return Promise.all(tasks).then(() => undefined);
    }
    section.append(...part.blocks.slice(0, split).map(render));
    return Promise.all(tasks)
      .then(() => (alive ? playTalk(talk) : false))
      .then(() => {
        if (!alive) return;
        const before = tasks.length;
        section.append(...part.blocks.slice(split).map(render));
        return Promise.all(tasks.slice(before)).then(() => undefined);
      });
  };

  /** A button at the end of a part, enabled once its tasks are done. */
  const gate = (ready: Promise<void>, last: boolean): Promise<void> => {
    const btn = el('button.btn.btn-big', { type: 'button', disabled: true }, last ? 'Write up the log' : 'Continue') as HTMLButtonElement;
    const hint = el('p.gate-hint', {}, 'Finish the tasks above to go on.');
    const box = el('div.gate', {}, hint, btn);
    article.append(box);
    void ready.then(() => {
      btn.disabled = false;
      hint.textContent = last ? 'Check done.' : 'Done. On to the next part.';
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
        el('p.eyebrow', {}, `Lesson ${shift.n} log`),
        el('h2', {}, shift.title),
        score.of ? el('p.score', {}, `${save.talk ? 'Radio check' : 'Check'}: ${score.right} of ${score.of} right`) : null,
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
      cue('start');
      for (const [i, part] of shift.parts.entries()) {
        reached(i);
        const ready = renderPart(part, i);
        if (i > 0) article.lastElementChild!.scrollIntoView({ behavior: 'smooth', block: 'start' });
        await gate(ready, i === shift.parts.length - 1);
        if (!alive) return;
        release();
      }
    }
    if (!alive) return;
    reached(total);
    renderLog();
  })();

  return () => {
    alive = false;
    closed.abort();
    clearRadio();
  };
};
