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

  it('the aperture figure meets its goal once the bushes melt behind a sharp bird', async () => {
    const fig = FIGURES.aperture(context(), 'blur-background');
    setLogSlider(fig.node, 0, 2000, 200, 2000);
    setSlider(fig.node, 1, 0);
    setLogSlider(fig.node, 3, 40, 1, 40);
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('the aperture figure can keep the pines readable behind the bird', async () => {
    const fig = FIGURES.aperture(context(), 'in-place');
    setLogSlider(fig.node, 0, 300, 200, 2000);
    setSlider(fig.node, 1, 10);
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('the hyperfocal figure holds the flowers and the hills at the wide end', async () => {
    const fig = FIGURES.hyperfocal(context(), 'boots-to-hills');
    setLogSlider(fig.node, 0, 24, 24, 2000);
    setSlider(fig.node, 1, 3);
    setLogSlider(fig.node, 2, 1.5, 0.3, 2000);
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('the modes figure is done once the light has changed a few times', async () => {
    const fig = FIGURES.modes(context(), 'follow');
    for (const v of [10, 12, 14]) setSlider(fig.node, 0, v);
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('the pan figure is done once the bird is sharp on streaked trees', async () => {
    const fig = FIGURES.pan(context(), 'pan');
    setSlider(fig.node, 0, 22);
    setSlider(fig.node, 1, 1);
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('the pooling figure is done when a high-ISO picture is seen whole on a phone', async () => {
    const fig = FIGURES.pooling(context(), 'phone');
    const buttons = fig.node.querySelectorAll('button');
    (buttons[buttons.length - 1] as HTMLButtonElement).click();
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('the dusk figure is done with a clean, steady shot well after sunset', async () => {
    const fig = FIGURES.dusk(context(), 'late');
    setSlider(fig.node, 0, 16);
    // The shutter steps run 1/2000 s to 1/8 s; 1/60 s is the 16th.
    setSlider(fig.node, 1, 15);
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('the compression figure is done when the moon fills half the frame behind the pine', async () => {
    const fig = FIGURES.compression(context(), 'moon-big');
    setLogSlider(fig.node, 0, 1800, 24, 2000);
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('the crop figure is done at a shorter zoom that still fills a screen', async () => {
    const fig = FIGURES.crop(context(), 'screen');
    setLogSlider(fig.node, 0, 900, 200, 2000);
    await expect(fig.done).resolves.toBeUndefined();
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
    expect(FIGURES.closeUp.options?.({ photo: 'flower-close-01' })).toEqual([]);
    expect(FIGURES.closeUp.options?.({ photo: 'distant-wildlife-01' })?.[0]).toMatch(/not flower-close/);
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
