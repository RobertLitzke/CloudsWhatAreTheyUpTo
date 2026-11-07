// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { DIET, INSECT_MG, MONTHS, PREY, flying, hatch, insectsPerNight, skyLight } from '../src/figures/green-lake';
import { click, context, guess, setSlider } from './helpers';

describe('lesson N1: dusk at Green Lake', () => {
  it('the high flyers come before the water skimmers, and the hoary only in late summer', () => {
    const july = MONTHS.indexOf('Late July');
    expect(flying(july, 10)).toEqual([]);
    expect(flying(july, 20).every((b) => b.where === 'trees')).toBe(true);
    expect(flying(july, 35).some((b) => b.where === 'water')).toBe(true);
    expect(flying(july, 50).some((b) => b.name === 'Hoary')).toBe(true);
    expect(flying(MONTHS.indexOf('May'), 60).some((b) => b.name === 'Hoary')).toBe(false);
    expect(flying(MONTHS.indexOf('January'), 60).some((b) => b.where === 'water')).toBe(false);
    expect(skyLight(0)).toBe(1);
    expect(skyLight(90)).toBe(0);
    expect(hatch(july, 40)).toBeGreaterThan(hatch(MONTHS.indexOf('May'), 40));
  });

  it('Myotis eat mostly midges; big browns mostly beetles', () => {
    expect(DIET['Yuma myotis'][PREY.indexOf('Midges')]).toBe(3);
    expect(DIET['Big brown'][PREY.indexOf('Beetles')]).toBe(3);
    expect(DIET['Yuma myotis'][PREY.indexOf('Mosquitoes')]).toBeLessThan(2);
  });

  it('200 bats eating 6 g of 2 mg midges is 600,000 insects', () => {
    expect(insectsPerNight(200, 8, 0.75, INSECT_MG.Midge)).toBeCloseTo(600000);
    expect(insectsPerNight(1, 8, 1, INSECT_MG.Moth)).toBe(200);
  });

  it('scrubbing to late evening in late July finds the hoary bat', async () => {
    const f = FIGURES['gl-dusk'](context(), 'hoary');
    setSlider(f.node, 0, 25);
    setSlider(f.node, 0, 50);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the diet guess, then the big brown', async () => {
    const f = FIGURES['gl-diet'](context(), 'diet');
    guess(f.node, 'Midges and caddisflies');
    click(f.node, 'Big brown');
    await expect(f.done).resolves.toBeUndefined();
  });

  it('a big nursing colony eats a million insects in a night', async () => {
    const f = FIGURES['gl-colony'](context(), 'million');
    setSlider(f.node, 0, 5); // 500 bats (steps index)
    setSlider(f.node, 1, 90);
    await expect(f.done).resolves.toBeUndefined();
  });
});
