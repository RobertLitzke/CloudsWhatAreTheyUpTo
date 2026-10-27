// The fields at dusk, and the lessons as a tree: the trunk of training, the
// branches that fork off it, and the cloud-seeding lesson hung off the end.
// With the radio on, the page tells the story and the opening talk plays the
// first time.

import { BRANCHES, TREE_LESSONS } from '../../core/shifts';
import { el } from 'lesson-kit/dom';
import { passed, skipLesson } from 'lesson-kit/progress';
import { resumeFor } from 'lesson-kit/resume';
import type { View } from 'lesson-kit/router';
import { nextLesson, treeView, type TreeNode } from 'lesson-kit/tree';
import { placeCloud } from '../scene/drawn';
import { makeScene } from '../scene/landscape';
import { getSave, updateSave } from '../store';
import { INTRO } from '../../core/talk';
import { clearRadio, playTalk } from '../radio';

export const homeView: View = (root, nav) => {
  const save = getSave();
  // Cropped from the left on a phone, so the town and the sun stay in view.
  const scene = makeScene({ time: 'dusk', seed: 11, sun: [0.36, 0.7], align: 'xMinYMax' });
  const p = scene.palette;
  scene.sky.append(
    // Banks of heaped cloud catching the last light, as on the poster.
    placeCloud('cirrus', p, 120, 138, 0.6, 3),
    placeCloud('altocumulus', p, 300, 120, 0.6, 5),
    placeCloud('cumulus', p, 170, 180, 1.7, 8),
    placeCloud('cumulus', p, 28, 186, 1.1, 4),
    placeCloud('cumulus', p, 330, 184, 1.3, 9),
  );

  type Item = (typeof TREE_LESSONS)[number];
  const nextUp = nextLesson(TREE_LESSONS, save) as Exclude<Item, { coming: true }> | undefined;
  const trained = passed(save, 'local-sky');
  /** Started, left part way, and still there to pick up. */
  const started = (s: Item) => !('coming' in s) && !save.lessons[s.id]?.done && resumeFor(save.resume, s.id, s) !== undefined;
  const names = (ls: readonly Item[]) => ls.map((l) => `Lesson ${l.n}`).join(' and ');

  const card = ({ lesson: s, state, missing, wanting }: TreeNode<Item>) => {
    const rec = save.lessons[s.id];
    const go = rec?.done ? 'Again' : started(s) ? 'Continue' : 'Start';
    const status = state === 'done' && rec ? `${save.talk ? 'Radio check' : 'Check'}: ${rec.best} of ${rec.of}`
      : state === 'skipped' ? 'Skipped'
        : state === 'coming' ? 'Coming'
          : state === 'locked' ? `After ${names(missing)}`
            : state === 'soft' ? `Better after ${names(wanting)}`
              : null;
    const open = state !== 'locked' && state !== 'coming';
    return el('div.shift-card', { className: `shift-card ${state === 'next' ? 'next' : ''}` },
      el('div', {}, el('h3', {}, s.title), el('p', {}, s.teaches), status ? el('p.score', {}, status) : null),
      open ? el('div.shift-actions', {},
        el('a.btn', { href: `#/shift/${s.id}` }, go),
        state === 'next' ? el('button.btn.btn-ghost.btn-small', { type: 'button', onclick: () => { updateSave((v) => skipLesson(v, s.id)); nav.replace('/home'); } }, 'Skip') : null,
      ) : null,
    );
  };

  root.append(
    el(
      'div.home',
      {},
      el(
        'section.hero',
        {},
        scene.root,
        el(
          'div.hero-text',
          {},
          el('p.eyebrow', {}, save.talk ? `Harrow, Adams County, Washington · ${trained ? 1946 : 1931}` : 'A cloud workbook'),
          el('h1.poster-type', {}, 'Clouds'),
          el('p.subtitle.poster-type', {}, 'What are they up to?'),
        ),
      ),
      el(
        'section.page',
        {},
        el(
          'div.letter',
          {},
          save.name ? el('p', {}, `Welcome back, ${save.name}.`) : null,
          ...(save.talk
            ? [
                el('p', {}, 'It is 1931, and you are the new weather forecaster in Harrow, a wheat town in the dry hills of eastern Washington.'),
                el('p', {}, 'An old hand at Walla Walla, a few counties over, will come on the radio as you start each lesson, and quiz you at the end.'),
              ]
            : [el('p', {}, 'Short lessons on what a cloud is made of, how to name every kind, and what each one says about the weather to come. Branches fork off the main line for weather further afield, and the last lesson is on cloud seeding.')]),
        ),
        nextUp ? el('a.btn.btn-big', { href: `#/shift/${nextUp.id}` }, started(nextUp) ? `Continue lesson ${nextUp.n}: ${nextUp.title}` : nextUp.n === 1 && !save.lessons[nextUp.id] ? 'Start the first lesson' : `Lesson ${nextUp.n}: ${nextUp.title}`) : null,
        el('h2', {}, 'Lessons'),
        treeView({ lessons: TREE_LESSONS, branches: BRANCHES, save, card, remember: 'clouds.tree' }),
        // Open from the start: the natural skies can be made as soon as their
        // clouds are met; the seeding orders wait on the cloud-seeding lesson.
        el(
          'div.seeding',
          { className: 'seeding open' },
          el('h2', {}, 'The forecast desk: make the sky'),
          el('p', {}, 'Set the heat, the moisture and what lifts the air, and make the skies on the list. The orders marked Seed are for after the cloud-seeding lesson.'),
          el('a.btn', { href: '#/seed' }, 'Take the orders'),
        ),
      ),
    ),
  );

  // The opening talk, once, after the poster has had its moment. Turning the
  // radio off in it redraws the page without the story.
  let timer = 0;
  if (save.talk && !save.introSeen) {
    timer = window.setTimeout(() => {
      updateSave((s) => ({ ...s, introSeen: true }));
      void playTalk(INTRO).then((heard) => {
        if (heard && !getSave().talk) nav.replace('/home');
      });
    }, 1800);
  }
  return () => {
    clearTimeout(timer);
    clearRadio();
  };
};
