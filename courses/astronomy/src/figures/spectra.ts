// Lesson 6, What the stars are made of: Kirchhoff's bench (a hot lamp seen
// through a gas, where the gas's temperature decides whether its lines are
// bright or dark) and matching the Sun's dark lines to the elements.

import { svg } from 'didactics/dom';
import { line, note, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, sig, slider, toggles } from './kit';
import { LINES, planck, wavelengthColour } from './light';

const W = 400;
const LO = 390;
const HI = 700;
const nmX = (nm: number, x0: number, x1: number) => x0 + ((nm - LO) / (HI - LO)) * (x1 - x0);

/** How close to a line centre `nm` is, 0 to 1 (a line about 1.2 nm wide). */
const lineDepth = (nm: number, lines: readonly number[]) => Math.max(0, ...lines.map((l) => Math.exp(-(((nm - l) / 0.7) ** 2))));

/** A spectrum strip: `bright(nm)` from 0 (black) to 1 (full colour) across the visible band. */
function strip(x0: number, x1: number, y: number, h: number, bright: (nm: number) => number): SVGElement[] {
  const out: SVGElement[] = [svg('rect', { x: x0, y, width: x1 - x0, height: h, fill: '#000' })];
  const step = 0.5;
  for (let nm = LO; nm < HI; nm += step) {
    const b = Math.max(0, Math.min(1, bright(nm + step / 2)));
    if (b < 0.01) continue;
    const xa = nmX(nm, x0, x1);
    out.push(svg('rect', { x: xa, y, width: nmX(nm + step, x0, x1) - xa + 0.3, height: h, fill: wavelengthColour(nm + step / 2), opacity: b }));
  }
  return out;
}

// ---- Kirchhoff's bench ----------------------------------------------------------------

/** The lamp's filament, kelvin. */
const LAMP = 3000;

/**
 * Brightness seen at `nm` (W/m² per m per steradian, as Planck): the lamp's
 * glow where the gas has no line; at a line's centre the gas, thick there,
 * shows its own glow at its own temperature instead (Kirchhoff's law).
 */
export function seenThrough(nm: number, o: { lamp: boolean; gas: boolean; gasT: number; lines: readonly number[] }): number {
  const behind = o.lamp ? planck(nm, LAMP) : 0;
  if (!o.gas) return behind;
  const d = lineDepth(nm, o.lines);
  return behind * (1 - d) + planck(nm, o.gasT) * d;
}

const ELEMENTS = ['sodium', 'hydrogen'] as const;

export const benchFigure = figure(['dark-lines'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let lamp = true;
  let gas = false;
  let gasT = 1500;
  let el: (typeof ELEMENTS)[number] = 'sodium';
  const paint = () => {
    const lines = LINES[el];
    const o = { lamp, gas, gasT, lines };
    let top = 0;
    for (let nm = LO; nm < HI; nm += 2) top = Math.max(top, seenThrough(nm, o));
    for (const l of lines) top = Math.max(top, seenThrough(l, o));
    const parts: SVGElement[] = [svg('rect', { width: W, height: 230, fill: COL.paper })];
    // The bench, from the side.
    parts.push(
      svg('circle', { cx: 40, cy: 70, r: 16, fill: lamp ? '#ffd27a' : '#cfc8b8', stroke: COL.ink }),
      svg('path', { d: 'M34,74 q6,-12 12,0', fill: 'none', stroke: lamp ? '#c4462f' : COL.soft, 'stroke-width': 2 }),
      small(40, 100, lamp ? 'lamp, 3,000 K' : 'lamp off', { anchor: 'middle', bold: true }),
      svg('rect', { x: 120, y: 48, width: 70, height: 44, rx: 6, fill: gas ? (el === 'sodium' ? '#f6d36b' : '#c9a3e8') : 'none', opacity: gas ? 0.55 : 1, stroke: COL.ink, 'stroke-dasharray': gas ? '' : '4 3' }),
      small(155, 106, gas ? `${el}, ${sig(gasT, 2)} K` : 'no gas', { anchor: 'middle', bold: true }),
      svg('polygon', { points: '250,92 270,48 290,92', fill: '#dfe8f0', stroke: COL.ink }),
      small(270, 106, 'prism', { anchor: 'middle', soft: true }),
      line(58, 70, 250, 70, lamp ? COL.light : COL.grid, lamp ? 2 : 1),
    );
    parts.push(...strip(20, 380, 140, 34, (nm) => (top > 0 ? (seenThrough(nm, o) / top) ** 0.6 : 0)));
    parts.push(
      small(20, 190, '400 nm', { soft: true }),
      small(380, 190, '700 nm', { anchor: 'end', soft: true }),
      note(200, 214, 'What the prism spreads out, violet to red', { anchor: 'middle', soft: true }),
    );
    redraw(g, ...parts);
    const lineB = gas ? seenThrough(lines[0], o) : 0;
    const around = lamp ? planck(lines[0] + 3, LAMP) : 0;
    const dark = gas && lamp && lineB < around * 0.9;
    f.readout.textContent = !lamp && !gas
      ? 'Nothing glows: the spectrum is black.'
      : !gas
        ? 'A hot solid glows in every colour at once: an unbroken rainbow, brighter toward the red for a 3,000 K filament.'
        : !lamp
          ? `Hot ${el} gas on its own glows only at its own few colours: bright lines on black. Each element has its own set.`
          : dark
            ? `The ${el}, cooler than the lamp, takes its own colours out of the lamp’s light and glows them out more weakly than the lamp did: dark lines, exactly where its bright lines were.`
            : Math.abs(gasT - LAMP) < 150
              ? `At the lamp’s own temperature the gas gives back as much as it takes: its lines vanish.`
              : `The ${el}, hotter than the lamp, glows brighter at its colours than the lamp behind it: bright lines on the rainbow.`;
    if (dark && t.goal === 'dark-lines') t.done();
  };
  const tg = toggles(['Lamp on', 'Gas in the way'], [lamp, gas], (on) => { [lamp, gas] = on; paint(); });
  const kinds = toggles(['Sodium', 'Hydrogen'], [true, false], (on) => {
    const now = el === 'sodium' ? (on[1] ? 'hydrogen' : 'sodium') : (on[0] ? 'sodium' : 'hydrogen');
    el = now;
    kinds.set(0, el === 'sodium');
    kinds.set(1, el === 'hydrogen');
    paint();
  });
  const st = slider('Gas temperature', 1000, 6000, 50, gasT, (v) => `${sig(v, 2)} K`, (v) => { gasT = v; paint(); }, 'heat');
  f.controls.append(tg.node, kinds.node, st.node);
  paint();
  guessFirst(t, f, {
    ask: 'The lamp’s rainbow, then sodium gas at 1,500 K put in its way, cooler than the lamp. Sodium glows yellow. What happens at sodium’s yellow? Guess first.',
    options: ['A bright yellow line', 'A dark gap', 'Nothing changes'],
    sliders: [st],
    buttons: [...tg.buttons, ...kinds.buttons],
    after: () => {
      gas = true;
      tg.set(1, true);
      paint();
    },
  });
  return f.node;
});

// ---- The Sun's dark lines ------------------------------------------------------------------

/** The dark lines in sunlight the figure shows, and which element makes each. */
export const SUN_LINES: { nm: number; by: string; letter?: string }[] = [
  { nm: 656.3, by: 'hydrogen', letter: 'C' },
  { nm: 486.1, by: 'hydrogen', letter: 'F' },
  { nm: 434.0, by: 'hydrogen' },
  { nm: 410.2, by: 'hydrogen' },
  { nm: 589.0, by: 'sodium', letter: 'D' },
  { nm: 589.6, by: 'sodium' },
  { nm: 516.7, by: 'magnesium', letter: 'b' },
  { nm: 517.3, by: 'magnesium' },
  { nm: 518.4, by: 'magnesium' },
  { nm: 527.0, by: 'iron', letter: 'E' },
  { nm: 495.7, by: 'iron' },
  { nm: 438.4, by: 'iron' },
  { nm: 430.8, by: 'iron', letter: 'G' },
  { nm: 404.6, by: 'iron' },
  { nm: 393.4, by: 'calcium', letter: 'K' },
  { nm: 396.8, by: 'calcium', letter: 'H' },
  { nm: 422.7, by: 'calcium' },
];
/** The 1868 eclipse: the bright lines at the Sun's edge. */
const EDGE = [656.3, 486.1, 434.0, 587.6, 396.8, 393.4];

const LAB = ['hydrogen', 'sodium', 'magnesium', 'iron', 'calcium'] as const;
const LAB_COL: Record<string, string> = { hydrogen: '#7a4fc0', sodium: '#c98a00', magnesium: '#2a8c7a', iron: '#a33a3a', calcium: '#3d6fb0' };

export const sunLinesFigure = figure(['all-matched'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let on = LAB.map(() => false);
  const paint = () => {
    const x0 = 20;
    const x1 = 380;
    const parts: SVGElement[] = [svg('rect', { width: W, height: 250, fill: COL.paper })];
    const sunNm = SUN_LINES.map((l) => l.nm);
    parts.push(
      small(x0, 40, 'Sunlight', { bold: true }),
      ...strip(x0, x1, 46, 34, (nm) => 0.95 * (1 - 0.92 * lineDepth(nm, sunNm))),
      small(x0, 140, 'The edge of the Sun in the 1868 eclipse', { bold: true }),
      ...strip(x0, x1, 146, 26, (nm) => 1.2 * lineDepth(nm, EDGE)),
    );
    for (const l of SUN_LINES) if (l.letter) parts.push(small(nmX(l.nm, x0, x1), 94, l.letter, { anchor: 'middle', soft: true }));
    // Each lit element marks its lab lines on both strips.
    LAB.forEach((name, i) => {
      if (!on[i]) return;
      for (const nm of LINES[name]) {
        if (nm < LO || nm > HI) continue;
        const x = nmX(nm, x0, x1);
        parts.push(line(x, 100, x, 112, LAB_COL[name], 2), line(x, 176, x, 186, LAB_COL[name], 2));
      }
    });
    const marks = LAB.filter((_, i) => on[i]).flatMap((n) => LINES[n]);
    const unmatched = SUN_LINES.filter((l) => !marks.some((m) => Math.abs(m - l.nm) < 0.3));
    const done = unmatched.length === 0;
    parts.push(
      small(x0, 128, done ? 'Every dark line has an element.' : `${unmatched.length} dark lines still unexplained`, { fill: done ? COL.good : COL.soft }),
      small(x0, 206, '400 nm', { soft: true }),
      small(x1, 206, '700 nm', { anchor: 'end', soft: true }),
    );
    if (done) parts.push(small(nmX(587.6, x0, x1), 140, '?', { anchor: 'middle', bold: true, fill: COL.bad }));
    redraw(g, ...parts);
    f.readout.textContent = done
      ? 'Hydrogen, sodium, magnesium, iron and calcium account for every dark line in sunlight. But at the Sun’s edge in 1868, a bright yellow line sat close to sodium’s pair and matched no element known on Earth: helium.'
      : marks.length === 0
        ? 'Turn on an element: its lab lines are marked under each strip. Match every dark line in sunlight.'
        : `Each lit element’s lines land on dark lines in sunlight. ${unmatched.length} still to explain.`;
    if (done && t.goal === 'all-matched') t.done();
  };
  const tg = toggles(LAB.map((n) => n[0].toUpperCase() + n.slice(1)), on, (v) => { on = v; paint(); });
  tg.buttons.forEach((b, i) => (b.style.borderColor = LAB_COL[LAB[i]]));
  f.controls.append(tg.node);
  paint();
  return f.node;
});
