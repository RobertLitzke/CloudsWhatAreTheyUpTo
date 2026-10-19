// The lookout at dusk, the shift board and what comes after training.

import { SHIFTS } from '../../core/shifts';
import { el } from '../dom';
import type { View } from '../router';
import { placeCloud } from '../scene/drawn';
import { makeScene } from '../scene/landscape';
import { getSave } from '../store';

/** Shifts still to be written, shown on the board so the road ahead is visible. */
const PLANNED: readonly { title: string; teaches: string }[] = [
  { title: 'The heaps', teaches: 'Cumulus, thermals, and when a fair-weather cloud stops being one' },
  { title: 'Veils and halos', teaches: 'Cirrus to cirrostratus to altostratus: a warm front coming in' },
  { title: 'Grey days', teaches: 'Stratus, stratocumulus and nimbostratus, and telling them apart' },
  { title: 'Towers', teaches: 'Cumulonimbus: how a storm builds, and what the anvil means' },
];

export const homeView: View = (root) => {
  const save = getSave();
  // Cropped from the left on a phone, so the lookout and the sun stay in view.
  const scene = makeScene({ time: 'dusk', seed: 11, sun: [0.36, 0.7], align: 'xMinYMax' });
  const p = scene.palette;
  scene.sky.append(
    placeCloud('cirrus', p, 150, 104, 0.7, 3),
    placeCloud('altocumulus', p, 300, 120, 0.6, 5),
    placeCloud('cumulus', p, 46, 170, 0.6, 8),
    placeCloud('cumulus', p, 290, 172, 0.75, 9),
  );

  const nextUp = SHIFTS.find((s) => !save.shifts[s.id]?.done);
  const allDone = !nextUp;

  const board = el(
    'ol.shift-board',
    {},
    SHIFTS.map((s) => {
      const rec = save.shifts[s.id];
      const open = rec?.done || s === nextUp;
      return el(
        'li.shift-card',
        { className: `shift-card ${rec?.done ? 'done' : open ? 'open' : 'locked'}` },
        el('span.shift-n', {}, String(s.n)),
        el('div', {}, el('h3', {}, s.title), el('p', {}, s.teaches), rec?.done ? el('p.score', {}, `Radio check: ${rec.best} of ${rec.of}`) : null),
        open ? el('a.btn', { href: `#/shift/${s.id}` }, rec?.done ? 'Again' : 'Start') : null,
      );
    }),
    PLANNED.map((s, i) =>
      el(
        'li.shift-card.locked',
        {},
        el('span.shift-n', {}, String(SHIFTS.length + i + 1)),
        el('div', {}, el('h3', {}, s.title), el('p', {}, s.teaches)),
        el('span.tag', {}, 'Coming'),
      ),
    ),
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
          el('p.eyebrow', {}, 'Anvil Peak Lookout · Thunderhead National Forest'),
          el('h1', {}, 'Clouds'),
          el('p.subtitle', {}, 'What are they up to?'),
        ),
      ),
      el(
        'section.page',
        {},
        el(
          'div.letter',
          {},
          el('p', {}, save.name ? `Welcome back, ${save.name}.` : 'You’ve taken the summer job nobody else wanted: cloud watcher on Anvil Peak.'),
          el('p', {}, 'Every hour, look up, log what’s in the sky and radio the district with what it’s up to. Juniper will train you over the radio, one shift at a time.'),
        ),
        nextUp ? el('a.btn.btn-big', { href: `#/shift/${nextUp.id}` }, nextUp.n === 1 && !save.shifts[nextUp.id] ? 'Start your first shift' : `Shift ${nextUp.n}: ${nextUp.title}`) : null,
        el('h2', {}, 'Training shifts'),
        board,
        el(
          'div.seeding',
          { className: `seeding ${allDone ? 'open' : 'locked'}` },
          el('h2', {}, 'Cloud seeding'),
          el('p', {}, 'Once training is done, the district wants you cooking up clouds as well as reading them: set the moisture, the heat and the wind, and make the sky you’re asked for.'),
          el('span.tag', {}, allDone ? 'Coming soon' : 'Opens after training'),
        ),
      ),
    ),
  );
};
