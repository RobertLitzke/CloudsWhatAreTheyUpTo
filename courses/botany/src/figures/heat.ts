// Lesson O4, Flowers that make heat: a lotus flower holding itself warm on a
// cooling night, and the starch it burns to do it.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, slider, toggles } from './kit';

const W = 400;

/** Heat lost per degree the flower is warmer than the air (W per °C). */
export const LOSS = 0.05;
/** The most heat the flower can make (W), and the temperature it aims for (°C). */
export const MAX = 1.1;
export const AIM = 32;
/** Energy in a gram of starch (J). */
const STARCH = 17000;

/** The flower's temperature and heat output at air temperature `air`, with the thermostat on or making a steady half-watt. */
export function flower(air: number, thermostat = true): { temp: number; watts: number } {
  if (!thermostat) return { temp: air + 0.5 / LOSS, watts: 0.5 };
  const need = Math.max(0, (AIM - air) * LOSS);
  const watts = Math.min(MAX, need);
  return { temp: air + watts / LOSS, watts };
}

/** Grams of starch burned in a 10-hour night at that output. */
export const starch = (watts: number) => (watts * 10 * 3600) / STARCH;

export const lotusHeatFigure = figure(['cold'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let air = 20;
  let thermo = true;
  let sawCold = false;
  let sawWarm = false;
  const paint = () => {
    const shown = open();
    const s = flower(air, thermo);
    const a = axes({ x: 180, y: 30, w: 200, h: 140, xmin: 0, xmax: 35, ymin: 0, ymax: 45, xticks: [0, 10, 20, 30], yticks: [0, 15, 30, 45], xlabel: 'air, °C', ylabel: 'flower, °C', ink: COL.ink, grid: COL.grid });
    const xs = Array.from({ length: 36 }, (_, i) => i);
    const hot = Math.min(1, Math.max(0, (s.temp - 10) / 30));
    const petal = `rgb(${Math.round(240)},${Math.round(200 - hot * 80)},${Math.round(210 - hot * 110)})`;
    redraw(g,
      // The flower.
      ...[-2, -1, 0, 1, 2].map((k) => svg('ellipse', { cx: 80 + k * 18, cy: 100 - Math.abs(k) * -4, rx: 12, ry: 34, fill: petal, transform: `rotate(${k * 22} ${80 + k * 18} 110)` })),
      svg('rect', { x: 66, y: 96, width: 28, height: 22, rx: 6, fill: '#c9cf6a', stroke: COL.leaf }),
      line(80, 118, 80, 200, COL.leaf, 3),
      label(80, 222, `${s.temp.toFixed(0)} °C`, { anchor: 'middle', bold: true, fill: s.temp > 28 ? COL.heat : COL.ink }),
      ...a.parts,
      a.path(xs.map((x) => [x, x] as const), COL.soft, 1, { 'stroke-dasharray': '3 3' }),
      a.path(xs.map((x) => [x, flower(x, thermo).temp] as const), COL.heat, 2.2),
      svg('circle', { cx: a.X(air), cy: a.Y(s.temp), r: 4.5, fill: COL.heat }),
      small(a.X(35), a.Y(35) + 14, 'air', { anchor: 'end', soft: true }),
      small(180, 212, `Heat made: ${s.watts.toFixed(2)} W`, { bold: true }),
      small(180, 226, `Starch burned in a 10-hour night: ${starch(s.watts).toFixed(1)} g`, { fill: COL.sugar, bold: true }),
      small(16, 22, thermo ? 'Thermostat on. A model.' : 'Steady heat. A model.', { soft: true }),
    );
    if (!shown) return;
    if (thermo && air <= 12) sawCold = true;
    if (thermo && air >= 28) sawWarm = true;
    f.readout.textContent = !thermo
      ? 'Making the same heat all night, the flower simply stays 10 °C above the air: too hot on a warm night, too cold on a cold one. A real lotus doesn’t do this.'
      : s.watts >= MAX - 1e-9
        ? `At ${air} °C the flower is burning starch as fast as it can and still slips below ${AIM} °C.`
        : s.watts === 0
          ? 'On a hot day the air is warm enough on its own; the flower makes no extra heat.'
          : `To hold ${AIM} °C in ${air} °C air the flower burns more starch the colder it gets: a thermostat.`;
    if (sawCold && sawWarm) t.done();
  };
  const as = slider('Air temperature', 0, 35, 1, air, (v) => `${v} °C`, (v) => { air = v; paint(); }, 'heat');
  const sw = toggles(['Turn the thermostat off'], [false], (on) => { thermo = !on[0]; paint(); });
  f.controls.append(as.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'A sacred lotus flower keeps itself warm at night. As the night grows colder, what does it do?',
    options: ['Burns more and stays warm', 'Burns the same and cools', 'Stops heating to save starch'],
    answer: 0,
    reveal: 'done',
    sliders: [as],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
