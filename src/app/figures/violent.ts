// Figures for what makes a storm violent: the fuel a bubble gains on its way
// up (Lesson 5's chart, with the area between the lines measured), the cap
// that holds the bubbles down through a spring day, the wind's change with
// height that sorts storms into showers, clusters, lines and supercells, and
// the hail an updraft can hold up.

import { el, svg } from 'didactics/dom';
import { parcelAt } from '../../core/air';
import { TOP_M, breakC, capBreak, dayGroundC, hailFall, hailHeld, hailName, stormEnvC, stormFuel, stormKind, type StormKind } from '../../core/violent';
import { arrow, heapAt, line, note, points, polyline, redraw, small, still, type P } from './draw';
import { COL, choices, deg, figure, frame, height, lock, lockIn, slider, tint, type FigureFactory } from './kit';

const FIELD = '#a39150';

/** A speed in m/s, and in km/h for those who think in those. */
const speed = (ms: number) => `${Math.round(ms)} m/s (${Math.round(ms * 3.6)} km/h)`;

const fuelWords = (cape: number) => (cape < 300 ? 'next to none' : cape < 1000 ? 'a little' : cape < 2500 ? 'plenty' : 'a great deal');

// ---- Fuel: the area between the lines ---------------------------------------

const FUEL_GUESSES = ['Hardly changes: the heat is what matters', 'Roughly doubles', 'Grows four times or more'] as const;
const FUEL_RIGHT = 2;

export const fuelSoundingFigure = figure(['fuel'], (ctx, t) => {
  const W = 400;
  const H = 300;
  const f = frame(W, H, 4);
  const bottom = 280;
  const yOf = (m: number) => bottom - (m / TOP_M) * 264;
  const cx0 = 44;
  const cx1 = 300;
  const tMin = -70;
  const tMax = 40;
  const xOf = (c: number) => cx0 + ((c - tMin) / (tMax - tMin)) * (cx1 - cx0);
  let ground = 32;
  let dew = 12;
  const grid = svg('g');
  for (let m = 0; m <= TOP_M; m += 2000) grid.append(line(cx0, yOf(m), cx1, yOf(m), COL.grid, 1), small(cx0 - 4, yOf(m) + 3, height(m, ctx.save.units), { anchor: 'end' }));
  for (let c = -60; c <= 30; c += 30) grid.append(line(xOf(c), yOf(0), xOf(c), yOf(TOP_M), COL.grid, 1), small(xOf(c), bottom + 14, deg(c), { anchor: 'middle' }));
  const live = svg('g');
  f.svg.append(svg('rect', { x: 306, y: 0, width: W - 306, height: bottom, fill: COL.sky }), svg('rect', { x: 306, y: bottom, width: W - 306, height: H - bottom, fill: FIELD }), grid, live);
  const paint = () => {
    const a = { groundC: ground, dewC: dew, capC: 0 };
    const fuel = stormFuel(a);
    const env: P[] = [];
    const parcel: P[] = [];
    const warm: P[] = [];
    const warmEnv: P[] = [];
    for (let h = 0; h <= TOP_M; h += 100) {
      const e = stormEnvC(h, a);
      const p = parcelAt(h, ground, dew).tempC;
      env.push([xOf(e), yOf(h)]);
      if (h <= fuel.topM + 600) parcel.push([xOf(p), yOf(h)]);
      if (h <= fuel.topM && p > e) {
        warm.push([xOf(p), yOf(h)]);
        warmEnv.push([xOf(e), yOf(h)]);
      }
    }
    // The cloud beside the chart: from its base to where the bubble stops.
    const top = Math.max(fuel.topM, fuel.baseM);
    const cloud = fuel.topM > fuel.baseM + 200
      ? svg('path', { d: `M314,${yOf(fuel.baseM)} C308,${yOf(top) + 30} 330,${yOf(top)} 352,${yOf(top)} C374,${yOf(top)} 398,${yOf(top) + 30} 392,${yOf(fuel.baseM)} Z`, fill: '#fff', stroke: COL.cloudShade, 'stroke-width': 1.2 })
      : null;
    redraw(live,
      warm.length > 1 ? svg('polygon', { points: points([...warm, ...warmEnv.reverse()]), fill: tint(COL.parcel, 0.35) }) : null,
      polyline(env, COL.env, 2.5),
      polyline(parcel, COL.parcel, 2.5),
      cloud,
      line(cx0, yOf(fuel.baseM), 306, yOf(fuel.baseM), COL.dew, 1, { 'stroke-dasharray': '3 3' }),
      small(cx1 - 2, yOf(fuel.baseM) + 12, `cloud base ${height(fuel.baseM, ctx.save.units)}`, { anchor: 'end', fill: COL.dew, halo: COL.paper }),
      small(xOf(stormEnvC(7000, a)) - 4, yOf(7000), 'the air', { anchor: 'end', fill: COL.env, halo: COL.paper }),
      small(xOf(parcelAt(9000, ground, dew).tempC) + 4, yOf(9000), 'the bubble', { fill: COL.warmInk, halo: COL.paper }),
    );
    if (asking) {
      f.readout.textContent = `A hot afternoon, ${deg(ground)}, with a dew point of ${deg(dew)}. The orange area between the lines is the bubble’s fuel: ${fuel.cape.toLocaleString()} J/kg, ${fuelWords(fuel.cape)}. Now damper air comes north from the Gulf, and the dew point rises to ${deg(20)}. What happens to the fuel?`;
      return;
    }
    const verdict = pick.picked() < 0 || ground !== 32 || dew !== 20 ? '' : pick.picked() === FUEL_RIGHT ? 'As you guessed: ' : 'Not what you guessed: ';
    f.readout.textContent = `${verdict}${fuel.cape.toLocaleString()} J/kg of fuel, ${fuelWords(fuel.cape)}. The bubble turns to cloud at ${height(fuel.baseM, ctx.save.units)}, and from there its condensing water keeps it warmer than the air ${fuel.topM > fuel.baseM ? `up to ${height(fuel.topM, ctx.save.units)}` : 'for no distance at all'}. An updraft of about ${speed(fuel.updraft)}.`;
    if (t.goal === 'fuel' && fuel.cape >= 2500) t.done();
  };
  let asking = t.goal === 'fuel';
  const groundS = slider('Ground temperature', 20, 38, 1, ground, (v) => deg(v), (v) => { ground = v; if (dew > v) dewS.set((dew = v)); paint(); }, 'parcel');
  const dewS = slider('Dew point', 4, 26, 1, dew, (v) => deg(v), (v) => { dew = Math.min(v, ground); paint(); }, 'dew');
  const pick = choices(FUEL_GUESSES, () => (markIt.disabled = false));
  const markIt = lockIn('Bring in the damp air', () => {
    asking = false;
    t.keep(pick.picked());
    pick.freeze(true);
    markIt.hidden = true;
    lock([groundS, dewS], false);
    dew = 20;
    dewS.set(20);
    paint();
  });
  markIt.disabled = true;
  if (asking) f.controls.append(el('div.fig-guess', {}, pick.node, markIt));
  f.controls.append(groundS.node, dewS.node);
  lock([groundS, dewS], asking);
  if (asking && typeof t.kept === 'number' && FUEL_GUESSES[t.kept]) {
    pick.pick(t.kept);
    markIt.click();
  }
  paint();
  return f.node;
});

// ---- The cap through a spring day ------------------------------------------

const CAP_GUESSES = ['No cap at all', 'A middling cap', 'A strong cap'] as const;
const CAP_RIGHT = 1;

export const capDayFigure = figure(['cap'], (_ctx, t) => {
  const W = 400;
  const H = 270;
  const f = frame(W, H, 4);
  const x0 = 40;
  const x1 = 390;
  const xOf = (hour: number) => x0 + ((hour - 5) / 15) * (x1 - x0);
  const yOf = (c: number) => 170 - ((c - 14) / 24) * 150;
  const earth = 258;
  const clock = (h: number) => `${Math.floor(h) % 12 === 0 ? 12 : Math.floor(h) % 12}${h % 1 ? `:${String(Math.round((h % 1) * 60)).padStart(2, '0')}` : ''} ${h < 12 ? 'a.m.' : 'p.m.'}`;
  const day: P[] = [];
  for (let h = 5; h <= 20; h += 0.25) day.push([xOf(h), yOf(dayGroundC(h))]);
  const grid = svg('g');
  for (const h of [6, 9, 12, 15, 18]) grid.append(line(xOf(h), 20, xOf(h), 170, COL.grid, 1), small(xOf(h), 184, clock(h), { anchor: 'middle' }));
  for (const c of [20, 30]) grid.append(small(x0 - 4, yOf(c) + 3, deg(c), { anchor: 'end' }));
  let cap = 0;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), svg('rect', { x: 0, y: 192, width: W, height: earth - 192, fill: COL.sky }), svg('rect', { x: 0, y: earth, width: W, height: H - earth, fill: FIELD }), grid, polyline(day, COL.parcel, 3), small(xOf(6.6), yOf(dayGroundC(6.6)) + 14, 'the ground', { fill: COL.warmInk, bold: true }), g);
  const paint = () => {
    const need = breakC(cap);
    const br = capBreak(cap);
    const storm = br ? (br.fuel.cape > 2200 ? 2 : 1) : 0;
    redraw(g,
      line(x0, yOf(need), x1, yOf(need), COL.env, 2, { 'stroke-dasharray': '6 3' }),
      small(x1, yOf(need) - 6, cap === 0 ? 'hot enough for bubbles to rise' : 'hot enough to break the cap', { anchor: 'end', fill: COL.env, bold: true }),
      ...(br ? [
        svg('circle', { cx: xOf(br.hour), cy: yOf(br.groundC), r: 6, fill: COL.red }),
        line(xOf(br.hour), yOf(br.groundC), xOf(br.hour), 192, COL.red, 1.5),
        ...(storm === 2
          ? [heapAt(xOf(br.hour) + 20, earth - 2, 50, 58)]
          : [0, 1, 2, 3].map((i) => heapAt(xOf(br.hour) + 14 + i * 34, earth - 2, 20, 18 + (i % 2) * 6))),
        small(W - 6, 206, storm === 2 ? 'a few towering storms' : 'many ordinary showers', { anchor: 'end', bold: true }),
      ] : [small(W - 6, 230, 'the cap holds all day: hot, hazy, no storms', { anchor: 'end', fill: COL.soft, bold: true })]),
    );
    if (asking) {
      f.readout.textContent = 'A spring day on the Plains: damp air near the ground, cold air high up, plenty of fuel. Which cap makes the worst storm of the day?';
      return;
    }
    const verdict = pick.picked() < 0 ? '' : pick.picked() === CAP_RIGHT ? 'As you guessed. ' : 'Not what you guessed. ';
    f.readout.textContent = verdict + (!br
      ? 'The cap is too warm for even the afternoon’s hottest bubbles. The fuel sits there unused, and the day ends without a storm.'
      : cap === 0
        ? `With no cap, bubbles rise from ${clock(br.hour)}, as soon as the ground warms. Heaps sprout everywhere, the sky clouds over, the ground stops warming, and the fuel is spent in many ordinary showers.`
        : `The cap holds every bubble down until ${clock(br.hour)}, while the sun keeps heating the ground and the fuel keeps growing, to ${br.fuel.cape.toLocaleString()} J/kg. When it finally gives, it gives in a few places at once, and all that fuel goes into a few towering storms.`);
    if (t.goal === 'cap' && !asking && br && br.fuel.cape > 2400) t.done();
  };
  let asking = t.goal === 'cap';
  const capS = slider('The cap: how much warmer than the air under it', 0, 4, 0.5, cap, (v) => (v ? `${v} °C warmer` : 'no cap'), (v) => { cap = v; paint(); }, 'env');
  const pick = choices(CAP_GUESSES, () => (markIt.disabled = false));
  const markIt = lockIn('Run the day', () => {
    asking = false;
    t.keep(pick.picked());
    pick.freeze(true);
    markIt.hidden = true;
    lock([capS], false);
    paint();
  });
  markIt.disabled = true;
  if (asking) f.controls.append(el('div.fig-guess', {}, pick.node, markIt));
  f.controls.append(capS.node);
  lock([capS], asking);
  if (asking && typeof t.kept === 'number' && CAP_GUESSES[t.kept]) {
    pick.pick(t.kept);
    markIt.click();
  }
  paint();
  return f.node;
});

// ---- Shear sorts the storms ---------------------------------------------------

const KIND_WORDS: Record<StormKind, string> = {
  none: 'No storm: the bubbles hardly rise.',
  shower: 'A shower: heaps that rain briefly and fade.',
  single: 'A single storm. Its rain falls straight back down through its own updraft, choking it, and it rains itself out within the hour.',
  multicell: 'A cluster. Each storm’s cold outflow lifts new bubbles where the wind brings in fresh warm air, so new towers keep growing on one side as old ones die on the other: hours of storms.',
  line: 'A line. Not much fuel, but a strong wind: the storms join along their gust fronts into a squall line that marches along for hours.',
  supercell: 'A supercell. The updraft leans downwind, away from its rain, so nothing chokes it; the turning wind sets it spinning. One storm that can last four hours, with the biggest hail and the strongest tornadoes.',
};

const SHEAR_GUESSES = ['Dies sooner: the wind tears it apart', 'Much the same', 'Lasts far longer'] as const;
const SHEAR_RIGHT = 2;

export const stormSorterFigure = figure(['supercell'], (_ctx, t) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 4);
  const ground = 222;
  let cape = 2500;
  let shear = 10;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: ground, fill: COL.sky }), svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: FIELD }), g);
  /** One storm: a tower from the ground at x, leaning by `lean` px at the top, `tall` px high, with an anvil, and rain on one side. */
  const tower = (x: number, lean: number, tall: number, rainAt: number, scale = 1): SVGElement[] => {
    const top = ground - 30 - tall * scale;
    const w = 46 * scale;
    const base = ground - 34;
    const body = svg('path', {
      d: `M${x - w / 2},${base} C${x - w / 2 + lean * 0.3},${base - tall * 0.5 * scale} ${x - w / 2 + lean * 0.8},${top + 20} ${x + lean - 10},${top} L${x + lean + 10},${top} C${x + w / 2 + lean * 0.8},${top + 20} ${x + w / 2 + lean * 0.3},${base - tall * 0.5 * scale} ${x + w / 2},${base} Z`,
      fill: '#ffffff', stroke: COL.cloudShade, 'stroke-width': 1.2,
    });
    const anvil = tall * scale > 90 ? svg('path', { d: `M${x + lean - 40 * scale},${top + 8} Q${x + lean},${top - 10} ${x + lean + 70 * scale},${top + 4} L${x + lean + 66 * scale},${top + 12} Q${x + lean},${top + 4} ${x + lean - 36 * scale},${top + 14} Z`, fill: '#f6f4fa', stroke: COL.cloudShade }) : null;
    const rain = Array.from({ length: 6 }, (_, i) => line(rainAt + (i - 3) * 6 * scale, base + 2, rainAt + (i - 3) * 6 * scale - 3, ground - 2, COL.rain, 1.4));
    return [...(anvil ? [anvil] : []), body, ...rain];
  };
  const paint = () => {
    const kind = stormKind(cape, shear);
    const tall = Math.min(170, 40 + cape / 22);
    const lean = Math.min(90, shear * 1.1);
    const parts: SVGElement[] = [];
    if (kind === 'none') parts.push(heapAt(200, ground - 30, 30, 14));
    else if (kind === 'shower') parts.push(heapAt(200, ground - 30, 50, 40), ...Array.from({ length: 4 }, (_, i) => line(186 + i * 8, ground - 30, 183 + i * 8, ground - 2, COL.rain, 1.2)));
    else if (kind === 'single') {
      parts.push(...tower(190, lean, tall, 190 + lean * 0.4));
      parts.push(arrow(178, ground - 40, 178, ground - 30 - tall * 0.6, COL.parcel, 2.5), arrow(204, ground - 30 - tall * 0.5, 204, ground - 12, COL.rain, 2.5));
      parts.push(small(214, ground - 30 - tall * 0.3, 'rain falls into its updraft', { fill: COL.coldInk, halo: '#fff' }));
    } else if (kind === 'multicell' || kind === 'line') {
      [[110, 0.6], [200, 1], [290, 0.75]].forEach(([x, s], i) => parts.push(...tower(x, lean * s, tall * s, x + (i === 0 ? 10 : 30), s)));
      parts.push(small(90, ground + 18, kind === 'line' ? 'storms joined in a line' : 'dying', { fill: '#fff', bold: true }), small(300, ground + 18, kind === 'line' ? '' : 'new growth', { fill: '#fff', bold: true, anchor: 'middle' }));
    } else {
      parts.push(...tower(150, lean, tall, 150 + lean + 40));
      parts.push(arrow(140, ground - 40, 150 + lean * 0.5, ground - 30 - tall * 0.65, COL.parcel, 3));
      parts.push(svg('ellipse', { cx: 158, cy: ground - 30 - tall * 0.4, rx: 26, ry: 8, fill: 'none', stroke: COL.env, 'stroke-width': 2 }));
      parts.push(small(186, ground - 30 - tall * 0.4 + 4, 'the updraft turns', { fill: COL.env, bold: true, halo: '#fff' }));
      parts.push(small(150 + lean + 40, ground + 16, 'rain falls clear of it', { fill: '#fff', bold: true, anchor: 'middle' }));
    }
    // The wind at three heights: the change with height is the shear.
    const winds = [0, 0.5, 1].map((k) => {
      const y = ground - 40 - k * 150;
      const len = 10 + shear * k * 0.7;
      return [arrow(W - 70, y, W - 70 + len, y, COL.ink, 1.6), small(W - 74, y + 3, k === 0 ? 'ground' : k === 1 ? '6 km' : '3 km', { anchor: 'end', soft: true })];
    }).flat();
    redraw(g, ...parts, ...winds, small(W - 8, 14, 'wind', { anchor: 'end', bold: true }));
    if (asking) {
      f.readout.textContent = `${KIND_WORDS[kind]} Now the same fuel, but the wind 6 km up blows 80 km/h faster than the wind at the ground. The storm…`;
      return;
    }
    const verdict = pick.picked() < 0 || shear !== 80 || cape !== 2500 ? '' : pick.picked() === SHEAR_RIGHT ? 'As you guessed. ' : 'Not what you guessed. ';
    f.readout.textContent = verdict + KIND_WORDS[kind];
    if (t.goal === 'supercell' && !asking && kind === 'supercell') t.done();
  };
  let asking = t.goal === 'supercell';
  const capeS = slider('Fuel', 0, 4000, 250, cape, (v) => `${v.toLocaleString()} J/kg`, (v) => { cape = v; paint(); }, 'parcel');
  const shearS = slider('Change in wind, ground to 6 km', 0, 100, 5, shear, (v) => `${v} km/h`, (v) => { shear = v; paint(); }, 'ink');
  const pick = choices(SHEAR_GUESSES, () => (markIt.disabled = false));
  const markIt = lockIn('Add the wind', () => {
    asking = false;
    t.keep(pick.picked());
    pick.freeze(true);
    markIt.hidden = true;
    lock([capeS, shearS], false);
    shear = 80;
    shearS.set(80);
    paint();
  });
  markIt.disabled = true;
  if (asking) f.controls.append(el('div.fig-guess', {}, pick.node, markIt));
  f.controls.append(capeS.node, shearS.node);
  lock([capeS, shearS], asking);
  if (asking && typeof t.kept === 'number' && SHEAR_GUESSES[t.kept]) {
    pick.pick(t.kept);
    markIt.click();
  }
  paint();
  return f.node;
});

// ---- Hail ---------------------------------------------------------------------

export const hailstoneFigure = figure(['golf'], (_ctx, t) => {
  const W = 400;
  const H = 250;
  const f = frame(W, H, 3);
  let up = 15;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.sky }), svg('rect', { x: 0, y: 230, width: 230, height: 20, fill: FIELD }), g);
  const paint = () => {
    const cm = hailHeld(up);
    const trips = Math.max(1, Math.min(6, Math.round(up / 8)));
    // The cloud: a tower whose updraft carries the stone up past the freezing level and lets it fall back, `trips` times.
    const loop: P[] = [];
    for (let i = 0; i <= 120; i++) {
      const k = i / 120;
      const a = k * trips * 2 * Math.PI;
      loop.push([80 + k * 70 + 16 * Math.sin(a), 130 - 70 * Math.min(1, up / 40) * (0.5 - 0.5 * Math.cos(a)) + k * 40]);
    }
    const r = Math.min(70, 8 + cm * 7);
    const rings = Array.from({ length: trips }, (_, i) => svg('circle', { cx: 310, cy: 120, r: r * (1 - i / trips), fill: i % 2 ? '#e9f1fb' : '#ffffff', stroke: COL.cloudShade, 'stroke-width': 1 }));
    redraw(g,
      svg('path', { d: 'M30,200 C20,120 50,30 115,24 C180,30 210,120 200,200 Z', fill: '#ffffff', stroke: COL.cloudShade }),
      line(30, 120, 205, 120, COL.ice, 1, { 'stroke-dasharray': '4 3' }),
      small(32, 116, 'freezing level', { fill: COL.ice }),
      arrow(115, 196, 115, 196 - Math.min(150, up * 3.5), COL.parcel, 2 + up / 10),
      small(122, 192, `updraft ${speed(up)}`, { fill: COL.warmInk, bold: true }),
      polyline(loop, COL.ink, 1.4, { opacity: 0.5 }),
      line(160, 170, 160, 228, COL.ink, 1.4, { 'stroke-dasharray': '3 3' }),
      ...rings,
      note(310, 210, `${cm < 0.5 ? 'under half a centimetre' : `${cm.toFixed(1)} cm`}: ${hailName(cm)}`, { anchor: 'middle', bold: true }),
      small(310, 224, `${trips} trip${trips > 1 ? 's' : ''} through the cloud, a layer for each`, { anchor: 'middle', soft: true }),
    );
    f.readout.textContent = `A stone stays up while the updraft is faster than it falls. It grows a coat of ice each time it is carried up through the supercooled water, until it is too heavy to hold: ${cm < 0.5 ? 'here, small hail or graupel' : `here, at ${cm.toFixed(1)} cm, ${hailName(cm)} hail`}, falling at about ${speed(hailFall(Math.max(0.3, cm)))}. Twice the updraft holds a stone four times as wide.`;
    if (t.goal === 'golf' && cm >= 4.2) t.done();
  };
  f.controls.append(slider('Updraft', 5, 50, 1, up, (v) => speed(v), (v) => { up = v; paint(); }, 'parcel').node);
  paint();
  return f.node;
});

// ---- A spring sky that will not break --------------------------------------------

/** Where the Plains get their storms: damp air from the Gulf under dry air off the Rockies, under the jet stream. */
export const stormRecipeDiagram: FigureFactory = () => {
  const W = 400;
  const H = 230;
  const d = still(W, H);
  const ground = 200;
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: ground, fill: COL.sky }),
    svg('polygon', { points: points([[0, ground], [0, 120], [40, 110], [80, 150], [120, 180], [150, ground]]), fill: '#8a7a48' }),
    svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: FIELD }),
    svg('rect', { x: 120, y: 160, width: 280, height: 40, fill: tint(COL.dew, 0.35) }),
    note(390, 186, 'damp air from the Gulf of Mexico', { anchor: 'end', fill: COL.dew, bold: true }),
    arrow(380, 172, 250, 172, COL.dew, 2),
    svg('rect', { x: 120, y: 120, width: 280, height: 40, fill: tint(COL.warm, 0.35) }),
    note(390, 146, 'hot, dry air off the high desert: the cap', { anchor: 'end', fill: COL.warmInk, bold: true }),
    arrow(130, 136, 250, 136, COL.warmInk, 2),
    note(390, 66, 'cold air and the jet stream above', { anchor: 'end', fill: COL.env, bold: true }),
    arrow(130, 50, 300, 40, COL.env, 4),
    small(20, 104, 'Rockies', { bold: true }),
    note(4, H - 6, 'A slice across the Plains in spring, west on the left.', { soft: true }),
  );
  return { node: d.node };
};

