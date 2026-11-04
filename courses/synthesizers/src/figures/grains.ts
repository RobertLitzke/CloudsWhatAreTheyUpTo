// Branch lesson O6, Crumbs of sound: the sample drawn across the figure, with
// the stretch the grains come from shaded and one second's grains drawn as
// humps along a timeline below. Play it: the grains are scheduled live, so
// every knob is heard as it is turned.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { grainSettings, scheduleGrains } from '../audio/grains';
import { sounder } from '../audio/tone';
import { SAMPLE_RATE, SAMPLE_SECONDS, sampleData } from '../core/sample';
import { COL, figure, frame, slider } from './kit';

const W = 400;
const H = 240;
const X0 = 20;
const X1 = 380;
const WAVE_Y = 70;
const LANE_Y = 200;

export const grainsFigure = figure(['grains-cloud'], (ctx, t) => {
  const f = frame(W, H, 1.65);
  const g = svg('g');
  f.svg.append(g);
  const k = { wave: 0.5, timbre: 0.6, shape: 0.2 };
  const sizes = new Set<string>();
  const data = sampleData();
  // The sample's outline: the biggest swing in each column.
  const COLS = 180;
  const outline = Array.from({ length: COLS }, (_, c) => {
    let m = 0;
    const a = Math.floor((c / COLS) * data.length);
    const b = Math.floor(((c + 1) / COLS) * data.length);
    for (let i = a; i < b; i++) m = Math.max(m, Math.abs(data[i]));
    return m;
  });

  const sound = sounder(ctx, (ac, out) => {
    const buffer = ac.createBuffer(1, data.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(data);
    const level = ac.createGain();
    level.gain.value = 1.4;
    level.connect(out);
    let until = ac.currentTime + 0.05;
    let seed = 1;
    // Schedule a little ahead, every tenth of a second, with the knobs as they are now.
    const tick = () => {
      const now = ac.currentTime;
      if (until < now) until = now + 0.02;
      const to = now + 0.25;
      scheduleGrains(ac, buffer, level, until, to, grainSettings(k.wave, k.timbre, k.shape, 1), seed++);
      until = to;
    };
    tick();
    const timer = setInterval(tick, 100);
    return { update: () => {}, stop: () => clearInterval(timer) };
  }, 'Play');

  const paint = () => {
    const gs = grainSettings(k.wave, k.timbre, k.shape, 1);
    const x = (sec: number) => X0 + (sec / SAMPLE_SECONDS) * (X1 - X0);
    const centre = k.wave * SAMPLE_SECONDS * 0.85;
    const from = Math.max(0, centre - gs.scatter);
    const to = Math.min(SAMPLE_SECONDS, centre + gs.scatter + gs.size);
    const cw = (X1 - X0) / COLS;
    // One second of grains, drawn on a timeline: each a hump as long as the grain.
    const lane: SVGElement[] = [];
    let seed = 5;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let tt = 0, n = 0; tt < 1 && n < 200; tt += (1 / gs.density) * (0.7 + 0.6 * rnd()), n++) {
      const w = Math.max(1.5, gs.size * (X1 - X0));
      const x0 = X0 + tt * (X1 - X0);
      lane.push(svg('path', { d: `M${x0},${LANE_Y} Q${x0 + w / 2},${LANE_Y - 44} ${x0 + w},${LANE_Y}`, fill: COL.harmonic, opacity: 0.35, stroke: COL.harmonic, 'stroke-width': 0.8 }));
    }
    redraw(g,
      label(X0, 16, 'The sample, and where the grains come from', { bold: true }),
      svg('rect', { x: x(from), y: WAVE_Y - 44, width: Math.max(2, x(to) - x(from)), height: 88, fill: COL.filter, opacity: 0.18 }),
      ...outline.map((m, c) => svg('rect', { x: X0 + c * cw, y: WAVE_Y - m * 40, width: Math.max(1, cw - 0.4), height: Math.max(0.8, m * 80), fill: COL.wave, opacity: 0.8 })),
      label(X0, 136, 'One second of grains', { bold: true }),
      svg('line', { x1: X0, y1: LANE_Y, x2: X1, y2: LANE_Y, stroke: COL.ink }),
      ...lane,
      small(X0, LANE_Y + 16, '0 s', { soft: true }),
      small(X1, LANE_Y + 16, '1 s', { anchor: 'end', soft: true }),
    );
    const ms = Math.round(gs.size * 1000);
    f.readout.textContent = `${Math.round(gs.density)} grains a second, each ${ms} ms long, ${gs.scatter > 0.01 ? `scattered over ${Math.round(gs.scatter * 2000)} ms of the sample` : 'all from one spot'}. ` +
      (ms < 30 ? 'Grains this short are heard as texture, a buzz or a fizz, not as bits of the voice.' : ms > 100 ? 'Grains this long are heard as little pieces of the voice.' : 'In between: a smeared, frozen version of the voice.');
    sound.update();
    sizes.add(ms < 30 ? 'short' : ms > 100 ? 'long' : 'mid');
    if (sizes.has('short') && sizes.has('long')) t.done();
  };
  const sw = slider('Wave', 0, 10, 1, 5, (v) => `${v * 10} %`, (v) => { k.wave = v / 10; paint(); }, 'wave');
  const st = slider('Timbre', 0, 10, 1, 6, (v) => `${v * 10} %`, (v) => { k.timbre = v / 10; paint(); }, 'harmonic');
  const ss = slider('Shape', 0, 10, 1, 2, (v) => `${v * 10} %`, (v) => { k.shape = v / 10; paint(); }, 'second');
  f.controls.append(sw.node, st.node, ss.node, sound.button);
  paint();
  return f.node;
});
