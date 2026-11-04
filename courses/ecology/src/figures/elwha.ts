// Branch W2, After the dams came down: the Elwha River's long profile from
// the sea to the mountains, 2010 to 2020, as its two dams were taken out,
// the trapped sediment washed down and salmon moved back upstream.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, legend, player, slider } from './kit';

const W = 400;
export const KM = 65;

export interface Dam { name: string; km: number; height: number; start: number; gone: number; sediment: number }

/** The two dams: river km from the mouth, height (m), when removal began and ended (decimal years), sediment behind them (million m³, roughly). */
export const DAMS: readonly Dam[] = [
  { name: 'Elwha Dam', km: 7.9, height: 33, start: 2011.7, gone: 2012.2, sediment: 3 },
  { name: 'Glines Canyon Dam', km: 21.6, height: 64, start: 2011.7, gone: 2014.6, sediment: 17 },
];

/** Height left of a dam in `year`, m. */
export const damLeft = (d: Dam, year: number) => (year <= d.start ? d.height : year >= d.gone ? 0 : d.height * (1 - (year - d.start) / (d.gone - d.start)));

/** Sediment still behind a dam in `year`, million m³: it washes out as the dam comes down, fastest at first. */
export function sedimentLeft(d: Dam, year: number): number {
  if (year <= d.start) return d.sediment;
  const left = d.sediment * Math.exp(-(year - d.start) / 3.5);
  return Math.max(left, d.sediment * 0.25);
}

/** How far upstream salmon reach in `year`, river km. */
export function reach(year: number): number {
  const [low, high] = DAMS;
  if (year < low.gone) return low.km;
  if (year < high.gone) return high.km;
  return Math.min(60, high.km + (year - high.gone) * 12);
}

/** New beach and delta at the river mouth, hectares, roughly. */
export const delta = (year: number) => {
  const out = DAMS.reduce((s, d) => s + d.sediment - sedimentLeft(d, year), 0);
  return out * 4;
};

export const elwhaFigure = figure(['reach'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let year = 2010;
  const X = (km: number) => 40 + (km / KM) * 346;
  const ground = (km: number) => 6 + km * 9 + (km > 30 ? (km - 30) * 6 : 0);
  const Y = (m: number) => 170 - (m / 900) * 140;
  const paint = () => {
    const profile = Array.from({ length: KM + 1 }, (_, km) => `${X(km).toFixed(1)},${Y(ground(km)).toFixed(1)}`).join(' ');
    const r = reach(year);
    const fish = Array.from({ length: 14 }, (_, i) => (r * (i + 0.5)) / 14);
    redraw(g,
      svg('rect', { x: 14, y: Y(0) - 2, width: X(0) - 14 + Math.min(20, delta(year) / 4), height: 6, fill: '#d9c99a' }),
      svg('rect', { x: 4, y: Y(0), width: X(0) - 4, height: 30, fill: COL.sea, opacity: 0.45 }),
      small(10, Y(0) + 26, 'Strait', { soft: true }),
      svg('polygon', { points: `${X(0)},${Y(0) + 30} ${profile} ${X(KM)},${Y(0) + 30}`, fill: '#d8ccb0' }),
      svg('polyline', { points: profile, fill: 'none', stroke: COL.water, 'stroke-width': 2.4 }),
      ...DAMS.map((d) => {
        // Heights drawn three times too tall, so the dams show.
        const h = damLeft(d, year) * 3;
        const base = Y(ground(d.km));
        const sed = (sedimentLeft(d, year) / d.sediment) * d.height * 3 * 0.7;
        const up = (rise: number) => X(d.km + rise / 9);
        return [
          h > 0 ? svg('polygon', { points: `${X(d.km)},${base} ${X(d.km)},${Y(ground(d.km) + h)} ${up(h)},${Y(ground(d.km) + h)}`, fill: COL.water, opacity: 0.45 }) : null,
          sed > 0 ? svg('polygon', { points: `${X(d.km)},${base} ${X(d.km)},${Y(ground(d.km) + sed)} ${up(sed)},${Y(ground(d.km) + sed)}`, fill: COL.soil, opacity: 0.85 }) : null,
          h > 0 ? svg('rect', { x: X(d.km) - 2, y: Y(ground(d.km) + h), width: 4, height: base - Y(ground(d.km) + h), fill: COL.ink }) : null,
          small(X(d.km), Y(ground(d.km) + d.height * 3) - 6, d.name, { anchor: 'middle', soft: true }),
        ];
      }).flat(),
      ...fish.map((km) => svg('ellipse', { cx: X(km), cy: Y(ground(km)) - 5, rx: 3.6, ry: 1.6, fill: COL.rose })),
      line(X(r), Y(ground(r)) - 14, X(r), Y(ground(r)) + 2, COL.rose, 1.2),
      small(X(r) + 4, Y(ground(r)) + 14, `salmon reach km ${Math.round(r)}`, { fill: COL.rose }),
      small(X(KM), Y(ground(KM)) - 6, 'Olympic Mountains', { anchor: 'end', soft: true }),
      ...legend(40, 212, [{ text: 'river', color: COL.water }, { text: 'trapped sediment', color: COL.soil }, { text: 'salmon', color: COL.rose, dot: true }]),
      small(392, 212, 'A model, not to scale', { anchor: 'end', soft: true }),
    );
    const trapped = DAMS.reduce((s, d) => s + sedimentLeft(d, year), 0);
    const y = Math.floor(year);
    f.readout.textContent = `${y}: ${DAMS.filter((d) => damLeft(d, year) > 0).map((d) => d.name).join(' and ') || 'No dams'}${DAMS.some((d) => damLeft(d, year) > 0) ? ' standing' : ' left'}. About ${Math.round(trapped)} million m³ of sediment still behind them; about ${Math.round(delta(year))} hectares of new beach and delta at the mouth. Salmon reach ${Math.round(r)} km up the river.`;
    if (year >= 2016) t.done();
  };
  const ys = slider('Year', 2010, 2020, 0.1, 2010, (v) => String(Math.floor(v)), (v) => { year = v; paint(); }, 'model');
  const play = player(ys, ctx, { seconds: 10 });
  f.controls.append(play.node, ys.node);
  paint();
  return f.node;
});
