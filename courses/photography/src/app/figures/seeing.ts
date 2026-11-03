// Figures about the decisions made with your feet: stepping aside to choose
// what is behind the subject (parallax), and walking around it to choose
// where the light comes from.

import { el, svg } from 'didactics/dom';
import { note, redraw } from 'didactics/draw';
import { P950, fromEquivalent, widestAperture } from '../../core/camera';
import { shoot, settingsLine } from '../../core/shot';
import { MEADOW, place, stepAside, type Placed } from '../../core/stage';
import { stagePictures } from '../stage/pictures';
import { stageRenderer, type Picture } from '../stage/render';
import { COL, distance, figure, frame, slider, tint } from './kit';

const W = 760;
const H = Math.round((W * P950.sensor.h) / P950.sensor.w);

/** How far the photographer stands from the deer, metres: as close as it will let you. */
export const DEER_AT = 40;
/** Half the deer's width, metres, and the forest's right edge before anyone moves. */
const DEER_HALF = 0.75;

/** Where the forest's edge falls against the deer after a step: + to the deer's right, metres at the deer. */
export function forestEdge(step: number): number {
  const forest = MEADOW.planes.find((p) => p.id === 'forest')!;
  const moved = stepAside(MEADOW, step, DEER_AT).planes.find((p) => p.id === 'forest')!;
  const right = (moved.x ?? 0) + forest.width / 2;
  return (right * DEER_AT) / (DEER_AT + forest.behind);
}

/**
 * The deer in the meadow from 40 m. Stepping sideways (the camera turning to
 * keep the deer in the middle) slides the forest edge across behind it: a
 * few metres decide whether the deer stands against dark trees or open
 * hills. Zooming in narrows how much background the frame shows at all.
 */
export const stepAsideFigure = figure(['dark-behind'], (ctx, t) => {
  const units = ctx.save.units;
  const canvas = el('canvas.shot', { width: W, height: H, role: 'img', 'aria-label': 'A deer in a meadow, a forest edge and open hills behind' }) as HTMLCanvasElement;
  const caption = el('p.shot-settings');
  const f = frame({ drawing: el('figure.photo.shot-figure', {}, canvas, caption), lines: 3 });
  f.node.classList.add('shot-body');
  const renderer = stageRenderer(canvas);
  let pictures: ReadonlyMap<string, Picture> = new Map();
  let planes = MEADOW.planes;
  let eqFocal = 300;
  let step = -6;
  let frameId = 0;
  let latest: Placed[] = [];

  const paint = () => {
    const focal = fromEquivalent(P950, eqFocal);
    const n = widestAperture(P950, focal);
    const placed = place(stepAside({ ...MEADOW, planes }, step, DEER_AT), { focal, n, stand: DEER_AT, focusAt: DEER_AT });
    latest = placed;
    if (!frameId) frameId = requestAnimationFrame(() => { frameId = 0; renderer.draw(latest, pictures); });
    caption.textContent = `${settingsLine(shoot({ subjectAt: DEER_AT, near: DEER_AT, far: null, ev: 13 }, { eqFocal, aperture: n }))} · ${step === 0 ? 'where you started' : `${distance(Math.abs(step), units)} to the ${step > 0 ? 'right' : 'left'}`}`;
    const edge = forestEdge(step);
    const halfFrame = (DEER_AT * P950.sensor.w) / focal / 2; // half the frame's width at the deer, metres
    const behind = edge > DEER_HALF ? 'forest' : edge < -DEER_HALF ? 'hills' : 'edge';
    const say = behind === 'forest'
      ? (edge > halfFrame ? 'Dark forest fills the whole background: the deer stands out like a portrait.' : 'Dark forest behind the deer, with open country at the side of the frame.')
      : behind === 'hills'
        ? (-edge > halfFrame ? 'Open hills fill the background: the deer is part of a landscape.' : 'Open hills behind the deer, with the forest at the side of the frame.')
        : 'The forest edge cuts right behind the deer: a line through its back.';
    f.readout.textContent = `${say} Each metre you step slides the forest edge ${distance(60 / (DEER_AT + 60), units)} across behind the deer.`;
    if (t.goal === 'dark-behind' && edge > halfFrame && eqFocal >= 400) t.done();
  };

  f.controls.append(
    slider('Step sideways', { min: -10, max: 10, step: 0.5, value: step, show: (v) => (v === 0 ? 'where you started' : `${distance(Math.abs(v), units)} ${v > 0 ? 'right' : 'left'}`), onInput: (v) => { step = v; paint(); }, color: 'subject' }).node,
    slider('Zoom', { min: 150, max: 1500, scale: 'log', value: eqFocal, show: (v) => `${Math.round(v)} mm`, onInput: (v) => { eqFocal = v; paint(); }, color: 'aperture' }).node,
  );
  t.waitFor(stagePictures(MEADOW).then((got) => { pictures = got.pictures; planes = got.planes; paint(); }));
  paint();
  return f.node;
});

/**
 * Where the light comes from, on a bird drawn as two rounded shapes. The sun
 * is walked around it: behind the photographer (front light: flat, every
 * feather lit, a bright catchlight in the eye), to the side (half lit, half
 * shadow, the most shape), and behind the bird (the body dark, its outline
 * glowing). None is right; each makes a different picture.
 */
export const lightFigure = figure(['all-three'], (_ctx, t) => {
  const SW = 400;
  const SH = 210;
  const f = frame(SW, SH, 3);
  const g = svg('g');
  f.svg.append(g);
  let angle = 0; // degrees: 0 the sun behind you, 90 to the side, 180 behind the bird
  const tried = new Set<string>();

  const paint = () => {
    const a = (angle * Math.PI) / 180;
    // The light's direction on the picture: from the left as it swings round, and from behind as it passes 90.
    const lx = -Math.sin(a);
    const front = Math.cos(a); // 1 from the front, −1 from behind
    const lit = Math.max(0, front);
    const kind = angle <= 35 ? 'front' : angle >= 145 ? 'back' : angle >= 60 && angle <= 120 ? 'side' : 'between';
    if (kind !== 'between') tried.add(kind);
    const body = { x: 200, y: 112, rx: 62, ry: 44 };
    const head = { x: 138, y: 70, r: 26 };
    const gid = 'birdlight';
    const hx = 50 + 55 * lx;
    const bright = 0.3 + 0.7 * Math.max(0, Math.cos(a / 2));
    const shade = (v: number) => { const c = Math.round(60 + 150 * v); return `rgb(${c},${Math.round(c * 0.86)},${Math.round(c * 0.72)})`; };
    const rim = Math.max(0, -front);
    redraw(
      g,
      svg('rect', { x: 0, y: 0, width: SW, height: SH, fill: kind === 'back' ? '#f2d9b0' : tint(COL.ink, 0.06) }),
      svg('defs', {}, svg('radialGradient', { id: gid, cx: `${hx}%`, cy: '35%', r: `${75 - 20 * Math.abs(lx)}%` },
        svg('stop', { offset: '0', 'stop-color': shade(bright) }),
        svg('stop', { offset: '1', 'stop-color': shade(0.12 + 0.5 * lit) }))),
      // A branch, the tail, the body and the head.
      svg('rect', { x: 40, y: 160, width: 320, height: 9, rx: 4, fill: '#5a4636' }),
      svg('path', { d: 'M250 120 L330 150 L322 160 L240 135Z', fill: `url(#${gid})` }),
      svg('ellipse', { cx: body.x, cy: body.y, rx: body.rx, ry: body.ry, fill: `url(#${gid})` }),
      svg('circle', { cx: head.x, cy: head.y, r: head.r, fill: `url(#${gid})` }),
      // The rim: light coming round the edges from behind.
      svg('ellipse', { cx: body.x, cy: body.y, rx: body.rx, ry: body.ry, fill: 'none', stroke: '#fff4d6', 'stroke-width': 4 * rim, opacity: rim }),
      svg('circle', { cx: head.x, cy: head.y, r: head.r, fill: 'none', stroke: '#fff4d6', 'stroke-width': 4 * rim, opacity: rim }),
      svg('path', { d: `M${head.x - 26} ${head.y + 2} l-22 6 l22 4Z`, fill: '#3a3028' }),
      svg('circle', { cx: head.x - 8, cy: head.y - 4, r: 6, fill: '#15120f' }),
      // The catchlight: the sun reflected in the eye, only when it is in front of the bird.
      ...(front > 0.3 ? [svg('circle', { cx: head.x - 10 + 3 * lx, cy: head.y - 6, r: 1.8 + 1.4 * front, fill: '#ffffff' })] : []),
      note(12, 18, kind === 'front' ? 'front light' : kind === 'side' ? 'side light' : kind === 'back' ? 'back light' : '', { fill: COL.ink }),
    );
    f.readout.textContent = {
      front: 'The sun behind you: every feather lit, a catchlight in the eye, but flat, with little sense of shape.',
      side: 'The sun to the side: one half lit and one in shadow. The most shape and texture, and the hardest exposure.',
      back: 'The sun behind the bird: the body goes dark and the outline glows. Expose for the rim.',
      between: 'Between the three: a bit of each.',
    }[kind];
    if (t.goal === 'all-three' && tried.size === 3) t.done();
  };

  f.controls.append(slider('Where the sun is', { min: 0, max: 180, step: 5, value: angle, show: (v) => (v <= 35 ? 'behind you' : v >= 145 ? 'behind the bird' : v >= 60 && v <= 120 ? 'to the side' : `${v}°`), onInput: (v) => { angle = v; paint(); }, color: 'warm' }).node);
  paint();
  tried.clear();
  return f.node;
});
