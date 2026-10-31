// Settings' per-lesson downloads: each lesson's piece names files that exist,
// and a written lesson's names the code of the figures it shows.

import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lessonPieces } from '../src/app/course-pieces';
import { isWritten, LESSONS } from '../src/core/lessons';

describe('lesson pieces', () => {
  it('has one per lesson, each with its lesson file and figure code', () => {
    const pieces = lessonPieces();
    expect(pieces).toHaveLength(LESSONS.length);
    LESSONS.forEach((l, i) => {
      const p = pieces[i];
      for (const f of [...p.files, ...p.code!]) expect(existsSync(f), f).toBe(true);
      if (isWritten(l)) expect(p.code!.length, p.label).toBeGreaterThan(0);
    });
    const first = pieces.find((p) => p.fileName === 'circuitry-what-flows.json')!;
    expect(first.label).toBe(`Lesson 1: ${LESSONS[0].title}`);
    expect(first.code).toContain('src/app/figures/what-flows.ts');
    const switches = pieces.find((p) => p.fileName === 'circuitry-switches.json')!;
    expect(switches.code).toContain('src/app/figures/switches.ts');
  });
});
