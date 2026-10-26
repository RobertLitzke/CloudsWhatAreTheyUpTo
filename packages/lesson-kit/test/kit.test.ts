// @vitest-environment happy-dom
// lesson-kit stands on its own: nothing in it reaches into an app, and a lesson
// app made of nothing but a JSON-shaped lesson and one figure runs.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { el } from '../src/dom';
import { figure, frame, quiz, slider } from '../src/figure';
import { lessonProblems, lessonView, prose, type Lesson } from '../src/lesson';
import { emptyProgress, finishLesson, migrateProgress } from '../src/progress';
import { deal, review, tally } from '../src/quiz';
import { makeRng } from '../src/rng';
import { createStore } from '../src/store';

const SRC = resolve(__dirname, '../src');

describe('lesson-kit', () => {
  it('imports only itself and its build tools', () => {
    for (const f of readdirSync(SRC)) {
      for (const [, from] of readFileSync(resolve(SRC, f), 'utf8').matchAll(/from '([^']+)'/g)) {
        expect(from.startsWith('./') || /^(node:|vite|virtual:pwa-register)/.test(from), `${f} imports ${from}`).toBe(true);
      }
    }
  });

  it('migrates junk to an empty save and keeps the best score', () => {
    expect(migrateProgress('x')).toEqual(emptyProgress());
    const once = finishLesson(emptyProgress(), 'a', 3, 4, ['j'], new Date('2026-01-02'));
    const worse = finishLesson(once, 'a', 1, 4, [], new Date('2026-02-02'));
    expect(worse.lessons.a).toEqual({ done: true, best: 3, of: 4, finishedAt: '2026-01-02' });
    expect(migrateProgress(JSON.parse(JSON.stringify(worse)))).toEqual(worse);
  });

  it('schedules cards further apart as they are got right', () => {
    const deck = [{ id: 'c1', question: '?', options: ['yes', 'no'], why: '' }];
    const s1 = review(undefined, true, 0);
    expect(review(s1, true, 0).due).toBeGreaterThan(s1.due);
    expect(tally(deck, {}, 0).fresh).toBe(1);
    expect(deal(deck, {}, 0, 5, 5, makeRng(1))).toHaveLength(1);
  });

  it('runs a lesson made of one paragraph and one figure', async () => {
    globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;
    const push = figure(['far'], (_ctx, t) => {
      const f = frame(200, 100, 2);
      f.controls.append(slider('Push', 0, 10, 1, 0, String, (v) => v >= 8 && t.done()).node);
      return f.node;
    });
    const check = quiz((ctx, t) => el('button', { onclick: () => { ctx.score(1, 1); t.done(); } }, 'Answer'));
    const lessons: Lesson[] = [{
      id: 'push', n: 1, title: 'Pushing', teaches: 'What a push does', learned: ['Pushes move things'], next: 'Next: pulling.', journal: [],
      parts: [
        { title: 'Push', blocks: [{ kind: 'text', text: 'A **push** in [[red|warm]].' }, { kind: 'figure', figure: 'push', caption: 'A block', task: 'Push it far', goal: 'far' }] },
        { title: 'Check', blocks: [{ kind: 'figure', figure: 'check', caption: 'One question', task: 'Answer' }] },
      ],
    }];
    const figures = { push, check };
    expect(lessonProblems(lessons, figures)).toEqual([]);
    expect(lessonProblems(lessons, { push })).toEqual(['push: no figure "check"']);

    const store = createStore({ key: 'test', empty: emptyProgress, migrate: migrateProgress });
    const root = el('div');
    const view = lessonView({ lessons, figures, store, prose: (t) => prose(t, { ink: '#000', warm: '#c00' }) });
    view(root, { params: { id: 'push' }, navigate: () => {}, replace: () => {} });
    expect(root.querySelector('.part b.tint')?.getAttribute('style')).toContain('#c00');
    const input = root.querySelector('input[type=range]') as HTMLInputElement;
    input.value = '9';
    input.dispatchEvent(new Event('input'));
    await new Promise((r) => setTimeout(r));
    expect(root.querySelector('.fig.done')).not.toBeNull();
    (root.querySelector('.gate button') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    (root.querySelector('[data-figure=check] button') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    (root.querySelector('.gate button') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    expect(root.querySelector('.logbook .score')?.textContent).toBe('Check: 1 of 1 right');
  });
});
