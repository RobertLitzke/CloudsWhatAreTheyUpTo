// A lesson (Didactics' lesson view), with the valley at the top. A lesson
// that is planned but not written yet has no parts, and the player sends the
// reader home.

import { lessonView as kitLessonView } from 'didactics/lesson';
import { LESSONS } from '../../core/lessons';
import { FIGURES } from '../figures';
import { prose } from '../figures/kit';
import { makeScene } from '../scene/field';
import { store } from '../store';

export const lessonView = kitLessonView({
  lessons: LESSONS,
  figures: FIGURES,
  store,
  prose,
  // "Lesson 1 of 12": the whole plan, which the home page shows too.
  countComing: true,
  hero: (l) => makeScene({ seed: 30 + l.n, time: l.n % 2 ? 'morning' : 'evening' }),
});
