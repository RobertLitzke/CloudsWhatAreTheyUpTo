// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { A1_THRESHOLD, A2_THRESHOLD, BATS, level, outcome, response, spikes } from '../src/figures/moths';
import lesson from '../src/lessons/moths.json';
import { click, context, guess, setSlider } from './helpers';

/** This lesson's own block options (another lesson may use the same live chart). */
const own = (id: string) => {
  const blocks = (lesson as unknown as { parts: { blocks: { id?: string; options?: Record<string, unknown> }[] }[] }).parts.flatMap((p) => p.blocks);
  return blocks.find((b) => b.id === id)?.options;
};

describe('lesson 6, the moth that hears the bat', () => {
  it('fades a call with distance, so A1 hears far and A2 only near', () => {
    expect(level(1) - level(2)).toBeGreaterThan(6);
    expect(A1_THRESHOLD).toBeLessThan(A2_THRESHOLD);
    expect(spikes(level(50), A1_THRESHOLD, 8)).toBe(0);
    expect(spikes(level(20), A1_THRESHOLD, 8)).toBeGreaterThan(0);
    expect(spikes(level(20), A2_THRESHOLD, 5)).toBe(0);
    expect(spikes(level(3), A2_THRESHOLD, 5)).toBeGreaterThan(0);
    expect(response(50)).toBe('nothing');
    expect(response(20)).toBe('turn');
    expect(response(3)).toBe('dive');
  });

  it('scores the moth game: turn early, dive late, click only when found', () => {
    const big = BATS[0];
    expect(outcome('turn', 20, big, false).result).toBe('escaped');
    expect(outcome('turn', 5, big, false).result).toBe('caught');
    expect(outcome('dive', 4, big, false).result).toBe('escaped');
    expect(outcome('dive', 0.5, big, false).result).toBe('caught');
    expect(outcome('click', 20, big, true).result).toBe('none');
    expect(outcome('click', 3, big, true).result).toBe('escaped');
    // The whispering barbastelle finds the moth before it is heard.
    const barb = BATS.find((b) => b.name.includes('barbastelle'))!;
    expect(barb.finds).toBeGreaterThan(barb.heard);
    expect(outcome('turn', barb.heard, barb, false).result).toBe('caught');
  });

  it('reaches its goals', async () => {
    const c = FIGURES['moths-cells'](context(), 'both');
    guess(c.node, 'Turn away from the sound');
    setSlider(c.node, 0, 20);
    setSlider(c.node, 0, 3);
    await expect(c.done).resolves.toBeUndefined();

    const g = FIGURES['moths-game'](context(), 'escape');
    click(g.node, 'Start');
    click(g.node, 'Turn away');
    click(g.node, 'Next bat');
    click(g.node, 'Turn away');
    click(g.node, 'Next bat');
    click(g.node, 'Dive');
    await expect(g.done).resolves.toBeUndefined();

    const s = FIGURES.groups(context(), 'sorted', own('groups'));
    const items = (own('groups') as { items: { group: string }[] }).items;
    const order = ['Hear the bat', 'Answer with sound', 'Hide or mislead', "The bat's reply"];
    // Every pick moves the sort on, right or wrong; the goal is to file them all.
    for (let k = 0; k < items.length; k++) click(s.node, order[k % 4]);
    await expect(s.done).resolves.toBeUndefined();
  });
});
