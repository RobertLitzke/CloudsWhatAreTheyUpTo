// A lesson (lesson-kit's lesson view), with the valley at the top. A lesson
// that is planned but not written yet goes home.

import { lessonView as kitLessonView } from 'lesson-kit/lesson';
import type { View } from 'lesson-kit/router';
import { isWritten, lesson, LESSONS } from '../../core/lessons';
import { FIGURES } from '../figures';
import { prose } from '../figures/kit';
import { makeScene } from '../scene/field';
import { store } from '../store';

const view = kitLessonView({
  lessons: LESSONS,
  figures: FIGURES,
  store,
  prose,
  hero: (l) => makeScene({ seed: 30 + l.n, time: l.n % 2 ? 'morning' : 'evening' }),
});

export const lessonView: View = (root, nav) => {
  const l = lesson(nav.params.id);
  if (!l || !isWritten(l)) {
    nav.replace('/home');
    return;
  }
  return view(root, nav);
};
