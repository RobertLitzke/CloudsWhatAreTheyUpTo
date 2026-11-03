// Figures about the colour of light: that daylight is not one colour, that
// the camera guesses which one it was, and that the guess is a dial you can
// take off automatic when the guess goes wrong (snow, shade, dawn).

import { el, svg } from 'didactics/dom';
import { label, line, note, redraw } from 'didactics/draw';
import { lightColor } from '../../core/camera';
import { shoot } from '../../core/shot';
import { photoOptions, shotPhoto, type PhotoOptions } from '../picture';
import { COL, choices, figure, frame, slider, tint } from './kit';
import { noPhoto, shotFrame } from './shot';

/** What a light of `kelvin` looks like, as a CSS colour, normalised so the brightest channel is full. */
function swatch(kelvin: number): string {
  const [r, g, b] = lightColor(kelvin);
  const k = 1 / Math.max(r, g, b);
  const to8 = (v: number) => {
    const c = Math.min(1, Math.max(0, v * k));
    return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055));
  };
  return `rgb(${to8(r)},${to8(g)},${to8(b)})`;
}

const PLACES: readonly { k: number; name: string }[] = [
  { k: 1900, name: 'candle' },
  { k: 2700, name: 'a lamp indoors' },
  { k: 4000, name: 'just after dawn' },
  { k: 5500, name: 'noon sun' },
  { k: 6500, name: 'overcast' },
  { k: 8000, name: 'blue shade' },
];

/**
 * The scale itself: the colour of the light in each of the places a nature
 * photographer stands, with the number under it. Warm light is a low number,
 * which is the thing everyone has to unlearn once.
 */
export const kelvinDiagram = figure(['read-scale'], (_ctx, t) => {
  const W = 400;
  const H = 170;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let k = 5500;

  const x = (kelvin: number) => 30 + ((Math.log(kelvin) - Math.log(1800)) / (Math.log(9000) - Math.log(1800))) * 340;

  const paint = () => {
    redraw(
      g,
      ...Array.from({ length: 68 }, (_, i) => {
        const kk = 1800 * (9000 / 1800) ** (i / 67);
        return svg('rect', { x: 30 + i * 5, y: 34, width: 5.4, height: 40, fill: swatch(kk) });
      }),
      svg('rect', { x: 30, y: 34, width: 340, height: 40, fill: 'none', stroke: COL.grid, 'stroke-width': 1 }),
      ...PLACES.map((p) => note(x(p.k), 92, p.name, { anchor: 'end', soft: true, attrs: { transform: `rotate(-32 ${x(p.k)} 92)` } })),
      line(x(k), 28, x(k), 80, COL.ink, 2),
      label(x(k), 22, `${Math.round(k)} K`, { anchor: 'middle', bold: true }),
      note(30, 150, 'warm light, low number', { soft: true }),
      note(372, 150, 'cool light, high number', { anchor: 'end', soft: true }),
    );
    const near = PLACES.reduce((a, b) => (Math.abs(Math.log(b.k / k)) < Math.abs(Math.log(a.k / k)) ? b : a));
    f.readout.textContent = `${Math.round(k)} K is about ${near.name}. The number is the temperature a lump of iron would glow at to give that colour, which is why the warm end is the low one.`;
    if (t.goal === 'read-scale' && k <= 2800) t.done();
  };

  f.controls.append(slider('The light', { min: 1800, max: 9000, scale: 'log', step: 10, value: k, show: (v) => `${v} K`, onInput: (v) => { k = v; paint(); }, color: 'warm' }).node);
  paint();
  return f.node;
});

/** The light a snow scene can be lit by, for the white balance figure. */
const LIGHTS = [
  { name: 'Noon sun', k: 5500 },
  { name: 'Shade', k: 8000 },
  { name: 'Blue hour', k: 11000 },
] as const;

/**
 * The same thing on a photograph: the light in the picture was one colour,
 * and the camera's setting is a guess at it. Set the dial where the light
 * really was and the snow goes white; set it elsewhere and the whole picture
 * tips warm or cold. Auto sets it to the light, which is right at noon and
 * wrong at blue hour, when the blue is the point.
 */
export const whiteBalanceFigure = figure<PhotoOptions>(['white-snow', 'warm-it', 'keep-blue'], (_ctx, t, options) => {
  const photo = shotPhoto('snow-scene', options?.photo);
  if (!photo?.scene) return noPhoto('snow').node;
  const scene = photo.scene;

  const f = shotFrame(photo, 3);
  let light: number = t.goal === 'keep-blue' ? 11000 : scene.kelvin ?? 5500;
  let setting = light;
  let touched = false;

  const paint = () => {
    const shot = shoot({ ...scene, kelvin: light }, { eqFocal: scene.eqFocal ?? 50, whiteBalance: setting });
    const off = Math.log(light / setting);
    const say = Math.abs(off) < 0.06
      ? `Set to the light that was really there (${Math.round(light)} K): the snow is white${light > 9000 ? ', and the blue of the hour is gone' : ''}.`
      : off > 0
        ? `The camera is told the light was warmer than it was, so it leaves the picture ${light > 9000 && setting >= 4500 ? 'as blue as the hour really was' : 'cold: blue snow'}.`
        : 'The camera is told the light was cooler than it was, so it warms the picture up: orange snow.';
    f.paint(shot, say);
    f.view.caption.textContent = `${Math.round(setting)} K set · the light was ${Math.round(light)} K`;
    if (!touched) return;
    if (t.goal === 'white-snow' && Math.abs(off) < 0.06) t.done();
    if (t.goal === 'warm-it' && setting > light * 1.25) t.done();
    if (t.goal === 'keep-blue' && light > 9000 && setting <= 6000 && setting >= 4500) t.done();
  };

  const dial = slider('White balance', { min: 2500, max: 12000, scale: 'log', step: 10, value: setting, show: (v) => `${v} K`, onInput: (v) => { setting = v; touched = true; paint(); }, color: 'cool' });
  const auto = el('button.chip', { type: 'button' }, 'Auto');
  auto.addEventListener('click', () => { setting = light; dial.set(light); touched = true; paint(); });
  const pick = choices(LIGHTS.map((l) => l.name), (i) => { light = LIGHTS[i].k; touched = true; paint(); });
  f.controls.append(el('div.fig-row', {}, pick.node, auto), dial.node);
  pick.pick(Math.max(0, LIGHTS.findIndex((l) => l.k === light)));
  touched = false;
  f.start(t, paint);
  return f.node;
}, { options: photoOptions('snow-scene') });

/** Roughly how warm sunlight is with the sun this many degrees up, kelvin. */
export function sunKelvin(elevation: number): number {
  if (elevation <= 0) return 2000;
  return Math.min(5600, 2000 + 3600 * (1 - Math.exp(-elevation / 12)));
}

/**
 * The sun's height and the light it gives: low sun is warm and throws long
 * shadows; high sun is white and the shadows are short; under the horizon
 * there is only the sky's light, blue. The shadows are always bluer than the
 * sunlit snow, because the sky fills them in.
 */
export const sunFigure = figure(['golden'], (_ctx, t) => {
  const W = 400;
  const H = 200;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let elevation = 40;
  let touched = false;

  const paint = () => {
    const up = elevation > 0;
    const k = up ? sunKelvin(elevation) : 11000;
    const ground = 150;
    const skyTop = up ? (elevation > 15 ? '#6f9fd6' : '#8aa8d0') : '#3a4a80';
    const skyLow = up ? (elevation > 15 ? '#cfe1f2' : swatch(Math.max(2600, k - 600))) : '#9a8bb4';
    const grad = 'sunsky';
    const tree = { x: 270, h: 50 };
    const len = up ? Math.min(400, tree.h / Math.tan((elevation * Math.PI) / 180)) : 0;
    const sunX = 372;
    const sunY = ground - Math.max(-12, Math.min(120, elevation * 2.2));
    redraw(
      g,
      svg('defs', {}, svg('linearGradient', { id: grad, x1: 0, y1: 0, x2: 0, y2: 1 },
        svg('stop', { offset: '0', 'stop-color': skyTop }), svg('stop', { offset: '1', 'stop-color': skyLow }))),
      svg('rect', { x: 0, y: 0, width: W, height: ground, fill: `url(#${grad})` }),
      ...(elevation > -2 ? [svg('circle', { cx: sunX, cy: sunY, r: 12, fill: swatch(up ? k : 2000) })] : []),
      // Snow, lit by the sun's colour where it reaches, and by the sky in the shadow.
      svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: up ? swatch(Math.min(6500, k + 1400)) : swatch(11000), opacity: up ? 1 : 0.85 }),
      ...(up ? [svg('path', { d: `M${tree.x - 4} ${ground} L${tree.x - 4 - len} ${ground + 10} L${tree.x - len} ${ground + 18} L${tree.x + 4} ${ground}Z`, fill: swatch(16000), opacity: 0.95 })] : []),
      svg('rect', { x: tree.x - 3, y: ground - tree.h, width: 6, height: tree.h, fill: '#4a3a30' }),
      svg('path', { d: `M${tree.x} ${ground - tree.h - 14} l16 34 h-32Z M${tree.x} ${ground - tree.h + 4} l20 36 h-40Z`, fill: '#2f4f43' }),
      note(8, 16, up ? `sun ${Math.round(elevation)}° up` : `sun ${Math.round(-elevation)}° below the horizon`, { fill: COL.ink }),
      note(8, H - 8, up ? `sunlight about ${Math.round(k / 100) * 100} K; shade lit by blue sky` : 'no sunlight: only the sky, about 11000 K', { fill: COL.soft }),
    );
    const name = !up ? (elevation >= -6 ? 'Blue hour' : 'Nearly dark') : elevation <= 6 ? 'Golden hour' : elevation <= 20 ? 'Low sun' : 'High sun';
    f.readout.textContent = `${name}. ` + (!up
      ? 'The sun is gone, and the snow is lit only by the blue sky.'
      : `The light is about ${Math.round(k / 100) * 100} K and a tree's shadow is ${(1 / Math.tan((elevation * Math.PI) / 180)).toFixed(1)} times its height. `
        + (elevation <= 6 ? 'Warm, low light raking across the snow.' : elevation >= 30 ? 'White light from high up; short, hard shadows.' : ''));
    if (t.goal === 'golden' && touched && up && elevation <= 6) t.done();
  };

  f.controls.append(slider('Sun height', { min: -8, max: 60, step: 1, value: elevation, show: (v) => `${v}°`, onInput: (v) => { elevation = v; touched = true; paint(); }, color: 'warm' }).node);
  paint();
  return f.node;
});

/**
 * A polariser on a lake scene with the sun low and to one side. The sky's
 * light is partly polarised, most strongly 90° from the sun; glare off the
 * water is polarised across the other way. Turning the filter darkens one
 * or cuts the other, and facing toward the sun leaves the sky as it was.
 */
export const polariserFigure = figure(['both-ways'], (_ctx, t) => {
  const W = 400;
  const H = 210;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let facing = 90; // degrees from the sun
  let turn = 0; // the filter's axis, degrees from horizontal
  let darkSky = false;
  let clearWater = false;

  const paint = () => {
    const th = (facing * Math.PI) / 180;
    const p = (0.75 * Math.sin(th) ** 2) / (1 + Math.cos(th) ** 2); // how polarised the sky is
    const a = (turn * Math.PI) / 180;
    const sky = (1 - p) + 2 * p * Math.sin(a) ** 2; // against no filter (both halved by the filter anyway)
    const glare = (0.2 + 1.6 * Math.cos(a) ** 2) / 1.8;
    // The sky: its blue darkens as less of it gets through.
    const mix = (c: [number, number, number], k: number) => `rgb(${c.map((v) => Math.round(Math.min(255, v * k))).join(',')})`;
    const skyCol = mix([120, 168, 220], 0.45 + 0.55 * Math.min(1.2, sky));
    const sx = 20;
    const sw = 250;
    redraw(
      g,
      svg('rect', { x: sx, y: 10, width: sw, height: 100, fill: skyCol }),
      svg('path', { d: `M${sx} 110 q40 -26 80 -8 q50 -22 100 -4 q40 -14 70 2 V112 H${sx}Z`, fill: '#5d7a6a' }),
      // The lake: rocks under the water, seen when the glare is cut.
      svg('rect', { x: sx, y: 110, width: sw, height: 90, fill: '#2f5a5e' }),
      ...[[60, 160, 18], [120, 178, 14], [190, 150, 20], [230, 182, 12]].map(([x, y, r]) => svg('ellipse', { cx: sx + x, cy: y, rx: r, ry: r * 0.5, fill: '#8a7a5a' })),
      svg('rect', { x: sx, y: 110, width: sw, height: 90, fill: '#eef3f6', opacity: 0.85 * glare }),
      // The compass: you, the sun, and which way you face.
      svg('circle', { cx: 336, cy: 60, r: 40, fill: 'none', stroke: COL.grid, 'stroke-width': 1 }),
      svg('circle', { cx: 336, cy: 20, r: 7, fill: COL.warm }),
      note(336, 10, 'sun', { anchor: 'middle', fill: COL.warm }),
      line(336, 60, 336 + 36 * Math.sin(th), 60 - 36 * Math.cos(th), COL.ink, 2),
      note(336, 116, 'you face', { anchor: 'middle', fill: COL.soft }),
      // The filter ring with its axis.
      svg('circle', { cx: 336, cy: 160, r: 26, fill: tint(COL.cool, 0.12), stroke: COL.cool, 'stroke-width': 2 }),
      line(336 - 24 * Math.cos(a), 160 + 24 * Math.sin(a), 336 + 24 * Math.cos(a), 160 - 24 * Math.sin(a), COL.cool, 2),
      note(336, 202, 'the filter', { anchor: 'middle', fill: COL.cool }),
    );
    const skySays = sky < 0.6 ? 'the sky is a deep blue' : sky > 1.15 ? 'the sky is paler than without the filter' : 'the sky is about as it was';
    const waterSays = glare < 0.3 ? 'the glare is gone and you can see the rocks on the bottom' : glare > 0.8 ? 'the water is a sheet of reflected light' : 'the glare is partly cut';
    f.readout.textContent = `Facing ${Math.round(facing)}° from the sun, the filter turned ${Math.round(turn)}°: ${skySays}, and ${waterSays}.`;
    if (sky < 0.6) darkSky = true;
    if (glare < 0.3) clearWater = true;
    if (t.goal === 'both-ways' && darkSky && clearWater) t.done();
  };

  f.controls.append(
    slider('Facing, from the sun', { min: 0, max: 180, step: 5, value: facing, show: (v) => `${v}°`, onInput: (v) => { facing = v; paint(); }, color: 'warm' }).node,
    slider('Turn the filter', { min: 0, max: 90, step: 5, value: turn, show: (v) => `${v}°`, onInput: (v) => { turn = v; paint(); }, color: 'cool' }).node,
  );
  paint();
  darkSky = false;
  return f.node;
});
