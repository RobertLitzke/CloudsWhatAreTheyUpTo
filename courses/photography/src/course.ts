// The course's words as this device reads them (Didactics' course.ts): every
// JSON file under src/data, with any edited copy loaded in Settings put in
// their place. main.ts imports this first, so the edits are in before any
// module reads the files; it imports none of them itself for that reason.

import { courseEdits, courseFiles, type CoursePiece } from 'didactics/course';

const FILES = courseFiles(import.meta.glob('/src/data/**/*.json', { eager: true, import: 'default' }));

export const COURSE = courseEdits({ key: 'out-of-auto.course', title: 'Out of Auto', files: FILES });

/** Each written lesson's text on its own, in order, for Settings' download menu after "All". */
export const LESSON_PIECES: CoursePiece[] = Object.entries(FILES)
  .filter(([path]) => path.startsWith('src/data/lessons/'))
  .map(([path, json]) => ({ path, lesson: json as { n: number; title: string } }))
  .sort((a, b) => a.lesson.n - b.lesson.n)
  .map(({ path, lesson }) => ({
    label: `Lesson ${lesson.n}: ${lesson.title}`,
    files: [path],
    fileName: `out-of-auto-lesson-${lesson.n}.json`,
  }));
