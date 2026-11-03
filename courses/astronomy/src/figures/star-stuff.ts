// Lesson 17, Star stuff: a heavy star's last years as an onion of burning
// shells, each stage faster than the last; and the periodic table coloured by
// where each element was made, one source at a time.

import { svg } from 'didactics/dom';
import { note, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, sig, slider, toggles } from './kit';

const W = 400;

/** The burning stages of a star of about 20 Suns: what burns, into what, and for how long (years). */
export const STAGES = [
  { fuel: 'hydrogen', ash: 'helium', years: 8e6, colour: '#7fa7e0' },
  { fuel: 'helium', ash: 'carbon and oxygen', years: 1e6, colour: '#9a86d6' },
  { fuel: 'carbon', ash: 'neon and magnesium', years: 1e3, colour: '#c77fb6' },
  { fuel: 'neon', ash: 'oxygen and magnesium', years: 1, colour: '#df8a7a' },
  { fuel: 'oxygen', ash: 'silicon and sulphur', years: 0.5, colour: '#e8ad5c' },
  { fuel: 'silicon', ash: 'iron', years: 1 / 365, colour: '#e8d35c' },
] as const;

/** Which stages have begun when `left` years remain before the core collapses. */
export function stagesBegun(left: number): number {
  let n = 0;
  let sum = 0;
  for (let i = STAGES.length - 1; i >= 0; i--) {
    sum += STAGES[i].years;
    if (left <= sum) n = Math.max(n, i + 1);
  }
  return Math.max(1, n);
}

const say = (y: number) =>
  y >= 1e6 ? `${sig(y / 1e6, 2)} million years` : y >= 2 ? `${sig(y, 2)} years` : y >= 2 / 365 ? `${sig(y * 365, 2)} days` : y >= 2 / 8760 ? `${sig(y * 8760, 2)} hours` : `${sig(y * 31.5e6, 2)} seconds`;

// ---- The onion (live) -----------------------------------------------------------------------

export const onionFigure = figure(['collapse'], (_ctx, t) => {
  const H = 240;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  // The slider runs over the log of the time left, from 10 million years to a second.
  let logLeft = 7;
  let guessed = false;
  const paint = () => {
    const left = 10 ** logLeft;
    const end = logLeft <= -7.4;
    const n = stagesBegun(left);
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.sky })];
    const cx = 120;
    const cy = 124;
    if (!end) {
      parts.push(svg('circle', { cx, cy, r: 100, fill: '#2a3150' }));
      // The newest fire is innermost; each older one burns on in a shell around it.
      for (let i = 0; i < n; i++) parts.push(svg('circle', { cx, cy, r: 92 - i * 14, fill: STAGES[i].colour, opacity: 0.9 }));
      parts.push(svg('circle', { cx, cy, r: 92 - n * 14, fill: n === STAGES.length ? '#8d8a84' : '#2a3150' }));
      if (n === STAGES.length) parts.push(small(cx, cy + 4, 'iron', { anchor: 'middle', fill: COL.ink, bold: true }));
    } else {
      parts.push(svg('circle', { cx, cy, r: 100, fill: '#ffe6b0', opacity: 0.25 }), svg('circle', { cx, cy, r: 6, fill: '#c9b8ff' }), small(cx, cy + 22, 'core collapses', { anchor: 'middle', fill: '#ece6d8', bold: true }));
    }
    parts.push(note(14, 20, 'Inside a star of 20 Suns', { bold: true, fill: '#ece6d8' }));
    // The key: each fuel, and how long it lasts.
    STAGES.forEach((s, i) => {
      const y = 50 + i * 26;
      const on = i < n && !end;
      parts.push(svg('rect', { x: 236, y: y - 9, width: 12, height: 12, fill: s.colour, opacity: on ? 1 : 0.25 }), small(254, y + 1, `${s.fuel} → ${s.ash}`, { fill: on ? '#ece6d8' : '#6b7090' }), small(254, y + 12, say(s.years), { fill: on ? '#a9adc2' : '#4f5574' }));
    });
    redraw(g, ...parts);
    if (!guessed) return;
    if (end) {
      f.readout.textContent = 'Iron won’t burn: fusing it takes energy instead of giving it. With nothing holding it up, the iron core, about the mass of the Sun, collapses in under a second to a neutron star, and the rest of the star is blasted outwards: a supernova.';
      if (t.goal === 'collapse') t.done();
      return;
    }
    const s = STAGES[n - 1];
    f.readout.textContent = `${say(left)} to go. The core is burning ${s.fuel} into ${s.ash}, and every older fuel burns on in a shell around it. Each new fuel gives less energy and must burn hotter, so each stage is shorter than the last.`;
  };
  // Dragged rightwards, towards the end: the slider holds minus the log of the time left.
  const s = slider('Time left before the end', -7, 7.5, 0.01, -logLeft, (v) => say(10 ** -v), (v) => { logLeft = -v; paint(); }, 'light');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'A star of 20 Suns burns hydrogen for about 8 million years. How long does its last fuel, silicon, last? Guess first.',
    options: ['About a million years', 'About a thousand years', 'About a day'],
    answer: 2,
    sliders: [s],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 2 ? 'Right. ' : ''}Run the clock down to the end, and watch the fires stack up in the core.`;
    },
  });
  return f.node;
});

// ---- The periodic table by origin (live) -----------------------------------------------------

/** Where the elements come from (after Jennifer Johnson's chart, simplified). */
export const SOURCES = [
  { key: 'B', name: 'Big Bang', colour: '#7fa7e0' },
  { key: 'L', name: 'Dying light stars', colour: '#7fc79a' },
  { key: 'M', name: 'Exploding heavy stars', colour: '#e8ad5c' },
  { key: 'W', name: 'Exploding white dwarfs', colour: '#e8e2c8' },
  { key: 'N', name: 'Merging neutron stars', colour: '#c77fb6' },
  { key: 'R', name: 'Cosmic rays', colour: '#df6f5f' },
] as const;

/** Each element's symbol and its sources, main one first ('' for elements that only come from radioactive decay). */
const TABLE = 'H:B He:B Li:BRL Be:R B:R C:LM N:LM O:M F:ML Ne:M Na:M Mg:M Al:M Si:MW P:M S:MW Cl:M Ar:MW K:M Ca:MW Sc:M Ti:MW V:WM Cr:WM Mn:W Fe:WM Co:MW Ni:WM Cu:M Zn:M Ga:ML Ge:ML As:M Se:M Br:M Kr:ML Rb:LN Sr:L Y:L Zr:L Nb:L Mo:LN Tc: Ru:NL Rh:N Pd:NL Ag:N Cd:LN In:LN Sn:L Sb:N Te:N I:N Xe:N Cs:N Ba:L La:L Ce:L Pr:LN Nd:LN Pm: Sm:NL Eu:N Gd:N Tb:N Dy:N Ho:N Er:N Tm:N Yb:NL Lu:N Hf:LN Ta:NL W:LN Re:N Os:N Ir:N Pt:N Au:N Hg:LN Tl:LN Pb:L Bi:LN Po: At: Rn: Fr: Ra: Ac: Th:N Pa: U:N'
  .split(' ')
  .map((e, i) => {
    const [sym, src] = e.split(':');
    return { z: i + 1, sym, src };
  });

/** Grid position of element `z`: [column, row], 0-based, with the lanthanides and actinides in rows 7 and 8. */
export function cell(z: number): [number, number] {
  if (z === 1) return [0, 0];
  if (z === 2) return [17, 0];
  if (z <= 10) return [z <= 4 ? z - 3 : z + 7, 1];
  if (z <= 18) return [z <= 12 ? z - 11 : z - 1, 2];
  if (z <= 36) return [z - 19, 3];
  if (z <= 54) return [z - 37, 4];
  if (z <= 56) return [z - 55, 5];
  if (z <= 71) return [z - 55, 7];
  if (z <= 86) return [z - 69, 5];
  if (z <= 88) return [z - 87, 6];
  return [z - 87, 8];
}

/** The element's colour with the given sources switched on: its main switched-on source, or none. */
export function madeBy(z: number, on: readonly boolean[]): string | null {
  const e = TABLE[z - 1];
  for (const k of e.src) {
    const i = SOURCES.findIndex((s) => s.key === k);
    if (on[i]) return SOURCES[i].key;
  }
  return null;
}

export const originsFigure = figure(['all'], (_ctx, t) => {
  const H = 250;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let on = SOURCES.map(() => false);
  let guessed = false;
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.paper })];
    const cw = 21.6;
    const ch = 21;
    let made = 0;
    for (const e of TABLE) {
      const [c, r] = cell(e.z);
      const x = 6 + c * cw;
      const y = 8 + r * ch + (r >= 7 ? 8 : 0);
      const k = madeBy(e.z, on);
      const src = SOURCES.find((s) => s.key === k);
      if (k) made++;
      parts.push(svg('rect', { x, y, width: cw - 1.5, height: ch - 1.5, rx: 2, fill: src ? src.colour : e.src ? '#ece6d8' : '#d6d2c6', stroke: e.sym === 'Au' ? COL.ink : 'none', 'stroke-width': 1.5 }));
      parts.push(small(x + cw / 2 - 0.7, y + 13.5, e.sym, { anchor: 'middle', fill: e.src ? COL.ink : '#9a968c', attrs: { 'font-size': 8.5 } }));
    }
    const all = TABLE.filter((e) => e.src).length;
    parts.push(small(394, 240, `${made} of ${all} elements accounted for`, { anchor: 'end', soft: true }));
    parts.push(small(6, 240, 'grey: only from radioactive decay', { soft: true, attrs: { 'font-size': 8.5 } }));
    redraw(g, ...parts);
    if (!guessed) return;
    f.readout.textContent = made === all
      ? 'Every element in nature, accounted for. Gold (outlined) comes mostly from merging neutron stars, though how much also comes from rare kinds of exploding star is still argued about.'
      : `Switch on another source. ${on[SOURCES.findIndex((s) => s.key === 'N')] ? '' : 'Gold, outlined, is still waiting.'}`;
    if (made === all && t.goal === 'all') t.done();
  };
  const row = toggles(SOURCES.map((s) => s.name), on, (o) => { on = o; paint(); });
  row.buttons.forEach((b, i) => (b.style.borderLeft = `6px solid ${SOURCES[i].colour}`));
  f.controls.append(row.node);
  paint();
  guessFirst(t, f, {
    ask: 'Where did most of the gold in a wedding ring come from? Guess first.',
    options: ['The Big Bang', 'Stars exploding', 'Neutron stars colliding'],
    answer: 2,
    sliders: [],
    buttons: row.buttons,
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 2 ? 'Right, as far as anyone knows. ' : ''}Switch on each source of elements, one at a time, and see what it made.`;
    },
  });
  return f.node;
});
