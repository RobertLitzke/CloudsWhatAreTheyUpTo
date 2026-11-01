// @vitest-environment happy-dom
// Every figure the lessons name builds, in both unit systems, and the ones
// with a task can reach it.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { emptyProgress } from 'didactics/progress';
import type { Units } from 'didactics/units';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';
import { orbitAt, TODAY } from '../src/figures/pacemaker';
import { alpsCooling, lengthFor, seaLevel } from '../src/figures/iceage';
import { JURA_KM } from '../src/figures/ice';
import { PLATE_VEL, sunk } from '../src/figures/hotspot';
import { turnAt } from '../src/figures/drift';

const context = (units: Units = 'imperial') => ({ save: emptyProgress(units), closed: new AbortController().signal, score: () => {} });

function setSlider(node: HTMLElement, n: number, value: number): void {
  const input = node.querySelectorAll('input[type=range]')[n] as HTMLInputElement;
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

const click = (node: HTMLElement, text: string) => {
  const b = [...node.querySelectorAll('button')].find((x) => x.textContent?.trim() === text);
  if (!b) throw new Error(`no button "${text}"`);
  b.dispatchEvent(new Event('click'));
};

/** Pick a guess and lock it in. */
const guess = (node: HTMLElement, choice: string) => {
  click(node, choice);
  click(node, 'Lock it in');
};

describe('figures', () => {
  for (const units of ['imperial', 'metric'] as const) {
    it(`all build (${units})`, () => {
      for (const l of WRITTEN) for (const p of l.parts) for (const b of p.blocks) {
        if (!isDiagram(b)) continue;
        const handle = FIGURES[b.id](context(units), b.goal, b.options);
        expect(handle.node, `${l.id}: ${b.id}`).toBeInstanceOf(HTMLElement);
      }
    });
  }

  it('lesson 1: settling levels out, and the cliff reads in order', async () => {
    const settle = FIGURES.settle(context(), 'flat');
    guess(settle.node, 'They fill the hollows and level out');
    setSlider(settle.node, 1, 100);
    setSlider(settle.node, 0, 8);
    await expect(settle.done).resolves.toBeUndefined();
    const order = FIGURES.order(context(), 'ordered');
    for (const e of ['Layer A settles', 'Layer B settles', 'Layer C settles', 'A crack (fault) shifts A, B and C', 'The top is worn level, and layer D settles on it', 'Melted rock fills a crack (dike) through everything']) click(order.node, e);
    await expect(order.done).resolves.toBeUndefined();
  });

  it('lesson 2: a river leaves clean sand, and a dune builds its beds', async () => {
    const sort = FIGURES.sorting(context(), 'sand-bed');
    setSlider(sort.node, 0, 0.15);
    await expect(sort.done).resolves.toBeUndefined();
    expect(sort.node.textContent).toContain('clean sandstone');
    const dune = FIGURES.dune(context(), 'built');
    guess(dune.node, 'From the left');
    setSlider(dune.node, 0, 90);
    await expect(dune.done).resolves.toBeUndefined();
  });

  it('lesson 3: layers tie up by their fossils, and steep layers V downstream', async () => {
    const cor = FIGURES.correlate(context(), 'matched');
    const rects = () => [...cor.node.querySelectorAll('rect[role=button]')];
    const tap = (col: string, rock: string) => {
      const r = rects().find((x) => x.getAttribute('aria-label') === `${col}: ${rock}`);
      if (!r) throw new Error(`no ${col}: ${rock}`);
      r.dispatchEvent(new Event('click'));
    };
    // A wrong match first: same rock, different fossils.
    tap('Canal cutting', 'cream limestone with sea lily stems');
    tap('Hill quarry', 'cream limestone with lamp shells');
    expect(cor.node.textContent).toContain('Same rock');
    for (const [col, rock] of [
      ['Canal cutting', 'blue clay with no fossils'],
      ['Canal cutting', 'cream limestone with sea lily stems'],
      ['Well shaft', 'blue clay with ammonites'],
      ['Well shaft', 'cream limestone with lamp shells'],
    ]) {
      tap(col, rock);
      tap('Hill quarry', rock);
    }
    await expect(cor.done).resolves.toBeUndefined();
    const vees = FIGURES.vees(context(), 'downstream');
    guess(vees.node, 'A V pointing upstream');
    setSlider(vees.node, 0, 2);
    expect(vees.node.textContent).toContain('still points upstream');
    setSlider(vees.node, 0, 20);
    await expect(vees.done).resolves.toBeUndefined();
  });

  it('lesson 4: slow cooling grows crystals, and deep in a flow the columns are hexagons', async () => {
    const furnace = FIGURES.furnace(context(), 'crystals');
    guess(furnace.node, 'Black glass');
    expect(furnace.node.textContent).toContain('glass');
    setSlider(furnace.node, 0, 8);
    await expect(furnace.done).resolves.toBeUndefined();
    expect(furnace.node.textContent).toContain('Basalt');
    const columns = FIGURES.columns(context(), 'hexagons');
    setSlider(columns.node, 0, 12);
    await expect(columns.done).resolves.toBeUndefined();
  });

  it('lesson 5: buried mud grows garnets, and squeezed flakes line up', async () => {
    const burial = FIGURES.burial(context(), 'garnet');
    setSlider(burial.node, 0, 20);
    await expect(burial.done).resolves.toBeUndefined();
    setSlider(burial.node, 0, 30);
    setSlider(burial.node, 1, 8);
    expect(burial.node.textContent).toContain('Blueschist');
    const squeeze = FIGURES.squeeze(context(), 'cleavage');
    setSlider(squeeze.node, 0, 90);
    await expect(squeeze.done).resolves.toBeUndefined();
  });

  it('lesson 6: the cliff at Siccar Point is built in five stages', async () => {
    const unc = FIGURES.unconformity(context(), 'story');
    await Promise.resolve();
    guess(unc.node, 'Tens of millions of years');
    setSlider(unc.node, 0, 5);
    await expect(unc.done).resolves.toBeUndefined();
    expect(unc.node.textContent).toContain('million years');
  });

  it('lesson 7: Kelvin gets about 100 million years, and two half-lives leave a quarter', async () => {
    const cooling = FIGURES.cooling(context(), 'kelvin');
    setSlider(cooling.node, 0, 2);
    await expect(cooling.done).resolves.toBeUndefined();
    expect(cooling.node.textContent).toContain('Kelvin');
    const decay = FIGURES.decay(context(), 'two-halves');
    guess(decay.node, 'None');
    setSlider(decay.node, 0, 8.94);
    await expect(decay.done).resolves.toBeUndefined();
    expect(decay.node.textContent).toContain('50 uranium atoms remain');
  });

  it('lesson 8: South America meets Africa at the shelf edge', async () => {
    const fit = FIGURES.fit(context(), 'fitted');
    guess(fit.node, 'The shelf edges');
    click(fit.node, 'Shelf edges');
    setSlider(fit.node, 0, 100);
    await expect(fit.done).resolves.toBeUndefined();
  });

  it('lesson 9: the ridge matches the survey at about 2.9 cm a year', async () => {
    const ridge = FIGURES.ridge(context(), 'matched');
    setSlider(ridge.node, 1, 6);
    expect(ridge.node.textContent).toContain('too wide');
    setSlider(ridge.node, 1, 2.9);
    await expect(ridge.done).resolves.toBeUndefined();
  });

  it('lesson 10: a steeper slab brings the volcanoes nearer the trench', async () => {
    const slab = FIGURES.slab(context(), 'close');
    guess(slab.node, 'Closer to the trench');
    setSlider(slab.node, 0, 60);
    await expect(slab.done).resolves.toBeUndefined();
  });

  it('lesson 11: the Pacific plate moves about 9 cm a year', async () => {
    const plume = FIGURES.plume(context(), 'speed');
    guess(plume.node, 'About 10 cm a year');
    setSlider(plume.node, 0, 9);
    await expect(plume.done).resolves.toBeUndefined();
  });

  it('lesson 12: a river that keeps up cuts a canyon; a knickpoint climbs', async () => {
    const race = FIGURES.race(context(), 'gorge');
    setSlider(race.node, 0, 1.4);
    setSlider(race.node, 2, 2);
    expect(race.node.textContent).toContain('lake');
    setSlider(race.node, 1, 1.5);
    await expect(race.done).resolves.toBeUndefined();
    const knick = FIGURES.knick(context(), 'knick');
    setSlider(knick.node, 0, 60);
    setSlider(knick.node, 1, 60);
    await expect(knick.done).resolves.toBeUndefined();
  });

  it('lesson 13: about 10 °C colder sends the Rhône glacier to the Jura', async () => {
    const glacier = FIGURES.glacier(context(), 'jura');
    expect(glacier.node.textContent).toMatch(/[5-9] km long|1[0-2] km long/);
    setSlider(glacier.node, 0, -10);
    await expect(glacier.done).resolves.toBeUndefined();
  });

  it('lesson 14: a cold northern summer, and the 41,000-year beat', async () => {
    const orbit = FIGURES.orbit(context(), 'cold');
    setSlider(orbit.node, 0, 22.1);
    setSlider(orbit.node, 1, 0.05);
    setSlider(orbit.node, 2, 0);
    await expect(orbit.done).resolves.toBeUndefined();
    const record = FIGURES.record(context(), 'beat');
    click(record.node, '1.2 to 2 million years ago');
    setSlider(record.node, 0, 41);
    await expect(record.done).resolves.toBeUndefined();
    const cycles = FIGURES.cycles(context(), 'played');
    expect([...cycles.node.querySelectorAll('button')].map((b) => b.textContent)).toContain('Play');
    setSlider(cycles.node, 0, 800);
    await expect(cycles.done).resolves.toBeUndefined();
  });

  it('lesson 14: the orbit through time agrees with today, and 11,000 years ago had strong northern summers', () => {
    expect(orbitAt(0).sun).toBeCloseTo(TODAY, -1);
    expect(orbitAt(0).tilt).toBeCloseTo(23.44, 1);
    expect(orbitAt(11).sun).toBeGreaterThan(TODAY + 40);
  });

  it('lesson 15: the crust rises after the ice melts', async () => {
    const rebound = FIGURES.rebound(context(), 'raised');
    setSlider(rebound.node, 0, 3000);
    setSlider(rebound.node, 1, 10);
    await expect(rebound.done).resolves.toBeUndefined();
  });
  it('P branch: round craters at a slant, a dated plain, a floating crust, a Moon from a Mars-like impactor', async () => {
    const impact = FIGURES.impact(context(), 'shallow-round');
    guess(impact.node, 'Round');
    setSlider(impact.node, 0, Math.log10(20));
    setSlider(impact.node, 1, 15);
    await expect(impact.done).resolves.toBeUndefined();
    const count = FIGURES['crater-count'](context(), 'date');
    guess(count.node, 'Only a few hundred million years older');
    setSlider(count.node, 0, 3.8);
    await expect(count.done).resolves.toBeUndefined();
    const ocean = FIGURES['magma-ocean'](context(), 'crust');
    guess(ocean.node, 'They float to the top');
    setSlider(ocean.node, 0, 96);
    await expect(ocean.done).resolves.toBeUndefined();
    expect(ocean.node.textContent).toContain('white crust');
    const mix = FIGURES['moon-mix'](context(), 'mars-like');
    setSlider(mix.node, 0, 1);
    await expect(mix.done).resolves.toBeUndefined();
  });

  it('L1: silica-rich water under ash turns a log to quartz, wall by wall', async () => {
    const fossil = FIGURES.fossilize(context(), 'petrified');
    guess(fossil.node, 'Volcanic ash');
    for (const b of ['Buried fast', 'No oxygen', 'Silica']) click(fossil.node, b);
    await expect(fossil.done).resolves.toBeUndefined();
    const cells = FIGURES.cells(context(), 'replaced');
    setSlider(cells.node, 0, 2000);
    await expect(cells.done).resolves.toBeUndefined();
  });

  it('D branch: weighing, locating, the Moho, the core, the inner core and the drill', async () => {
    const plumb = FIGURES.plumb(context(), 'match');
    setSlider(plumb.node, 0, 4.5);
    await expect(plumb.done).resolves.toBeUndefined();
    const layers = FIGURES.layers(context(), 'core');
    guess(layers.node, 'Packed at the centre');
    setSlider(layers.node, 0, 0.55);
    setSlider(layers.node, 1, 11);
    await expect(layers.done).resolves.toBeUndefined();
    const epi = FIGURES.epicentre(context(), 'found');
    setSlider(epi.node, 0, 190);
    setSlider(epi.node, 1, 130);
    await expect(epi.done).resolves.toBeUndefined();
    const moho = FIGURES.moho(context(), 'fit');
    guess(moho.node, 'Farther from the quake');
    setSlider(moho.node, 0, 54);
    await expect(moho.done).resolves.toBeUndefined();
    const rays = FIGURES.rays(context(), 'shadow');
    setSlider(rays.node, 0, 3480);
    await expect(rays.done).resolves.toBeUndefined();
    const inner = FIGURES['inner-core'](context(), 'lehmann');
    setSlider(inner.node, 0, 1220);
    await expect(inner.done).resolves.toBeUndefined();
    const drill = FIGURES.drill(context(), 'ktb');
    guess(drill.node, 'Shallower');
    setSlider(drill.node, 0, 28);
    setSlider(drill.node, 1, 265);
    await expect(drill.done).resolves.toBeUndefined();
  });

  it('time lapses: each played figure reaches today and is done', async () => {
    for (const [id, end] of [['opening', 150], ['ice-sheets', 130], ['rhone-ice', 120], ['island-drift', 550], ['cycles', 800]] as const) {
      const h = FIGURES[id](context(), id === 'opening' ? 'opened' : 'played');
      expect([...h.node.querySelectorAll('button')].some((b) => b.textContent === 'Play'), id).toBe(true);
      setSlider(h.node, 0, end);
      await expect(h.done, id).resolves.toBeUndefined();
    }
  });

  it('time lapses: the models behind the maps', () => {
    // The South Atlantic: closed before it opened, open today.
    expect(turnAt(140)).toBeCloseTo(57);
    expect(turnAt(0)).toBe(0);
    // The sea about 125 m lower at the last glacial maximum, as today now.
    expect(seaLevel(20)).toBeLessThan(-110);
    expect(Math.abs(seaLevel(0))).toBeLessThan(1);
    // The Rhône glacier reaches the Jura at the maximum, and only its own valley today.
    expect(lengthFor(alpsCooling(20))).toBeGreaterThanOrEqual(JURA_KM);
    expect(lengthFor(alpsCooling(0))).toBeLessThan(20);
    // The Pacific plate moves west-northwest at about 10 cm a year, and old islands have sunk most.
    expect(PLATE_VEL[0]).toBeLessThan(0);
    expect(PLATE_VEL[1]).toBeGreaterThan(0);
    expect(Math.hypot(...PLATE_VEL) / 10).toBeGreaterThan(8);
    expect(Math.hypot(...PLATE_VEL) / 10).toBeLessThan(12);
    expect(sunk(5)).toBeGreaterThan(sunk(1));
  });
});

