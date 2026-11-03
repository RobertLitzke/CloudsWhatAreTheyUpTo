// @vitest-environment happy-dom
// The globe preview lesson (#/preview/globe-preview): its blocks name figures
// and goals that exist, like any lesson's.

import { describe, expect, it } from 'vitest';
import { lessonProblems, type Lesson } from 'didactics/lesson';
import { FIGURES } from '../src/figures';
import { GLOBE_PREVIEW } from '../src/figures/globe-preview';
import preview from '../src/previews/globe.json';

describe('the globe preview', () => {
  it('names only figures and goals that exist', () => {
    expect(lessonProblems([preview as unknown as Lesson], { ...FIGURES, ...GLOBE_PREVIEW }, { allowPlaceholders: false })).toEqual([]);
  });
});
