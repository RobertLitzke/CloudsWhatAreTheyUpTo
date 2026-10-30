// The course's text one lesson at a time, for Settings' download menu
// (Didactics' courseSection `pieces`). A lesson's piece is its lesson file,
// its radio talk, and the words in the code of every figure it shows: the
// figure files that draw them, and the src/core file of the same name, which
// holds the sums and commentary of figures such as seeding's. Words shared by
// every lesson (the glossary, the quiz deck, the pages) are in "All" only.

import type { CoursePiece } from 'didactics/course';
import { lessonName, SHIFTS } from '../core/shifts';
import { FIGURES } from './figures';

const MODULES = import.meta.glob<Record<string, unknown>>('/src/app/figures/*.ts', { eager: true });

/** The source file each figure is written in, by figure id. */
function figureFiles(): Map<unknown, string> {
  const out = new Map<unknown, string>();
  for (const [path, mod] of Object.entries(MODULES)) {
    if (path.endsWith('/index.ts')) continue;
    for (const value of Object.values(mod)) if (!out.has(value)) out.set(value, path.slice(1));
  }
  return out;
}

export function lessonPieces(): CoursePiece[] {
  const files = figureFiles();
  return SHIFTS.map((l) => {
    const code = new Set<string>();
    for (const part of l.parts) {
      for (const b of part.blocks) {
        if (!('id' in b)) continue;
        const file = files.get(FIGURES[b.id as keyof typeof FIGURES]);
        if (!file) continue;
        code.add(file);
        code.add(file.replace('src/app/figures/', 'src/core/'));
      }
    }
    return {
      label: `${lessonName(l)}: ${l.title}`,
      files: [`src/data/shifts/${l.id}.json`, `src/data/radio/${l.id}.json`],
      code: [...code].sort(),
      fileName: `clouds-${l.id}.json`,
    };
  });
}
