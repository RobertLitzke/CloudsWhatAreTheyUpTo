import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../tools/photos/config';
import { problems, SUBJECTS, type Photo } from '../src/core/photos';
import library from '../src/data/photos.json';

describe('the photo library', () => {
  it('credits every photo under an accepted licence', () => {
    for (const p of library as Partial<Photo>[]) expect(problems(p), p.id).toEqual([]);
  });

  it('has somewhere to look for every subject', () => {
    expect(Object.keys(CATEGORIES).sort()).toEqual(Object.keys(SUBJECTS).sort());
  });
});
