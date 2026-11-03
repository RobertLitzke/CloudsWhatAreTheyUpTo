// Settings' per-lesson downloads (Didactics' lessonPieces, as main.ts asks for
// them): each lesson's piece names files that exist, and the code of the
// figures it shows with the src/core model behind each.

import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lessonPieces } from 'didactics/course';
import { FIGURES } from '../src/app/figures';
import { LESSONS } from '../src/core/lessons';

const modules = import.meta.glob<Record<string, unknown>>('/src/app/figures/*.ts', { eager: true });
const MODEL: Record<string, string> = { 'made-of': 'soil', photo: 'photos' };

describe('lesson pieces', () => {
  it('has one per lesson, each with its lesson file and figure code', () => {
    const pieces = lessonPieces({
      lessons: LESSONS, figures: FIGURES, modules,
      files: (l) => [`src/data/lessons/${l.id}.json`],
      alongside: (file) => {
        const name = file.replace(/^src\/app\/figures\/(.*)\.ts$/, '$1');
        return [`src/core/${MODEL[name] ?? name}.ts`];
      },
      fileName: (l) => `dirt-${l.id}.json`,
    });
    expect(pieces).toHaveLength(LESSONS.length);
    for (const p of pieces) {
      expect(existsSync(p.files[0]), p.files[0]).toBe(true);
      expect(p.code!.length, p.label).toBeGreaterThan(0);
    }
    const madeOf = pieces.find((p) => p.fileName === 'dirt-made-of.json')!;
    expect(madeOf.label).toBe(`Lesson 1: ${LESSONS[0].title}`);
    expect(madeOf.code).toContain('src/app/figures/made-of.ts');
    expect(madeOf.code).toContain('src/core/soil.ts');
  });
});
