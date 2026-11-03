// @vitest-environment happy-dom
// The save (src/store.ts): it stays under the localStorage key it has always
// had, so no one loses their progress, and it is repaired into the course's
// shape: metric units, no radio.

import { beforeEach, describe, expect, it } from 'vitest';
import { empty, store } from '../src/store';

describe('the save', () => {
  beforeEach(() => localStorage.clear());

  it('lives under outofauto.save, and reads a save written there before', () => {
    store.update((s) => ({ ...s, name: 'Rob' }));
    expect(JSON.parse(localStorage.getItem('outofauto.save')!).name).toBe('Rob');
    localStorage.setItem('outofauto.save', JSON.stringify({ v: 1, name: 'Ann', lessons: { 'tour': { done: true, best: 6, of: 7 } }, journal: ['x'] }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'outofauto.save' }));
    const s = store.get();
    expect(s.name).toBe('Ann');
    expect(s.lessons['tour'].best).toBe(6);
    expect(s).not.toHaveProperty('journal');
  });

  it('starts metric, with no radio', () => {
    expect(empty().units).toBe('metric');
    expect(empty()).not.toHaveProperty('talk');
    localStorage.setItem('outofauto.save', JSON.stringify({ talk: true, heard: {}, units: 'imperial' }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'outofauto.save' }));
    expect(store.get()).not.toHaveProperty('talk');
    expect(store.get().units).toBe('imperial');
  });
});
