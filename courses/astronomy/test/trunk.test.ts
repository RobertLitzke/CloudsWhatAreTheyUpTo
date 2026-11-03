// @vitest-environment happy-dom
// The tasks of lessons 8 and 12-25 can each be done, and the physics behind
// their figures gives the numbers the text quotes.
import { describe, expect, it } from 'vitest';
import { emptyProgress } from 'didactics/progress';
import { FIGURES } from '../src/figures';
import { arcGain, heightGain, realPeak, speedLoss } from '../src/figures/bending';
import { dwarfRadius, electronSpeed, teaspoon } from '../src/figures/dead-stars';
import { breakup, CRAB, DWARF, NEUTRON } from '../src/figures/pulsars';
import { cell, madeBy, SOURCES, stagesBegun } from '../src/figures/star-stuff';
import { BODIES, escapeShare, horizon } from '../src/figures/dark-stars';
import { lifetime, starAt } from '../src/figures/clusters';
import { balmerLine, band, fallNm } from '../src/figures/ladder';
import { SEA, slowing, survivors } from '../src/figures/muons';

const context = () => ({ save: emptyProgress('metric'), closed: new AbortController().signal, score: () => {} });

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

const guess = (node: HTMLElement, choice: string) => {
  click(node, choice);
  click(node, 'Lock it in');
};

describe('trunk lessons', () => {
  it('lesson 8: Balmer’s rule and Bohr’s falls agree, and the four visible lines can be found', async () => {
    expect(balmerLine(3)).toBeCloseTo(656.3, 0);
    expect(balmerLine(6)).toBeCloseTo(410.2, 0);
    expect(fallNm(3, 2)).toBeCloseTo(656.3, -1);
    expect(band(fallNm(2, 1))).toBe('ultraviolet');
    expect(band(fallNm(4, 3))).toBe('infrared');
    const r = FIGURES.rungs(context(), 'balmer');
    guess(r.node, 'They all end on the second rung');
    setSlider(r.node, 1, 2);
    for (const n of [3, 4, 5, 6]) setSlider(r.node, 0, n);
    await expect(r.done).resolves.toBeUndefined();
  });

  it('lesson 12: heavy stars die young, and the cluster clock matches the Pleiades and M67', async () => {
    expect(lifetime(1)).toBeCloseTo(1e10, -8);
    expect(lifetime(10) / 1e6).toBeGreaterThan(20);
    expect(lifetime(10) / 1e6).toBeLessThan(50);
    expect(starAt(1, 4.6e9).stage).toBe('main');
    expect(starAt(1, 10.5e9).stage).toBe('giant');
    expect(starAt(20, 1e8).stage).toBe('gone');
    const c = FIGURES.clusters(context(), 'both');
    guess(c.node, 'M67');
    setSlider(c.node, 0, Math.log10(1.1e8));
    click(c.node, 'Match M67');
    setSlider(c.node, 0, Math.log10(4e9));
    await expect(c.done).resolves.toBeUndefined();
  });

  it('lesson 13: clocks at 87% tick at half speed, and slow clocks match Frisch and Smith', async () => {
    expect(slowing(0.87)).toBeCloseTo(2, 1);
    expect(survivors(0.995, false)).toBeGreaterThan(20);
    expect(survivors(0.995, false)).toBeLessThan(40);
    expect(Math.abs(survivors(0.995, true) - SEA) / SEA).toBeLessThan(0.08);
    const c = FIGURES['light-clock'](context(), 'clock');
    guess(c.node, 'About half as fast');
    setSlider(c.node, 0, 0.87);
    await expect(c.done).resolves.toBeUndefined();
    const m = FIGURES['muon-rain'](context(), 'count');
    guess(m.node, 'About 30');
    click(m.node, 'Moving clocks slow');
    setSlider(m.node, 0, 0.995);
    await expect(m.done).resolves.toBeUndefined();
  });

  it('lesson 14: the real arc is the one the clock likes best, and GPS clocks gain 38 µs a day', async () => {
    expect(realPeak()).toBeCloseTo(4.9, 1);
    expect(arcGain(realPeak())).toBeGreaterThan(arcGain(4));
    expect(arcGain(realPeak())).toBeGreaterThan(arcGain(6));
    expect(heightGain(20200)).toBeCloseTo(45.7, 0);
    expect(heightGain(20200) - speedLoss(3.87)).toBeCloseTo(38.5, 0);
    const b = FIGURES['best-path'](context(), 'best');
    guess(b.node, 'About five metres up');
    setSlider(b.node, 0, 4.9);
    await expect(b.done).resolves.toBeUndefined();
    const g = FIGURES.gps(context(), 'gps');
    guess(g.node, 'About ten kilometres');
    setSlider(g.node, 0, 20200);
    setSlider(g.node, 1, 3.87);
    await expect(g.done).resolves.toBeUndefined();
  });

  it('lesson 15: a white dwarf of the Sun’s mass is Earth-sized, heavier is smaller, and 1.44 Suns is the end', async () => {
    expect(dwarfRadius(1)).toBeGreaterThan(0.7);
    expect(dwarfRadius(1)).toBeLessThan(1);
    expect(dwarfRadius(1.2)).toBeLessThan(dwarfRadius(0.6) / 2);
    expect(teaspoon(1)).toBeGreaterThan(5);
    expect(electronSpeed(1.42)).toBeGreaterThan(0.95);
    expect(dwarfRadius(1.45)).toBe(0);
    const d = FIGURES.dwarf(context(), 'limit');
    guess(d.node, 'It gets smaller');
    setSlider(d.node, 0, 1.5);
    await expect(d.done).resolves.toBeUndefined();
  });

  it('lesson 16: a white dwarf can’t spin like the Crab pulsar, a neutron star can', async () => {
    expect(breakup(DWARF.suns, DWARF.km)).toBeLessThan(1 / 1.337);
    expect(breakup(NEUTRON.suns, NEUTRON.km)).toBeGreaterThan(1000);
    const s = FIGURES.spin(context(), 'crab');
    guess(s.node, 'No, it would fly apart');
    setSlider(s.node, 0, Math.log10(CRAB));
    await expect(s.done).resolves.toBeUndefined();
  });

  it('lesson 17: the onion burns down to iron, and every natural element has a source', async () => {
    expect(stagesBegun(5e6)).toBe(1);
    expect(stagesBegun(1 / 1000)).toBe(6);
    expect(cell(26)).toEqual([7, 3]);
    expect(cell(79)).toEqual([10, 5]);
    expect(madeBy(79, SOURCES.map((s) => s.key === 'N'))).toBe('N');
    const o = FIGURES.onion(context(), 'collapse');
    guess(o.node, 'About a day');
    setSlider(o.node, 0, 7.5);
    await expect(o.done).resolves.toBeUndefined();
    const p = FIGURES.origins(context(), 'all');
    guess(p.node, 'Neutron stars colliding');
    for (const s of SOURCES) click(p.node, s.name);
    await expect(p.done).resolves.toBeUndefined();
  });

  it('lesson 18: the Earth in a marble and the Sun in 6 km are black holes', async () => {
    expect(horizon(BODIES[0].kg) * 1000).toBeCloseTo(8.9, 0);
    expect(horizon(BODIES[1].kg) / 1000).toBeCloseTo(2.95, 1);
    expect(escapeShare(BODIES[0].kg, BODIES[0].m) * 299792.458).toBeCloseTo(11.2, 0);
    const q = FIGURES.squash(context(), 'horizon');
    guess(q.node, 'The size of a marble');
    setSlider(q.node, 0, Math.log10(0.008));
    await expect(q.done).resolves.toBeUndefined();
  });
});
