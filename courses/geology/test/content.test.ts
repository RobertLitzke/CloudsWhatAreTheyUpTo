// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { lessonProblems, lessonShapeProblems } from 'didactics/lesson';
import { FIGURES } from '../src/figures';
import { WRITTEN as LESSONS } from '../src/lessons';

describe('the lessons', () => {
  it('are well formed', () => {
    expect(LESSONS.flatMap((l) => lessonShapeProblems(l, l.id))).toEqual([]);
  });

  it('name figures that exist, with goals they know', () => {
    // Drop allowPlaceholders once every diagram is drawn.
    expect(lessonProblems(LESSONS, FIGURES, { allowPlaceholders: false })).toEqual([]);
  });
});
