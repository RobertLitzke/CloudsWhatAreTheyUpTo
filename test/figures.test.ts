// @vitest-environment happy-dom
// Every figure builds, in both unit systems, and the ones with a task can
// reach it. Figures that re-expose a photograph are built too: with an empty
// library they fall back to the "no photograph yet" card, which must not throw.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/app/figures';
import { makeScene } from '../src/app/scene/field';
import { FIGURE_IDS, LESSONS, type FigureId } from '../src/core/lessons';
import { emptySave } from '../src/core/save';

const context = () => ({ save: emptySave(), closed: new AbortController().signal, score: () => {} });

/** Set a figure's nth slider and let it repaint. */
function setSlider(node: HTMLElement, n: number, value: number): void {
  const input = node.querySelectorAll('input')[n] as HTMLInputElement;
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

describe('figures', () => {
  for (const units of ['imperial', 'metric'] as const) {
    it(`all build (${units})`, () => {
      const ctx = { ...context(), save: { ...emptySave(), units } };
      for (const id of FIGURE_IDS) {
        const handle = FIGURES[id](ctx, FIGURES[id].goals?.[0], id === 'check' ? { items: [] } : undefined);
        expect(handle.node, id).toBeInstanceOf(HTMLElement);
      }
    });
  }

  it('builds every figure a lesson asks for, with that lesson’s options', () => {
    const ctx = context();
    for (const l of LESSONS) for (const p of l.parts) for (const b of p.blocks) {
      if (b.kind !== 'figure') continue;
      expect(FIGURES[b.figure as FigureId](ctx, b.goal, b.options).node, b.figure).toBeInstanceOf(HTMLElement);
    }
  });

  it('the cone figure meets its goal once the disc is small again', async () => {
    const cone = FIGURES.cone(context(), 'sharp-again');
    setSlider(cone.node, 0, Math.log(10));
    setSlider(cone.node, 1, 10);
    await expect(cone.done).resolves.toBeUndefined();
  });

  it('the stops figure wants the exposure put back by hand', async () => {
    const stops = FIGURES.stops(context(), 'trade');
    // It starts a stop bright; a stop faster on the shutter puts it back.
    setSlider(stops.node, 1, 9);
    await expect(stops.done).resolves.toBeUndefined();
  });

  it('the shake figure meets its goal at a long lens and a fast shutter', async () => {
    const shake = FIGURES.shake(context(), 'rule-of-thumb');
    setSlider(shake.node, 0, Math.log2(1200));
    setSlider(shake.node, 1, 0);
    await expect(shake.done).resolves.toBeUndefined();
  });

  it('the photon figure meets its goal at high ISO', async () => {
    const photons = FIGURES.photons(context(), 'count');
    setSlider(photons.node, 0, 18);
    await expect(photons.done).resolves.toBeUndefined();
  });

  it('the kelvin scale meets its goal at the warm end', async () => {
    const kelvin = FIGURES.kelvin(context(), 'read-scale');
    setSlider(kelvin.node, 0, Math.log(2000));
    await expect(kelvin.done).resolves.toBeUndefined();
  });

  it('the angle figure meets its goal at the long end', async () => {
    const angle = FIGURES.angle(context(), 'narrow');
    setSlider(angle.node, 0, Math.log2(1500));
    await expect(angle.done).resolves.toBeUndefined();
  });
});

describe('the drawn scene', () => {
  it('draws the same valley from the same seed', () => {
    expect(makeScene({ seed: 3 }).outerHTML).toBe(makeScene({ seed: 3 }).outerHTML);
  });
});
