// Lesson 15, A lake with no river: a drumlin field in western New York lit
// from a sun the reader moves; the crust pressed down under an ice sheet and
// rising again after it melts; and how a buried block of ice leaves a kettle.

import { el, svg } from 'didactics/dom';
import { arrow, label, line, note, redraw, small, still } from 'didactics/draw';
import { hillshade, loadRelief, mapView, reliefFor, type Relief } from 'didactics/maps';
import { asset } from '../asset';
import { COL, figure, frame, guessFirst, slider } from './kit';

const W = 400;

// ---- Drumlins under a moving sun ------------------------------------------------------

const DRUMLINS = 'maps/drumlins';
/** Light within this many degrees of across the drumlins' long axes (which run a little west of north) shows them best. */
const AXIS = 345;
const across = (az: number) => {
  const d = Math.abs(((az - AXIS + 360) % 180) - 90);
  return d;
};

export const sunFigure = figure(['lit'], (_ctx, t) => {
  const holder = el('div', {}, el('p.map-note', {}, 'Loading the map…'));
  const f = frame({ drawing: holder, lines: 3 });
  let az = 345;
  let relief: Relief | null = null;
  let view: ReturnType<typeof mapView> | null = null;
  let isOpen: () => boolean = () => false;
  const paint = () => {
    if (!relief || !view) return;
    view.paint({ shade: hillshade(relief, { azimuth: az, altitude: 25 }, 2.5), relief: 0.95, ground: '#e9e2d0' });
    const dir = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(az / 45) % 8];
    const d = across(az);
    if (!isOpen()) return;
    f.readout.textContent = d < 30
      ? `Light from the ${dir}, nearly along the hills’ long axes: they almost vanish, because the light grazes their sides equally.`
      : d > 55
        ? `Light from the ${dir}, across the hills: each one stands out, a smooth whaleback a kilometre or two long. Their blunt, steeper ends face north; their tails taper south. The ice came from the north.`
        : `Light from the ${dir}. The hills show, but not as clearly as they could.`;
    if (d > 55 && t.goal === 'lit') t.done();
  };
  const sun = slider('Sun from', 0, 359, 1, az, (v) => `${['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(v / 45) % 8]} (${v}°)`, (v) => { az = v; paint(); }, 'young');
  f.controls.append(sun.node);
  isOpen = guessFirst(t, f, {
    ask: 'This is a lidar-style map of farmland near Palmyra, New York, lit from the north-northwest. The ice sheet that covered it left the low hills you can barely see. Which way did the ice move? Guess first, then move the sun.',
    options: ['From north to south', 'From south to north', 'From west to east'],
    sliders: [sun],
    after: (guess) => {
      paint();
      f.readout.textContent = `You guessed ${['north to south', 'south to north', 'west to east'][guess]}. Move the sun until the hills stand out, and look at their shapes.`;
    },
  });
  t.waitFor(
    reliefFor((p) => loadRelief(asset(p)), DRUMLINS).then((r) => {
      relief = r;
      view = mapView(r, { alt: 'A shaded relief map of the drumlin field near Palmyra, New York: dozens of smooth, elongated hills, each a kilometre or two long, all aligned a little west of north.' });
      holder.replaceChildren(view.node, el('p.map-credit', {}, `Heights: ${r.meta.credit}`));
      paint();
    }).catch(() => holder.replaceChildren(el('p.map-note', {}, 'The map could not be loaded here.'))),
  );
  return f.node;
});

// ---- The crust under an ice sheet -------------------------------------------------------

/** Ice is about 0.3 times as dense as the mantle rock that has to flow aside. */
const ICE_OVER_MANTLE = 917 / 3300;
/** How long the rebound takes to fall to 1/e of what is left, thousand years. */
const RELAX = 4.5;

export const reboundFigure = figure(['raised'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let ice = 0;
  let kyr = 0;
  const SURF = 92;
  const KM = 28; // px per km of depth, exaggerated
  const shape = (x: number) => Math.exp(-(((x - 200) / 130) ** 2));
  const paint = () => {
    const sink = ICE_OVER_MANTLE * (ice / 1000); // km, at equilibrium under the ice
    const melted = kyr > 0;
    const left = melted ? sink * Math.exp(-kyr / RELAX) : sink;
    const ground = (x: number) => SURF + left * KM * shape(x);
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 5) pts.push(`${x},${ground(x).toFixed(1)}`);
    const parts: (SVGElement | null)[] = [
      svg('rect', { width: W, height: 220, fill: '#eef2f4' }),
      svg('polygon', { points: `0,220 ${pts.join(' ')} ${W},220`, fill: '#c9a98a' }),
      svg('polygon', { points: `0,220 ${pts.map((p) => p.replace(/,([\d.]+)$/, (_, y) => `,${(Number(y) + 34).toFixed(1)}`)).join(' ')} ${W},220`, fill: '#a0715a' }),
      small(8, 214, 'mantle: hot rock that flows, very slowly', { fill: COL.paper, bold: true }),
      small(8, SURF + 20, 'crust', { bold: true, fill: '#5d4535' }),
    ];
    if (!melted && ice > 0) {
      const top: string[] = [];
      for (let x = 60; x <= 340; x += 5) {
        const h = (ice / 1000) * 22 * Math.sqrt(Math.max(0, 1 - ((x - 200) / 140) ** 2));
        top.push(`${x},${(ground(x) - h).toFixed(1)}`);
      }
      const base: string[] = [];
      for (let x = 340; x >= 60; x -= 5) base.push(`${x},${ground(x).toFixed(1)}`);
      parts.push(svg('polygon', { points: `${top.join(' ')} ${base.join(' ')}`, fill: '#e3f0f7', stroke: '#9cc0d6', 'stroke-width': 1 }));
      parts.push(label(200, ground(200) - (ice / 1000) * 11 + 4, `ice sheet, ${(ice / 1000).toFixed(1)} km thick`, { anchor: 'middle', bold: true, size: 'note', fill: '#4f7a94' }));
      for (const s of [-1, 1]) parts.push(arrow(200 + s * 40, 180, 200 + s * 120, 180, COL.paper, 1.6));
    }
    if (melted && sink > 0) {
      // A hill by the old shore: the beach the sea cut when the ice had just gone, lifted since.
      const raised = (sink - left) * 1000;
      const hill = (x: number) => ground(x) - 46 * Math.max(0, 1 - Math.abs(x - 60) / 50);
      const hp: string[] = [];
      for (let x = 10; x <= 110; x += 4) hp.push(`${x},${hill(x).toFixed(1)}`);
      parts.push(svg('polygon', { points: `10,${ground(10)} ${hp.join(' ')} 110,${ground(110)}`, fill: '#c9a98a' }));
      const by = SURF - ((sink - left) * KM);
      parts.push(
        line(64, by, 96, by, COL.water, 2.5),
        small(100, by - 6, `beach cut when the ice left: now ${Math.round(raised)} m up`, { bold: true, fill: COL.water, halo: '#eef2f4' }),
      );
      for (const s of [-1, 1]) parts.push(arrow(200 + s * 120, 186, 200 + s * 40, 186, COL.paper, 1.6));
      parts.push(arrow(200, ground(200) + 18, 200, ground(200) + 2, COL.heat, 2));
    }
    parts.push(line(0, SURF, W, SURF, COL.water, 1, { 'stroke-dasharray': '4 3', opacity: 0.6 }), small(W - 4, SURF - 4, 'sea level', { anchor: 'end', fill: COL.water }));
    redraw(g, ...parts);
    const rate = (left / RELAX) * 1000; // km per thousand years is m a year; this is mm a year
    f.readout.textContent = ice === 0
      ? 'Crust floating on the mantle, before the ice. Pile an ice sheet on it.'
      : !melted
        ? `${(ice / 1000).toFixed(1)} km of ice presses the crust about ${Math.round(sink * 1000)} m down; the mantle beneath flows slowly aside. Now melt the ice and let time pass.`
        : `${kyr} thousand years after the ice melted, the crust has risen ${Math.round((sink - left) * 1000)} m and is still rising ${(rate).toFixed(1)} mm a year, with ${Math.round(left * 1000)} m to go.`;
    if (melted && ice >= 1500 && kyr >= 8 && t.goal === 'raised') t.done();
  };
  const is = slider('Ice sheet', 0, 3000, 100, 0, (v) => `${(v / 1000).toFixed(1)} km thick`, (v) => { ice = v; paint(); }, 'water');
  const ts = slider('After the ice melts', 0, 20, 0.5, 0, (v) => (v === 0 ? 'ice still there' : `${v} thousand years`), (v) => { kyr = v; paint(); }, 'old');
  f.controls.append(is.node, ts.node);
  paint();
  return f.node;
});

// ---- How a kettle forms: a still ----------------------------------------------------------

export const kettleStill = () => {
  const { node, svg: s } = still(W, 190);
  const panel = (x0: number, title: string, stage: number): SVGElement[] => {
    const w = 124;
    const out: SVGElement[] = [svg('rect', { x: x0, y: 20, width: w, height: 130, fill: '#eef2f4', rx: 4 })];
    const top = 90;
    const dip = stage === 0 ? 0 : 26;
    const d = `M${x0},${top} L${x0 + 34},${top} Q${x0 + w / 2},${top + dip * 1.4} ${x0 + w - 34},${top} L${x0 + w},${top} L${x0 + w},150 L${x0},150 Z`;
    out.push(svg('path', { d, fill: '#d6bf8e' }));
    for (let k = 0; k < 18; k++) out.push(svg('circle', { cx: x0 + 6 + ((k * 37) % (w - 12)), cy: top + 12 + ((k * 13) % 34), r: 1.6, fill: '#9c8560' }));
    if (stage === 0) out.push(svg('rect', { x: x0 + 40, y: top - 12, width: w - 80, height: 36, rx: 8, fill: '#e3f0f7', stroke: '#9cc0d6' }), small(x0 + w / 2, top + 9, 'ice', { anchor: 'middle', bold: true, fill: '#4f7a94' }));
    if (stage === 1) out.push(svg('rect', { x: x0 + 52, y: top + 10, width: w - 104, height: 10, rx: 4, fill: '#e3f0f7', stroke: '#9cc0d6' }));
    if (stage === 2) out.push(svg('path', { d: `M${x0 + 40},${top + 6} Q${x0 + w / 2},${top + dip * 1.4} ${x0 + w - 40},${top + 6} Z`, fill: COL.water, opacity: 0.7 }));
    if (stage === 0) out.push(svg('path', { d: `M${x0 + 8},${top - 30} q8,-10 16,0 q8,10 16,0`, fill: 'none', stroke: COL.water, 'stroke-width': 1.5 }), small(x0 + 46, top - 30, 'meltwater', { fill: COL.water }));
    out.push(note(x0 + w / 2, 168, title, { anchor: 'middle', bold: true }));
    return out;
  };
  s.append(
    svg('rect', { width: W, height: 190, fill: COL.paper }),
    ...panel(6, 'Ice left behind', 0),
    ...panel(138, 'Buried, it melts', 1),
    ...panel(270, 'A kettle lake', 2),
  );
  s.setAttribute('aria-label', 'Three panels: a stranded block of glacier ice is buried in sand and gravel by meltwater streams; it melts slowly underground; the ground above slumps into a hollow that fills with water, a kettle lake.');
  return { node };
};
