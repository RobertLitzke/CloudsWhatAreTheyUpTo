// @vitest-environment happy-dom
// Lesson 5's figures: the teacup, the migrating meander, braided against
// meandering, and the maths behind them.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { braidIndex, braidSlope, history, leafRadius, pattern, sinuosity, swirl, visibleOxbows } from '../src/figures/meanders';
import { blockOptions, context, click, guess, setSlider } from './helpers';

const build = (id: string, goal?: string, options?: Record<string, unknown>) => {
  let done = false;
  const h = FIGURES[id](context('metric'), goal, options);
  void h.done?.then(() => (done = true));
  return { node: h.node, done: async () => { await Promise.resolve(); await Promise.resolve(); return done; } };
};

const firstCutoff = (bank: number) => {
  const h = history(bank);
  return h.findIndex((c, yr) => visibleOxbows(c, yr).length > 0);
};

describe('the teacup', () => {
  it('the swirl dies away and the leaves move in, more for a harder stir', () => {
    expect(swirl(1, 0)).toBe(1);
    expect(swirl(1, 15)).toBeLessThan(0.1);
    expect(leafRadius(1, 20)).toBeLessThan(0.3);
    expect(leafRadius(0.3, 20)).toBeGreaterThan(0.7);
    expect(leafRadius(1, 2)).toBeGreaterThan(leafRadius(1, 6));
  });
});

describe('the migrating meander', () => {
  it('grows its bends, then cuts one off: sooner on bare banks than under forest, never with riprap', () => {
    const bare = firstCutoff(1);
    const forest = firstCutoff(0);
    expect(bare).toBeGreaterThan(60);
    expect(forest).toBeGreaterThan(bare * 1.5);
    expect(forest).toBeLessThan(400);
    expect(firstCutoff(2)).toBe(-1);
    const h = history(1, bare);
    expect(sinuosity(h[bare - 1])).toBeGreaterThan(sinuosity(h[0]) + 1);
  });
});

describe('braided or meandering', () => {
  it("follows Leopold and Wolman's line: about 0.1 percent for 300 m³/s, gentler for bigger rivers", () => {
    expect(braidSlope(300)).toBeGreaterThan(0.0008);
    expect(braidSlope(300)).toBeLessThan(0.0013);
    expect(braidSlope(3000)).toBeLessThan(braidSlope(300));
    expect(pattern(braidIndex(0.0003, 0.5))).toBe('meandering');
    expect(pattern(braidIndex(0.01, 2))).toBe('braided');
    expect(braidIndex(0.001, 4)).toBeGreaterThan(braidIndex(0.001, 1));
  });
});

describe('the figures', () => {
  it('meanders-teacup: a hard stir gathers the leaves', async () => {
    const h = build('meanders-teacup', 'gather');
    setSlider(h.node, 0, 1);
    setSlider(h.node, 1, 2);
    expect(await h.done()).toBe(false);
    setSlider(h.node, 1, 15);
    expect(await h.done()).toBe(true);
  });

  it('meanders-migrate: guess, then play on bare banks to a cutoff', async () => {
    const h = build('meanders-migrate', 'cutoff');
    guess(h.node, 'The outside bank');
    await Promise.resolve();
    click(h.node, 'Bare banks');
    setSlider(h.node, 0, 40);
    expect(await h.done()).toBe(false);
    setSlider(h.node, 0, 300);
    expect(await h.done()).toBe(true);
  });

  it('meanders-braid: braid it, then make it meander', async () => {
    const h = build('meanders-braid', 'both');
    setSlider(h.node, 0, 12);
    setSlider(h.node, 1, 8);
    expect(await h.done()).toBe(false);
    setSlider(h.node, 0, 0);
    setSlider(h.node, 1, 0);
    expect(await h.done()).toBe(true);
  });

  it('the White River map and the river groups have their options', () => {
    expect(blockOptions('map-live', 'meanders')).toBeTruthy();
    expect(blockOptions('groups', 'meanders')).toBeTruthy();
  });
});
