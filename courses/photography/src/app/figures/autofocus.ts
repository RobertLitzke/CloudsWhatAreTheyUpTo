// Figures about autofocus: where the camera looks (the focus area, and its
// habit of taking the nearest thing with detail in it), and when it looks
// (focus once and lock, or keep focusing on a bird that is coming closer).

import { el, svg } from 'didactics/dom';
import { line, note, redraw } from 'didactics/draw';
import { P950, apertureLabel, depthOfField, fromEquivalent, widestAperture } from '../../core/camera';
import { shoot, settingsLine } from '../../core/shot';
import { BRAMBLE, WREN_HEAD, place, standFor, type Placed } from '../../core/stage';
import { stagePictures } from '../stage/pictures';
import { stageRenderer, type Picture } from '../stage/render';
import { COL, choices, distance, figure, frame, slider, tint } from './kit';

const W = 760;
const H = Math.round((W * P950.sensor.h) / P950.sensor.w);

/** A focus area, in frame widths from the frame's middle (y up): centre and half-size. */
interface Box { x: number; y: number; hw: number; hh: number }

const MODES = ['Wide area', 'Centre', 'Spot', 'Manual'] as const;
type Mode = (typeof MODES)[number];

/** What the camera finds in each area when it cannot look at the pictures (no canvas: tests). */
const FALLBACK: Record<Mode, string> = { 'Wide area': 'twigs', Centre: 'twigs', Spot: 'wren', Manual: '' };

/** Each picture's alpha, read once, so the camera can tell where a plane has something in it. */
const alphaCache = new WeakMap<Picture, { w: number; h: number; a: Uint8ClampedArray } | null>();
function alphaOf(pic: Picture): { w: number; h: number; a: Uint8ClampedArray } | null {
  if (alphaCache.has(pic)) return alphaCache.get(pic)!;
  let out: { w: number; h: number; a: Uint8ClampedArray } | null = null;
  try {
    const w = 256;
    const h = Math.max(1, Math.round((w * (pic instanceof HTMLImageElement ? pic.naturalHeight / pic.naturalWidth : pic.height / pic.width))));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (g) {
      g.drawImage(pic, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data;
      const a = new Uint8ClampedArray(w * h);
      for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
      out = { w, h, a };
    }
  } catch {
    out = null;
  }
  alphaCache.set(pic, out);
  return out;
}

/** The share of `box` where this placed plane has something solid. */
function coverage(p: Placed, pic: Picture | undefined, box: Box): number | null {
  if (p.plane.backdrop) return 1;
  const alpha = pic ? alphaOf(pic) : null;
  if (!alpha) return null;
  let hit = 0;
  const N = 14;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = box.x - box.hw + ((i + 0.5) / N) * 2 * box.hw;
    const y = box.y - box.hh + ((j + 0.5) / N) * 2 * box.hh;
    let u = (x - p.left) / (p.right - p.left);
    const v = (p.top - y) / (p.top - p.bottom);
    if (u < 0 || u > 1 || v < 0 || v > 1) continue;
    if (p.plane.tile) {
      const k = (u * p.plane.width) / p.plane.tile;
      const whole = Math.floor(k);
      u = k - whole;
      if (whole % 2) u = 1 - u; // mirrored repeat
    }
    const px = Math.min(alpha.w - 1, Math.floor(u * alpha.w));
    const py = Math.min(alpha.h - 1, Math.floor(v * alpha.h));
    if (alpha.a[py * alpha.w + px] > 128) hit++;
  }
  return hit / (N * N);
}

/**
 * The wren in the bramble at 2000 mm, wide open. The camera focuses on the
 * nearest thing with detail inside its focus area: in the wide area and the
 * centre box that is the canes in front, so the wren goes soft. A spot on the
 * wren's head finds the wren; manual focus lets the reader do it by hand.
 */
export const afAreaFigure = figure(['wren'], (ctx, t) => {
  const units = ctx.save.units;
  const stage = BRAMBLE;
  const canvas = el('canvas.shot', { width: W, height: H, role: 'img', 'aria-label': 'A wren in a bramble behind bare canes' }) as HTMLCanvasElement;
  const overlay = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'af-overlay', 'aria-hidden': 'true' }) as SVGSVGElement;
  const og = svg('g');
  overlay.append(og);
  const caption = el('p.shot-settings');
  const holder = el('div.af-holder', {}, canvas, overlay);
  const f = frame({ drawing: el('figure.photo.shot-figure', {}, holder, caption), lines: 3 });
  f.node.classList.add('shot-body');
  const renderer = stageRenderer(canvas);
  let pictures: ReadonlyMap<string, Picture> = new Map();
  let planes = stage.planes;

  const eqFocal = 2000;
  const focal = fromEquivalent(P950, eqFocal);
  const n = widestAperture(P950, focal);
  const stand = standFor(stage, focal);
  const fw = (stand * P950.sensor.w) / focal; // the frame's width at the wren, metres
  const head = { x: WREN_HEAD.x / fw, y: WREN_HEAD.y / fw };
  const BOXES: Record<Exclude<Mode, 'Manual'>, Box> = {
    'Wide area': { x: 0, y: 0, hw: 0.42, hh: 0.3 },
    Centre: { x: 0, y: 0, hw: 0.2, hh: 0.16 },
    Spot: { x: head.x, y: head.y, hw: 0.03, hh: 0.03 },
  };

  let mode: Mode = 'Wide area';
  let manual = stand - 1.5;
  let frameId = 0;
  let latest: Placed[] = [];

  const paint = () => {
    const probe = place({ ...stage, planes }, { focal, n, stand, focusAt: stand });
    let found = '';
    let focusAt = manual;
    if (mode !== 'Manual') {
      const box = BOXES[mode];
      const nearestFirst = [...probe].reverse();
      for (const p of nearestFirst) {
        const c = coverage(p, pictures.get(p.plane.id), box);
        if (c === null) { found = FALLBACK[mode]; break; }
        if (c > 0.04) { found = p.plane.id; break; }
      }
      const hit = probe.find((p) => p.plane.id === found);
      focusAt = hit ? hit.distance : stand;
    }
    const placed = place({ ...stage, planes }, { focal, n, stand, focusAt });
    latest = placed;
    if (!frameId) frameId = requestAnimationFrame(() => { frameId = 0; renderer.draw(latest, pictures); });
    const blurOf = (id: string) => placed.find((p) => p.plane.id === id)?.blur ?? 0;
    const wrenSharp = blurOf('wren') < 0.004;
    const twigsSoft = blurOf('twigs') > 0.01;

    // The focus area, as the camera's screen draws it.
    const toPx = (b: Box) => ({ x: W / 2 + (b.x - b.hw) * W, y: H / 2 - (b.y + b.hh) * W, w: 2 * b.hw * W, h: 2 * b.hh * W });
    const box = mode === 'Manual' ? null : toPx(BOXES[mode]);
    redraw(og, ...(box ? [svg('rect', { ...box, width: box.w, height: box.h, fill: 'none', stroke: found === 'wren' ? '#7be07b' : '#ffffff', 'stroke-width': 3, rx: 4 })] : []));

    const dof = depthOfField(P950, focal, n, focusAt);
    caption.textContent = `${settingsLine(shoot({ subjectAt: stand, near: stand, far: null, ev: 10 }, { eqFocal, aperture: n, focusAt }))} · focused at ${distance(focusAt, units)}`;
    const what = mode === 'Manual' ? `Focused by hand at ${distance(focusAt, units)}` : `The camera found ${found === 'wren' ? 'the wren' : found === 'twigs' ? 'the canes in front' : found === 'bramble' ? 'the bramble behind' : 'the woods'} and focused there`;
    f.readout.textContent = `${what}, ${distance(stand - focusAt, units).replace('-', '')} ${focusAt < stand ? 'in front of' : 'behind'} the wren; the sharp band is ${distance(dof.far - dof.near, units)} deep at ${apertureLabel(n)}. ` +
      (wrenSharp ? 'The wren is sharp.' : 'The wren is soft.');
    if (Math.abs(focusAt - stand) < 0.02) f.readout.textContent = `${what}. The sharp band is ${distance(dof.far - dof.near, units)} deep at ${apertureLabel(n)}: the wren is sharp${twigsSoft ? ' and the canes in front go soft' : ''}.`;
    if (t.goal === 'wren' && wrenSharp && twigsSoft) t.done();
  };

  const focusSlider = slider('Focus', { min: stand - 3, max: stand + 3, step: 0.01, value: manual, show: (v) => distance(v, units), onInput: (v) => { manual = v; paint(); }, color: 'focus' });
  const pick = choices(MODES.map((m) => m), (i) => {
    mode = MODES[i];
    focusSlider.node.style.display = mode === 'Manual' ? '' : 'none';
    paint();
  });
  f.controls.append(el('div.fig-row', {}, pick.node), focusSlider.node);
  pick.pick(0);
  t.waitFor(stagePictures(stage).then((got) => { pictures = got.pictures; planes = got.planes; paint(); }));
  paint();
  return f.node;
});

/**
 * A heron flying straight at you, from 60 m to 20 m in three seconds, shot as
 * a burst at 1000 mm wide open. In single autofocus the lens focuses once, on
 * the first half-press, and stays there while the heron leaves the sharp band;
 * in continuous it keeps refocusing, a little behind the bird.
 */
export const trackingFigure = figure(['continuous'], (ctx, t) => {
  const units = ctx.save.units;
  const SW = 400;
  const SH = 200;
  const f = frame(SW, SH, 3);
  const g = svg('g');
  f.svg.append(g);
  const eqFocal = 1000;
  const focal = fromEquivalent(P950, eqFocal);
  const n = widestAperture(P950, focal);
  const START = 60;
  const SPEED = 13; // m/s, a heron's flight
  const SECONDS = 3;
  const FRAMES = 10;
  const LAG = 0.04; // seconds continuous AF runs behind
  let mode = 0; // 0 single, 1 continuous
  let touched = false;

  const L = 44;
  const R = 384;
  const T = 14;
  const B = 150;
  const x = (s: number) => L + ((R - L) * s) / SECONDS;
  const y = (m: number) => T + ((B - T) * (START + 4 - m)) / (START + 4 - 14);
  const bird = (s: number) => START - SPEED * s;
  const focusAt = (s: number) => (mode === 0 ? START : bird(Math.max(0, s - LAG)));

  const paint = () => {
    const shots = Array.from({ length: FRAMES }, (_, i) => {
      const s = (i / (FRAMES - 1)) * SECONDS;
      const d = depthOfField(P950, focal, n, focusAt(s));
      return { s, sharp: bird(s) >= d.near && bird(s) <= d.far };
    });
    const band = Array.from({ length: 31 }, (_, i) => {
      const s = (i / 30) * SECONDS;
      return { s, ...depthOfField(P950, focal, n, focusAt(s)) };
    });
    const sharp = shots.filter((q) => q.sharp).length;
    redraw(
      g,
      svg('path', {
        d: `M${band.map((b) => `${x(b.s).toFixed(1)} ${y(b.far).toFixed(1)}`).join(' L')} L${[...band].reverse().map((b) => `${x(b.s).toFixed(1)} ${y(b.near).toFixed(1)}`).join(' L')}Z`,
        fill: tint(COL.sharp, 0.22), stroke: 'none',
      }),
      svg('polyline', { points: band.map((b) => `${x(b.s).toFixed(1)},${y(focusAt(b.s)).toFixed(1)}`).join(' '), fill: 'none', stroke: COL.focus, 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }),
      line(x(0), y(bird(0)), x(SECONDS), y(bird(SECONDS)), COL.subject, 2.2),
      ...shots.map((q) => svg('circle', { cx: x(q.s), cy: y(bird(q.s)), r: 5, fill: q.sharp ? COL.sharp : COL.time, stroke: '#fff', 'stroke-width': 1.2 })),
      line(L, B, R, B, COL.grid, 1),
      line(L, T, L, B, COL.grid, 1),
      ...[20, 40, 60].map((m) => note(L - 4, y(m) + 4, distance(m, units), { anchor: 'end', fill: COL.soft })),
      ...[0, 1, 2, 3].map((s) => note(x(s), B + 14, `${s} s`, { anchor: 'middle', fill: COL.soft })),
      note(x(2.2) - 6, y(bird(2.2)) + 20, 'the heron', { anchor: 'end', fill: COL.subject }),
      note(x(0.1), T + 4, 'green band: what is sharp', { fill: COL.sharp }),
      note((L + R) / 2, B + 32, 'a burst of ten frames, as the heron comes in', { anchor: 'middle', fill: COL.soft }),
    );
    f.readout.textContent = (mode === 0
      ? `Single autofocus focused once, at ${distance(START, units)}, and stayed there. `
      : 'Continuous autofocus keeps refocusing as the heron comes, a moment behind it. ') +
      `Sharp frames: ${sharp} of ${FRAMES}.`;
    if (t.goal === 'continuous' && touched && sharp >= 8) t.done();
  };

  const pick = choices(['Single (AF-S)', 'Continuous (AF-C)'], (i) => { mode = i; touched = touched || i === 1; paint(); });
  f.controls.append(el('div.fig-row', {}, pick.node));
  pick.pick(0);
  paint();
  return f.node;
});
