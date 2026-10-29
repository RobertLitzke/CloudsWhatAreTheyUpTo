// The valley at first light, a word on what this is, the lesson board (the
// written lessons open, the rest shown as coming), and the way to the
// reference page.

import { el } from 'didactics/dom';
import type { View } from 'didactics/router';
import { isWritten, LESSONS } from '../../core/lessons';
import { makeScene } from '../scene/field';
import { getSave } from '../store';

export const homeView: View = (root) => {
  const save = getSave();
  const written = LESSONS.filter(isWritten);
  const nextUp = written.find((l) => !save.lessons[l.id]?.done);

  const board = el(
    'ol.lesson-board',
    {},
    LESSONS.map((l) => {
      const rec = save.lessons[l.id];
      const open = isWritten(l);
      return el(
        'li.lesson-card',
        { className: `lesson-card ${rec?.done ? 'done' : open ? 'open' : 'soon'}` },
        el('span.lesson-n', {}, String(l.n)),
        el('div', {}, el('h3', {}, l.title), el('p', {}, l.teaches), rec?.done ? el('p.score', {}, `Check: ${rec.best} of ${rec.of}`) : null),
        open ? el('a.btn', { href: `#/lesson/${l.id}` }, rec?.done ? 'Again' : 'Start') : el('span.tag', {}, 'Coming'),
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
        makeScene({ seed: 8, h: 320, horizon: 0.66, align: 'xMidYMax' }),
        el('div.hero-text', {}, el('p.eyebrow', {}, 'A field workbook'), el('h1', {}, 'Out of Auto'), el('p.subtitle', {}, 'Photographing what is out there, on purpose')),
      ),
      el(
        'section.page',
        {},
        el(
          'div.letter',
          {},
          save.name ? el('p', {}, `Welcome back, ${save.name}.`) : null,
          el('p', {}, `${LESSONS.length} short lessons on what a camera is deciding for you and how to take each decision back: light and exposure, what stays sharp, movement, grain, reach, focus and colour. Written for nature photography with a long zoom, with figures that work on real photographs rather than diagrams of them.`),
        ),
        nextUp ? el('a.btn.btn-big', { href: `#/lesson/${nextUp.id}` }, save.lessons[nextUp.id] ? `Lesson ${nextUp.n}: ${nextUp.title}` : 'Start the first lesson') : null,
        el('h2', {}, 'Lessons'),
        board,
        el(
          'div.ref-card',
          {},
          el('h2', {}, 'Reference'),
          el('p', {}, 'What the lessons teach, set out to look up in the field: the four decisions, the stop scale, the camera at a glance, and settings to start from.'),
          el('a.btn', { href: '#/reference' }, 'Open the reference'),
        ),
      ),
    ),
  );
};
