// The course's text one lesson at a time, for Settings' download menu
// (Didactics' courseSection `pieces`). A lesson's piece is its lesson file and
// the words in the code of every figure it shows: the figure files that draw
// them. Words shared by every lesson (the reference page, the glossary, the
// quiz deck, the pages, and the figure helpers such as guess.ts and bench.ts)
// are in "All" only. A lesson not yet written has only its lesson file.

import type { CoursePiece } from 'didactics/course';
import { LESSONS } from '../core/lessons';
import { FIGURES } from './figures';

const MODULES = import.meta.glob<Record<string, unknown>>('/src/app/figures/*.ts', { eager: true });

/** The source file each figure is written in, by figure factory. */
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
  return LESSONS.map((l) => {
    const code = new Set<string>();
    for (const part of l.parts) {
      for (const b of part.blocks) {
        if (!('id' in b)) continue;
        const file = files.get(FIGURES[b.id as keyof typeof FIGURES]);
        if (file) code.add(file);
      }
    }
    return {
      label: `Lesson ${l.n}: ${l.title}`,
      files: [`src/data/lessons/${l.id}.json`],
      code: [...code].sort(),
      fileName: `circuitry-${l.id}.json`,
    };
  });
}
