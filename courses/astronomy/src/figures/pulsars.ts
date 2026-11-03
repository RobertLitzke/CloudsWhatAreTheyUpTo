// Lesson 16, Little green men: Jocelyn Bell's chart with its bit of scruff,
// and a white dwarf and a neutron star spun up together until one flies apart.

import { svg } from 'didactics/dom';
import { line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, sig, slider } from './kit';

const W = 400;
const GM_SUN = 1.327e20;

/** The fastest a body of `suns` and radius `km` can spin, turns a second, before its equator flies off. */
export const breakup = (suns: number, km: number) => Math.sqrt((GM_SUN * suns) / (km * 1000) ** 3) / (2 * Math.PI);

/** A white dwarf like Sirius B, and a neutron star. */
export const DWARF = { suns: 1, km: 5900 };
export const NEUTRON = { suns: 1.4, km: 11 };
/** The Crab pulsar's flashes a second, and Bell's first pulsar's period, seconds. */
export const CRAB = 30;
export const CP1919 = 1.337;

// ---- Spin them up (live) --------------------------------------------------------------------

export const spinFigure = figure(['crab'], (_ctx, t) => {
  const H = 230;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let logRate = -1;
  let guessed = false;
  const bodies = [
    { ...DWARF, name: 'white dwarf', size: 'the Earth’s size', x: 105, r: 46, fill: '#dfe8ff' },
    { ...NEUTRON, name: 'neutron star', size: '20 km across', x: 295, r: 12, fill: '#c9b8ff' },
  ];
  const paint = () => {
    const rate = 10 ** logRate;
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.sky })];
    parts.push(note(14, 20, 'Spin both at the same rate (not to scale)', { bold: true, fill: '#ece6d8' }));
    for (const b of bodies) {
      const share = rate / breakup(b.suns, b.km);
      const cy = 100;
      if (share < 1) {
        // Squashed a little by its spin, with a beam sweeping round.
        const flat = 1 - 0.3 * Math.min(1, share) ** 2;
        parts.push(svg('ellipse', { cx: b.x, cy, rx: b.r / Math.sqrt(flat), ry: b.r * flat, fill: b.fill }));
        parts.push(line(b.x - 3, cy - b.r - 3, b.x - 12, cy - b.r - 26, COL.light, 2.5, { opacity: 0.8 }), line(b.x + 3, cy + b.r + 3, b.x + 12, cy + b.r + 26, COL.light, 2.5, { opacity: 0.8 }));
      } else {
        const rnd = makeRng(Math.round(b.x));
        for (let i = 0; i < 14; i++) {
          const a = rnd() * Math.PI * 2;
          const d = b.r * (1.2 + rnd() * 1.4);
          parts.push(svg('circle', { cx: b.x + d * Math.cos(a), cy: cy + d * Math.sin(a) * 0.6, r: 2 + rnd() * 4, fill: b.fill, opacity: 0.8 }));
        }
        parts.push(small(b.x, cy + 4, 'flies apart', { anchor: 'middle', fill: COL.cool, bold: true }));
      }
      parts.push(small(b.x, 178, `${b.name}, ${b.size}`, { anchor: 'middle', fill: '#ece6d8', bold: true }));
      parts.push(small(b.x, 192, `breaks up above ${sig(breakup(b.suns, b.km), 2)} turns a second`, { anchor: 'middle', fill: '#a9adc2' }));
    }
    parts.push(small(W / 2, 220, `spinning ${sig(rate, 2)} times a second`, { anchor: 'middle', fill: COL.light, bold: true }));
    redraw(g, ...parts);
    if (!guessed) return;
    const wd = rate < breakup(DWARF.suns, DWARF.km);
    const crab = Math.abs(Math.log10(rate / CRAB)) < 0.04;
    f.readout.textContent = crab
      ? 'The Crab’s rate. A white dwarf would be torn apart many times over; a neutron star, small and hugely dense, is nowhere near its limit. Pulsars are spinning neutron stars.'
      : `${wd ? 'Both hold together.' : 'The white dwarf has flown apart; the neutron star holds.'} ${rate < 1 / CP1919 ? `Bell’s first pulsar turns ${sig(1 / CP1919, 2)} times a second.` : ''} Take it to the Crab pulsar’s 30 times a second.`;
    if (crab && t.goal === 'crab') t.done();
  };
  const s = slider('Spin', -2, 3, 0.01, logRate, (v) => `${sig(10 ** v, 2)} a second`, (v) => { logRate = v; paint(); }, 'light');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'The Crab pulsar flashes 30 times a second. If each flash is one turn of a spinning star, could a white dwarf spin that fast? Guess first.',
    options: ['Yes, easily', 'No, it would fly apart', 'Only a very heavy one'],
    answer: 1,
    sliders: [s],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}Spin both stars faster and faster. Take them to the Crab pulsar’s 30 times a second.`;
    },
  });
  return f.node;
});

// ---- Bell's chart (a still) ------------------------------------------------------------------

export const bellChartStill = () => {
  const H = 210;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' });
  s.append(svg('rect', { width: W, height: H, fill: '#f6efdc' }));
  for (let x = 20; x <= 390; x += 18.5) s.append(line(x, 30, x, 190, 'rgba(160, 90, 80, 0.18)', 1));
  for (let y = 30; y <= 190; y += 16) s.append(line(20, y, 390, y, 'rgba(160, 90, 80, 0.18)', 1));
  const rnd = makeRng(1967);
  // Above: the survey trace, where the source was a quarter-inch of scruff among the noise.
  const top: P[] = [];
  for (let x = 20; x <= 390; x += 1.5) {
    const scruff = x > 210 && x < 238 ? (rnd() - 0.5) * 40 : 0;
    top.push([x, 70 + (rnd() - 0.5) * 9 + scruff]);
  }
  s.append(polyline(top, '#3b3a72', 1), small(224, 40, 'the “bit of scruff”', { anchor: 'middle', fill: '#7a2e2e', bold: true }));
  // Below: the fast recording of 28 November 1967, pulses every 1.337 seconds (a second is 18.5 px).
  const low: P[] = [];
  for (let x = 20; x <= 390; x += 1) {
    const sec = (x - 20) / 18.5;
    const phase = (sec % CP1919) / CP1919;
    const pulse = phase < 0.03 && rnd() > 0.15 ? -36 * (0.5 + rnd() * 0.5) : 0;
    low.push([x, 160 + (rnd() - 0.5) * 6 + pulse]);
  }
  s.append(polyline(low, '#3b3a72', 1.1));
  s.append(
    note(20, 18, 'A radio telescope chart, Cambridge, 1967 (redrawn)', { bold: true }),
    small(20, 104, 'Above: the sky survey, slow. Below: run fast, 28 November.', { soft: true }),
    small(20, 204, 'one square: a second. A pulse every 1.337 seconds, as regular as a clock.', { soft: true }),
  );
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};
