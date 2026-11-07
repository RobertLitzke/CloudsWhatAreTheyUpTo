// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { FIGURES } from '../src/figures';
import { cover, gift, hoursAt, STARVE_GRAMS, survival, weightAt, year } from '../src/figures/diets';
import { WRITTEN } from '../src/lessons';
import { click, context, guess, setSlider } from './helpers';

/** A block's options from this lesson (other lessons may use the same live chart). */
const ownOptions = (id: string) => {
  const b = WRITTEN.find((l) => l.id === 'diets')!.parts.flatMap((p) => p.blocks).find((x) => isDiagram(x) && x.id === id);
  return b && isDiagram(b) ? b.options : undefined;
};

describe('lesson 9, Blood, nectar and fruit', () => {
  it('the weight curve: dead at 60 hours, and a gift costs the donor less than it gives', () => {
    expect(weightAt(60)).toBeCloseTo(STARVE_GRAMS);
    expect(hoursAt(weightAt(30))).toBeCloseTo(30);
    const g = gift(0, 48);
    expect(g.lost).toBeGreaterThan(5);
    expect(g.lost).toBeLessThan(12);
    expect(g.gained).toBeGreaterThan(2 * g.lost);
  });

  it('without sharing about four adults in five starve in a year (Wilkinson: 82%)', () => {
    const s = survival('never', false);
    expect(s.honest).toBeGreaterThan(0.1);
    expect(s.honest).toBeLessThan(0.25);
    expect(s.young).toBeLessThan(0.05);
  });

  it('sharing keeps the roost alive; only paying back starves cheats', () => {
    expect(survival('everyone', false).honest).toBeGreaterThan(0.95);
    expect(survival('everyone', true).cheats).toBeGreaterThan(0.9);
    expect(survival('kin', true).cheats).toBeGreaterThan(0.9);
    const pay = survival('payback', true);
    expect(pay.honest).toBeGreaterThan(0.95);
    expect(pay.cheats).toBeLessThan(0.5);
  });

  it('a year is the same run each time for one seed', () => {
    const a = year('payback', true, 5).at(-1)!.alive;
    const b = year('payback', true, 5).at(-1)!.alive;
    expect(a).toEqual(b);
  });

  it('bats seed the middle of a cleared patch; birds only its edge', () => {
    const both = { bats: true, birds: true, tree: false };
    const birds = { bats: false, birds: true, tree: false };
    expect(cover(30, 20, birds)).toBeGreaterThan(0.9);
    expect(cover(285, 20, birds)).toBeLessThan(0.02);
    expect(cover(285, 20, both)).toBeGreaterThan(0.4);
    expect(cover(210, 20, { ...birds, tree: true })).toBeGreaterThan(cover(210, 20, birds));
  });

  it('the sharing figure: guess, then pay back with cheats for a year', async () => {
    const f = FIGURES['vampire-share'](context(), 'cheats');
    guess(f.node, 'Fewer than one in five');
    click(f.node, 'Pay back');
    click(f.node, 'Add six cheats');
    setSlider(f.node, 0, 365);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the seed rain figure: twenty years with bats, then without', async () => {
    const f = FIGURES['seed-rain'](context(), 'far');
    setSlider(f.node, 0, 20);
    click(f.node, 'Fruit bats');
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the diet sort, from the lesson\'s JSON', async () => {
    const o = ownOptions('groups');
    expect(o).toBeDefined();
    const f = FIGURES.groups(context(), 'sorted', o);
    for (let k = 0; k < 8; k++) click(f.node, 'Insects');
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the still builds', () => {
    expect(FIGURES['vampire-hours'](context()).node).toBeTruthy();
  });
});
