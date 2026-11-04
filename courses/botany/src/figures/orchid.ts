// Lesson 18, The comet orchid: a flower's parts and the fruit they become
// (still); a flower as we see it and as a bee does; and the orchid's spur and
// the moth's tongue lengthening together, generation by generation.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, player, slider, toggles, wrapped } from './kit';

const W = 400;

// ---- A flower's parts, and its fruit (still) -----------------------------------------------------------

export const partsStill = () => {
  const s = still(W, 240);
  const cx = 130;
  const base = 190;
  const parts: SVGElement[] = [];
  // Sepals and petals.
  parts.push(
    svg('path', { d: `M${cx},${base} q-70,-10 -84,-60 q40,10 84,50 Z`, fill: '#8fbf6a' }),
    svg('path', { d: `M${cx},${base} q70,-10 84,-60 q-40,10 -84,50 Z`, fill: '#8fbf6a' }),
    svg('path', { d: `M${cx - 6},${base - 10} q-70,-40 -60,-120 q50,40 66,110 Z`, fill: '#e8a0b8' }),
    svg('path', { d: `M${cx + 6},${base - 10} q70,-40 60,-120 q-50,40 -66,110 Z`, fill: '#e8a0b8' }),
  );
  // The carpel: ovary with ovules, style, stigma.
  parts.push(
    svg('ellipse', { cx, cy: base - 24, rx: 16, ry: 20, fill: '#9fcf7a', stroke: COL.leaf }),
    ...[-6, 0, 6].map((dx, i) => svg('circle', { cx: cx + dx, cy: base - 30 + i * 6, r: 3, fill: '#f3e8b0', stroke: '#a8922e', 'stroke-width': 0.6 })),
    line(cx, base - 44, cx, base - 110, COL.leaf, 3),
    svg('ellipse', { cx, cy: base - 114, rx: 8, ry: 4, fill: '#6f9a3a' }),
  );
  // Stamens.
  for (const dx of [-22, 22]) {
    parts.push(line(cx + dx * 0.4, base - 20, cx + dx, base - 92, '#c9b26a', 2), svg('ellipse', { cx: cx + dx, cy: base - 96, rx: 5, ry: 8, fill: COL.light }));
  }
  const tags: [number, number, string][] = [
    [cx + 8, base - 114, 'stigma: catches pollen'],
    [cx + 3, base - 80, 'style'],
    [cx + 22, base - 96, 'stamen: anther makes pollen'],
    [cx + 50, base - 120, 'petals'],
    [cx + 76, base - 52, 'sepals: wrapped the bud'],
    [cx + 16, base - 24, 'ovary, holding ovules'],
  ];
  tags.forEach(([x, y, text], i) => {
    const ty = 30 + i * 30;
    parts.push(line(x, y, 236, ty - 4, COL.soft, 0.7), small(240, ty, text, { bold: i === 5 }));
  });
  // The fruit it becomes.
  parts.push(
    svg('ellipse', { cx: 330, cy: 218, rx: 26, ry: 14, fill: '#e07a5f', stroke: '#a04a3a' }),
    ...[-10, 0, 10].map((dx) => svg('ellipse', { cx: 330 + dx, cy: 218, rx: 3, ry: 2, fill: '#5a3a1a' })),
    small(240, 214, 'fruit: the ovary,', { soft: true }),
    small(240, 228, 'its seeds the ovules', { soft: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- As a bee sees it -------------------------------------------------------------------------------

export const beeFigure = figure(['bee'], (_ctx, t) => {
  const f = frame(W, 200, 2);
  const g = svg('g');
  f.svg.append(g);
  let bee = false;
  const paint = () => {
    const cx = 200;
    const cy = 100;
    const petal = bee ? '#6fd0c8' : '#f2c94c';
    const centre = bee ? '#1d3b5a' : '#e0b030';
    const petals: SVGElement[] = [];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * 46;
      const y = cy + Math.sin(a) * 46;
      petals.push(svg('ellipse', { cx: x, cy: y, rx: 34, ry: 26, fill: petal, transform: `rotate(${(a * 180) / Math.PI} ${x} ${y})` }));
      // The inner half of each petal reflects no ultraviolet: dark to a bee, the same yellow to us.
      petals.push(svg('ellipse', { cx: cx + Math.cos(a) * 26, cy: cy + Math.sin(a) * 26, rx: 16, ry: 14, fill: bee ? '#2c4f72' : petal, transform: `rotate(${(a * 180) / Math.PI} ${cx + Math.cos(a) * 26} ${cy + Math.sin(a) * 26})` }));
    }
    redraw(g,
      ...petals,
      svg('circle', { cx, cy, r: 14, fill: centre }),
      label(16, 24, bee ? 'As a bee sees it' : 'As we see it', { bold: true }),
      ...wrapped(16, 40, bee ? 'Bees see ultraviolet but not red. A false-colour picture.' : 'Plain yellow petals.', 22, { soft: true }),
    );
    f.readout.textContent = bee
      ? 'In ultraviolet, the inner halves of the petals are dark: a bullseye pointing to the nectar, invisible to us. Many yellow flowers have one.'
      : 'A yellow flower, as we see it. Bees see a different range of colours.';
    if (bee) t.done();
  };
  const sw = toggles(['As a bee sees it'], [false], (on) => { bee = on[0]; paint(); });
  f.controls.append(sw.node);
  paint();
  return f.node;
});

// ---- Spur and tongue --------------------------------------------------------------------------------

const sig = (x: number) => 1 / (1 + Math.exp(-x));

/**
 * The average spur length of the orchids and tongue length of the moths
 * (cm), generation by generation. A moth whose tongue is short of the
 * nectar gets less of it, so longer tongues leave more offspring; an orchid
 * whose spur is shorter than the tongue lets the moth sip without pressing
 * its head against the pollen, so longer spurs leave more seed. Length costs
 * a little to build. With `spurFixed`, the orchids stop changing.
 */
export function race(generations: number, spurFixed: boolean): { spur: number; tongue: number }[] {
  let spur = 4;
  let tongue = 3;
  const out = [{ spur, tongue }];
  for (let g = 1; g <= generations; g++) {
    const dT = 0.25 * sig(spur - tongue) - 0.03 * (tongue / 12);
    const dS = spurFixed ? 0 : 0.25 * sig(tongue - spur + 0.5) - 0.03 * (spur / 12);
    spur += dS;
    tongue += dT;
    out.push({ spur, tongue });
  }
  return out;
}

export const raceFigure = figure(['fixed'], (ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let gen = 0;
  let fixed = false;
  const paint = () => {
    const shown = open();
    const run = race(300, fixed);
    const now = run[gen];
    const a = axes({ x: 210, y: 30, w: 170, h: 150, xmin: 0, xmax: 300, ymin: 0, ymax: 35, xticks: [0, 100, 200, 300], yticks: [0, 10, 20, 30], ylabel: 'length, cm', xlabel: 'generations', ink: COL.ink, grid: COL.grid });
    const sofar = run.slice(0, gen + 1);
    const scale = 4;
    const top = 28;
    redraw(g,
      // The orchid's spur hanging down, and the moth's tongue reaching into it.
      svg('circle', { cx: 60, cy: top, r: 16, fill: '#f4f1e6', stroke: COL.soft }),
      svg('rect', { x: 56, y: top + 10, width: 8, height: now.spur * scale, rx: 4, fill: '#d9e7c0', stroke: COL.leaf }),
      svg('rect', { x: 57, y: top + 6 + now.spur * scale, width: 6, height: 6, fill: COL.sugar }),
      svg('ellipse', { cx: 130, cy: top + 10 + now.tongue * scale + 14, rx: 22, ry: 10, fill: '#8a7a6a' }),
      line(60, top + 10 + now.tongue * scale, 60, top + 10 + now.tongue * scale + 12, '#5a4a3a', 1.5),
      line(60, top + 10 + now.tongue * scale + 12, 112, top + 10 + now.tongue * scale + 12, '#5a4a3a', 1.5),
      small(14, 236, `spur ${now.spur.toFixed(1)} cm`, { fill: COL.leaf }),
      small(110, 236, `tongue ${now.tongue.toFixed(1)} cm`, { fill: '#5a4a3a' }),
      ...a.parts,
      a.path(sofar.map((p, i) => [i, p.spur] as const), COL.leaf, 2),
      a.path(sofar.map((p, i) => [i, p.tongue] as const), '#8a6a4a', 2),
      ...legend(210, 214, [{ text: 'spur', color: COL.leaf }, { text: 'tongue', color: '#8a6a4a' }]),
      small(210, 236, fixed ? 'Spur held fixed. A model.' : 'Both evolving. A model.', { soft: true }),
    );
    if (!shown) return;
    f.readout.textContent = gen === 0
      ? 'A short-spurred orchid and a short-tongued moth. Press Play.'
      : fixed
        ? `With the spur held at ${now.spur.toFixed(0)} cm, the moths’ tongues grow until they reach the nectar easily, then stop. Nothing selects for any more length, and the moths now sip without touching the pollen.`
        : `Generation ${gen}. Each time the tongues catch up, moths that press deeper carry more pollen, so longer spurs set more seed; and each time the spurs pull ahead, longer-tongued moths get more nectar. Neither is trying to fit the other.`;
    if (fixed && gen >= 150) t.done();
  };
  const gs = slider('Generations', 0, 300, 1, 0, (v) => `${v}`, (v) => { gen = v; paint(); }, 'leaf');
  const play = player(gs, ctx, { seconds: 10 });
  const sw = toggles(['Hold the spur fixed'], [false], (on) => { fixed = on[0]; gs.set(0); });
  f.controls.append(play.node, gs.node, sw.node);
  const open = guessFirst(t, f, {
    ask: 'Suppose the orchids stop changing and their spurs stay 4 cm long. What happens to the moths’ tongues?',
    options: ['They keep getting longer', 'They reach the nectar, then stop', 'They get shorter at once'],
    answer: 1,
    reveal: 'done',
    sliders: [gs],
    buttons: sw.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
