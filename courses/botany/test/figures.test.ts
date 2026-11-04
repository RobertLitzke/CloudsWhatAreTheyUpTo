// @vitest-environment happy-dom
// Every figure the lessons name builds, in both unit systems, and the ones
// with a task can reach it.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { emptyProgress } from 'didactics/progress';
import type { Units } from 'didactics/units';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';
import { jar } from '../src/figures/willow';
import { breakEven, CANDLE, mintJar } from '../src/figures/air';
import { absorbed, autumn, uses } from '../src/figures/green';
import { lollipop } from '../src/figures/oxygen';
import { cell, rise } from '../src/figures/cells';
import { column } from '../src/figures/xylem';
import { stoma } from '../src/figures/stomata';
import { day } from '../src/figures/cam';
import { girdled, munch } from '../src/figures/phloem';
import { pot } from '../src/figures/peas';
import { trade, tracer } from '../src/figures/pale';
import { divergence, inkDots, shoot } from '../src/figures/spiral';
import { bend, sideways } from '../src/figures/bending';
import { field, sprayed } from '../src/figures/foolish';
import { dayLength, flowering, lettuce, stretch } from '../src/figures/cupboard';
import { BEAM_END, match, ringWidth } from '../src/figures/rings';
import { drying } from '../src/figures/rhynie';
import { race } from '../src/figures/orchid';
import { distance, hedge, sprouts } from '../src/figures/seeds';
import { best, FAST, radiate, SLOW } from '../src/figures/menu';
import { BY_DNA, BY_LOOKS, lotusKin } from '../src/figures/abominable';
import { sortBy } from '../src/figures/stamens';
import { fits, KEY, plant, PLANTS, walk } from '../src/figures/key';
import { cross } from '../src/figures/mendel';
import { crossover, twoYears } from '../src/figures/wheat';
import { takes } from '../src/figures/apples';
import { fresh, touch } from '../src/figures/traps';
import { seek } from '../src/figures/steal';
import { grove, stems } from '../src/figures/giant';
import { flower, starch } from '../src/figures/heat';


globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;

const context = (units: Units = 'metric') => ({ save: emptyProgress(units), closed: new AbortController().signal, score: () => {} });

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

  it('lesson 1: the willow is taken apart, and a sealed jar stops growth', async () => {
    const tub = FIGURES.tub(context(), 'split');
    guess(tub.node, 'The air');
    click(tub.node, 'Take the willow apart');
    expect(tub.node.textContent).toContain('carbon dioxide');
    await expect(tub.done).resolves.toBeUndefined();
    const sealed = jar(true, 20);
    expect(sealed[20].co2).toBeLessThan(60);
    expect(sealed[20].grown).toBeLessThan(jar(false, 20)[20].grown / 2);
    const bj = FIGURES.belljar(context(), 'stall');
    click(bj.node, 'Seal the jar');
    setSlider(bj.node, 0, 20);
    await expect(bj.done).resolves.toBeUndefined();
  });

  it('lesson 2: mint restores the air only in light, and a shade leaf breaks even lower', async () => {
    expect(mintJar(true, 10)[10].o2).toBeGreaterThan(CANDLE);
    expect(mintJar(false, 10)[10].o2).toBeLessThan(16);
    expect(breakEven('shade')).toBeLessThan(breakEven('sun') / 3);
    const m = FIGURES.mint(context(), 'both');
    guess(m.node, 'Makes it worse');
    setSlider(m.node, 0, 10);
    click(m.node, 'Keep it dark');
    setSlider(m.node, 0, 10);
    await expect(m.done).resolves.toBeUndefined();
    const l = FIGURES.light(context(), 'shade');
    setSlider(l.node, 0, 20);
    await expect(l.done).resolves.toBeUndefined();
  });

  it('lesson 3: chlorophyll uses red and blue, a bouncing leaf catches green, and red needs sun and cool nights', async () => {
    expect(uses('green', 550)).toBeLessThan(uses('green', 670) / 3);
    expect(uses('red', 550)).toBeGreaterThan(uses('red', 670));
    expect(absorbed('green', 4, false)).toBeLessThan(0.5);
    expect(absorbed('green', 4, true)).toBeGreaterThan(0.75);
    expect(autumn(8, 1, 5).red).toBeGreaterThan(0.6);
    expect(autumn(8, 0.1, 14).red).toBeLessThan(0.2);
    const e = FIGURES.engelmann(context(), 'red');
    guess(e.node, 'Under the red and blue light');
    click(e.node, 'Red seaweed');
    await expect(e.done).resolves.toBeUndefined();
    const l = FIGURES.leaf(context(), 'green');
    click(l.node, 'Light bounces inside');
    await expect(l.done).resolves.toBeUndefined();
    const a = FIGURES.autumn(context(), 'red');
    setSlider(a.node, 1, 1);
    setSlider(a.node, 2, 4);
    setSlider(a.node, 0, 8);
    await expect(a.done).resolves.toBeUndefined();
  });

  it('lesson 4: heavy oxygen is traced both ways, and carbon goes into PGA first', async () => {
    expect(lollipop(2).pga).toBeGreaterThan(0.7);
    expect(lollipop(300).sucrose).toBeGreaterThan(lollipop(300).pga);
    const l = FIGURES.label(context(), 'traced');
    guess(l.node, 'In the oxygen gas');
    click(l.node, 'Heavy oxygen in the CO₂');
    await expect(l.done).resolves.toBeUndefined();
    const p = FIGURES.lollipop(context(), 'first');
    setSlider(p.node, 0, 1);
    await expect(p.done).resolves.toBeUndefined();
  });

  it('lesson 5: water rises on the sugar side, and saltier water plasmolyses a cell', async () => {
    expect(rise(0.6, 60, false)).toBeGreaterThan(30);
    expect(rise(0.6, 60, true)).toBe(0);
    expect(cell(0).turgor).toBeGreaterThan(0.5);
    expect(cell(1.5).volume).toBeLessThan(1);
    const o = FIGURES.osmosis(context(), 'rise');
    guess(o.node, 'Into the sugar side');
    setSlider(o.node, 0, 60);
    await expect(o.done).resolves.toBeUndefined();
    const c = FIGURES.cell(context(), 'plasmolysed');
    setSlider(c.node, 0, 1.5);
    await expect(c.done).resolves.toBeUndefined();
  });

  it('lesson 6: height, dry air and dry soil raise the pull until pipes break', async () => {
    expect(column(100, 0.5, 0.2).tension).toBeGreaterThan(column(20, 0.5, 0.2).tension);
    expect(column(40, 0.5, 0.2).broken).toBe(0);
    expect(column(110, 1, 0.9).broken).toBeGreaterThan(0.3);
    const c = FIGURES.column(context(), 'embolism');
    guess(c.node, 'It gets stronger');
    setSlider(c.node, 0, 110);
    setSlider(c.node, 1, 1);
    setSlider(c.node, 2, 0.9);
    await expect(c.done).resolves.toBeUndefined();
  });

  it('lesson 7: a leaf trades about a hundred waters per CO₂, more in dry air, through a pore that closes', async () => {
    const mild = stoma({ light: 0.8, dryAir: 0.3, soil: 0.8, co2: 400 });
    const dry = stoma({ light: 0.8, dryAir: 1, soil: 0.8, co2: 400 });
    expect(mild.ratio).toBeGreaterThan(80);
    expect(mild.ratio).toBeLessThan(250);
    expect(dry.ratio).toBeGreaterThan(300);
    expect(dry.open).toBeLessThan(mild.open);
    const s = FIGURES.stoma(context(), 'trade');
    guess(s.node, 'Closes them partly');
    setSlider(s.node, 1, 1);
    await expect(s.done).resolves.toBeUndefined();
  });

  it('lesson 8: corn makes most sugar, the cactus most per water, and without the mistake wheat catches up', async () => {
    const c3 = day('C3');
    const c4 = day('C4');
    const cam = day('CAM');
    expect(c4.sugar).toBeGreaterThan(c3.sugar * 1.3);
    expect(cam.perWater).toBeGreaterThan(c4.perWater * 1.5);
    expect(day('C3', 24, false).sugar).toBeGreaterThanOrEqual(c4.sugar * 0.95);
    const p = FIGURES.pathways(context(), 'mistake');
    guess(p.node, 'The cactus');
    setSlider(p.node, 0, 24);
    click(p.node, 'Take away rubisco’s mistake');
    await expect(p.done).resolves.toBeUndefined();
  });

  it('lesson 9: a ringed tree starves its roots before its leaves, and Münch flow stops when the sink fills', async () => {
    const ringed = girdled('bark', 30);
    const firstRootLoss = ringed.findIndex((s) => s.roots < 1);
    const firstLeafLoss = ringed.findIndex((s) => s.leaves < 1);
    expect(firstRootLoss).toBeGreaterThan(0);
    expect(firstLeafLoss).toBeGreaterThan(firstRootLoss);
    expect(girdled('wood', 1)[1].leaves).toBe(0);
    expect(munch(0.6, true, 60)[60].flow).toBeGreaterThan(0.05);
    expect(munch(0.6, false, 60)[60].flow).toBeLessThan(0.01);
    const g = FIGURES.girdle(context(), 'roots');
    guess(g.node, 'The roots');
    setSlider(g.node, 0, 30);
    await expect(g.done).resolves.toBeUndefined();
    const m = FIGURES.munch(context(), 'stops');
    click(m.node, 'Stop the sink using sugar');
    setSlider(m.node, 0, 60);
    await expect(m.done).resolves.toBeUndefined();
  });

  it('lesson 10: soil wash feeds peas but not oats, and shortages show on old or new leaves', async () => {
    expect(pot('peas', 'wash').growth).toBeGreaterThan(0.8);
    expect(pot('oats', 'wash').growth).toBeLessThan(0.3);
    expect(pot('peas', 'wash').nodules).toBe(true);
    const p = FIGURES.pots(context(), 'nodules');
    guess(p.node, 'Only the peas');
    click(p.node, 'Oats');
    await expect(p.done).resolves.toBeUndefined();
    const k = FIGURES.knop(context(), 'mobile');
    click(k.node, 'No N');
    click(k.node, 'No Fe');
    await expect(k.done).resolves.toBeUndefined();
  });
  it('lesson 11: a fungus pays most in poor soil, and the tracer reaches pinesap unless the threads are cut', async () => {
    expect(trade(0.2).partnered).toBeGreaterThan(trade(0.2).alone * 3);
    expect(trade(0.9).share).toBeLessThan(trade(0.2).share / 5);
    expect(tracer(14, false)[14].pinesap).toBeGreaterThan(0.1);
    expect(tracer(14, true)[14].pinesap).toBe(0);
    const tr = FIGURES.trade(context(), 'trade');
    setSlider(tr.node, 0, 0.1);
    setSlider(tr.node, 0, 0.95);
    await expect(tr.done).resolves.toBeUndefined();
    const tc = FIGURES.tracer(context(), 'pinesap');
    guess(tc.node, 'In the pinesap too');
    setSlider(tc.node, 0, 14);
    await expect(tc.done).resolves.toBeUndefined();
  });
  it('lesson 12: slow tip growth spirals at 137.5°, fast growth alternates, and a root grows only behind its tip', async () => {
    expect(Math.abs(divergence(shoot(0.08)) - 137.5)).toBeLessThan(2.5);
    expect(divergence(shoot(1))).toBeGreaterThan(175);
    const d = inkDots(24);
    expect(d[11] - d[10]).toBeCloseTo(1, 5);
    expect(d[1] - d[0]).toBeGreaterThan(0.9);
    expect(d[5] - d[4]).toBeGreaterThan(1.5);
    const r = FIGURES.root(context(), 'tip');
    guess(r.node, 'Just behind the tip');
    setSlider(r.node, 0, 24);
    await expect(r.done).resolves.toBeUndefined();
    const p = FIGURES.phyllotaxis(context(), 'golden');
    guess(p.node, 'An odd angle, near 137.5°');
    setSlider(p.node, 0, 1.1);
    setSlider(p.node, 0, 0.08);
    await expect(p.done).resolves.toBeUndefined();
  });
  it('lesson 13: a capped or cut seedling grows straight, and a laid-down root turns only with its cap', async () => {
    expect(bend('none').angle).toBeGreaterThan(20);
    expect(bend('cap').angle).toBe(0);
    expect(bend('collar').angle).toBeGreaterThan(20);
    expect(bend('micaShade').angle).toBe(0);
    expect(bend('micaLit').angle).toBeGreaterThan(20);
    expect(sideways(12, false).root).toBeGreaterThan(80);
    expect(sideways(12, true).root).toBe(0);
    const d = FIGURES.darwin(context(), 'all');
    guess(d.node, 'No, it grows straight');
    for (const n of ['Nothing', 'Collar below the tip', 'Tip cut off', 'Mica, shaded side']) click(d.node, n);
    await expect(d.done).resolves.toBeUndefined();
    const g = FIGURES.gravity(context(), 'down');
    guess(g.node, 'Down');
    setSlider(g.node, 0, 14);
    await expect(g.done).resolves.toBeUndefined();
  });
  it('lesson 14: tall wheat lodges at high fertiliser, and gibberellin rescues the pea but not the wheat', async () => {
    expect(field('tall', 180, true).lodged).toBeGreaterThan(0.3);
    expect(field('semi', 200, true).lodged).toBe(0);
    expect(field('semi', 180, true).grain).toBeGreaterThan(field('tall', 180, true).grain * 1.4);
    expect(field('tall', 180, false).lodged).toBe(0);
    expect(sprayed('dwarfPea', true)).toBeGreaterThan(sprayed('dwarfPea', false) * 2);
    expect(sprayed('dwarfWheat', true)).toBe(sprayed('dwarfWheat', false));
    const l = FIGURES.lodging(context(), 'lodge');
    guess(l.node, 'The semi-dwarf');
    setSlider(l.node, 0, 180);
    await expect(l.done).resolves.toBeUndefined();
    const d = FIGURES.dwarfs(context(), 'spray');
    click(d.node, 'Spray with gibberellin');
    await expect(d.done).resolves.toBeUndefined();
  });
  it('lesson 15: day length at 48° N, a night break stops a short-day plant, the last flash wins, and shade stretches the avoider', async () => {
    expect(dayLength(48, 171)).toBeGreaterThan(15.7);
    expect(dayLength(48, 171)).toBeLessThan(16.3);
    expect(dayLength(48, 354)).toBeGreaterThan(8.2);
    expect(dayLength(48, 354)).toBeLessThan(8.7);
    expect(flowering(48, false).shortDay.some(Boolean)).toBe(true);
    expect(flowering(48, true).shortDay.some(Boolean)).toBe(false);
    expect(lettuce('RFRF')).toBeLessThan(0.1);
    expect(lettuce('FRFR')).toBeGreaterThan(0.8);
    expect(stretch(0.15).avoider).toBeGreaterThan(2.5);
    expect(stretch(0.15).tolerant).toBeLessThan(1.2);
    const p = FIGURES.photoperiod(context(), 'nightbreak');
    guess(p.node, 'No, never');
    click(p.node, 'Flash of light at midnight');
    await expect(p.done).resolves.toBeUndefined();
    const l = FIGURES.lettuce(context(), 'last');
    for (const b of ['Red flash', 'Far-red flash', 'Red flash', 'Far-red flash']) click(l.node, b);
    await expect(l.done).resolves.toBeUndefined();
    const c = FIGURES.canopy(context(), 'stretch');
    guess(c.node, 'The shade-avoider, a sunflower');
    click(c.node, 'Under a dense canopy');
    await expect(c.done).resolves.toBeUndefined();
  });
  it('lesson 16: wet years make wide rings, and the beam matches the master at one year only', async () => {
    expect(ringWidth(50)).toBeGreaterThan(ringWidth(10) * 2.5);
    expect(match(BEAM_END)).toBeGreaterThan(0.85);
    for (let y = 1240; y <= 1299; y++) if (y !== BEAM_END) expect(match(y)).toBeLessThan(0.6);
    const g = FIGURES.grow(context(), 'grow');
    for (const r of [10, 50, 30, 30, 30, 30, 30, 30]) {
      setSlider(g.node, 0, r);
      click(g.node, 'Grow a year');
    }
    await expect(g.done).resolves.toBeUndefined();
    const c = FIGURES.crossdate(context(), 'dated');
    setSlider(c.node, 0, BEAM_END);
    await expect(c.done).resolves.toBeUndefined();
  });
  it('lesson 17: a dried moss revives and a dried lettuce leaf dies, and all three life cycles can be seen', async () => {
    expect(drying('moss', 24).working).toBeLessThan(0.2);
    expect(drying('moss', 30).working).toBeGreaterThan(0.7);
    expect(drying('lettuce', 36).dead).toBe(true);
    const d = FIGURES.dry(context(), 'revive');
    guess(d.node, 'Only the moss');
    setSlider(d.node, 0, 36);
    await expect(d.done).resolves.toBeUndefined();
    const c = FIGURES.cycle(context(), 'all');
    click(c.node, 'Fern');
    click(c.node, 'Pine');
    await expect(c.done).resolves.toBeUndefined();
  });
  it('lesson 18: spur and tongue lengthen together, and a fixed spur stops the tongues', async () => {
    const both = race(300, false);
    expect(both[300].spur).toBeGreaterThan(25);
    expect(both[300].tongue).toBeGreaterThan(25);
    const fixed = race(300, true);
    expect(fixed[300].spur).toBe(4);
    expect(fixed[300].tongue).toBeLessThan(8);
    expect(fixed[300].tongue - fixed[200].tongue).toBeLessThan(0.05);
    const r = FIGURES.race(context(), 'fixed');
    guess(r.node, 'They reach the nectar, then stop');
    click(r.node, 'Hold the spur fixed');
    setSlider(r.node, 0, 200);
    await expect(r.done).resolves.toBeUndefined();
    const b = FIGURES.bee(context(), 'bee');
    click(b.node, 'As a bee sees it');
    await expect(b.done).resolves.toBeUndefined();
  });
  it('lesson 19: a maple key goes 75 m, fire wakes the heat seeds, and waiting seeds outlast droughts', async () => {
    expect(distance(15, 5, 1)).toBe(75);
    expect(sprouts('fire')).toEqual(['Snowbrush', 'Lodgepole pine']);
    expect(sprouts('none')).toEqual([]);
    for (let s = 3; s < 10; s++) {
      expect(hedge(1, 40, s)).toContain(0);
      expect(hedge(0.5, 40, s)).not.toContain(0);
    }
    const d = FIGURES.drop(context(), 'compare');
    click(d.node, 'Dandelion');
    await expect(d.done).resolves.toBeUndefined();
    const b = FIGURES.bank(context(), 'fire');
    guess(b.node, 'The ones that need heat');
    click(b.node, 'A fire');
    await expect(b.done).resolves.toBeUndefined();
    const h = FIGURES.hedge(context(), 'hedge');
    setSlider(h.node, 0, 0.5);
    await expect(h.done).resolves.toBeUndefined();
  });
  it('lesson 20: some poison is best, free poison is all-out, and a late specialist leaves a bigger radiation', async () => {
    expect(best(0.1)).toBe(0);
    expect(best(0.5)).toBeGreaterThan(0.3);
    expect(best(0.5)).toBeLessThan(1);
    expect(best(0.5, { free: true })).toBe(1);
    expect(best(0.5, { tolerant: true })).toBe(0);
    expect(radiate('mustard', FAST, SLOW, 45).tips).toBeGreaterThan(3 * radiate('mustard', FAST, SLOW, 5).tips);
    const c = FIGURES.cost(context(), 'free');
    guess(c.node, 'No: too much costs more than it saves');
    click(c.node, 'Defence is free');
    await expect(c.done).resolves.toBeUndefined();
    const e = FIGURES.escape(context(), 'radiate');
    setSlider(e.node, 0, 10);
    setSlider(e.node, 0, 50);
    await expect(e.done).resolves.toBeUndefined();
  });
  it('lesson 21: by looks the lotus sits with water lilies, by DNA with plane trees', async () => {
    expect(lotusKin(BY_LOOKS)).toEqual(['Water lily']);
    expect(lotusKin(BY_DNA)).toEqual(['Plane tree', 'Protea']);
    const l = FIGURES.lotus(context(), 'dna');
    guess(l.node, 'Plane trees');
    click(l.node, 'Read from DNA');
    await expect(l.done).resolves.toBeUndefined();
  });
  it('lesson K1: stamen classes and families group the flowers differently', async () => {
    expect(sortBy('cls').length).toBe(4);
    expect(sortBy('family').find(([n]) => n === 'Rose family')![1].map((b) => b.name)).toEqual(['Lady’s mantle', 'Apple', 'Strawberry']);
    const s = FIGURES.sort(context(), 'both');
    guess(s.node, 'The rose family, with apples');
    click(s.node, 'By family');
    await expect(s.done).resolves.toBeUndefined();
  });
  it('lesson K2: the key names every plant, and features narrow to one', async () => {
    for (const p of PLANTS) expect(walk(p).name).toBe(p.id);
    expect(fits({ leaves: 'opposite', leaf: 'any', flower: 'lipped', petals: 'any' }).map((p) => p.id)).toEqual(['selfheal']);
    const k = FIGURES.key(context(), 'keyed');
    for (const id of ['rose', 'selfheal']) {
      for (const step of walk(plant(id)).path) {
        const c = KEY.find((x) => x.n === Number(step.slice(0, -1)))!;
        click(k.node, step.endsWith('a') ? c.a.text : c.b.text);
      }
      click(k.node, 'Another plant');
    }
    await expect(k.done).resolves.toBeUndefined();
    const m = FIGURES.multi(context(), 'one');
    click(m.node, 'two-lipped');
    click(m.node, 'opposite');
    await expect(m.done).resolves.toBeUndefined();
  });
  it('lesson C1: hybrids crossed give about one short in four, and pure tall hides the short', async () => {
    const kids = cross('Tt', 'Tt', 4000, 3);
    const short = kids.filter((k) => k === 'tt').length / 4000;
    expect(short).toBeGreaterThan(0.22);
    expect(short).toBeLessThan(0.28);
    expect(cross('TT', 'tt', 100, 1).every((k) => k === 'Tt')).toBe(true);
    const c = FIGURES.cross(context(), 'ratio');
    guess(c.node, 'About a quarter');
    setSlider(c.node, 0, 400);
    await expect(c.done).resolves.toBeUndefined();
  });
  it('lesson C2: all four changes turn teosinte into maize', async () => {
    const c = FIGURES.corn(context(), 'maize');
    guess(c.node, 'Four or five');
    for (const n of ['One main stalk', 'Naked kernels', 'Ear stays whole', 'Many rows']) click(c.node, n);
    await expect(c.done).resolves.toBeUndefined();
  });
  it('lesson C3: fallow wins in the dry belt and annual wheat in the wet Palouse', async () => {
    expect(twoYears(29).fallow).toBeGreaterThan(twoYears(29).annual);
    expect(twoYears(53).annual).toBeGreaterThan(twoYears(53).fallow);
    expect(crossover).toBeGreaterThan(30);
    expect(crossover).toBeLessThan(36);
    const f = FIGURES.fallow(context(), 'both');
    guess(f.node, 'More');
    setSlider(f.node, 0, 22);
    setSlider(f.node, 0, 55);
    await expect(f.done).resolves.toBeUndefined();
  });
  it('lesson C4: a graft takes only with cambium against cambium, and grafted trees all match', async () => {
    expect(takes(0)).toBe(false);
    expect(takes(13)).toBe(true);
    const g = FIGURES.graft(context(), 'take');
    guess(g.node, 'At one side, bark edge to bark edge');
    setSlider(g.node, 0, 13);
    await expect(g.done).resolves.toBeUndefined();
    const s = FIGURES.seedlings(context(), 'graft');
    guess(s.node, 'Hardly any');
    click(s.node, 'Graft instead');
    await expect(s.done).resolves.toBeUndefined();
  });
  it('lesson O1: two touches close together shut the trap, far apart they do not, and five start digestion', async () => {
    expect(touch(touch(fresh(), 10), 10).shut).toBe(true);
    expect(touch(touch(fresh(), 60), 60).shut).toBe(false);
    let s = fresh();
    for (let k = 0; k < 5; k++) s = touch(s, 5);
    expect(s.digesting).toBe(true);
    const f = FIGURES.flytrap(context(), 'digest');
    guess(f.node, 'A second touch, soon after');
    click(f.node, 'Touch a trigger hair');
    click(f.node, 'Touch a trigger hair');
    setSlider(f.node, 0, 5);
    for (let k = 0; k < 5; k++) click(f.node, 'Touch a trigger hair');
    await expect(f.done).resolves.toBeUndefined();
  });
  it('lesson O2: dodder seedlings mostly reach the tomato', async () => {
    const r = Array.from({ length: 40 }, (_, k) => seek('tomato', 'wheat', k).reached);
    expect(r.filter((x) => x === 'left').length).toBeGreaterThan(25);
    const d = FIGURES.dodder(context(), 'tomato');
    guess(d.node, 'Towards the tomato');
    await expect(d.done).resolves.toBeUndefined();
  });
  it('lesson O3: a browsed clone thins and a fenced one fills in', async () => {
    expect(stems(grove(150, true)[150])).toBeLessThan(stems(grove(150, true)[0]) / 3);
    expect(stems(grove(150, false)[150])).toBeGreaterThan(stems(grove(150, false)[0]));
    const c = FIGURES.clone(context(), 'fence');
    guess(c.node, 'It thins as old trunks die');
    setSlider(c.node, 0, 120);
    click(c.node, 'Fence out deer and elk');
    setSlider(c.node, 0, 120);
    await expect(c.done).resolves.toBeUndefined();
  });
  it('lesson O4: the lotus holds about 32 °C down to about 10 °C air, burning more as it cools', async () => {
    expect(flower(15).temp).toBeCloseTo(32);
    expect(flower(5).temp).toBeLessThan(32);
    expect(flower(10).watts).toBeGreaterThan(flower(20).watts);
    expect(starch(1)).toBeCloseTo(2.1, 1);
    const h = FIGURES['lotus-heat'](context(), 'cold');
    guess(h.node, 'Burns more and stays warm');
    setSlider(h.node, 0, 8);
    setSlider(h.node, 0, 30);
    await expect(h.done).resolves.toBeUndefined();
  });
});
