// Branch lesson S1, Sabine's lecture hall: Sabine's law made playable. A room's
// size and what its surfaces are made of give its reverberation time; the
// figure draws the room's answer to one clap (its impulse response, the same
// one the synth's reverb uses) and plays a clap in it.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { sounder } from '../audio/tone';
import { impulse, REVERB, sabine } from '../core/reverb';
import { choices, COL, figure, frame, slider } from './kit';

const W = 400;
const H = 240;
const X0 = 20;
const X1 = 380;
const Y = 200;
const SHOWN = 4;
/** Rooms, by volume in cubic metres. */
const ROOMS = [
  { name: 'a bathroom', v: 15 },
  { name: 'a classroom', v: 250 },
  { name: 'a lecture hall', v: 2000 },
  { name: 'a concert hall', v: 18000 },
  { name: 'a cathedral', v: 60000 },
];
/** How much of the sound a surface soaks up at each bounce (its absorption coefficient). */
const SURFACES = [
  { name: 'Tile and plaster', a: 0.03 },
  { name: 'Wood', a: 0.1 },
  { name: 'Seats and people', a: 0.3 },
  { name: 'Curtains and cushions', a: 0.6 },
];

/** A room's surface area, from its volume, if it were a box twice as long as it is wide and high. */
const area = (v: number) => {
  const side = Math.cbrt(v / 2);
  // Floor and ceiling, two long walls (each 2 × side²), and two end walls (each side²).
  return 10 * side * side;
};

export const roomFigure = figure(['room-sabine'], (ctx, t) => {
  const f = frame(W, H, 1.65);
  const g = svg('g');
  f.svg.append(g);
  let room = 2;
  let surface = 2;
  const times = new Set<string>();
  const seconds = () => Math.min(8, Math.max(0.15, sabine(ROOMS[room].v, area(ROOMS[room].v) * SURFACES[surface].a)));

  const sound = sounder(ctx, (ac, out) => {
    let src: AudioBufferSourceNode | null = null;
    const level = ac.createGain();
    level.gain.value = 0.6;
    level.connect(out);
    const make = () => {
      const ir = impulse(REVERB.room, seconds(), ac.sampleRate);
      // A clap every so often, with the room's answer.
      const len = Math.round(ac.sampleRate * Math.max(2, seconds() + 0.6));
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      d.set(ir.subarray(0, len));
      let seed = 4;
      for (let i = 0; i < 400; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        d[i] += (seed / 2147483648 - 1) * 0.6 * (1 - i / 400);
      }
      src?.stop();
      src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(level);
      src.start();
    };
    make();
    return { update: make, stop: () => src?.stop() };
  }, 'Clap');

  const paint = () => {
    const T = seconds();
    const rate = 2000;
    const ir = impulse(REVERB.room, T, rate);
    const cols = 180;
    const per = Math.round((SHOWN * rate) / cols);
    let peak = 1e-9;
    const env = Array.from({ length: cols }, (_, c) => {
      let m = 0;
      for (let i = c * per; i < Math.min(ir.length, (c + 1) * per); i++) m = Math.max(m, Math.abs(ir[i]));
      return m;
    });
    // The tail's start is 0 dB; the early reflections stand above it.
    peak = Math.max(...env.slice(3, 7), 1e-9);
    const cw = (X1 - X0) / cols;
    const x60 = X0 + (Math.min(T, SHOWN) / SHOWN) * (X1 - X0);
    redraw(g,
      label(X0, 16, `${ROOMS[room].name[0].toUpperCase()}${ROOMS[room].name.slice(1)}, ${SURFACES[surface].name.toLowerCase()}`, { bold: true }),
      ...env.map((m, c) => {
        // Drawn on a decibel scale, 60 dB tall, so the fall is a straight line.
        const db = Math.max(-60, 20 * Math.log10(m / peak + 1e-9));
        // (columns of the early reflections can stand above the top)
        const h = Math.min(150, ((db + 60) / 60) * 140);
        return svg('rect', { x: X0 + c * cw, y: Y - h, width: Math.max(1, cw - 0.3), height: h, fill: COL.time, opacity: 0.75 });
      }),
      svg('line', { x1: X0, y1: Y, x2: X1, y2: Y, stroke: COL.ink }),
      T <= SHOWN ? svg('line', { x1: x60, y1: Y - 150, x2: x60, y2: Y, stroke: COL.grit, 'stroke-dasharray': '4 3' }) : svg('g'),
      small(Math.min(x60, X1), Y - 154, `60 dB down at ${T.toFixed(T < 1 ? 2 : 1)} s`, { anchor: T > SHOWN * 0.7 ? 'end' : 'middle', bold: true, fill: COL.grit }),
      small(X0, Y + 16, '0 s', { soft: true }),
      small(X1, Y + 16, `${SHOWN} s`, { anchor: 'end', soft: true }),
      small((X0 + X1) / 2, Y + 16, 'the room’s answer to one clap, in decibels', { anchor: 'middle', soft: true }),
    );
    f.readout.textContent = `Sabine: 0.161 × ${ROOMS[room].v.toLocaleString('en')} m³ ÷ ${Math.round(area(ROOMS[room].v) * SURFACES[surface].a).toLocaleString('en')} m² of absorption = ${T.toFixed(T < 1 ? 2 : 1)} s.` +
      (T < 0.6 ? ' Dry: good for speech.' : T > 2.5 ? ' Long: words blur, organs and choirs sound grand.' : ' In between: good for music.');
    sound.update();
    times.add(T < 0.6 ? 'short' : T > 2.5 ? 'long' : 'mid');
    if (times.has('short') && times.has('long')) t.done();
  };
  const sr = slider('Room', 0, ROOMS.length - 1, 1, room, (v) => ROOMS[v].name, (v) => { room = v; paint(); }, 'time');
  const pick = choices(SURFACES.map((s) => s.name), (i) => { surface = i; paint(); });
  f.controls.append(sr.node, pick.node, sound.button);
  pick.pick(surface);
  return f.node;
});
