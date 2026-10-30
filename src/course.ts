// Dirt's words as this browser has them. Every JSON file in src/data except
// the photo library (the eight lessons, the reference page, the quiz cards and
// the glossary) can be downloaded from Settings as one course file, edited,
// and loaded back to read here before it is committed (Didactics' course.ts).
// main.ts imports this first, so edited words are in place before any module
// reads them. In the repository, `npx didactics-course export src/data --skip
// src/data/photos.json --title Dirt` and `npx didactics-course import
// course.json` do the same with the files themselves.

import { courseEdits, courseFiles } from 'didactics/course';

export const COURSE = courseEdits({
  key: 'dirt.course',
  title: 'Dirt',
  files: courseFiles(import.meta.glob(['/src/data/**/*.json', '!/src/data/photos.json'], { eager: true, import: 'default' })),
});
