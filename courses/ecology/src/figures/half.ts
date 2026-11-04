// Lesson 19, Half the Earth?: a forest square cut free of the forest around it,
// losing species for decades, and the species-area rule run backward.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, pick, player, slider, toggles } from './kit';

const W = 400;

/** Species of forest bird in a stretch of unbroken forest. */
export const FOREST_KINDS = 100;
/** The species-area exponent, Darlington's rule. */
export const Z = 0.3;
/** Area that holds the whole forest's species, ha. */
const FULL = 10000;

/** The core of a square of `ha` hectares, once a strip `edge` metres deep around it is too bright, dry and windy for forest-interior birds. */
export function core(ha: number, edge: number): number {
  const side = Math.sqrt(ha) * 100;
  const inner = Math.max(0, side - 2 * edge);
  return (inner * inner) / 10000;
}

/** Species a forest square holds in the end: the species-area rule applied to its core (with a few edge-tolerant ones kept even with no core). */
export function settled(ha: number, edge: number): number {
  const c = core(ha, edge);
  const interior = FOREST_KINDS * 0.8 * Math.min(1, (Math.max(c, 0.0001) / FULL) ** Z) * (c > 0 ? 1 : 0);
  const edgeKinds = FOREST_KINDS * 0.2 * Math.min(1, (ha / FULL) ** Z);
  return interior + edgeKinds;
}

/** How many years it takes to lose about two-thirds of the species a square will eventually lose: longer for bigger squares. */
export const lag = (ha: number) => 4 * Math.sqrt(ha);

/** Species left `years` after the cut. */
export const left = (ha: number, edge: number, years: number) => {
  const end = settled(ha, edge);
  return end + (FOREST_KINDS - end) * Math.exp(-years / lag(ha));
};

const SIZES = [1, 10, 100];

export const fragmentFigure = figure(['debt'], (ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let at = 1;
  let edge = 100;
  let year = 0;
  const paint = () => {
    const ha = SIZES[at];
    const side = Math.sqrt(ha) * 100;
    const px = 130 / Math.sqrt(100) / 100;
    const s = side * px;
    const e = Math.min(s / 2, edge * px);
    const cx = 80;
    const cy = 104;
    const a = axes({ x: 186, y: 20, w: 200, h: 160, xmin: 0, xmax: 60, ymin: 0, ymax: 100, xticks: [0, 20, 40, 60], yticks: [0, 50, 100], xlabel: 'years after the cut', ylabel: 'kinds of forest bird', ink: COL.ink, grid: COL.grid });
    const pts = Array.from({ length: Math.round(year) + 1 }, (_, y) => [y, left(ha, edge, y)] as [number, number]);
    const now = left(ha, edge, year);
    const end = settled(ha, edge);
    redraw(g,
      svg('rect', { x: 10, y: 34, width: 140, height: 140, fill: '#e8dfc4' }),
      small(80, 26, 'cleared pasture', { anchor: 'middle', soft: true }),
      svg('rect', { x: cx - s / 2, y: cy - s / 2, width: s, height: s, fill: COL.lichen }),
      s - 2 * e > 0 ? svg('rect', { x: cx - s / 2 + e, y: cy - s / 2 + e, width: s - 2 * e, height: s - 2 * e, fill: '#2f5f2c' }) : null,
      small(80, 192, `${ha} ha: core ${core(ha, edge) < 10 ? core(ha, edge).toFixed(1) : Math.round(core(ha, edge))} ha`, { anchor: 'middle' }),
      ...legend(10, 212, [{ text: 'edge', color: COL.lichen }, { text: 'core forest', color: '#2f5f2c' }]),
      ...a.parts,
      line(a.X(0), a.Y(end), a.X(60), a.Y(end), COL.model, 1.2, { 'stroke-dasharray': '5 3' }),
      a.path(pts, COL.heat, 2.2),
      label(386, 214, 'A model', { anchor: 'end', size: 'small', soft: true }),
    );
    if (!open()) return;
    const owed = now - end;
    f.readout.textContent = year < 1
      ? `Just cut: the ${ha}-hectare square still holds all ${FOREST_KINDS} kinds of forest bird. Press Play.`
      : `${Math.round(year)} years on: ${Math.round(now)} kinds left. The square will settle near ${Math.round(end)}, so ${Math.round(owed)} more are still to go: an extinction debt, not yet paid.`;
    if (year >= 30) t.done();
  };
  const ys = slider('Years after the cut', 0, 60, 1, 0, (v) => String(v), (v) => { year = v; paint(); }, 'model');
  const play = player(ys, ctx, { seconds: 10 });
  const sizes = pick(SIZES.map((h) => `${h} ha`), at, (i) => { at = i; paint(); });
  const es = slider('Edge depth', 0, 300, 10, edge, (v) => `${v} m`, (v) => { edge = v; paint(); }, 'sun');
  f.controls.append(play.node, ys.node, sizes.node, es.node);
  const open = guessFirst(t, f, {
    ask: 'Ranchers clear the forest around a 100-hectare square and leave it standing. When does the square lose the birds it can no longer support?',
    options: ['All at once, as the forest around is cut', 'Gradually, over decades', 'Never: the square keeps them'],
    answer: 1,
    sliders: [ys, es],
    buttons: [play.node, ...sizes.buttons],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Running the curve backward ---------------------------------------------------------------

/** Share of species kept in the long run when a share `kept` of the land is left, by the species-area rule. With species spread evenly over their land, fewer are lost, since a species is lost only when all its range goes. */
export const keptShare = (kept: number, spread: boolean) => (kept <= 0 ? 0 : kept ** (spread ? 0.1 : Z));

export const halfFigure = figure(['half'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let kept = 1;
  let spread = false;
  const paint = () => {
    const a = axes({ x: 44, y: 18, w: 340, h: 160, xmin: 0, xmax: 100, ymin: 0, ymax: 100, xticks: [0, 25, 50, 75, 100], yticks: [0, 50, 100], xlabel: 'share of the land left as habitat, %', ylabel: 'share of species kept, %', ink: COL.ink, grid: COL.grid });
    const curve = (sp: boolean) => Array.from({ length: 51 }, (_, i) => [i * 2, keptShare(i / 50, sp) * 100] as [number, number]);
    const k = keptShare(kept, spread) * 100;
    redraw(g,
      ...a.parts,
      a.path(curve(!spread), COL.grid, 1.4),
      a.path(curve(spread), COL.model, 2.2),
      line(a.X(kept * 100), a.Y(0), a.X(kept * 100), a.Y(k), COL.heat, 1, { 'stroke-dasharray': '3 3' }),
      line(a.X(0), a.Y(k), a.X(kept * 100), a.Y(k), COL.heat, 1, { 'stroke-dasharray': '3 3' }),
      svg('circle', { cx: a.X(kept * 100), cy: a.Y(k), r: 4.5, fill: COL.heat }),
      ...legend(44, 214, [{ text: spread ? 'species spread evenly' : 'species in clumps (species-area rule)', color: COL.model }, { text: 'the other assumption', color: COL.grid }]),
    );
    f.readout.textContent = `Leave ${Math.round(kept * 100)}% of the land and, in the long run, about ${Math.round(k)}% of its species survive${spread ? ', if each species is spread across the land and is lost only when its whole range goes' : ', by the species-area rule run backward'}. Lose the rest and ${Math.round(100 - k)}% are eventually gone.`;
    if (Math.abs(kept - 0.5) < 0.02) t.done();
  };
  const s = slider('Land left as habitat', 0, 1, 0.01, kept, (v) => `${Math.round(v * 100)}%`, (v) => { kept = v; paint(); }, 'plant');
  const sw = toggles(['Species spread evenly'], [false], (on) => { spread = on[0]; paint(); });
  f.controls.append(s.node, sw.node);
  paint();
  return f.node;
});
