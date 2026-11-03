// What Circuitry adds to Didactics' lesson player (defineCourse's `lesson`):
// a board at the top of each lesson. A lesson that is planned but not written
// yet (no parts) goes home, which Didactics does by itself.

import type { LessonViewOptions } from 'didactics/lesson';
import type { Lesson } from '../../core/lessons';
import type { Progress } from 'didactics/progress';
import { makeBoard } from '../scene/board';

export const lessonOptions: Partial<LessonViewOptions<Lesson, Progress>> = {
  hero: (l) => makeBoard({ seed: 30 + l.n, h: 220 }),
};
