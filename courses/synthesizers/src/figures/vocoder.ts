// Branch lesson O4, The talking synth: a channel vocoder. A voice (here a
// steady vowel, the modulator) is split into bands, and the level in each band
// sets the level of the same band of a synth sound (the carrier). With enough
// bands the synth says the vowel; with few, the vowel blurs away.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { sounder } from '../audio/tone';
import { VOWELS } from '../core/vowels';
import { choices, COL, figure, frame, slider } from './kit';
import { peak } from './vowel';

const W = 400;
const H = 250;
const X0 = 24;
const X1 = 384;
const FMIN = 120;
const FMAX = 5000;
const F0 = 110;
const COUNTS = [4, 8, 16, 32];
const CARRIERS = ['Saw', 'Noise'] as const;

const xOf = (f: number) => X0 + (Math.log(f / FMIN) / Math.log(FMAX / FMIN)) * (X1 - X0);

/** The vowel's shape across frequency: three resonances, the third fixed. */
export function voiceShape(vowel: number, f: number): number {
  const v = VOWELS[vowel];
  return peak(f, v.f1) + 0.7 * peak(f, v.f2) + 0.25 * peak(f, 2600);
}

/** The bands: centre frequencies, evenly spaced on a log scale, and how sharp each is. */
export function bands(n: number): { centres: number[]; q: number } {
  const step = Math.pow(FMAX / FMIN, 1 / n);
  const centres = Array.from({ length: n }, (_, i) => FMIN * Math.pow(step, i + 0.5));
  // A band about as wide as the gap to its neighbours.
  return { centres, q: Math.sqrt(step) / (step - 1) };
}

export const vocoderFigure = figure(['vocoder-bands'], (ctx, t) => {
  const f = frame(W, H, 1.6);
  const g = svg('g');
  f.svg.append(g);
  let vowel = 2;
  let count = 1;
  let carrier = 0;
  const counts = new Set<number>();
  const vowels = new Set<number>();

  const levels = () => {
    const { centres, q } = bands(COUNTS[count]);
    return { centres, q, gains: centres.map((c) => voiceShape(vowel, c)) };
  };

  const sound = sounder(ctx, (ac, out) => {
    const saw = ac.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.value = F0;
    const noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let seed = 3;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = seed / 2147483648 - 1;
    }
    const noise = ac.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const pick = ac.createGain();
    const sawIn = ac.createGain();
    const noiseIn = ac.createGain();
    saw.connect(sawIn).connect(pick);
    noise.connect(noiseIn).connect(pick);
    let nodes: AudioNode[] = [];
    const set = () => {
      for (const n of nodes) n.disconnect();
      sawIn.gain.value = carrier === 0 ? 1 : 0;
      noiseIn.gain.value = carrier === 1 ? 0.6 : 0;
      const { centres, q, gains } = levels();
      // Narrow bands pass less; give it back so the level holds as the count changes.
      const makeup = 2.2 * Math.sqrt(COUNTS[count] / 8);
      nodes = centres.flatMap((c, i) => {
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = c;
        bp.Q.value = q;
        const gain = ac.createGain();
        gain.gain.value = gains[i] * makeup;
        pick.connect(bp).connect(gain).connect(out);
        return [bp, gain];
      });
    };
    set();
    saw.start();
    noise.start();
    return {
      update: set,
      stop: () => {
        saw.stop();
        noise.stop();
      },
    };
  });

  const paint = () => {
    const { centres, q, gains } = levels();
    let curve = '';
    for (let i = 0; i <= 200; i++) {
      const fr = FMIN * Math.pow(FMAX / FMIN, i / 200);
      curve += `${i ? 'L' : 'M'}${xOf(fr).toFixed(1)},${(100 - voiceShape(vowel, fr) * 60).toFixed(1)}`;
    }
    const step = Math.pow(FMAX / FMIN, 1 / centres.length);
    const bandBars = centres.map((c, i) => {
      const x0 = xOf(c / Math.sqrt(step));
      const x1 = xOf(c * Math.sqrt(step));
      const h = gains[i] * 60;
      return svg('rect', { x: x0 + 0.5, y: 100 - h, width: Math.max(1, x1 - x0 - 1), height: h, fill: COL.filter, opacity: 0.35 });
    });
    // What comes out: each harmonic of the saw (or a spread of noise), through the bands at their levels.
    const response = (fr: number) => centres.reduce((a, c, i) => a + gains[i] * peak(fr, c, q), 0);
    const outBars: SVGElement[] = [];
    let top = 1e-6;
    for (let i = 0; i <= 200; i++) top = Math.max(top, response(FMIN * Math.pow(FMAX / FMIN, i / 200)));
    if (carrier === 0) {
      for (let n = 2; n * F0 <= FMAX; n++) {
        const fr = n * F0;
        const h = (response(fr) / top) * 60;
        outBars.push(svg('rect', { x: xOf(fr) - 1, y: 222 - h, width: 2, height: h, fill: COL.harmonic }));
      }
    } else {
      let d = `M${X0},222`;
      for (let i = 0; i <= 200; i++) {
        const fr = FMIN * Math.pow(FMAX / FMIN, i / 200);
        d += `L${xOf(fr).toFixed(1)},${(222 - (response(fr) / top) * 60).toFixed(1)}`;
      }
      outBars.push(svg('path', { d: `${d}L${X1},222Z`, fill: COL.harmonic, opacity: 0.6 }));
    }
    redraw(g,
      label(X0, 16, `The voice saying “${VOWELS[vowel].name}”, measured in ${COUNTS[count]} bands`, { bold: true }),
      svg('line', { x1: X0, y1: 100, x2: X1, y2: 100, stroke: COL.grid }),
      ...bandBars,
      svg('path', { d: curve, fill: 'none', stroke: COL.ink, 'stroke-width': 1.4 }),
      label(X0, 140, `The ${CARRIERS[carrier].toLowerCase()} through the same bands`, { bold: true }),
      svg('line', { x1: X0, y1: 222, x2: X1, y2: 222, stroke: COL.ink }),
      ...outBars,
      small(xOf(200), 238, '200 Hz', { anchor: 'middle', soft: true }),
      small(xOf(1000), 238, '1 kHz', { anchor: 'middle', soft: true }),
      small(xOf(4000), 238, '4 kHz', { anchor: 'middle', soft: true }),
    );
    f.readout.textContent = COUNTS[count] <= 4
      ? 'Four bands are too coarse to show where the formants are: every vowel comes out much the same.'
      : COUNTS[count] >= 16
        ? 'Enough bands to follow both formants: the synth says the vowel.'
        : 'Eight bands catch the formants roughly: the vowels are there, but blurred.';
    sound.update();
    counts.add(COUNTS[count]);
    vowels.add(vowel);
    if (counts.has(4) && [...counts].some((c) => c >= 16) && vowels.size >= 2) t.done();
  };
  const pickVowel = choices(VOWELS.map((v) => v.name), (i) => { vowel = i; paint(); });
  const pickCarrier = choices([...CARRIERS], (i) => { carrier = i; paint(); });
  const n = slider('Bands', 0, COUNTS.length - 1, 1, count, (v) => String(COUNTS[v]), (v) => { count = v; paint(); }, 'filter');
  f.controls.append(pickVowel.node, pickCarrier.node, n.node, sound.button);
  pickCarrier.pick(0);
  pickVowel.pick(2);
  return f.node;
});
