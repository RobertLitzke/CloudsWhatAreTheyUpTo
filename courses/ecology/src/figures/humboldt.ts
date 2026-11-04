// Lesson 17, Humboldt's mountain: zones of life on Chimborazo sliding up as
// the climate warms, and Whittaker's chart of biomes by temperature and rain.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, pick, slider } from './kit';

const W = 400;

export const SUMMIT = 6263;
/** Mean yearly temperature at sea level near Chimborazo, °C, and how fast it falls with height, °C per km. Round numbers. */
export const SEA_LEVEL = 26;
export const LAPSE = 5.5;

/** Zones of plant life on the mountain by mean yearly temperature, simplified. */
export const ZONES = [
  { name: 'Lowland rainforest', above: 20, color: '#2f5f2c' },
  { name: 'Cloud forest', above: 12, color: '#4f8a3c' },
  { name: 'High forest and farms', above: 6, color: '#8fb36a' },
  { name: 'Páramo grassland', above: 1, color: '#c7c98f' },
  { name: 'Last plants on rock', above: -2, color: '#cfc8b6' },
  { name: 'Ice and bare rock', above: -99, color: '#eef3f6' },
] as const;

/** Height where the mean temperature falls to `t` °C, after `warming` °C, m. */
export const heightOf = (t: number, warming: number) => ((SEA_LEVEL + warming - t) / LAPSE) * 1000;

/** The bottom and top of each zone on the mountain, m, clipped to the summit. */
export function bands(warming: number): { name: string; from: number; to: number; color: string }[] {
  return ZONES.map((z, i) => {
    const from = i === 0 ? 0 : heightOf(ZONES[i - 1].above, warming);
    const to = i === ZONES.length - 1 ? SUMMIT : heightOf(z.above, warming);
    return { name: z.name, from: Math.min(SUMMIT, from), to: Math.min(SUMMIT, to), color: z.color };
  });
}

/** Ground area of a band on a cone, relative: proportional to the difference of the squared radii. */
export const coneArea = (from: number, to: number) => (1 - from / SUMMIT) ** 2 - (1 - to / SUMMIT) ** 2;

export const mountainFigure = figure(['shift'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let warming = 0;
  const paint = () => {
    const bs = bands(warming);
    const now = bands(0);
    const base = 214;
    const top = 20;
    const Y = (m: number) => base - (m / SUMMIT) * (base - top);
    const half = (m: number) => 150 * (1 - m / SUMMIT);
    const cx = 170;
    const polys = bs.filter((b) => b.to > b.from).map((b) => svg('polygon', {
      points: `${cx - half(b.from)},${Y(b.from)} ${cx + half(b.from)},${Y(b.from)} ${cx + half(b.to)},${Y(b.to)} ${cx - half(b.to)},${Y(b.to)}`,
      fill: b.color,
    }));
    const tops = now.slice(0, -1).map((b) => line(cx + half(b.to) + 2, Y(b.to), 360, Y(b.to), COL.grid, 1, { 'stroke-dasharray': '2 3' }));
    const lastNow = now[4];
    const lastThen = bs[4];
    const areaNow = coneArea(lastNow.from, lastNow.to);
    const areaThen = coneArea(lastThen.from, lastThen.to);
    redraw(g,
      ...polys,
      ...tops,
      ...bs.map((b) => (b.to - b.from > 260 ? small(cx, (Y(b.from) + Y(b.to)) / 2 + 4, b.name, { anchor: 'middle', fill: b.name.startsWith('Lowland') || b.name.startsWith('Cloud') ? '#fbf8ef' : COL.ink }) : null)),
      ...[0, 2000, 4000, 6000].map((m) => small(392, Y(m) + 4, `${m.toLocaleString('en-US')} m`, { anchor: 'end', soft: true })),
      line(10, base, 330, base, COL.ink, 1),
      label(cx, 14, `Chimborazo, ${SUMMIT.toLocaleString('en-US')} m`, { anchor: 'middle', size: 'small', bold: true }),
      small(392, 230, 'dotted: where each zone ends today. A model.', { anchor: 'end', soft: true }),
    );
    if (!open()) return;
    const shift = (warming / LAPSE) * 1000;
    f.readout.textContent = warming === 0
      ? `Today each zone ends where the mean temperature falls past its limit, about ${LAPSE} °C colder for every kilometre up.`
      : `${warming > 0 ? 'Warmer' : 'Cooler'} by ${Math.abs(warming)} °C: every zone moves ${Math.round(Math.abs(shift) / 10) * 10} m ${warming > 0 ? 'up' : 'down'}. ${warming > 0 ? (lastThen.to <= lastThen.from ? 'The highest plants have run out of mountain.' : `The highest plants have ${Math.round((areaThen / areaNow) * 100)}% of the ground they had: the cone narrows toward the top.`) : 'The zones have more room as they spread down the wider slopes.'}`;
    if (warming >= 3) t.done();
  };
  const s = slider('Climate', -3, 6, 0.5, 0, (v) => (v === 0 ? 'today' : `${v > 0 ? '+' : ''}${v} °C`), (v) => { warming = v; paint(); }, 'heat');
  f.controls.append(s.node);
  const open = guessFirst(t, f, {
    ask: `The air cools about ${LAPSE} °C for every kilometre up. Warm the climate by 3 °C: how far up do the zones of plants move?`,
    options: ['About 50 m', 'About 550 m', 'About 3 km'],
    answer: 1,
    sliders: [s],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Biomes ------------------------------------------------------------------------------

export const BIOMES = [
  { name: 'Tundra', color: '#cfd8dc' },
  { name: 'Northern conifer forest', color: '#5b7f5a' },
  { name: 'Temperate grassland or desert', color: '#e3cf8a' },
  { name: 'Woodland and shrubland', color: '#c9b36a' },
  { name: 'Temperate broadleaf forest', color: '#7fa65a' },
  { name: 'Temperate rainforest', color: '#2f6b4a' },
  { name: 'Hot desert', color: '#ecd5a0' },
  { name: 'Savanna', color: '#d9b860' },
  { name: 'Tropical seasonal forest', color: '#8fb36a' },
  { name: 'Tropical rainforest', color: '#2f5f2c' },
] as const;

/** Whittaker's biomes, simplified to rules on mean yearly temperature (°C) and rain (cm a year). */
export function biome(temp: number, rain: number): number {
  if (temp < -5) return 0;
  if (temp < 3) return rain < 25 ? 0 : 1;
  if (temp < 20) {
    if (rain < 40) return 2;
    if (rain < 70 + (temp - 3) * 1.5) return 3;
    if (rain < 200) return 4;
    return 5;
  }
  if (rain < 50) return 6;
  if (rain < 120) return 7;
  if (rain < 250) return 8;
  return 9;
}

/** Places to set on the chart: mean yearly temperature and rain, rounded. */
export const PLACES = [
  { name: 'Seattle', temp: 11.5, rain: 95 },
  { name: 'Hoh rainforest', temp: 10, rain: 350 },
  { name: 'Ritzville (Harrow)', temp: 9, rain: 29 },
  { name: 'Quito', temp: 14, rain: 110 },
  { name: 'Manaus', temp: 27, rain: 230 },
  { name: 'Utqiaġvik', temp: -11, rain: 12 },
] as const;

export const biomesFigure = figure(['three'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  const x0 = 40;
  const y0 = 196;
  const X = (temp: number) => x0 + ((temp + 15) / 45) * 340;
  const Y = (rain: number) => y0 - (rain / 450) * 176;
  const cells: SVGElement[] = [];
  for (let temp = -15; temp < 30; temp += 1) {
    for (let rain = 0; rain < 450; rain += 10) {
      // Hotter places can't be very wet and cold places can't be: leave out what no climate has.
      if (rain > 40 + (temp + 15) * 11) continue;
      cells.push(svg('rect', { x: X(temp), y: Y(rain + 10), width: X(temp + 1) - X(temp) + 0.5, height: Y(rain) - Y(rain + 10) + 0.5, fill: BIOMES[biome(temp + 0.5, rain + 5)].color }));
    }
  }
  let place: { name: string; temp: number; rain: number } = { ...PLACES[0] };
  const seen = new Set<number>();
  const paint = () => {
    const b = biome(place.temp, place.rain);
    seen.add(b);
    redraw(g,
      ...cells,
      line(x0, y0, x0 + 340, y0, COL.ink, 1.2),
      line(x0, y0, x0, 18, COL.ink, 1.2),
      ...[-10, 0, 10, 20, 30].map((v) => small(X(v), y0 + 13, `${v}°`, { anchor: 'middle', soft: true })),
      ...[0, 100, 200, 300, 400].map((v) => small(x0 - 4, Y(v) + 3, String(v), { anchor: 'end', soft: true })),
      small(x0 + 340, y0 + 26, 'mean yearly temperature, °C', { anchor: 'end' }),
      small(x0, 12, 'rain and snow, cm a year'),
      ...PLACES.map((p) => svg('circle', { cx: X(p.temp), cy: Y(p.rain), r: 2.5, fill: COL.ink, opacity: 0.5 })),
      svg('circle', { cx: X(place.temp), cy: Y(place.rain), r: 6, fill: 'none', stroke: COL.heat, 'stroke-width': 2.5 }),
      label(X(place.temp) + (place.temp > 15 ? -10 : 10), Y(place.rain) - 8, place.name, { size: 'small', bold: true, anchor: place.temp > 15 ? 'end' : undefined }),
    );
    f.readout.textContent = `${place.name}: ${place.temp} °C, ${Math.round(place.rain)} cm a year. ${BIOMES[b].name}.`;
    if (seen.size >= 3) t.done();
  };
  const chips = pick(PLACES.map((p) => p.name), 0, (i) => {
    setting = true;
    place = { ...PLACES[i] };
    temp.input.value = String(place.temp);
    rain.input.value = String(place.rain);
    temp.input.dispatchEvent(new Event('input'));
    rain.input.dispatchEvent(new Event('input'));
    setting = false;
  });
  let setting = false;
  const own = (p: typeof place) => (setting ? p : { ...p, name: 'Your place' });
  const temp = slider('Temperature', -15, 29, 0.5, place.temp, (v) => `${v} °C`, (v) => { place = own({ ...place, temp: v }); paint(); }, 'heat');
  const rain = slider('Rain and snow', 5, 400, 5, place.rain, (v) => `${v} cm`, (v) => { place = own({ ...place, rain: v }); paint(); }, 'water');
  f.controls.append(chips.node, temp.node, rain.node);
  paint();
  return f.node;
});
