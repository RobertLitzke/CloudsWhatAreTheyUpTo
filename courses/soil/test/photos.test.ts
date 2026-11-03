import { describe, expect, it } from 'vitest';
import { problems, SUBJECTS, type Photo } from '../src/core/photos';
import library from '../src/data/photos.json';
import search from '../tools/photo-search.json';

describe('the photo library', () => {
  it('credits every photo under an accepted licence', () => {
    for (const p of library as Partial<Photo>[]) expect(problems(p), p.id).toEqual([]);
  });

  it('has somewhere to look for every subject', () => {
    expect(Object.keys(search.categories).sort()).toEqual(Object.keys(SUBJECTS).sort());
  });
});
