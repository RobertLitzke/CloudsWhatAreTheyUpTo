// Lesson 8, Echoes on purpose: a clap and a wall. Sound goes about 343 metres
// a second, so the echo of a clap comes back after twice the distance; under
// about a twentieth of a second the ear hears it as part of the clap.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { sounder } from '../audio/tone';
import { COL, figure, frame, guessFirst, slider } from './kit';

const W = 400;
const H = 210;
/** The speed of sound in air at about 20 °C, metres a second. */
export const SOUND = 343;
/** Below this gap the ear fuses an echo with the sound that made it (seconds; it varies with the sound, 30 to 50 ms for a clap). */
export const FUSE = 0.05;

/** The gap before a wall `metres` away sends a clap back. */
export const echoDelay = (metres: number) => (2 * metres) / SOUND;

export const echoFigure = figure(['separate'], (ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let metres = 3;
  const sound = sounder(ctx, (ac, out) => {
    // A clap a second: a burst of noise, and the wall's copy of it.
    const noise = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.008));
    const delay = ac.createDelay(1);
    const wall = ac.createGain();
    wall.gain.value = 0.5;
    delay.connect(wall).connect(out);
    const set = () => delay.delayTime.setValueAtTime(echoDelay(metres), ac.currentTime);
    set();
    const sources: AudioBufferSourceNode[] = [];
    let next = ac.currentTime + 0.05;
    const timer = setInterval(() => {
      while (next < ac.currentTime + 0.3) {
        const src = ac.createBufferSource();
        src.buffer = noise;
        src.connect(out);
        src.connect(delay);
        src.start(next);
        sources.push(src);
        if (sources.length > 8) sources.shift();
        next += 1;
      }
    }, 100);
    return { update: set, stop: () => { clearInterval(timer); sources.forEach((s) => s.stop()); } };
  }, 'Clap');
  const paint = () => {
    const gap = echoDelay(metres);
    const wallX = 80 + Math.min(290, (metres / 100) * 290);
    const ms = Math.round(gap * 1000);
    const tx = (s: number) => 40 + (s / 0.6) * 320;
    redraw(g,
      label(20, 18, 'You', { bold: true }),
      svg('circle', { cx: 40, cy: 60, r: 9, fill: COL.ink }),
      svg('rect', { x: wallX, y: 32, width: 10, height: 56, fill: COL.soft }),
      line(52, 54, wallX - 4, 54, COL.time, 1.5),
      line(wallX - 4, 68, 52, 68, COL.time, 1.5, { 'stroke-dasharray': '4 3' }),
      small(wallX - 6, 28, `${metres} m`, { anchor: 'end', bold: true, fill: COL.time }),
      // The timeline: the clap, and its echo.
      svg('line', { x1: 40, y1: 160, x2: 360, y2: 160, stroke: COL.ink }),
      svg('rect', { x: tx(0), y: 120, width: 6, height: 40, fill: COL.ink }),
      svg('rect', { x: tx(gap), y: 136, width: 6, height: 24, fill: gap < FUSE ? COL.soft : COL.time }),
      svg('rect', { x: tx(0), y: 112, width: tx(FUSE) - tx(0), height: 52, fill: COL.grid }),
      small(tx(0), 180, '0', { soft: true }),
      small(tx(0), 104, 'heard as one', { soft: true }),
      small(360, 180, '0.6 s', { soft: true, anchor: 'end' }),
      small(tx(gap) > 250 ? tx(gap) - 4 : tx(gap) + 10, 150, `echo after ${ms} ms`, { fill: gap < FUSE ? COL.soft : COL.time, bold: true, ...(tx(gap) > 250 ? { anchor: 'end' as const } : {}) }),
    );
    // Until the guess is in, the readout holds the question.
    if (!open()) return;
    f.readout.textContent = gap < FUSE
      ? `The echo is back in ${ms} ms, too soon to hear apart: it fuses with the clap and only colours it. That is why a small room sounds “live” but has no echo.`
      : `${ms} ms is long enough to hear two claps. ${gap < 0.15 ? 'A gap like this, about a tenth of a second, is the slapback of a 1950s rockabilly record.' : 'A long gap like this is a canyon, or a tape echo set to a long delay.'}`;
    sound.update();
    if (gap >= FUSE * 1.2) t.done();
  };
  const s = slider('Distance to the wall', 1, 100, 1, metres, (v) => `${v} m`, (v) => { metres = v; paint(); }, 'time');
  f.controls.append(s.node, sound.button);
  const open = guessFirst(t, f, {
    ask: 'You clap facing a wall. How far away must it be before you hear the echo as a second clap?',
    options: ['About 2 metres', 'About 10 metres', 'About 100 metres'],
    answer: 1,
    reveal: 'done',
    sliders: [s],
    after: () => paint(),
  });
  paint();
  return f.node;
});
