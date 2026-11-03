// Figures for the history lesson: why the first street photographs are
// empty (anything that moves through a minutes-long exposure leaves too
// faint a trace to see), and why f-numbers run 1.4, 2, 2.8, 4 (each a step of
// the square root of two in width, which halves the hole's area).

import { el, svg } from 'didactics/dom';
import { label, line, note, redraw } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, slider, tint } from './kit';

const W = 760;
const H = 300;
/** The street's width across the frame, metres, and a walker's width. */
const STREET = 60;
const BODY = 0.5;

interface Walker { x: number; speed: number; lane: number; tall: number; color: string }

/** A time the way an early photographer would say it. */
function timeLabel(t: number): string {
  if (t < 1) return `1/${Math.round(1 / t)} s`;
  if (t < 60) return `${Math.round(t)} s`;
  return `${Math.round(t / 60)} min`;
}

/**
 * A boulevard drawn in the manner of 1838: buildings, trees, people walking
 * and a cart, and one man standing still having his boots shined. With a
 * short exposure everyone is there; as it lengthens, walkers smear into
 * streaks, and once the exposure is far longer than the time anyone spends
 * in one spot, they fade out altogether. The standing man stays.
 */
export const ghostsFigure = figure(['vanish'], (_ctx, t) => {
  const canvas = el('canvas.shot', { width: W, height: H, role: 'img', 'aria-label': 'A boulevard with people walking' }) as HTMLCanvasElement;
  const f = frame({ drawing: el('figure.photo.shot-figure', {}, canvas), lines: 3 });
  f.node.classList.add('shot-body');
  const g = canvas.getContext?.('2d') ?? null;
  const rng = makeRng(1838);
  const walkers: Walker[] = Array.from({ length: 22 }, () => ({
    x: rng() * STREET,
    speed: (rng() < 0.5 ? -1 : 1) * (1 + rng() * 0.8),
    lane: rng(),
    tall: 1.6 + rng() * 0.2,
    color: ['#3b3128', '#4a3d33', '#2e2924', '#5a4a3c'][Math.floor(rng() * 4)],
  }));
  // A cart, faster and wider.
  walkers.push({ x: 20, speed: 3, lane: 0.6, tall: 2.2, color: '#3a2f26' });
  let exposure = 1 / 100;

  const px = W / STREET;
  const sepia = (k: number) => `rgb(${Math.round(120 + 100 * k)},${Math.round(100 + 90 * k)},${Math.round(70 + 70 * k)})`;

  const paint = () => {
    if (g) {
      // The street, buildings and trees: still, so always sharp.
      g.globalAlpha = 1;
      g.fillStyle = sepia(0.85);
      g.fillRect(0, 0, W, H);
      g.fillStyle = sepia(0.55);
      for (let i = 0; i < 9; i++) g.fillRect(i * 88 + 4, 20 + (i % 3) * 12, 80, 140);
      g.fillStyle = sepia(0.35);
      for (let i = 0; i < 9; i++) for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) g.fillRect(i * 88 + 12 + c * 18, 40 + (i % 3) * 12 + r * 28, 8, 14);
      g.fillStyle = sepia(0.7);
      g.fillRect(0, 160, W, H - 160);
      g.fillStyle = sepia(0.3);
      for (let i = 0; i < 7; i++) {
        g.fillRect(50 + i * 110, 120, 6, 60);
        g.beginPath();
        g.ellipse(53 + i * 110, 110, 30, 30, 0, 0, Math.PI * 2);
        g.fill();
      }
      // The walkers: each smears along its path by speed × exposure, and is
      // as dark as the share of the exposure it spent in any one spot.
      for (const w of walkers) {
        const len = Math.abs(w.speed) * exposure; // metres travelled
        const presence = Math.min(1, BODY / Math.max(BODY, len)); // share of the exposure in one spot
        const y = 190 + w.lane * 80;
        const h = w.tall * px * 0.9;
        const start = w.x - (w.speed > 0 ? 0 : len);
        g.fillStyle = w.color;
        g.globalAlpha = presence;
        // Across the street at most: a long exposure spreads them over all of it, wrapping.
        const span = Math.min(len, STREET);
        const x0 = ((start % STREET) + STREET) % STREET;
        const draw = (x: number, wid: number) => g.fillRect(x * px, y - h, Math.max(BODY * px, wid * px), h);
        if (x0 + span + BODY <= STREET) draw(x0, span + BODY);
        else { draw(x0, STREET - x0); draw(0, x0 + span + BODY - STREET); }
      }
      // The man having his boots shined, and the bootblack: still for minutes.
      g.globalAlpha = 1;
      g.fillStyle = '#2a231d';
      g.fillRect(140, 230 - 1.75 * px * 0.9, BODY * px, 1.75 * px * 0.9);
      g.fillRect(140 + BODY * px + 2, 230 - 0.9 * px * 0.9, BODY * px * 1.1, 0.9 * px * 0.9);
    }
    const presence = Math.min(1, BODY / Math.max(BODY, 1.4 * exposure));
    f.readout.textContent = `${timeLabel(exposure)}: ` + (presence > 0.6 ? 'everyone is there, sharp or nearly so.'
      : presence > 0.05 ? `a walker spends ${(presence * 100).toFixed(0)}% of the exposure in any one spot, so each is a faint streak.`
        : `a walker spends ${(presence * 100).toFixed(2)}% of the exposure in any one spot: too little to show. Only the man who stood still is left.`);
    if (t.goal === 'vanish' && exposure >= 60 && presence < 0.05) t.done();
  };

  f.controls.append(slider('Exposure', { min: 1 / 250, max: 900, scale: 'log', value: exposure, show: timeLabel, onInput: (v) => { exposure = v; paint(); }, color: 'time' }).node);
  paint();
  return f.node;
});

const STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16] as const;

/**
 * The f-number series as holes in a 50 mm lens: each step is the last
 * divided by the square root of two across, so its area, and the light it
 * lets through, halves. The odd numbers are just the powers of √2, rounded.
 */
export const fNumberFigure = figure(['halve'], (_ctx, t) => {
  const SW = 400;
  const SH = 190;
  const f = frame(SW, SH, 3);
  const g = svg('g');
  f.svg.append(g);
  const focal = 50;
  let i = 0;
  let moved = 0;

  const paint = () => {
    const n = STOPS[i];
    const d = focal / n;
    const scale = 3.6; // drawn px per mm
    redraw(
      g,
      ...STOPS.map((m, k) => {
        const x = 26 + k * 48;
        return [
          svg('circle', { cx: x, cy: 150, r: ((focal / m) * 0.9) / 2, fill: k === i ? COL.aperture : tint(COL.aperture, 0.25) }),
          note(x, 182, `f/${m}`, { anchor: 'middle', fill: k === i ? COL.aperture : COL.soft }),
        ];
      }).flat(),
      svg('circle', { cx: 110, cy: 70, r: (d * scale) / 2, fill: tint(COL.light, 0.3), stroke: COL.aperture, 'stroke-width': 2 }),
      line(110 - (d * scale) / 2, 70, 110 + (d * scale) / 2, 70, COL.aperture, 1),
      label(220, 46, `f/${n} on a ${focal} mm lens`, { bold: true, fill: COL.aperture }),
      note(220, 66, `the hole is ${d.toFixed(1)} mm across`, { fill: COL.ink }),
      note(220, 84, `light let in: ${i === 0 ? 'all of it' : `1/${2 ** i} of f/1.4's`}`, { fill: COL.ink }),
      note(220, 102, `√2 to the power ${i + 1} is ${(Math.SQRT2 ** (i + 1)).toFixed(2)}`, { fill: COL.soft }),
    );
    f.readout.textContent = i === 0
      ? 'The f-number is the focal length divided by the hole\'s width. Step along the series and watch the hole.'
      : `From f/${STOPS[i - 1]} to f/${n} the width shrinks by √2 (1.41 times), so the area, and the light, halves: one stop.`;
    if (t.goal === 'halve' && moved >= 3) t.done();
  };

  f.controls.append(slider('f-number', { steps: [...STOPS], value: STOPS[0], show: (v) => `f/${v}`, onInput: (v) => { i = STOPS.indexOf(v as (typeof STOPS)[number]); moved++; paint(); }, color: 'aperture' }).node);
  paint();
  return f.node;
});
