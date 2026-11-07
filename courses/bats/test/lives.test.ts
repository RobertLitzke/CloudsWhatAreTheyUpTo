// @vitest-environment happy-dom
// Lesson 8, Long lives, slow births: the lifespan line and where bats fall,
// the colony model against mice, and each figure's goal.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { BATS, BIRDS, colony, COLONY, expected, fitLine, GROUND, growthRate, meanTimes, mouseMonths, recovery, times } from '../src/figures/lives';
import { context, guess, setSlider } from './helpers';

describe('lesson 8: long lives, slow births', () => {
  it('the ground mammals fit a gentle line; bats and birds sit well above it', () => {
    const { b } = fitLine(GROUND);
    expect(b).toBeGreaterThan(0.15);
    expect(b).toBeLessThan(0.3);
    expect(meanTimes(GROUND)).toBeCloseTo(1, 5);
    expect(expected(0.02)).toBeGreaterThan(3);
    expect(expected(0.02)).toBeLessThan(6);
    expect(times(BATS[0])).toBeGreaterThan(8);
    expect(meanTimes(BATS)).toBeGreaterThan(3);
    expect(meanTimes(BIRDS)).toBeGreaterThan(2);
    for (const bat of BATS) expect(times(bat), bat[0]).toBeGreaterThan(2);
  });

  it('a colony with one pup a year grows at most a tenth a year and takes decades to recover', () => {
    expect(growthRate(1)).toBeCloseTo(0.1, 6);
    const run = colony(1, 0.9, 0);
    expect(run[COLONY.lossAt]).toBeCloseTo(0.1, 6);
    const back = recovery(run)!;
    expect(back).toBeGreaterThan(30);
    expect(back).toBeLessThan(55);
    expect(recovery(colony(3, 0.9, 0))!).toBeLessThan(10);
    expect(recovery(colony(1, 0.9, 0.12))).toBeNull();
    expect(colony(1, 0.5, 0.12)[COLONY.years]).toBeLessThan(0.1);
    expect(mouseMonths(0.9)).toBeLessThan(12);
  });

  it('the lifespan figure is done once the guess is in', async () => {
    const f = FIGURES.lifespan(context(), 'placed');
    guess(f.node, 'About 40 years');
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the colony figure is done when the yearly toll outruns births', async () => {
    const f = FIGURES['colony-recovery'](context(), 'fail');
    guess(f.node, 'Several decades');
    setSlider(f.node, 2, 0.12);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the rabies still draws', () => {
    expect(FIGURES['rabies-numbers'](context()).node.querySelectorAll('circle').length).toBe(400);
  });
});
