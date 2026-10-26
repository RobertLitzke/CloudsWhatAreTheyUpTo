// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import type { ViewContext } from 'lesson-kit/router';
import { homeView } from '../src/app/views/home';
import { lessonView } from '../src/app/views/lesson';
import { referenceView } from '../src/app/views/reference';
import { LESSONS } from '../src/core/lessons';

const nav = (params: Record<string, string> = {}): ViewContext & { went: string[] } => {
  const went: string[] = [];
  return { params, navigate: (p) => went.push(p), replace: (p) => went.push(p), went };
};

describe('views', () => {
  it('home lists every lesson, with only written ones to start', () => {
    const root = document.createElement('main');
    homeView(root, nav());
    expect(root.querySelectorAll('.lesson-card')).toHaveLength(LESSONS.length);
    expect(root.querySelectorAll('.lesson-card a.btn')).toHaveLength(1);
  });

  it('a planned lesson goes home; a written one opens', () => {
    const root = document.createElement('main');
    const away = nav({ id: 'water' });
    lessonView(root, away);
    expect(away.went).toEqual(['/home']);
    const here = nav({ id: 'made-of' });
    const stop = lessonView(root, here);
    expect(here.went).toEqual([]);
    expect(root.querySelector('.article-intro h1')?.textContent).toBe('What soil is made of');
    if (typeof stop === 'function') stop();
  });

  it('the reference page renders every section', () => {
    const root = document.createElement('main');
    const stop = referenceView(root, nav());
    expect(root.querySelectorAll('.ref-section').length).toBeGreaterThan(5);
    expect(root.querySelector('.terms')).not.toBeNull();
    if (typeof stop === 'function') stop();
  });
});
