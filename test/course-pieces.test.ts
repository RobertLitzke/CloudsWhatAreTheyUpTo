// Settings' per-lesson downloads: each lesson's piece names files that exist,
// and the code of the figures it shows.

import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lessonPieces } from '../src/app/course-pieces';
import { SHIFTS } from '../src/core/shifts';

describe('lesson pieces', () => {
  it('has one per lesson, each with its lesson file and figure code', () => {
    const pieces = lessonPieces();
    expect(pieces).toHaveLength(SHIFTS.length);
    for (const p of pieces) {
      expect(existsSync(p.files[0]), p.files[0]).toBe(true);
      expect(p.code!.length, p.label).toBeGreaterThan(0);
    }
    const fog = pieces.find((p) => p.fileName === 'clouds-fog.json')!;
    expect(fog.label).toBe(`Lesson 1: ${SHIFTS[0].title}`);
    expect(fog.code).toContain('src/app/figures/fog.ts');
    expect(pieces.find((p) => p.fileName === 'clouds-seeding.json')!.code).toContain('src/core/seeding.ts');
  });
});
