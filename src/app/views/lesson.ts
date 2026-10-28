// A lesson (Didactics' lesson view), with Dirt's garden at the top. A lesson
// that is planned but not written yet goes home.

import { lessonView as kitLessonView } from 'didactics/lesson';
import type { View } from 'didactics/router';
import { isWritten, lesson, LESSONS } from '../../core/lessons';
import { FIGURES } from '../figures';
import { prose } from '../figures/kit';
import { makeGarden } from '../scene/garden';
import { store } from '../store';

const view = kitLessonView({
  lessons: LESSONS,
  figures: FIGURES,
  store,
  prose,
  hero: (l) => makeGarden({ seed: 30 + l.n, time: l.n % 2 ? 'morning' : 'noon' }),
});

export const lessonView: View = (root, nav) => {
  const l = lesson(nav.params.id);
  if (!l || !isWritten(l)) {
    nav.replace('/home');
    return;
  }
  return view(root, nav);
};
