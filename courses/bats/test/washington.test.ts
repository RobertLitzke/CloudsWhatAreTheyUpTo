// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { COMFORT, MOUNTS, PAINTS, PLACES, airTemp, comfyHours, insideDay, suits } from '../src/figures/washington';
import lesson from '../src/lessons/washington.json';
import { click, context, setSlider } from './helpers';

const optionsOf = (id: string) => {
  for (const p of lesson.parts) for (const b of p.blocks) if ('id' in b && b.id === id) return (b as { options?: Record<string, unknown> }).options;
  return undefined;
};
const paint = (n: string) => PAINTS.find((p) => p.name === n)!.absorb;
const mount = (n: string) => MOUNTS.find((m) => m.name === n)!;

describe("lesson N2: Washington's fifteen", () => {
  it('a Seattle July runs about 13 to 25 °C, Yakima hotter', () => {
    expect(airTemp(4)).toBeCloseTo(13);
    expect(airTemp(16)).toBeCloseTo(25);
    expect(airTemp(16, PLACES[1])).toBeGreaterThan(30);
  });

  it('in Seattle a dark box in long sun is warm enough; white or shaded is not', () => {
    expect(suits(paint('Black'), 8, mount('Pole'), 4)).toBe(true);
    expect(suits(paint('Dark brown'), 6, mount('House wall'), 4)).toBe(true);
    expect(suits(paint('White'), 8, mount('Pole'), 4)).toBe(false);
    expect(suits(paint('Black'), 8, mount('Tree trunk'), 4)).toBe(false);
    expect(suits(paint('Black'), 8, mount('Pole'), 2)).toBe(false);
    expect(comfyHours(insideDay(paint('White'), 3, mount('Pole')))).toBe(0);
  });

  it('in Yakima the same black box overheats and a white one suits', () => {
    expect(Math.max(...insideDay(paint('Black'), 8, mount('Pole'), PLACES[1]))).toBeGreaterThan(COMFORT.tooHot);
    expect(suits(paint('White'), 8, mount('Pole'), 4, PLACES[1])).toBe(true);
  });

  it('the bat house figure reaches its goal', async () => {
    const f = FIGURES['wa-house'](context(), 'warm');
    click(f.node, 'Black');
    setSlider(f.node, 0, 8);
    setSlider(f.node, 1, 4);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the sort and the key from the lesson build and can be finished', async () => {
    const g = FIGURES.groups(context(), 'sorted', optionsOf('groups'));
    const items = (optionsOf('groups')!.items as { group: string }[]);
    for (const it of items) click(g.node, it.group);
    await expect(g.done).resolves.toBeUndefined();

    const k = FIGURES['id-key'](context(), 'keyed', optionsOf('id-key'));
    const tick = (...vs: string[]) => { for (const v of vs) click(k.node, v); };
    tick('Over 20 g', 'Frosted');
    click(k.node, 'Next one');
    tick('50 kHz', 'Plain brown', 'Ordinary');
    click(k.node, 'Next one');
    tick('Huge', 'Pale');
    await expect(k.done).resolves.toBeUndefined();
  });
});
