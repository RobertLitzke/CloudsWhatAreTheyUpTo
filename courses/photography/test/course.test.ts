// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { settingsView } from '../src/app/views/settings';
import { isWritten, LESSONS } from '../src/core/lessons';
import { COURSE, LESSON_PIECES } from '../src/course';

describe('course text download', () => {
  it('offers every written lesson on its own', () => {
    expect(LESSON_PIECES.map((p) => p.label)).toEqual(LESSONS.filter(isWritten).map((l) => `Lesson ${l.n}: ${l.title}`));
  });

  it('a lesson downloads only its own file; All has every file', async () => {
    const all = await COURSE.file();
    expect(Object.keys(all.files)).toContain('src/data/glossary.json');
    for (const piece of LESSON_PIECES) {
      const one = await COURSE.file(piece);
      expect(Object.keys(one.files)).toEqual(piece.files);
      expect(one.part).toBe(piece.label);
      expect(one.files[piece.files[0]]).toEqual(all.files[piece.files[0]]);
    }
  });

  it('Settings shows the menu, All first', () => {
    const root = document.createElement('main');
    settingsView(root, { params: {}, navigate: () => {}, replace: () => {} });
    const options = [...root.querySelectorAll('select.course-piece option')].map((o) => o.textContent);
    expect(options).toEqual(['All', ...LESSON_PIECES.map((p) => p.label)]);
  });
});
