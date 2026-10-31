// @vitest-environment happy-dom
// Every figure builds, in both unit systems, and the ones with a task can
// reach it. Figures that re-expose a photograph are built too: with an empty
// library they fall back to the "no photograph yet" card, which must not throw.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
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

/** Set a log-scale slider (min to max, by ratio) to `value`, as its input counts it: 1000 steps end to end. */
function setLogSlider(node: HTMLElement, n: number, value: number, min: number, max: number): void {
  setSlider(node, n, Math.round((Math.log(value / min) / Math.log(max / min)) * 1000));
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
      if (!isDiagram(b)) continue;
      expect(FIGURES[b.id as FigureId](ctx, b.goal, b.options).node, b.id).toBeInstanceOf(HTMLElement);
    }
  });

  it('the cone figure meets its goal once the disc is small again', async () => {
    const cone = FIGURES.cone(context(), 'sharp-again');
    setLogSlider(cone.node, 0, 10, 1.5, 40);
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
    setLogSlider(shake.node, 0, 1200, 24, 2000);
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
    setLogSlider(kelvin.node, 0, 2000, 1800, 9000);
    await expect(kelvin.done).resolves.toBeUndefined();
  });

  it('the angle figure meets its goal at the long end', async () => {
    const angle = FIGURES.angle(context(), 'narrow');
    setLogSlider(angle.node, 0, 1500, 24, 2000);
    await expect(angle.done).resolves.toBeUndefined();
  });
});

describe('units', () => {
  it('puts the cone figure’s distances in feet for a reader who asked for feet', () => {
    const cone = FIGURES.cone({ ...context(), save: { ...emptySave(), units: 'imperial' } }, 'sharp-again');
    expect(cone.node.querySelector('output')?.textContent).toMatch(/ft$/);
    expect(cone.node.querySelector('.fig-readout')?.textContent).toMatch(/\d ft away/);
  });
});

describe('figure options', () => {
  it('catch a photo of the wrong subject, a missing photo and a bad question', () => {
    expect(FIGURES.aperture.options?.({ photo: 'perched-bird-01' })).toEqual([]);
    expect(FIGURES.aperture.options?.({ photo: 'distant-wildlife-01' })?.[0]).toMatch(/not perched-bird/);
    expect(FIGURES.zoom.options?.({ photo: 'no-such-photo' })?.[0]).toMatch(/no photo/);
    expect(FIGURES.photo.options?.({ subject: 'unicorn' })?.[0]).toMatch(/unknown subject/);
    expect(FIGURES.check.options?.({ items: [{ question: 'Q?', options: ['a'], answer: 2, why: 'Because it is so.' }] })?.[0]).toMatch(/not one of its 1 options/);
  });
});

describe('the drawn scene', () => {
  it('draws the same valley from the same seed', () => {
    expect(makeScene({ seed: 3 }).outerHTML).toBe(makeScene({ seed: 3 }).outerHTML);
  });
});
