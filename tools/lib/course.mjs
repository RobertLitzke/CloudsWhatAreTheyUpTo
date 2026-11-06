// A course's folder and what its course.json says, for the root tools that
// take a course name: `node tools/photos.mjs geology`.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The course named on the command line, or exit with the usage line. */
export function courseArg(usage) {
  const name = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const dir = name && join(root, 'courses', name);
  if (!name || !existsSync(join(dir, 'course.json'))) {
    console.error(name ? `no course "${name}" in courses/` : usage);
    process.exit(1);
  }
  const course = JSON.parse(readFileSync(join(dir, 'course.json'), 'utf8'));
  return {
    name,
    dir,
    course,
    /** The folder of lesson files. */
    lessons: join(dir, course.lessons),
    /** How the course names itself to Commons and other APIs. */
    userAgent: `${course.title.replace(/\W+/g, '')}Course/0.1 (https://github.com/RobertLitzke/Courses)`,
  };
}

export const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
