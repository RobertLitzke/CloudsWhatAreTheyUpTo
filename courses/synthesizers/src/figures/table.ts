// Branch lesson O1, Scanning through tables: a wavetable drawn the way synth
// screens draw it, as its single-cycle frames stacked one behind the other.
// The place knob picks a spot in the stack; between two frames the wave is a
// blend of both, drawn bold in front, with its harmonics underneath. Play it
// and sweep the knob to hear the scan.

import { svg } from 'didactics/dom';
import { redraw, small } from 'didactics/draw';
import { harmonicWave, sounder } from '../audio/tone';
import { frameAt, TABLE_FRAMES, TABLE_LAST } from '../core/tables';
import { COL, figure, frame, slider } from './kit';

const W = 400;
const H = 260;
/** The front frame's box; each frame further back moves up and right. */
const FX = 24;
const FY = 178;
const FW = 230;
const FH = 17;
const DX = 12;
const DY = -19;
const STEPS = 240;
const BAR_X = 24;
const BAR_W = 352;
const BAR_Y = 236;
const BAR_H = 40;
const F0 = 130.8;

/** The harmonics at a place in the table: the two neighbouring frames, blended. */
export function tableAmps(pos: number): number[] {
  const i = Math.min(TABLE_LAST - 1, Math.floor(pos));
  const f = pos - i;
  return TABLE_FRAMES[i].amps.map((a, n) => a * (1 - f) + TABLE_FRAMES[i + 1].amps[n] * f);
}

export const tableFigure = figure(['table-scanned'], (ctx, t) => {
  const f = frame(W, H, 1.55);
  const g = svg('g');
  f.svg.append(g);
  let pos = 0;
  let low = 0;
  let high = 0;

  const sound = sounder(ctx, (ac, out) => {
    const osc = ac.createOscillator();
    osc.frequency.value = F0;
    const level = ac.createGain();
    level.gain.value = 0.5;
    const set = () => osc.setPeriodicWave(harmonicWave(ac, tableAmps(pos)));
    set();
    osc.connect(level).connect(out);
    osc.start();
    return { update: set, stop: () => osc.stop() };
  });

  const path = (wave: (x: number) => number, x0: number, y0: number) => {
    let d = '';
    for (let i = 0; i <= STEPS; i++) {
      const x = i / STEPS;
      d += `${i ? 'L' : 'M'}${(x0 + x * FW).toFixed(1)},${(y0 - wave(x) * FH).toFixed(1)}`;
    }
    return d;
  };

  const paint = () => {
    const frames: SVGElement[] = [];
    // Back to front, so the nearer frames are drawn over the farther ones.
    for (let i = TABLE_LAST; i >= 0; i--) {
      const near = Math.abs(i - pos) < 1;
      frames.push(svg('path', { d: path((x) => frameAt(i, x), FX + i * DX, FY + i * DY), fill: 'none', stroke: COL.soft, opacity: near ? 0.7 : 0.3, 'stroke-width': 1.2 }));
      frames.push(small(FX + i * DX + FW + 6, FY + i * DY + 4, TABLE_FRAMES[i].name, { soft: true }));
    }
    const amps = tableAmps(pos);
    const now = (x: number) => amps.reduce((y, a, n) => y + a * Math.sin(2 * Math.PI * (n + 1) * x), 0);
    const bars = amps.map((a, n) => {
      const h = Math.min(BAR_H, a * BAR_H * 1.4);
      return svg('rect', { x: BAR_X + n * (BAR_W / amps.length) + 1, y: BAR_Y - h, width: BAR_W / amps.length - 3, height: h, fill: COL.harmonic, rx: 1 });
    });
    redraw(g,
      ...frames,
      svg('path', { d: path(now, FX + pos * DX, FY + pos * DY), fill: 'none', stroke: COL.wave, 'stroke-width': 2.6 }),
      svg('line', { x1: BAR_X, y1: BAR_Y, x2: BAR_X + BAR_W, y2: BAR_Y, stroke: COL.ink }),
      ...bars,
      small(BAR_X, BAR_Y + 14, 'harmonics 1 to 32', { soft: true }),
    );
    const i = Math.round(pos);
    f.readout.textContent = Math.abs(pos - i) < 0.05
      ? `On frame ${i + 1} of ${TABLE_LAST + 1}, the ${TABLE_FRAMES[i].name}.`
      : `Between the ${TABLE_FRAMES[Math.floor(pos)].name} and the ${TABLE_FRAMES[Math.ceil(pos)].name}: a blend of the two, harmonic by harmonic.`;
    sound.update();
    low = Math.min(low, pos);
    high = Math.max(high, pos);
    if (low <= 1 && high >= TABLE_LAST - 1) t.done();
  };
  const s = slider('Wave', 0, TABLE_LAST * 4, 1, 0, (v) => `${Math.round((v / (TABLE_LAST * 4)) * 100)} %`, (v) => { pos = v / 4; paint(); }, 'wave');
  f.controls.append(s.node, sound.button);
  paint();
  return f.node;
});
