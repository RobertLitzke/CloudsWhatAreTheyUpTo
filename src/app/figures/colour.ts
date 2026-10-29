// Figures about the colour of light: that daylight is not one colour, that
// the camera guesses which one it was, and that the guess is a dial you can
// take off automatic when the guess goes wrong (snow, shade, dawn).

import { svg } from 'didactics/dom';
import { label, line, note, redraw } from 'didactics/draw';
import { lightColor } from '../../core/camera';
import { shoot } from '../../core/shot';
import { photoOptions, shotPhoto, type PhotoOptions } from '../picture';
import { COL, figure, frame, slider } from './kit';
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

/**
 * The same thing on a photograph: the light in the picture was one colour,
 * and the camera's setting is a guess at it. Set the dial where the light
 * really was and the snow goes white; set it elsewhere and the whole picture
 * tips warm or cold.
 */
export const whiteBalanceFigure = figure<PhotoOptions>(['white-snow', 'warm-it'], (_ctx, t, options) => {
  const photo = shotPhoto('snow-scene', options?.photo);
  if (!photo?.scene) return noPhoto('snow').node;
  const scene = photo.scene;
  const light = scene.kelvin ?? 7500;

  const f = shotFrame(photo, 3);
  let setting = 5500;

  const paint = () => {
    const shot = shoot(scene, { eqFocal: scene.eqFocal ?? 50, whiteBalance: setting });
    const off = Math.log(light / setting);
    const say = Math.abs(off) < 0.06
      ? `Set to the light that was really there (${Math.round(light)} K): the snow is white and nothing else had to be touched.`
      : off > 0
        ? 'The camera is told the light was warmer than it was, so it cools the picture down: blue snow.'
        : 'The camera is told the light was cooler than it was, so it warms the picture up: orange snow.';
    f.paint(shot, say);
    f.view.caption.textContent = `${Math.round(setting)} K set · the light was ${Math.round(light)} K`;
    if (t.goal === 'white-snow' && Math.abs(off) < 0.06) t.done();
    if (t.goal === 'warm-it' && setting > light * 1.25) t.done();
  };

  f.controls.append(slider('White balance', { min: 2500, max: 10000, scale: 'log', step: 10, value: setting, show: (v) => `${v} K`, onInput: (v) => { setting = v; paint(); }, color: 'cool' }).node);
  f.start(t, paint);
  return f.node;
}, { options: photoOptions('snow-scene') });
