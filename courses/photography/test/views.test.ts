// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import type { ViewContext } from 'didactics/router';
import { homeView } from '../src/app/views/home';
import { lessonView } from '../src/app/views/lesson';
import { referenceView } from '../src/app/views/reference';
import { isWritten, LESSONS } from '../src/core/lessons';

const nav = (params: Record<string, string> = {}): ViewContext & { went: string[] } => {
  const went: string[] = [];
  return { params, navigate: (p) => went.push(p), replace: (p) => went.push(p), went };
};

describe('views', () => {
  it('home lists every lesson, with only written ones to start', () => {
    const root = document.createElement('main');
    homeView(root, nav());
    expect(root.querySelectorAll('.lesson-card')).toHaveLength(LESSONS.length);
    expect(root.querySelectorAll('.lesson-card a.btn')).toHaveLength(LESSONS.filter(isWritten).length);
  });

  it('an unknown lesson goes home; every written one opens, with its footnotes', () => {
    const away = nav({ id: 'no-such-lesson' });
    lessonView(document.createElement('main'), away);
    expect(away.went).toEqual(['/home']);
    for (const l of LESSONS.filter(isWritten)) {
      const root = document.createElement('main');
      const here = nav({ id: l.id });
      const stop = lessonView(root, here);
      expect(here.went, l.id).toEqual([]);
      expect(root.querySelector('.article-intro h1')?.textContent).toBe(l.title);
      if (l.footnotes) expect(root.querySelector('button.fn'), l.id).not.toBeNull();
      if (typeof stop === 'function') stop();
    }
  });

  it('the reference page renders every section', () => {
    const root = document.createElement('main');
    const stop = referenceView(root, nav());
    expect(root.querySelectorAll('.ref-section').length).toBeGreaterThan(5);
    // The glossary has the hand-written terms and the lessons' technical notes.
    const terms = [...root.querySelectorAll('.gl-term')].map((t) => t.textContent);
    expect(terms).toContain('Aperture');
    expect(terms).toContain('Circle of confusion');
    if (typeof stop === 'function') stop();
  });
});
