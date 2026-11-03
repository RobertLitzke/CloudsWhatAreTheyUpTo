// Lesson 1, The clarinet and the flute: a wave built from its harmonics, one
// at a time (Fourier's series), drawn and played.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { harmonicWave, sounder } from '../audio/tone';
import { choices, COL, figure, frame, guessFirst, slider, trace } from './kit';

const W = 400;
const H = 230;
const F0 = 196;

/** The four shapes, as harmonic amplitudes: harmonic n (from 1) has amplitude amp(n), signed. */
export const SHAPES = {
  Saw: (n: number) => 1 / n,
  Square: (n: number) => (n % 2 ? 1 / n : 0),
  Triangle: (n: number) => (n % 2 ? (((n - 1) / 2) % 2 ? -1 : 1) / (n * n) : 0),
  Sine: (n: number) => (n === 1 ? 1 : 0),
} as const;
export type Shape = keyof typeof SHAPES;
const NAMES = Object.keys(SHAPES) as Shape[];

/** The first `count` harmonics of a shape, as amplitudes from the fundamental up. */
export function partials(shape: Shape, count: number): number[] {
  return Array.from({ length: count }, (_, i) => SHAPES[shape](i + 1));
}

/** The wave those harmonics add up to, at phase x (0 to 1 is one cycle), scaled so a full saw or square peaks near 1. */
export function sumAt(amps: readonly number[], x: number): number {
  let y = 0;
  amps.forEach((a, i) => (y += a * Math.sin(2 * Math.PI * (i + 1) * x)));
  return y / 1.9;
}

export const harmonicsFigure = figure(['square'], (ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let shape: Shape = 'Square';
  let count = 1;
  const amps = () => partials(shape, count);
  const sound = sounder(ctx, (ac, out) => {
    const osc = ac.createOscillator();
    osc.frequency.value = F0;
    const set = () => osc.setPeriodicWave(harmonicWave(ac, amps()));
    set();
    osc.connect(out);
    osc.start();
    return { update: set, stop: () => osc.stop() };
  });
  const paint = () => {
    const a = amps();
    const bars = a.map((v, i) => {
      const h = Math.abs(v) * 70;
      return svg('rect', { x: 34 + i * 21, y: 210 - h, width: 13, height: Math.max(h, v ? 1 : 0), fill: COL.harmonic, rx: 2 });
    });
    redraw(g,
      svg('line', { x1: 20, y1: 70, x2: 380, y2: 70, stroke: COL.grid }),
      svg('path', { d: trace((x) => sumAt(a, x * 2), 20, 70, 360, 52), fill: 'none', stroke: COL.wave, 'stroke-width': 2.5 }),
      label(20, 16, `${shape}, built from ${count} harmonic${count > 1 ? 's' : ''}`, { bold: true }),
      svg('line', { x1: 26, y1: 210, x2: 380, y2: 210, stroke: COL.ink }),
      ...bars,
      small(26, 226, `${F0} Hz`, { soft: true }),
      small(380, 226, `${F0 * 16} Hz`, { soft: true, anchor: 'end' }),
      small(200, 226, 'harmonics, low to high', { anchor: 'middle', soft: true }),
    );
    // Until the guess is in, the readout holds the question.
    if (!open()) return;
    const zeros = a.filter((v) => v === 0).length;
    f.readout.textContent = count === 1
      ? 'One harmonic alone is a sine: a bare, pure tone. Add more and watch the shape change.'
      : shape === 'Square'
        ? `Only the odd harmonics, each weaker in step (1, 1/3, 1/5…). ${count >= 9 ? 'With nine or more the corners are nearly square; the little ripples at each corner never quite go away.' : 'Keep adding: the sides straighten and the corners sharpen.'}`
        : shape === 'Saw'
          ? 'Every harmonic, each weaker in step (1, 1/2, 1/3…): a ramp that climbs and drops. The buzziest of the four.'
          : shape === 'Triangle'
            ? 'The odd harmonics again, but they fall off much faster (1, 1/9, 1/25…), so it sounds soft, nearly a sine.'
            : `A sine has nothing above the fundamental${zeros ? ': every other bar stays empty' : ''}.`;
    sound.update();
    if (shape === 'Square' && count >= 9) t.done();
  };
  const n = slider('Harmonics', 1, 16, 1, count, (v) => `${v}`, (v) => { count = v; paint(); }, 'harmonic');
  const pick = choices(NAMES, (i) => { shape = NAMES[i]; paint(); });
  f.controls.append(pick.node, n.node, sound.button);
  const open = guessFirst(t, f, {
    ask: 'A square wave flips between two levels. Which harmonics is it built from?',
    options: ['Every harmonic', 'Only the odd ones', 'Only the even ones'],
    answer: 1,
    reveal: 'done',
    sliders: [n],
    buttons: [...pick.node.querySelectorAll('button')],
    after: () => paint(),
  });
  pick.pick(1);
  return f.node;
});
