// Branch S1, Why no trees?: a west-to-east line across Washington from
// Seattle over Snoqualmie Pass into the Columbia Basin. Rain and snow set
// where forest gives way to bunchgrass and sagebrush.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, slider } from './kit';

const W = 400;

/** Yearly rain and snow along the line, cm, roughly: km east of Seattle, cm. */
const RAIN: readonly [number, number][] = [[0, 95], [40, 150], [90, 250], [115, 130], [135, 55], [160, 24], [200, 19], [260, 22]];
/** Ground height, m. */
const HEIGHT: readonly [number, number][] = [[0, 50], [40, 300], [90, 950], [115, 650], [135, 550], [160, 480], [200, 300], [260, 450]];
export const KM = 260;

const interp = (pts: readonly [number, number][], x: number) => {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

export const rainAt = (km: number, wetter = 1) => interp(RAIN, km) * wetter;
export const heightAt = (km: number) => interp(HEIGHT, km);

export const ZONES = [
  { name: 'Wet conifer forest', color: '#2f5f2c' },
  { name: 'Pine and fir forest', color: '#5c7f3a' },
  { name: 'Bunchgrass steppe', color: '#c9b46a' },
  { name: 'Sagebrush steppe', color: '#a8a383' },
] as const;

/** Which zone grows with `rain` cm a year, on the west or east side of the crest. */
export function zoneFor(rain: number, east: boolean): number {
  if (!east && rain > 60) return 0;
  if (rain > 45) return east && rain < 110 ? 1 : 0;
  if (rain > 30) return 2;
  return 3;
}

/** Where the forest ends going east: km from Seattle. */
export function forestEdge(wetter: number): number {
  for (let km = 90; km <= KM; km++) if (zoneFor(rainAt(km, wetter), true) >= 2) return km;
  return KM;
}

const PLACES: readonly [number, string][] = [[0, 'Seattle'], [90, 'Snoqualmie Pass'], [165, 'Ellensburg'], [240, 'Moses Lake']];

export const transectFigure = figure(['edge'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let wetter = 1;
  const tried = new Set<string>();
  const X = (km: number) => 14 + (km / KM) * 372;
  const Yh = (m: number) => 150 - (m / 1000) * 70;
  const Yr = (cm: number) => 70 - (cm / 300) * 55;
  const paint = () => {
    const strips = Array.from({ length: KM / 2 }, (_, i) => {
      const km = i * 2;
      const z = zoneFor(rainAt(km, wetter), km > 90);
      return svg('rect', { x: X(km), y: Yh(heightAt(km)) - 12, width: X(2) - X(0) + 0.4, height: 12, fill: ZONES[z].color });
    });
    const ground = Array.from({ length: KM / 2 + 1 }, (_, i) => `${X(i * 2).toFixed(1)},${Yh(heightAt(i * 2)).toFixed(1)}`);
    const rain = Array.from({ length: KM / 2 + 1 }, (_, i) => `${X(i * 2).toFixed(1)},${Yr(rainAt(i * 2, wetter)).toFixed(1)}`);
    const edge = forestEdge(wetter);
    redraw(g,
      svg('polygon', { points: `${X(0)},${Yh(0) + 20} ${ground.join(' ')} ${X(KM)},${Yh(0) + 20}`, fill: '#d8ccb0' }),
      ...strips,
      svg('polyline', { points: rain.join(' '), fill: 'none', stroke: COL.water, 'stroke-width': 2 }),
      small(X(0), 12, 'rain and snow a year (blue): 300 cm at the top', { fill: COL.water }),
      line(X(edge), 20, X(edge), Yh(heightAt(edge)) - 12, COL.heat, 1.2, { 'stroke-dasharray': '3 3' }),
      small(X(edge) + 3, 28, `forest ends: ${Math.round(rainAt(edge, wetter))} cm`, { fill: COL.heat }),
      ...PLACES.map(([km, name]) => small(X(km), Yh(0) + 30, name, { anchor: km === 0 ? undefined : km > 200 ? 'end' : 'middle', soft: true })),
      ...ZONES.map((z, i) => [svg('rect', { x: 14 + (i % 2) * 190, y: 196 + Math.floor(i / 2) * 14, width: 10, height: 8, fill: z.color }), small(28 + (i % 2) * 190, 204 + Math.floor(i / 2) * 14, z.name)]).flat(),
      small(386, 12, 'A model', { anchor: 'end', soft: true }),
    );
    if (wetter < 0.8) tried.add('dry');
    if (wetter > 1.2) tried.add('wet');
    f.readout.textContent = `With ${wetter === 1 ? 'today’s' : `${Math.round(wetter * 100)}% of today’s`} rain and snow, the forest ends ${edge - 90} km east of the crest, about where the yearly total falls to ${Math.round(rainAt(edge, wetter))} cm. ${wetter > 1.2 ? 'Wetter, and pine pushes out onto the steppe.' : wetter < 0.8 ? 'Drier, and the steppe climbs toward the pass.' : ''}`;
    if (tried.size === 2) t.done();
  };
  const ws = slider('Rain and snow, compared with today', 0.5, 1.6, 0.05, wetter, (v) => `${Math.round(v * 100)}%`, (v) => { wetter = v; paint(); }, 'water');
  f.controls.append(ws.node);
  paint();
  return f.node;
});
