// Branch H1, Eggs that broke: a poison that lasts, multiplying at each step
// up a food chain, beside what Woodwell's team measured on Long Island.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { big, COL, figure, frame, guessFirst, legend, sig, slider } from './kit';

const W = 400;

export const STEPS = ['Water', 'Plankton', 'Small fish', 'Fish-eating fish', 'Fish-eating bird'];
/** DDT and its breakdown products in a Long Island salt marsh, ppm (Woodwell, Wurster and Isaacson, 1967): water, plankton, silversides, needlefish, osprey. */
export const WOODWELL = [0.00005, 0.04, 0.23, 2.07, 13.8];
/** Roughly the level in a bird of prey at which its eggshells start to thin, ppm. */
export const THIN = 3;

/**
 * Poison at each step: water, then plankton (which soak it up from the water),
 * then three steps where each kilo of body is built from `eaten` kilos of food
 * and a share `kept` of the poison in that food stays in the body. A model.
 */
export function chainPpm(kept: number, eaten: number): number[] {
  const out = [WOODWELL[0], WOODWELL[1]];
  for (let i = 2; i < STEPS.length; i++) out.push(out[i - 1] * kept * eaten);
  return out;
}

const MIN = -5;
const MAX = 3;

export const magnifyFigure = figure(['breaks'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let kept = 0.9;
  let eaten = 10;
  const x0 = 112;
  const w = 270;
  const X = (v: number) => x0 + ((Math.log10(Math.max(v, 10 ** MIN)) - MIN) / (MAX - MIN)) * w;
  const paint = () => {
    const ppm = chainPpm(kept, eaten);
    const rows = ppm.map((v, i) => {
      const y = 30 + i * 34;
      return [
        small(x0 - 6, y + 14, STEPS[i], { anchor: 'end', bold: i === STEPS.length - 1 }),
        svg('rect', { x: x0, y, width: Math.max(1, X(v) - x0), height: 20, fill: i === 0 ? COL.water : i === 1 ? COL.plant : i < 4 ? COL.sea : COL.predator, opacity: 0.85, rx: 2 }),
        svg('circle', { cx: X(WOODWELL[i]), cy: y + 10, r: 3.4, fill: COL.ink, stroke: '#fbf8ef', 'stroke-width': 0.8 }),
      ];
    }).flat();
    redraw(g,
      svg('rect', { x: X(THIN), y: 22, width: x0 + w - X(THIN), height: 176, fill: COL.heat, opacity: 0.08 }),
      small(x0 + w, 18, 'eggshells thin (roughly)', { anchor: 'end', fill: COL.heat }),
      ...[-4, -2, 0, 2].map((p) => [line(X(10 ** p), 198, X(10 ** p), 202, COL.ink, 1), small(X(10 ** p), 212, p < 0 ? String(10 ** p).replace(/^0/, '') : big(10 ** p), { anchor: 'middle', soft: true })]).flat(),
      line(x0, 198, x0 + w, 198, COL.ink, 1.2),
      small(x0 + w, 224, 'parts per million (each step 100 times the last)', { anchor: 'end' }),
      ...rows,
      ...legend(8, 232, [{ text: 'measured', color: COL.ink, dot: true }]),
    );
    if (!open()) return;
    const bird = ppm[ppm.length - 1];
    f.readout.textContent = `Each step up multiplies the poison by ${sig(kept * eaten)}. The bird carries ${sig(bird)} ppm, ${sig(bird / ppm[0], 2)} times the water. ${bird > THIN ? 'Enough to thin its eggshells.' : 'Below where shells start to thin: a poison the body breaks down or sheds doesn’t pile up.'}`;
    if (bird < THIN) t.done();
  };
  const ks = slider('Share of the poison the body keeps', 0, 1, 0.05, kept, (v) => `${Math.round(v * 100)}%`, (v) => { kept = v; paint(); }, 'heat');
  const es = slider('Food eaten to build each kilo of body', 3, 20, 1, eaten, (v) => `${v} kg`, (v) => { eaten = v; paint(); }, 'prey');
  f.controls.append(ks.node, es.node);
  const open = guessFirst(t, f, {
    ask: 'The water holds 0.00005 ppm of DDT and the plankton 0.04 ppm. At each step after that, an animal eats about ten kilos of food for each kilo it grows and keeps most of the poison. What does a fish-eating bird three steps above the plankton carry?',
    options: ['About 0.04 ppm, like the plankton', 'About 0.4 ppm', 'About 30 ppm'],
    answer: 2,
    sliders: [ks, es],
    after: () => paint(),
  });
  paint();
  return f.node;
});
