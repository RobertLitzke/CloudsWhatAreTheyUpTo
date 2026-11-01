// Lesson 10, What makes the Sun shine?: how long the Sun lasts on each fuel
// against the age of the Earth, and why a star's core is a thermostat.

import { svg } from 'didactics/dom';
import { line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { big, COL, figure, frame, guessFirst, sig, slider, toggles } from './kit';

const W = 400;

/** The Sun's mass as energy (mc²) over its output, in years: how long it would last turning all of itself into light. */
const ALL = (1.989e30 * 2.998e8 ** 2) / 3.828e26 / 3.156e7;
/** Years the Sun shines if a share `f` of its mass becomes light. */
export const lasts = (f: number) => f * ALL;

/** The fuels, as the share of the Sun's mass each turns into light. */
export const FUELS = [
  { name: 'burning, like coal', f: 3.3e-10 },
  { name: 'shrinking under its own weight', f: 2.1e-6 },
  { name: 'hydrogen to helium in the core', f: 0.007 * 0.1 },
];

const say = (yr: number) => (yr >= 1e9 ? `${sig(yr / 1e9, 2)} billion years` : yr >= 1e6 ? `${sig(yr / 1e6, 2)} million years` : `${big(Number(yr.toPrecision(2)))} years`);

export const fuelFigure = figure(['fusion'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let logF = Math.log10(FUELS[0].f);
  const x0 = 20;
  const x1 = 385;
  const lo = 2;
  const hi = 11;
  const yx = (yr: number) => x0 + ((Math.log10(yr) - lo) / (hi - lo)) * (x1 - x0);
  const paint = () => {
    const share = 10 ** logF;
    const yr = lasts(share);
    const parts: SVGElement[] = [svg('rect', { width: W, height: 220, fill: COL.paper })];
    const marks: [number, string, number][] = [
      [5000, 'written history', 150],
      [1e8, 'Kelvin’s Earth', 150],
      [5.4e8, 'first shelly fossils', 168],
      [4.55e9, 'age of the Earth', 186],
    ];
    parts.push(line(x0, 130, x1, 130, COL.ink, 1));
    for (let p = lo; p <= hi; p++) {
      parts.push(line(yx(10 ** p), 126, yx(10 ** p), 134, COL.ink, 1));
      if (p % 2 === 0) parts.push(small(yx(10 ** p), 116, p >= 9 ? `${10 ** (p - 9)} billion` : p >= 6 ? `${10 ** (p - 6)} million` : big(10 ** p), { anchor: 'middle', soft: true }));
    }
    for (const [at, name, y] of marks) parts.push(line(yx(at), 134, yx(at), y - 10, COL.soft, 1, { 'stroke-dasharray': '2 2' }), small(yx(at), y, name, { anchor: at > 1e9 ? 'end' : 'middle', soft: true }));
    const end = Math.max(x0 + 2, Math.min(x1, yx(yr)));
    parts.push(
      svg('rect', { x: x0, y: 60, width: end - x0, height: 26, fill: COL.sun, rx: 3 }),
      note(x0, 52, `The Sun lasts ${say(yr)}`, { bold: true }),
      small(x0, 212, 'years, each mark ten times the last', { soft: true }),
    );
    redraw(g, ...parts);
    const near = FUELS.find((fu) => Math.abs(Math.log10(fu.f) - logF) < 0.15);
    f.readout.textContent = `Turning ${share < 1e-6 ? `${sig(share * 1e9, 2)} billionths` : share < 1e-3 ? `${sig(share * 1e6, 2)} millionths` : `${sig(share * 100, 2)}%`} of its mass into light${near ? ` (${near.name})` : ''}, the Sun shines for ${say(yr)}. ${yr < 4.55e9 ? 'Not enough: the Earth is 4.55 billion years old, and the Sun must be older.' : 'Enough, with room to spare.'}`;
    if (share >= 6.5e-4 && t.goal === 'fusion') t.done();
  };
  const s = slider('Share of the Sun’s mass turned into light', -10, -2, 0.02, logF, (v) => {
    const x = 10 ** v;
    return x < 1e-6 ? `${sig(x * 1e9, 2)} billionths` : x < 1e-3 ? `${sig(x * 1e6, 2)} millionths` : `${sig(x * 100, 2)}%`;
  }, (v) => { logF = v; paint(); }, 'sun');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'Eddington’s idea: four hydrogen atoms become one helium atom, and 0.7% of their mass becomes light. Only the core, about a tenth of the Sun, is hot enough. How long can the Sun shine? Guess first.',
    options: ['Less than the age of the Earth', 'About the age of the Earth', 'About twice the age of the Earth'],
    sliders: [s],
    after: () => {
      paint();
      f.readout.textContent = `${f.readout.textContent} Slide up through shrinking to fusion.`;
    },
  });
  return f.node;
});

// ---- The core as a thermostat -------------------------------------------------------------

/**
 * The core's temperature over time (1 = steady) after a nudge of `nudge`
 * (0.05 = 5% hotter). Fusion runs about as T⁴. With the star free to swell,
 * extra heat lifts the layers above and the core cools (a star, held up by
 * its own heat against gravity, cools when it gains energy); held rigid, the
 * extra heat stays in the core and speeds fusion further.
 */
export function coreAfter(nudge: number, swells: boolean): P[] {
  let temp = 1 + nudge;
  const out: P[] = [[0, temp]];
  const dt = 0.01;
  for (let k = 1; k <= 400; k++) {
    const net = temp ** 4 - 1;
    temp += (swells ? -1 : 1) * 0.6 * net * dt;
    if (k % 4 === 0) out.push([k * dt, temp]);
    if (temp > 1.6) break;
  }
  return out;
}

export const thermostatFigure = figure(['steady'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let nudge = 0.05;
  let swells = true;
  const seen = { on: false, off: false };
  const paint = () => {
    const pts = coreAfter(nudge, swells);
    const x0 = 40;
    const x1 = 385;
    const cx = (tm: number) => x0 + (tm / 4) * (x1 - x0);
    const cy = (v: number) => 170 - ((v - 0.85) / 0.6) * 150;
    const parts: SVGElement[] = [
      svg('rect', { width: W, height: 220, fill: COL.paper }),
      line(x0, 20, x0, 170, COL.ink, 1),
      line(x0, 170, x1, 170, COL.ink, 1),
      line(x0, cy(1), x1, cy(1), COL.good, 1, { 'stroke-dasharray': '4 3' }),
      small(x1, cy(1) - 4, 'steady', { anchor: 'end', fill: COL.good }),
      small(x0 - 4, cy(1) + 4, '100%', { anchor: 'end', soft: true }),
      small(x0 - 4, cy(1.4) + 4, '140%', { anchor: 'end', soft: true }),
      small(x0 + 4, 16, 'Core temperature after the nudge', { bold: true }),
      small(x1, 186, 'time →', { anchor: 'end', soft: true }),
      polyline(pts.map(([tm, v]) => [cx(tm), cy(Math.min(v, 1.45))] as P), swells ? COL.good : COL.heat, 2.5),
    ];
    const last = pts[pts.length - 1];
    if (!swells && last[1] > 1.4) parts.push(note(cx(last[0]) - 4, 34, 'runaway', { anchor: 'end', fill: COL.heat, bold: true }));
    redraw(g, ...parts);
    if (nudge > 0.005) seen[swells ? 'on' : 'off'] = true;
    f.readout.textContent = nudge < 0.005
      ? 'Steady: fusion makes heat exactly as fast as the surface shines it away.'
      : swells
        ? `${Math.round(nudge * 100)}% hotter, fusion runs about ${Math.round(((1 + nudge) ** 4 - 1) * 100)}% faster. The extra heat makes the core swell, and a gas that expands cools, so fusion slows again: the core settles back.`
        : `Held rigid, the extra heat can’t escape by swelling. Fusion speeds up, which heats the core more, which speeds fusion more: a runaway, which is what a hydrogen bomb is.`;
    if (seen.on && seen.off && t.goal === 'steady') t.done();
  };
  const s = slider('Nudge the core hotter', 0, 0.15, 0.005, nudge, (v) => `${Math.round(v * 100)}%`, (v) => { nudge = v; paint(); }, 'heat');
  const tg = toggles(['The star can swell'], [true], (on) => { swells = on[0]; paint(); });
  f.controls.append(s.node, tg.node);
  paint();
  return f.node;
});
