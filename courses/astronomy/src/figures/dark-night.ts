// Lesson 22, Why is the night sky dark?: a patch of sky filling with stars as
// you see further back; and the Big Bang's afterglow, cooling from a star's
// surface to microwaves as the universe ages, against COBE's measurement.

import { svg } from 'didactics/dom';
import { line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, sig, slider } from './kit';
import { glowColour, planck } from './light';

const W = 400;

/**
 * How far, light years, a line of sight goes on average before it hits a star's
 * surface, in a universe filled with stars as ours is: about a hundred thousand
 * trillion trillion light years (10²³).
 */
export const FOREST = 1e23;
/** The share of the sky covered by stars, seeing out to `ly` light years. */
export const covered = (ly: number) => 1 - Math.exp(-ly / FOREST);

const sayLy = (ly: number) => {
  const p = Math.floor(Math.log10(ly));
  if (p < 6) return `${Number(ly.toPrecision(1)).toLocaleString('en-US')} light years`;
  if (p < 9) return `${sig(ly / 1e6, 2)} million light years`;
  if (p < 12) return `${sig(ly / 1e9, 2)} billion light years`;
  return `10 to the power ${p} light years`;
};

// ---- The forest of stars (live) --------------------------------------------------------------

export const olbersFigure = figure(['dark'], (_ctx, t) => {
  const H = 230;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let logLy = 3;
  let guessed = false;
  const visited = { endless: false, ours: false };
  // A few hundred stars at random depths: star k shows once you see out past its depth.
  const rnd = makeRng(1823);
  const stars = Array.from({ length: 420 }, () => ({ x: 14 + rnd() * 372, y: 34 + rnd() * 150, at: 1 + rnd() * 24, r: 0.6 + rnd() * 1.6 }));
  const paint = () => {
    const ly = 10 ** logLy;
    const fill = covered(ly);
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.sky })];
    // The patch of sky: its glow is the share covered by star surfaces, each as bright as the Sun's.
    parts.push(svg('rect', { x: 14, y: 34, width: 372, height: 150, fill: COL.sky, stroke: COL.skyLine }), svg('rect', { x: 14, y: 34, width: 372, height: 150, fill: glowColour(5772), opacity: Math.max(0, fill) }));
    for (const s of stars) if (s.at <= logLy) parts.push(svg('circle', { cx: s.x, cy: s.y, r: s.r, fill: '#fff6dc', opacity: 1 - fill * 0.9 }));
    parts.push(note(14, 22, 'A patch of night sky, seeing out to…', { bold: true, fill: '#ece6d8' }), small(14, 202, sayLy(ly), { fill: COL.light, bold: true }), small(386, 202, fill > 0.01 ? `${Math.round(fill * 100)}% of the sky is star surface` : 'almost all of the sky is dark', { anchor: 'end', fill: '#ece6d8' }));
    if (Math.abs(logLy - Math.log10(13.8e9)) < 0.15) parts.push(small(14, 218, 'as far as light has had time to come since the universe began', { fill: '#a9adc2' }));
    redraw(g, ...parts);
    if (!guessed) return;
    if (logLy >= 24) visited.endless = true;
    if (Math.abs(logLy - Math.log10(13.8e9)) < 0.15) visited.ours = true;
    f.readout.textContent = visited.endless && visited.ours
      ? 'An ageless universe would blaze like the Sun’s surface in every direction. Ours is dark because its starlight has only had 13.8 billion years to arrive: the darkness of night says the universe had a beginning.'
      : logLy >= 24
        ? 'Every line of sight ends on a star: the whole sky as bright as the Sun’s surface. Now bring it back to how far light has had time to travel in our universe, about 14 billion light years.'
        : `Out to ${sayLy(ly)}. Keep going: how far would you have to see for the sky to fill?`;
    if (visited.endless && visited.ours && t.goal === 'dark') t.done();
  };
  const s = slider('How far back you can see', 3, 25, 0.01, logLy, (v) => sayLy(10 ** v), (v) => { logLy = v; paint(); }, 'light');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'Suppose the universe went on for ever, full of stars, and had always been here. How bright would the night sky be? Guess first.',
    options: ['As dark as it is now', 'A little brighter', 'As bright as the Sun’s surface, everywhere'],
    answer: 2,
    sliders: [s],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 2 ? 'Right. ' : ''}See further and further back, and watch the sky fill. Then come back to our universe’s age.`;
    },
  });
  return f.node;
});

// ---- The afterglow cooling (live) ------------------------------------------------------------

/** The afterglow's temperature, kelvin, when the universe was `years` old (it cools as the universe stretches). */
export const glowTemp = (years: number) => 2.725 * (13.8e9 / years) ** (2 / 3);

/** Wavelengths across the plot, nm, on a log scale: 100 nm to 10 mm. */
const L0 = 2;
const L1 = 7;

export const afterglowFigure = figure(['today'], (_ctx, t) => {
  const H = 240;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let logYears = Math.log10(380000);
  let guessed = false;
  const lx = (nm: number) => 20 + ((Math.log10(nm) - L0) / (L1 - L0)) * 370;
  // Light per step of the log scale, scaled to its own peak, which is at 3.67 mm·K over the temperature.
  const top = (temp: number) => 3.67e6 / temp;
  const shape = (nm: number, temp: number) => (nm * planck(nm, temp)) / (top(temp) * planck(top(temp), temp));
  const paint = () => {
    const temp = glowTemp(10 ** logYears);
    const parts: SVGElement[] = [svg('rect', { width: W, height: H, fill: COL.paper })];
    // Bands.
    const band = (a: number, b: number, name: string, colour: string) => parts.push(svg('rect', { x: lx(a), y: 44, width: lx(b) - lx(a), height: 142, fill: colour, opacity: 0.18 }), small((lx(a) + lx(b)) / 2, 40, name, { anchor: 'middle', soft: true }));
    band(380, 750, 'visible', '#e8c45c');
    band(750, 1e6, 'infrared', COL.cool);
    band(1e6, 1e7, 'microwave', COL.hot);
    // The curve, scaled to its own peak (the real glow also fades as it cools).
    const pts: P[] = [];
    for (let i = 0; i <= 200; i++) {
      const nm = 10 ** (L0 + ((L1 - L0) * i) / 200);
      pts.push([lx(nm), 186 - 124 * shape(nm, temp)]);
    }
    parts.push(line(20, 186, 390, 186, COL.soft, 1), polyline(pts, COL.model, 2.5));
    // COBE's measurements: the curve for 2.725 K, sampled where FIRAS measured, 0.5 to 5 mm.
    for (let mm = 0.5; mm <= 5; mm *= 1.13) {
      const nm = mm * 1e6;
      parts.push(svg('circle', { cx: lx(nm), cy: 186 - 124 * shape(nm, 2.725), r: 2.6, fill: COL.ink }));
    }
    for (const [nm, text] of [[100, '100 nm'], [1000, '1 µm'], [1e4, '10 µm'], [1e5, '0.1 mm'], [1e6, '1 mm'], [1e7, '1 cm']] as const) parts.push(small(lx(nm), 200, text, { anchor: nm === 100 ? undefined : nm === 1e7 ? 'end' : 'middle', soft: true }));
    parts.push(small(390, 214, 'wavelength', { anchor: 'end', soft: true }), small(20, 228, 'dots: COBE’s measurement, 1990', { soft: true }));
    parts.push(note(14, 18, `The afterglow at ${sig(temp, 3)} K`, { bold: true }));
    redraw(g, ...parts);
    if (!guessed) return;
    const yrs = 10 ** logYears;
    const now = temp < 2.9;
    const age = yrs >= 1e9 ? `${sig(yrs / 1e9, 3)} billion years` : yrs >= 1e6 ? `${sig(yrs / 1e6, 2)} million years` : `${(Math.round(yrs / 1000) * 1000).toLocaleString('en-US')} years`;
    f.readout.textContent = now
      ? `At ${age}, the glow is ${sig(temp, 3)} degrees above absolute zero, brightest at about a millimetre: microwaves. It sits exactly on COBE’s measurements.`
      : `At ${age}, the afterglow is at ${sig(temp, 2)} K, brightest at ${sig(top(temp) / 1000, 2)} µm. ${temp > 2000 ? 'As hot as a cool star’s surface.' : 'Stretched with the universe, it is cooling.'} Bring it to today.`;
    if (now && t.goal === 'today') t.done();
  };
  const s = slider('Age of the universe', Math.log10(380000), Math.log10(13.8e9), 0.01, logYears, (v) => {
    const y = 10 ** v;
    return y >= 1e9 ? `${sig(y / 1e9, 3)} billion yr` : y >= 1e6 ? `${sig(y / 1e6, 2)} million yr` : `${sig(y / 1000, 3)} thousand yr`;
  }, (v) => { logYears = v; paint(); }, 'model');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: '380,000 years after the start, the universe glowed as hot as a cool star’s surface. What has become of that light today? Guess first.',
    options: ['It is still orange, only fainter', 'It has cooled into microwaves', 'It is gone'],
    answer: 1,
    sliders: [s],
    after: (guess) => {
      guessed = true;
      paint();
      f.readout.textContent = `${guess === 1 ? 'Right. ' : ''}Let the universe age and stretch, and follow its first light to today.`;
    },
  });
  return f.node;
});
