// Circuitry's words as this browser has them. All of the text can be
// downloaded from Settings as one course file, or one lesson at a time
// (app/course-pieces.ts), edited, and loaded back to read here before it is
// committed (Didactics' course.ts): every JSON file in src/data (the lessons,
// the reference page, the quiz cards and the glossary), and under "code" the
// words written in the source (figure labels and commentary, headings,
// buttons; Didactics' code-text.ts).
// main.ts imports this first, so edited words are in place before any module
// reads them. In the repository, `npx didactics-course export src/data --code
// src --title Circuitry` and `npx didactics-course import course.json` do the
// same with the files themselves.

import { courseEdits, courseFiles } from 'didactics/course';

export const COURSE = courseEdits({
  key: 'circuitry.course',
  title: 'Circuitry',
  files: courseFiles(import.meta.glob('/src/data/**/*.json', { eager: true, import: 'default' })),
  code: () => import('virtual:didactics/code-text').then((m) => m.default),
});
