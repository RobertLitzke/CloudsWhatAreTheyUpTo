// Lesson 1, Seashells on mountaintops: how sediment settles into layers, and
// reading the order of events in a cliff.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { BEDS, COL, choices, figure, frame, lock, lockIn, slider } from './kit';

const W = 400;

// ---- Settling into a basin --------------------------------------------------------

/** The basin's floor: a slope with two humps, as a sea floor with old hills on it. */
const N = 120;
const xAt = (i: number) => 20 + (i / (N - 1)) * 360;
const floor = Array.from({ length: N }, (_, i) => {
  const x = i / (N - 1);
  return 210 - 45 * x - 38 * Math.exp(-(((x - 0.3) / 0.08) ** 2)) - 28 * Math.exp(-(((x - 0.72) / 0.07) ** 2));
});
const WATER = 36;

/**
 * The surface after each of `layers` layers settles. Part of each layer drapes
 * an even coat over everything; the rest, carried by currents (0 to 1), rolls
 * and washes into the lowest places first, filling them up to a level. The
 * more the water moves, the more of each layer fills hollows instead of
 * draping, and the flatter its top.
 */
function settle(layers: number, currents: number): number[][] {
  const tops: number[][] = [];
  let s = floor.slice();
  const coat = 13;
  for (let k = 0; k < layers; k++) {
    // Drawing y runs down, so "lower" ground has a larger y.
    const drape = s.map((y) => y - coat * (1 - currents));
    // Fill up to the level that holds the rest of the layer.
    const want = coat * currents * N;
    let lo = Math.min(...drape) - 1;
    let hi = Math.max(...drape) + 1;
    for (let it = 0; it < 40; it++) {
      const level = (lo + hi) / 2;
      const held = drape.reduce((t, y) => t + Math.max(0, y - level), 0);
      if (held > want) lo = level;
      else hi = level;
    }
    s = drape.map((y) => Math.min(y, hi));
    tops.push(s.slice());
  }
  return tops;
}

/** How far a surface is from flat: the spread of its heights, in drawing units. */
const roughness = (s: number[]) => Math.max(...s) - Math.min(...s);

export const settleFigure = figure(['flat'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let layers = 0;
  let currents = 0.5;
  const area = (top: number[], bottom: number[], fill: string) =>
    svg('path', { d: `M${top.map((y, i) => `${xAt(i)},${y}`).join(' L')} L${bottom.map((_, i) => `${xAt(N - 1 - i)},${bottom[N - 1 - i]}`).join(' L')} Z`, fill, stroke: COL.paper, 'stroke-width': 0.6 });
  const paint = () => {
    const tops = settle(layers, currents);
    const ground = floor.map((y) => y);
    const beds = tops.map((top, k) => area(top, k ? tops[k - 1] : ground, BEDS[(k + 1) % BEDS.length]));
    redraw(g,
      svg('rect', { x: 20, y: WATER, width: 360, height: 220 - WATER, fill: COL.water, opacity: 0.18 }),
      line(20, WATER, 380, WATER, COL.water, 1.5),
      small(24, WATER - 5, 'water surface', { fill: COL.water }),
      area(floor, floor.map(() => 228), '#a39282'),
      ...beds,
      note(30, 222, 'old sea floor', { fill: COL.paper }),
    );
    if (!layers) f.readout.textContent = 'Nothing has settled yet. Add layers with the slider.';
    else {
      const top = tops[tops.length - 1];
      const r = roughness(top);
      const share = Math.round((100 * r) / roughness(floor));
      f.readout.textContent = currents < 0.1
        ? 'In perfectly still water each layer is an even coat, so the layers keep the shape of the floor. Real water is rarely this still.'
        : r < 12
          ? `Grains washed into the hollows, so each layer filled the low places first. After ${layers} layers the top is almost level.`
          : `Each layer fills the hollows a little. The top's ups and downs are now ${share}% of the floor's. Add more layers, or more current.`;
      if (r < 12 && t.goal === 'flat') t.done();
    }
  };
  const time = slider('Layers', 0, 8, 1, 0, (v) => `${v}`, (v) => { layers = v; paint(); }, 'young');
  const stir = slider('Currents', 0, 100, 5, 50, (v) => (v < 10 ? 'still' : v < 60 ? 'gentle' : 'strong'), (v) => { currents = v / 100; paint(); }, 'water');
  const sliders = [time, stir];
  const pick = choices(['They follow the bumps', 'They tilt like the floor', 'They fill the hollows and level out'], () => (go.disabled = false));
  const go = lockIn('Lock it in', () => {
    const guess = pick.picked();
    if (guess < 0) return;
    t.keep(guess);
    pick.freeze(true);
    go.remove();
    lock(sliders, false);
    paint();
    f.readout.textContent = guess === 2
      ? 'Your guess: they level out. Add layers and see.'
      : 'Your guess is down. Add layers and see what happens.';
  });
  go.disabled = true;
  lock(sliders, true);
  f.controls.append(pick.node, go, time.node, stir.node);
  paint();
  f.readout.textContent = 'Mud and sand settle into this basin, whose floor is lumpy and tilted. What shape will the layers take? Guess first.';
  if (typeof t.kept === 'number') {
    pick.pick(t.kept);
    go.click();
  }
  return f.node;
});

// ---- Reading a cliff ---------------------------------------------------------------

interface Event {
  id: string;
  says: string;
  /** Why it is not next yet, when tapped too early. */
  early: string;
}

const EVENTS: Event[] = [
  { id: 'A', says: 'Layer A settles', early: '' },
  { id: 'B', says: 'Layer B settles', early: 'B lies on A, so A had to be there first.' },
  { id: 'C', says: 'Layer C settles', early: 'C lies on B; B came first.' },
  { id: 'fault', says: 'A crack (fault) shifts A, B and C', early: 'The crack breaks A, B and C, so all three were there before it.' },
  { id: 'D', says: 'The top is worn level, and layer D settles on it', early: 'D is not broken by the crack, so the crack came before D.' },
  { id: 'dike', says: 'Melted rock fills a crack (dike) through everything', early: 'The dike cuts through D as well, so it is the youngest.' },
];

/** A cliff of four layers, a fault through the lower three, and a dike through all; tap the events oldest first. */
export const orderFigure = figure(['ordered'], (_ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let done = 0;
  const shown = (id: string) => EVENTS.findIndex((e) => e.id === id) < done;
  const top = 70;
  // The fault runs from (176, 236) up to (208, top + 22).
  const xf = (y: number) => 176 + ((236 - y) * 32) / (236 - (top + 22));
  const drop = 22;
  const paint = () => {
    const bed = (i: number, y0: number, y1: number, id: string, worn = 0) => {
      if (!shown(id)) return [];
      const o = shown('fault') ? drop : 0;
      // Once D is laid, the raised side has been worn down level with the dropped side.
      const top = shown('D') ? Math.max(y0, y0 + worn) : y0;
      return [
        svg('polygon', { points: `20,${top} ${xf(top)},${top} ${xf(y1)},${y1} 20,${y1}`, fill: BEDS[i] }),
        svg('polygon', { points: `${xf(y0 + o)},${y0 + o} 380,${y0 + o} 380,${y1 + o} ${xf(y1 + o)},${y1 + o}`, fill: BEDS[i] }),
        label(40, (top + y1) / 2 + 4, id, { bold: true }),
        label(350, (y0 + y1) / 2 + 4 + o, id, { bold: true, anchor: 'middle' }),
      ];
    };
    redraw(g,
      svg('rect', { x: 20, y: 40, width: 360, height: 196, fill: COL.grid }),
      ...bed(0, 170, 236, 'A'),
      ...bed(1, 130, 170, 'B'),
      ...bed(2, top + 25, 130, 'C', drop),
      // The lowest layer's broken-off end runs below the frame.
      svg('rect', { x: 20, y: 236, width: 360, height: 10, fill: COL.paper }),
      ...(shown('fault') ? [line(176, 236, 208, top + 22, COL.ink, 2.4), small(212, top + 30, 'fault')] : []),
      ...(shown('D') ? [svg('rect', { x: 20, y: top - 10, width: 360, height: 35 + drop, fill: BEDS[3] }), label(40, top + 12, 'D', { bold: true })] : []),
      ...(shown('dike') ? [svg('polygon', { points: `292,${top - 10} 304,${top - 10} 300,236 288,236`, fill: COL.heat }), small(308, top + 4, 'dike', { fill: COL.heat })] : []),
    );
  };
  const order = [4, 1, 5, 0, 3, 2];
  const buttons = order.map((k) => {
    const e = EVENTS[k];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-ghost wide';
    b.textContent = e.says;
    b.onclick = () => {
      if (k === done) {
        done++;
        b.disabled = true;
        b.classList.add('on');
        t.keep(done);
        f.readout.textContent = done === EVENTS.length
          ? 'Right: A, B, C, then the fault, then D, and the dike last. A layer is younger than the one under it, and anything that cuts through rock is younger than the rock it cuts.'
          : `${e.says}: yes. What happened next?`;
        paint();
        if (done === EVENTS.length && t.goal === 'ordered') t.done();
      } else {
        f.readout.textContent = `Not yet. ${e.early}`;
      }
    };
    return b;
  });
  const list = document.createElement('div');
  list.className = 'answer-list';
  list.append(...buttons);
  f.controls.append(list);
  // The cliff as it is today, before taking it apart.
  const today = () => {
    const was = done;
    done = EVENTS.length;
    paint();
    done = was;
  };
  if (typeof t.kept === 'number' && t.kept > 0) {
    for (let i = 0; i < t.kept; i++) buttons[order.indexOf(i)].click();
  } else {
    today();
    f.readout.textContent = 'This is the cliff as it stands. Tap the events below from oldest to youngest, and the cliff builds up as you go.';
  }
  return f.node;
});

// ---- Tongue stones, to scale --------------------------------------------------------

/** A still: a tongue stone beside a modern shark's tooth, the same shape, saw edges and all. Drawn, with a scale bar. */
export const toothStill = () => {
  const s = svg('svg', { viewBox: `0 0 ${W} 170`, class: 'fig-svg', role: 'img' });
  /** A serrated crown on a two-lobed root. */
  const tooth = (x: number, crown: string, root: string, edge: string) => {
    const left: string[] = [];
    const right: string[] = [];
    for (let k = 0; k <= 14; k++) {
      const f = k / 14;
      const y = 112 - f * 92;
      const half = 30 * (1 - f) ** 0.9;
      const bump = k % 2 ? 1.6 : 0;
      left.push(`${x - half - bump},${y}`);
      right.unshift(`${x + half + bump},${y}`);
    }
    return [
      svg('path', { d: `M${x - 36},112 L${x - 42},132 Q${x - 22},130 ${x - 8},122 L${x},118 L${x + 8},122 Q${x + 22},130 ${x + 42},132 L${x + 36},112 Z`, fill: root, stroke: edge, 'stroke-width': 1.2 }),
      svg('polygon', { points: [...left, ...right].join(' '), fill: crown, stroke: edge, 'stroke-width': 1.2 }),
    ];
  };
  const rng = makeRng(7);
  const grain = Array.from({ length: 36 }, () => {
    const f = rng();
    return svg('circle', { cx: 110 + (rng() - 0.5) * 50 * (1 - f), cy: 112 - f * 88, r: 0.9, fill: COL.fossil, opacity: 0.5 });
  });
  s.append(
    svg('rect', { width: W, height: 170, fill: COL.paper }),
    ...tooth(110, '#c9b79c', '#a99377', COL.fossil), ...grain,
    ...tooth(290, '#f7f3ea', '#e4d9c6', COL.soft),
    note(110, 150, 'Tongue stone, dug out of rock', { anchor: 'middle', bold: true }),
    note(290, 150, 'Tooth of a living shark', { anchor: 'middle', bold: true }),
    line(189, 40, 211, 40, COL.ink, 2), small(200, 33, '1 cm', { anchor: 'middle' }),
  );
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
