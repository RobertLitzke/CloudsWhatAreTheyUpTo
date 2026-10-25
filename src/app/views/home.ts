// The fields at dusk, the lesson board and what comes after training. With the
// radio on, the page tells the story and the opening talk plays the first time.

import { SHIFTS } from '../../core/shifts';
import { el } from '../dom';
import type { View } from '../router';
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

  const nextUp = SHIFTS.find((s) => !save.shifts[s.id]?.done);
  const training = SHIFTS.filter((s) => s.book === 'training');
  const seeding = SHIFTS.filter((s) => s.book === 'seeding');
  const trained = training.every((s) => save.shifts[s.id]?.done);

  const boardOf = (lessons: readonly (typeof SHIFTS)[number][]) => el(
    'ol.shift-board',
    {},
    lessons.map((s) => {
      const rec = save.shifts[s.id];
      const open = rec?.done || s === nextUp;
      return el(
        'li.shift-card',
        { className: `shift-card ${rec?.done ? 'done' : open ? 'open' : 'locked'}` },
        el('span.shift-n', {}, String(s.n)),
        el('div', {}, el('h3', {}, s.title), el('p', {}, s.teaches), rec?.done ? el('p.score', {}, `${save.talk ? 'Radio check' : 'Check'}: ${rec.best} of ${rec.of}`) : null),
        open ? el('a.btn', { href: `#/shift/${s.id}` }, rec?.done ? 'Again' : 'Start') : null,
      );
    }),
  );

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
            : [el('p', {}, `${training.length} short lessons: what a cloud is made of, how to name every kind, and what each one says about the weather to come. Then ${seeding.length === 1 ? 'one' : seeding.length} on cloud seeding.`)]),
        ),
        nextUp ? el('a.btn.btn-big', { href: `#/shift/${nextUp.id}` }, nextUp.n === 1 && !save.shifts[nextUp.id] ? 'Start the first lesson' : `Lesson ${nextUp.n}: ${nextUp.title}`) : null,
        el('h2', {}, 'Lessons'),
        boardOf(training),
        // Open from the start: the natural skies can be made as soon as their
        // clouds are met; the seeding orders wait on the last lesson.
        el(
          'div.seeding',
          { className: 'seeding open' },
          el('h2', {}, 'The forecast desk: make the sky'),
          el('p', {}, 'Set the moisture, the heat and the wind, and make the sky you’re asked for. The orders marked Seed are for after the cloud-seeding lesson.'),
          el('a.btn', { href: '#/seed' }, 'Take the orders'),
        ),
        el('h2', {}, 'Cloud seeding'),
        el('p', {}, save.talk
          ? 'Fifteen years on, a fellow at General Electric makes it snow with dry ice.'
          : 'Once training is done: how a supercooled cloud can be made to snow, and what seeding can and can’t do.'),
        boardOf(seeding),
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
