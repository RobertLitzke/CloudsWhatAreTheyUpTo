// The garden in the morning, a word on what this is, the lesson board (the
// written lessons open, the rest shown as coming), and the way to the
// reference page.

import { el } from 'lesson-kit/dom';
import type { View } from 'lesson-kit/router';
import { isWritten, LESSONS } from '../../core/lessons';
import { makeGarden } from '../scene/garden';
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
        makeGarden({ seed: 8, h: 320, ground: 0.6, align: 'xMidYMax', span: [100, 300] }),
        el('div.hero-text', {}, el('p.eyebrow', {}, 'A gardener’s workbook'), el('h1', {}, 'Dirt'), el('p.subtitle', {}, 'What is going on under your garden')),
      ),
      el(
        'section.page',
        {},
        el(
          'div.letter',
          {},
          save.name ? el('p', {}, `Welcome back, ${save.name}.`) : null,
          el('p', {}, `${LESSONS.length} short lessons on the ground your plants grow in: what it is made of, how it holds water and air, what lives in it, and how to feed it and build it up year on year. Each one has drawings to play with and a few questions at the end.`),
        ),
        nextUp ? el('a.btn.btn-big', { href: `#/lesson/${nextUp.id}` }, save.lessons[nextUp.id] ? `Lesson ${nextUp.n}: ${nextUp.title}` : 'Start the first lesson') : null,
        el('h2', {}, 'Lessons'),
        board,
        el(
          'div.ref-card',
          {},
          el('h2', {}, 'Reference'),
          el('p', {}, 'Everything the lessons cover, set out to look up in the garden: the texture triangle, tests to do at home, a glossary, compost ratios, nutrients and pH, cover crops and a symptom finder.'),
          el('a.btn', { href: '#/reference' }, 'Open the reference'),
        ),
      ),
    ),
  );
};
