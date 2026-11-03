// Lesson 2, Restoring the air: Priestley's jar of spent air with a sprig of
// mint, in light and dark, and a leaf's light curve for sun and shade leaves.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, pick, player, slider, toggles } from './kit';

const W = 400;

/** Oxygen below which a candle goes out, percent. */
export const CANDLE = 16.5;

/** Oxygen and carbon dioxide (percent) in a closed jar of spent air with a sprig of mint, day by day. */
export function mintJar(light: boolean, days: number): { o2: number; co2: number }[] {
  let o2 = 16;
  let co2 = 3;
  const out = [{ o2, co2 }];
  for (let d = 1; d <= days; d++) {
    // In light the leaf makes more oxygen than it uses; in the dark it only breathes.
    const net = light ? Math.min(0.32, co2 * 0.2) : -0.12;
    o2 = Math.max(0, o2 + net);
    co2 = Math.max(0, co2 - net);
    out.push({ o2, co2 });
  }
  return out;
}

export const mintFigure = figure(['both'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let light = true;
  let day = 0;
  let sawLight = false;
  let sawDark = false;
  const DAYS = 10;
  const paint = () => {
    const now = mintJar(light, DAYS)[day];
    const burns = now.o2 >= CANDLE;
    const gauge = (x: number, name: string, v: number, max: number, color: string, mark?: number) => [
      label(x, 30, name, { bold: true, fill: color }),
      svg('rect', { x, y: 40, width: 22, height: 130, fill: COL.grid, rx: 3 }),
      svg('rect', { x, y: 170 - (v / max) * 130, width: 22, height: (v / max) * 130, fill: color, rx: 3 }),
      small(x + 11, 186, `${v.toFixed(1)}%`, { anchor: 'middle', bold: true }),
      ...(mark !== undefined ? [line(x - 5, 170 - (mark / max) * 130, x + 27, 170 - (mark / max) * 130, COL.heat, 1.4, { 'stroke-dasharray': '3 2' }), small(x + 30, 174 - (mark / max) * 130, 'candle burns', { fill: COL.heat })] : []),
    ];
    redraw(g,
      svg('rect', { width: 170, height: 220, fill: light ? '#fbf3d6' : '#2c3138' }),
      ...(light ? [svg('circle', { cx: 150, cy: 22, r: 12, fill: COL.light })] : [small(150, 26, 'night', { anchor: 'middle', fill: '#c9d2dc' })]),
      svg('path', { d: 'M30,190 L30,70 Q30,46 54,46 L106,46 Q130,46 130,70 L130,190', fill: '#ffffff', 'fill-opacity': 0.25, stroke: '#7fa7b8', 'stroke-width': 2 }),
      svg('rect', { x: 20, y: 190, width: 120, height: 10, fill: COL.wood }),
      // The candle, and a sprig of mint in water.
      svg('rect', { x: 48, y: 158, width: 10, height: 32, fill: '#efe6d0' }),
      burns && day > 0 ? svg('path', { d: 'M53,156 q-5,-8 0,-16 q5,8 0,16', fill: COL.light }) : line(53, 158, 53, 152, COL.ink, 1),
      svg('rect', { x: 88, y: 170, width: 20, height: 20, fill: COL.water, opacity: 0.4 }),
      line(98, 172, 98, 110, COL.leaf, 2),
      ...[120, 134, 148].flatMap((y, i) => [svg('ellipse', { cx: 98 - 8, cy: y + i, rx: 8, ry: 3.5, fill: COL.leaf }), svg('ellipse', { cx: 98 + 8, cy: y - 3, rx: 8, ry: 3.5, fill: COL.leaf })]),
      ...gauge(200, 'Oxygen', now.o2, 22, COL.o2, CANDLE),
      ...gauge(310, 'CO₂', now.co2, 4, COL.co2),
      small(200, 212, `Day ${day}`, { soft: true }),
    );
    if (!open()) return;
    f.readout.textContent = day === 0
      ? `Air in which a candle has burned out, with a sprig of mint, sealed. ${light ? 'In daylight.' : 'Kept dark.'} Press Play.`
      : light
        ? `Day ${day}: in the light the mint takes in carbon dioxide and gives out oxygen. ${burns ? 'There is enough oxygen for a candle again.' : 'Not enough oxygen for a candle yet.'}`
        : `Day ${day}: in the dark the mint only breathes, like an animal: it uses oxygen and gives out carbon dioxide. The air is getting worse.`;
    if (day >= DAYS) {
      if (light && burns) sawLight = true;
      if (!light) sawDark = true;
    }
    if (sawLight && sawDark) t.done();
  };
  const days = slider('Day', 0, DAYS, 1, 0, (v) => `${v}`, (v) => { day = v; paint(); }, 'leaf');
  const play = player(days, ctx, { seconds: 6 });
  const sw = toggles(['Keep it dark'], [false], (on) => { light = !on[0]; days.set(0); });
  f.controls.append(sw.node, play.node, days.node);
  const open = guessFirst(t, f, {
    ask: 'In daylight the mint restores the air so a candle burns again. Keep the jar dark instead. What does the mint do to the air?',
    options: ['Restores it, only more slowly', 'Makes it worse', 'Nothing'],
    answer: 1,
    reveal: 'done',
    sliders: [days],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- The light curve ---------------------------------------------------------------------------

/** Two leaves from the same tree: carbon fixed at full light, breathing, and gain per unit of light at low light. */
export const LEAVES = {
  sun: { name: 'Sun leaf', top: 20, breathe: 2, color: COL.light },
  shade: { name: 'Shade leaf', top: 6, breathe: 0.4, color: COL.leaf },
} as const;
const SLOPE = 0.05;

/** A leaf's net carbon gain (made minus breathed) at a light level, in micromoles of photons per square metre per second. */
export const net = (leaf: keyof typeof LEAVES, light: number) => {
  const l = LEAVES[leaf];
  return l.top * (1 - Math.exp((-SLOPE * light) / l.top)) - l.breathe;
};

/** The light at which a leaf breaks even. */
export const breakEven = (leaf: keyof typeof LEAVES) => {
  const l = LEAVES[leaf];
  return (-l.top / SLOPE) * Math.log(1 - l.breathe / l.top);
};

export const lightFigure = figure(['shade'], (_ctx, t) => {
  const f = frame(W, 240, 3);
  const g = svg('g');
  f.svg.append(g);
  let light = 600;
  let zoom = 0;
  const paint = () => {
    const xmax = zoom ? 200 : 2000;
    const ymin = zoom ? -2.5 : -3;
    const ymax = zoom ? 8 : 20;
    const ax = axes({ x: 46, y: 18, w: 330, h: 170, xmin: 0, xmax, ymin, ymax, xticks: zoom ? [0, 50, 100, 150, 200] : [0, 500, 1000, 1500, 2000], yticks: zoom ? [-2, 0, 4, 8] : [0, 10, 20], xlabel: 'light on the leaf', ylabel: 'sugar gained', ink: COL.ink, grid: COL.grid });
    const curve = (k: keyof typeof LEAVES) => Array.from({ length: 121 }, (_, i) => [(i / 120) * xmax, net(k, (i / 120) * xmax)] as const);
    const x = Math.min(light, xmax);
    const sun = net('sun', light);
    const shade = net('shade', light);
    redraw(g,
      ...ax.parts,
      line(ax.X(0), ax.Y(0), ax.X(xmax), ax.Y(0), COL.ink, 1.2),
      small(ax.X(xmax), ax.Y(0) + 12, 'break even', { anchor: 'end', soft: true }),
      ax.path(curve('sun'), LEAVES.sun.color, 2.6),
      ax.path(curve('shade'), LEAVES.shade.color, 2.6),
      line(ax.X(x), ax.Y(ymin), ax.X(x), ax.Y(ymax), COL.ink, 1, { 'stroke-dasharray': '3 3' }),
      svg('circle', { cx: ax.X(x), cy: ax.Y(Math.max(ymin, Math.min(ymax, sun))), r: 4, fill: LEAVES.sun.color, stroke: COL.ink }),
      svg('circle', { cx: ax.X(x), cy: ax.Y(Math.max(ymin, Math.min(ymax, shade))), r: 4, fill: LEAVES.shade.color, stroke: COL.ink }),
      ...legend(46, 232, [{ text: 'sun leaf: thick, more machinery', color: LEAVES.sun.color }, { text: 'shade leaf: thin, cheap', color: LEAVES.shade.color }]),
    );
    const place = light >= 1500 ? 'full summer sun' : light >= 300 ? 'an overcast day' : light >= 60 ? 'light shade' : 'deep forest shade';
    f.readout.textContent = sun > 0 && shade > 0
      ? `In ${place} both leaves gain, and ${sun > shade ? 'the sun leaf gains far more' : 'the shade leaf gains a little more'}.`
      : sun <= 0 && shade > 0
        ? `In ${place} the sun leaf breathes away more sugar than it makes; the thin shade leaf, cheaper to run, still gains.`
        : `In ${place} neither leaf makes as much sugar as it breathes away.`;
    if (sun < 0 && shade > 0) t.done();
  };
  const s = slider('Light', 0, 2000, 5, light, (v) => `${v}`, (v) => { light = v; paint(); }, 'light');
  const z = pick(['Whole range', 'Dim end, close up'], 0, (i) => { zoom = i; paint(); });
  f.controls.append(s.node, z.node);
  paint();
  return f.node;
});
