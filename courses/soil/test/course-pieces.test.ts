// Settings' per-lesson downloads: each lesson's piece names files that exist,
// and the code of the figures it shows.

import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lessonPieces } from '../src/app/course-pieces';
import { LESSONS } from '../src/core/lessons';

describe('lesson pieces', () => {
  it('has one per lesson, each with its lesson file and figure code', () => {
    const pieces = lessonPieces();
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
