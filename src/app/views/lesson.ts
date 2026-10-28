// A lesson (Didactics' lesson view), with Dirt's garden at the top. A lesson
// that is planned but not written yet (no parts) goes home.

import { lessonView as kitLessonView } from 'didactics/lesson';
import { LESSONS } from '../../core/lessons';
import { FIGURES } from '../figures';
import { prose } from '../figures/kit';
import { makeGarden } from '../scene/garden';
import { store } from '../store';

export const lessonView = kitLessonView({
  lessons: LESSONS,
  figures: FIGURES,
  store,
  prose,
  hero: (l) => makeGarden({ seed: 30 + l.n, time: l.n % 2 ? 'morning' : 'noon' }),
});
