// A lesson, read as an illustrated workbook chapter on paper, in the manner of
// an interactive explainer: a picture at the top, then the lesson's parts one
// after another, each paragraphs and live figures. The next part opens once
// every task in this one is done, so the lesson is read in order the first
// time; a finished lesson opens in full. The last part is the check, and its
// score goes into the log at the end, which the reader signs.
//
// A lesson's words live in a JSON file (the Lesson shape below, less what the
// app adds), so they can be edited outside the code. Text takes a little
// markup (see prose): **bold**, *italic*, and [[words|colour]] to tie a word
// to the same colour in a figure.
//
// With a radio (radio.ts, slip.ts) and the reader's radio setting on, a talk
// comes on as the lesson opens and another once the check is done, before the
// log can be written up. They play only the first time through.

import { el, type Child } from './dom';
import type { FigureContext, FigureFactory } from './figure';
import { finishLesson, type Progress } from './progress';
import type { Cue, Talk } from './radio';
import type { View } from './router';
import type { Store } from './store';

export type Block<F extends string = string> =
  /** A paragraph of the article. */
  | { kind: 'text'; text: string }
  /** The few ideas to hold on to, as a short list set apart from the article. */
  | { kind: 'key'; title: string; points: string[] }
  /** A live figure. `task` says what to do with it; `goal` tells the figure when it is done. */
  | { kind: 'figure'; figure: F; caption: string; task?: string; goal?: string; options?: Record<string, unknown> };

export interface Part<F extends string = string> {
  title: string;
  blocks: Block<F>[];
}

export interface Lesson<F extends string = string> {
  id: string;
  /** Its number in the series, from 1. */
  n: number;
  title: string;
  /** One line for the lesson board, and the lede under the title. */
  teaches: string;
  parts: Part<F>[];
  /** What was learned, written into the log. */
  learned: string[];
  /** A line at the foot of the log, on what comes next. */
  next: string;
  /** Journal entries this lesson unlocks. */
  journal: string[];
}

/**
 * A paragraph of lesson text. **bold**, *italic*, and [[words|key]] in the
 * colour `palette[key]` (the ink colour, `palette.ink`, for a key it lacks).
 */
export function prose(text: string, palette: Readonly<Record<string, string>>): HTMLElement {
  const p = el('p');
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[\[(.+?)\|(\w+)\]\]/g;
  let at = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > at) p.append(text.slice(at, m.index));
    if (m[1]) p.append(el('b', {}, m[1]));
    else if (m[2]) p.append(el('i', {}, m[2]));
    else p.append(el('b.tint', { style: `color: ${palette[m[4]] ?? palette.ink}` }, m[3]));
    at = m.index! + m[0].length;
  }
  if (at < text.length) p.append(text.slice(at));
  return p;
}

export interface LessonViewOptions<L extends Lesson, S extends Progress> {
  lessons: readonly L[];
  figures: Readonly<Record<string, FigureFactory>>;
  store: Store<S>;
  /** Turns a paragraph's markup into a node; usually prose with the app's palette. */
  prose: (text: string) => HTMLElement;
  /** The picture over the paper, at the top of the lesson. */
  hero?: (lesson: L) => Child;
  /** More under the lede, such as the names a lesson introduces. */
  intro?: (lesson: L) => Child;
  /** The lesson's radio talks, and the slip to play them on. */
  radio?: { talks: (lessonId: string) => readonly Talk[]; play: (talk: Talk) => Promise<boolean>; clear: () => void };
  /** Where the back arrow and signing the log go. Default /home. */
  home?: string;
  /** What a lesson is called in the headings. Default "Lesson". */
  noun?: string;
}

/** The view for a route like /lesson/:id. */
export function lessonView<L extends Lesson, S extends Progress>(o: LessonViewOptions<L, S>): View {
  const home = o.home ?? '/home';
  const noun = o.noun ?? 'Lesson';

  function renderBlock(block: Block, ctx: FigureContext, tasks: Promise<void>[]): HTMLElement {
    switch (block.kind) {
      case 'text':
        return o.prose(block.text);
      case 'key':
        return el('section.key-ideas', {}, el('p.key-title', {}, block.title), el('ul', {}, ...block.points.map((p) => el('li', {}, o.prose(p)))));
      case 'figure': {
        const handle = o.figures[block.figure](ctx, block.goal, block.options);
        const status = block.task ? el('p.fig-task', {}, el('span.tick', { 'aria-hidden': 'true' }), block.task) : null;
        // The caption opens the figure's one text box, above what the figure is
        // showing now; a still or a quiz has no live text, so it gets a box of its own.
        const caption = el('p.fig-lead', {}, block.caption);
        const box = handle.node.querySelector('.fig-text');
        if (box) box.prepend(caption);
        const fig = el('figure.fig', { 'data-figure': block.figure }, status, handle.node, box ? null : el('div.fig-text', {}, caption));
        if (handle.done) {
          tasks.push(handle.done);
          void handle.done.then(() => fig.classList.add('done'));
        }
        return fig;
      }
    }
  }

  return (root, nav) => {
    const lesson = o.lessons.find((l) => l.id === nav.params.id);
    if (!lesson) {
      nav.replace(home);
      return;
    }
    let alive = true;
    const closed = new AbortController();
    const save = o.store.get();
    const replay = save.lessons[lesson.id]?.done === true;
    const score = { right: 0, of: 0 };
    const talks = o.radio?.talks(lesson.id) ?? [];
    const talking = Boolean(o.radio) && save.talk && !replay;
    /** The talk on this cue, if the radio is on and it has not been heard. */
    const waiting = (c: Cue) => (talking ? talks.find((t) => t.cue === c && !o.store.get().heard[t.id]) : undefined);
    const ctx: FigureContext = {
      save,
      closed: closed.signal,
      score: (right, of) => {
        score.right += right;
        score.of += of;
      },
    };

    const progress = el('div.article-progress', {}, el('i'));
    const bar = progress.firstElementChild as HTMLElement;
    const article = el('article.article');
    const total = lesson.parts.length + 1;
    const reached = (n: number) => (bar.style.width = `${(100 * n) / total}%`);

    root.append(
      el('div.lesson', {},
        el('header.lesson-head', {},
          el('a.back', { href: `#${home}`, 'aria-label': 'Back home' }, '‹'),
          el('div', {}, el('p.eyebrow', {}, `${noun} ${lesson.n}`), el('h1', {}, lesson.title)),
          progress,
        ),
        o.hero ? el('div.article-hero', {}, o.hero(lesson)) : null,
        el('div.paper', {},
          el('div.article-intro', {},
            el('p.eyebrow', {}, `${noun} ${lesson.n} of ${o.lessons.length}`),
            el('h1.poster-type', {}, lesson.title),
            el('p.lede', {}, lesson.teaches + '.'),
            o.intro?.(lesson),
          ),
          article,
        ),
      ),
    );

    const renderPart = (part: Part, i: number): Promise<void> => {
      const tasks: Promise<void>[] = [];
      const section = el('section.part', {}, el('h2', {}, el('span.part-n', {}, String(i + 1)), part.title));
      article.append(section);
      section.append(...part.blocks.map((b) => renderBlock(b, ctx, tasks)));
      const done = Promise.all(tasks).then(() => undefined);
      // The quiz on the radio comes once the check is done, and the log waits for it.
      const quiz = i === lesson.parts.length - 1 ? waiting('check') : undefined;
      return quiz ? done.then(() => (alive ? o.radio!.play(quiz) : false)).then(() => undefined) : done;
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

    /** The log: what was learned, the check's score, and a line to sign. */
    const renderLog = () => {
      const name = el('input.sign', { type: 'text', maxLength: 40, placeholder: 'Your name', value: save.name, 'aria-label': 'Your name' }) as HTMLInputElement;
      const sign = el('button.btn.btn-big', { type: 'button' }, 'Sign the log') as HTMLButtonElement;
      const section = el('section.part.log', {},
        el('div.logbook', {},
          el('p.eyebrow', {}, `${noun} ${lesson.n} log`),
          el('h2', {}, lesson.title),
          score.of ? el('p.score', {}, `${o.radio && save.talk ? 'Radio check' : 'Check'}: ${score.right} of ${score.of} right`) : null,
          el('ul', {}, lesson.learned.map((l) => el('li', {}, l))),
          el('p.next', {}, lesson.next),
          el('label', {}, 'Signed, ', name),
        ),
        el('div.gate', {}, sign),
      );
      article.append(section);
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      sign.addEventListener('click', () => {
        o.store.update((s) => ({ ...finishLesson(s, lesson.id, score.right, score.of, lesson.journal, new Date()), name: name.value.trim() || s.name }));
        nav.navigate(home);
      });
    };

    void (async () => {
      if (replay) {
        // Everything at once; only the check (the last part) gates the log.
        let last: Promise<void> = Promise.resolve();
        lesson.parts.forEach((p, i) => (last = renderPart(p, i)));
        reached(total - 1);
        await gate(last, true);
      } else {
        const opening = waiting('start');
        if (opening) void o.radio!.play(opening);
        for (const [i, part] of lesson.parts.entries()) {
          reached(i);
          const ready = renderPart(part, i);
          if (i > 0) article.lastElementChild!.scrollIntoView({ behavior: 'smooth', block: 'start' });
          await gate(ready, i === lesson.parts.length - 1);
        }
      }
      if (!alive) return;
      reached(total);
      renderLog();
    })();

    return () => {
      alive = false;
      closed.abort();
      o.radio?.clear();
    };
  };
}

/**
 * What is wrong with a set of lessons and the figures they use, for an app's
 * content test: a figure that does not exist, a goal its figure would never
 * meet, or a task on a live figure with no goal (the lesson would stall).
 */
export function lessonProblems(lessons: readonly Lesson[], figures: Readonly<Record<string, FigureFactory>>): string[] {
  const out: string[] = [];
  for (const l of lessons) {
    for (const p of l.parts) {
      for (const b of p.blocks) {
        if (b.kind !== 'figure') continue;
        const f = figures[b.figure];
        if (!f) out.push(`${l.id}: no figure "${b.figure}"`);
        else if (b.goal && !f.goals?.includes(b.goal)) out.push(`${l.id}: ${b.figure} does not know the goal "${b.goal}"`);
        else if (b.task && !b.goal && !f.quiz) out.push(`${l.id}: ${b.figure} has a task but no goal`);
      }
    }
  }
  return out;
}
