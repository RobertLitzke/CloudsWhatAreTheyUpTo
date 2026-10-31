// A live schematic: circuit-kit's parts drawn where a figure places them, with
// every wire coloured by its voltage and dots moving along it with the
// current. The colours run from ground's deep blue to the figure's top voltage
// in orange (COL.ground to COL.voltage), so the eye reads the circuit as a
// landscape of heights; across a resistor the colour slides from one end's to
// the other's, and that slide is the voltage dropped. The dots move at a speed
// set by the current through each part, in the direction conventional current
// flows, and stop dead where no current flows.
//
// A figure owns the parts and the solve: it builds the schematic once around
// its parts, changes their values in place, and calls `show(solution)`
// whenever one changes. A two-terminal part is drawn along a path from its a
// terminal to its b; a transistor or op-amp sits at a point, with a lead from
// each of its pins. While the reader is asked to predict something, `cover`
// greys the colours, stops the dots or puts out the lamps, so the drawing
// does not give the answer away; uncovering it is the reveal.

import { svg } from 'didactics/dom';
import { label, type P } from 'didactics/draw';
import { terminals, type Part } from 'circuit-kit/parts';
import type { Solution } from 'circuit-kit/solve';
import { animate, COL, type FigureContext } from '../figures/kit';

export type TwoTerminal = Exclude<Part, { kind: 'bjt' | 'mosfet' | 'opamp' }>;
export type ThreeTerminal = Extract<Part, { kind: 'bjt' | 'mosfet' | 'opamp' }>;

/** A two-terminal part and where it is drawn: from its a terminal along `path` to its b terminal. Symbols sit on the first segment. */
export interface Placed {
  part: TwoTerminal;
  path: P[];
  /** A name and value written beside the symbol, such as "R1 470 Ω". */
  tag?: string;
  /** Which side of the symbol the tag goes, from a to b: left or right of the direction of travel. */
  tagSide?: 'left' | 'right';
}

/** A transistor or op-amp drawn at `at`, with a run of wire from each pin (pinOf gives where each starts) to wherever it joins the rest. */
export interface Mounted {
  part: ThreeTerminal;
  at: P;
  /** Mirror it left to right: base or inputs on the right. */
  flip?: boolean;
  /** The wire from each pin, by terminal name (c, b, e; d, g, s; plus, minus, out, vcc, vee), starting at the pin. A pin with no lead is not drawn. */
  leads: Partial<Record<string, P[]>>;
  tag?: string;
}

export type Placement = Placed | Mounted;

export interface SchematicOptions {
  /** The voltage drawn in full orange. */
  topVolts: number;
  /** The current at which dots move at their normal pace; more is faster, less slower. */
  typicalAmps: number;
  /** Points to draw a ground symbol at, hanging below. */
  grounds?: P[];
  /** Tapping a wire asks for the voltage of the node nearest the tap; a switch is toggled instead. */
  onProbe?: (node: string, part: Part) => void;
  onToggle?: (id: string) => void;
}

/** What `cover` hides while the reader makes a guess. */
export interface Cover {
  colour?: boolean;
  dots?: boolean;
  glow?: boolean;
}

export interface Schematic {
  node: SVGGElement;
  show(s: Solution): void;
  /** Hide the colours, the dots or the glow until uncovered with `cover({})`. */
  cover(c: Cover): void;
  /** Slow the dots down (or speed them up) by a factor, 1 being the normal pace. */
  pace(factor: number): void;
  /** Where a node is drawn: the first pin or path end that names it. */
  pointOf(node: string): P | undefined;
}

/** Pixels between dots, and how fast they go at the typical current, in pixels a second. */
const SPACING = 16;
const PACE = 40;
/** How long a symbol is along its segment. */
export const BODY = 36;
const COVERED = '#9aa3ad';

let gradients = 0;

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

/** The colour of a voltage, from ground blue up to `top` in orange. Below ground stays blue; above the top stays orange. */
export function voltColour(v: number, top: number): string {
  return mix(COL.ground, COL.voltage, Math.max(0, Math.min(1, top > 0 ? v / top : 0)));
}

/** The light an LED gives, by its model. */
export function ledColour(part: Part): string | null {
  if (part.kind !== 'diode' || typeof part.model !== 'string' || !part.model.startsWith('led-')) return null;
  const colours: Record<string, string> = { 'led-red': '#e5332a', 'led-green': '#2fbf4a', 'led-blue': '#3a6ff0' };
  return colours[part.model] ?? '#e5332a';
}

export const lengthOf = (path: P[]) => path.slice(1).reduce((s, p, k) => s + Math.hypot(p[0] - path[k][0], p[1] - path[k][1]), 0);

export function pointAt(path: P[], d: number): P {
  for (let k = 1; k < path.length; k++) {
    const [x0, y0] = path[k - 1];
    const [x1, y1] = path[k];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (d <= seg || k === path.length - 1) {
      const t = seg ? Math.min(1, d / seg) : 0;
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
    d -= seg;
  }
  return path[0];
}

const ln = (x1: number, y1: number, x2: number, y2: number, stroke: string, w = 2.2) => svg('line', { x1, y1, x2, y2, stroke, 'stroke-width': w });

/** The symbol for a two-terminal part, drawn along +x from 0 to BODY, centred on y = 0. */
export function symbol(part: TwoTerminal, stroke: string): SVGElement {
  const w = 2.2;
  const m = BODY / 2;
  switch (part.kind) {
    case 'resistor': {
      const pts: string[] = ['0,0'];
      for (let k = 0; k < 6; k++) pts.push(`${4 + k * 5.6},${k % 2 ? 6 : -6}`);
      pts.push(`${BODY},0`);
      return svg('polyline', { points: pts.join(' '), fill: 'none', stroke, 'stroke-width': w, 'stroke-linejoin': 'round' });
    }
    case 'lamp':
      return svg('g', {},
        svg('circle', { class: 'glow', cx: m, cy: 0, r: 16, fill: COL.current, opacity: 0 }),
        svg('circle', { cx: m, cy: 0, r: 12, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.6 }),
        svg('path', { d: `M${m - 8.5},-8.5 L${m + 8.5},8.5 M${m - 8.5},8.5 L${m + 8.5},-8.5`, stroke: COL.ink, 'stroke-width': 1.4 }),
        ln(0, 0, m - 12, 0, stroke),
        ln(m + 12, 0, BODY, 0, stroke),
      );
    case 'source':
      if (part.wave?.amp) {
        // A signal generator: a circle with a wave in it, + at the a end.
        return svg('g', {},
          svg('circle', { cx: m, cy: 0, r: 12, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.6 }),
          svg('path', { d: part.wave.shape === 'square' ? `M${m - 7},3 V-3 H${m} V3 H${m + 7} V-3` : `M${m - 7},0 C${m - 4},-9 ${m - 1},-9 ${m},0 S${m + 4},9 ${m + 7},0`, fill: 'none', stroke: COL.ink, 'stroke-width': 1.5 }),
          ln(0, 0, m - 12, 0, stroke),
          ln(m + 12, 0, BODY, 0, stroke),
        );
      }
      // The long plate is +, at the a end.
      return svg('g', {},
        ln(0, 0, m - 3, 0, stroke),
        ln(m - 3, -13, m - 3, 13, COL.ink, 2.4),
        ln(m + 3, -6, m + 3, 6, COL.ink, 4),
        ln(m + 3, 0, BODY, 0, stroke),
      );
    case 'current':
      return svg('g', {},
        svg('circle', { cx: m, cy: 0, r: 12, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.6 }),
        svg('path', { d: `M${m - 6},0 H${m + 6} M${m + 2},-4 L${m + 6},0 L${m + 2},4`, fill: 'none', stroke: COL.ink, 'stroke-width': 1.6 }),
        ln(0, 0, m - 12, 0, stroke),
        ln(m + 12, 0, BODY, 0, stroke),
      );
    case 'switch': {
      const open = !part.closed;
      return svg('g', { class: 'switch', style: 'cursor: pointer' },
        svg('rect', { x: -4, y: -16, width: BODY + 8, height: 24, fill: 'transparent' }),
        ln(0, 0, 6, 0, stroke),
        svg('line', { class: 'lever', x1: 6, y1: 0, x2: BODY - 6, y2: open ? -12 : 0, stroke: COL.ink, 'stroke-width': 2 }),
        svg('circle', { cx: 6, cy: 0, r: 2.6, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.4 }),
        svg('circle', { cx: BODY - 6, cy: 0, r: 2.6, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.4 }),
        ln(BODY - 6, 0, BODY, 0, stroke),
      );
    }
    case 'fuse':
      return svg('g', {},
        svg('rect', { x: 4, y: -6, width: BODY - 8, height: 12, rx: 2, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.5 }),
        svg('path', { class: 'element', d: part.blown ? `M0,0 H${m - 4} M${m + 4},0 H${BODY}` : `M0,0 H${BODY}`, stroke, 'stroke-width': w, fill: 'none' }),
      );
    case 'load':
      return svg('g', {},
        svg('rect', { x: 3, y: -11, width: BODY - 6, height: 22, rx: 3, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.6 }),
        svg('path', { d: `M${m - 6},5 L${m},-6 L${m + 6},5`, fill: 'none', stroke: COL.power, 'stroke-width': 1.6 }),
        ln(0, 0, 3, 0, stroke),
        ln(BODY - 3, 0, BODY, 0, stroke),
      );
    case 'capacitor':
      return svg('g', {},
        ln(0, 0, m - 4, 0, stroke),
        ln(m - 4, -12, m - 4, 12, COL.ink, 2.6),
        ln(m + 4, -12, m + 4, 12, COL.ink, 2.6),
        ln(m + 4, 0, BODY, 0, stroke),
      );
    case 'inductor': {
      let d = 'M0,0 H4';
      for (let k = 0; k < 4; k++) d += ` a3.5,3.5 0 0 1 7,0`;
      d += ` H${BODY}`;
      return svg('path', { d, fill: 'none', stroke, 'stroke-width': w });
    }
    case 'diode': {
      const led = ledColour(part);
      return svg('g', {},
        ...(led ? [svg('circle', { class: 'glow', cx: m, cy: 0, r: 17, fill: led, opacity: 0 })] : []),
        ln(0, 0, m - 7, 0, stroke),
        svg('polygon', { points: `${m - 7},-8 ${m - 7},8 ${m + 6},0`, fill: led ?? COL.ink, stroke: COL.ink, 'stroke-width': 1.2 }),
        ln(m + 6, -8, m + 6, 8, COL.ink, 2.4),
        ln(m + 6, 0, BODY, 0, stroke),
        ...(led ? [svg('path', { d: `M${m},-11 l5,-7 m-3,0 h3 v3 M${m + 6},-10 l5,-7 m-3,0 h3 v3`, fill: 'none', stroke: COL.ink, 'stroke-width': 1.2 })] : []),
      );
    }
    case 'wire':
      return svg('g');
  }
}

/** Where each pin of a mounted part sits, from its `at`. */
export function pinOf(m: Pick<Mounted, 'part' | 'at' | 'flip'>, term: string): P {
  const [x, y] = m.at;
  const s = m.flip ? -1 : 1;
  const pins: Record<string, P> =
    m.part.kind === 'opamp'
      ? { minus: [-38, -14], plus: [-38, 14], out: [40, 0], vcc: [0, -32], vee: [0, 32] }
      : m.part.kind === 'bjt'
        ? { c: [10, -26], b: [-26, 0], e: [10, 26] }
        : { d: [10, -26], g: [-26, 0], s: [10, 26] };
  const [dx, dy] = pins[term];
  return [x + s * dx, y + dy];
}

/** The body of a transistor or op-amp, centred on 0, 0, unmirrored. Each pin's stub is marked with its terminal, to be coloured by its node. */
export function body(part: ThreeTerminal): SVGElement {
  const w = 2.2;
  const stroke = (_term: string) => COL.ink;
  const pin = <E extends SVGElement>(e: E, term: string): E => (e.setAttribute('data-pin', term), e);
  switch (part.kind) {
    case 'bjt': {
      const npn = part.type === 'npn';
      // The arrow on the emitter points out for NPN, in for PNP.
      const tip = npn ? [8, 15] : [-3, 8];
      const back = npn ? [-3, 8] : [8, 15];
      const ang = Math.atan2(tip[1] - back[1], tip[0] - back[0]);
      const head = (a: number) => `${tip[0] - 7 * Math.cos(ang + a)},${tip[1] - 7 * Math.sin(ang + a)}`;
      return svg('g', {},
        svg('circle', { cx: 2, cy: 0, r: 17, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.4 }),
        pin(ln(-26, 0, -6, 0, stroke('b'), w), 'b'),
        ln(-6, -11, -6, 11, COL.ink, 3),
        pin(svg('polyline', { points: '-6,-6 10,-15 10,-26', fill: 'none', stroke: stroke('c'), 'stroke-width': w }), 'c'),
        pin(svg('polyline', { points: '-6,6 10,15 10,26', fill: 'none', stroke: stroke('e'), 'stroke-width': w }), 'e'),
        svg('polygon', { points: `${tip[0]},${tip[1]} ${head(0.45)} ${head(-0.45)}`, fill: COL.ink }),
      );
    }
    case 'mosfet': {
      const n = part.type === 'n';
      return svg('g', {},
        svg('circle', { cx: 2, cy: 0, r: 17, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.4 }),
        pin(ln(-26, 0, -9, 0, stroke('g'), w), 'g'),
        ln(-9, -10, -9, 10, COL.ink, 2),
        ln(-4, -12, -4, -6, COL.ink, 2.6),
        ln(-4, -3, -4, 3, COL.ink, 2.6),
        ln(-4, 6, -4, 12, COL.ink, 2.6),
        pin(svg('polyline', { points: '-4,-9 10,-9 10,-26', fill: 'none', stroke: stroke('d'), 'stroke-width': w }), 'd'),
        pin(svg('polyline', { points: '-4,9 10,9 10,26', fill: 'none', stroke: stroke('s'), 'stroke-width': w }), 's'),
        ln(-4, 0, 10, 0, COL.ink, 1.4),
        ln(10, 0, 10, 9, COL.ink, 1.4),
        svg('polygon', { points: n ? '-3,0 3,-3.5 3,3.5' : '9,0 3,-3.5 3,3.5', fill: COL.ink }),
      );
    }
    case 'opamp':
      return svg('g', {},
        pin(ln(-38, -14, -26, -14, stroke('minus'), w), 'minus'),
        pin(ln(-38, 14, -26, 14, stroke('plus'), w), 'plus'),
        pin(ln(28, 0, 40, 0, stroke('out'), w), 'out'),
        svg('polygon', { points: '-26,-30 -26,30 28,0', fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.8, 'stroke-linejoin': 'round' }),
        label(-22, -10, '−', { bold: true }),
        label(-22, 18, '+', { bold: true }),
      );
  }
}

export function groundSymbol([x, y]: P): SVGElement {
  return svg('g', { stroke: COL.ink, 'stroke-width': 1.8, 'stroke-linecap': 'round' },
    svg('line', { x1: x, y1: y, x2: x, y2: y + 8 }),
    svg('line', { x1: x - 10, y1: y + 8, x2: x + 10, y2: y + 8 }),
    svg('line', { x1: x - 6, y1: y + 12, x2: x + 6, y2: y + 12 }),
    svg('line', { x1: x - 2.5, y1: y + 16, x2: x + 2.5, y2: y + 16 }),
  );
}

/** One run of dots: along `path`, carrying the current `amps(s)` in the path's direction. */
interface Run {
  path: P[];
  length: number;
  dots: SVGElement[];
  phase: number;
  amps: (s: Solution) => number;
}

/** Something to recolour on each show: a stroke attribute set from a node's voltage. */
interface Paint {
  el: SVGElement;
  attr: 'stroke' | 'stop-color';
  node: string;
}

export function schematic(ctx: FigureContext, placed: readonly Placement[], o: SchematicOptions): Schematic {
  const defs = svg('defs');
  const wires = svg('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const bodies = svg('g');
  const dotLayer = svg('g', { fill: COL.current, stroke: COL.ink, 'stroke-width': 0.6 });
  const labels = svg('g');
  const node = svg('g', { class: 'schematic' }, defs, wires, bodies, dotLayer, labels, ...(o.grounds ?? []).map(groundSymbol)) as SVGGElement;

  const paints: Paint[] = [];
  const runs: Run[] = [];
  const glows: { el: SVGElement; part: Part; led: boolean }[] = [];
  const levers: { el: SVGElement; part: Extract<Part, { kind: 'switch' }> }[] = [];
  const fuses: { el: SVGElement; part: Extract<Part, { kind: 'fuse' }> }[] = [];
  const where = new Map<string, P>();
  let covered: Cover = {};
  let factor = 1;

  const addRun = (path: P[], amps: (s: Solution) => number) => {
    const length = lengthOf(path);
    if (length < 1) return;
    const dots = Array.from({ length: Math.max(1, Math.floor(length / SPACING)) }, () => svg('circle', { r: 2.6, opacity: 0 }));
    dotLayer.append(...dots);
    runs.push({ path, length, dots, phase: 0, amps });
  };

  /** A tap on a path: the node at whichever end is nearer, by how far along the tap is. */
  const tappable = (path: P[], ends: [string, string], part: Part, split = 0.5) => {
    const hit = svg('polyline', { points: path.map((p) => p.join(',')).join(' '), stroke: 'transparent', 'stroke-width': 14, style: 'cursor: crosshair' });
    hit.addEventListener('click', (e) => {
      let nodeName = ends[0];
      const m = (hit as SVGGraphicsElement).getScreenCTM?.();
      const ev = e as MouseEvent;
      if (m && ends[0] !== ends[1] && typeof ev.clientX === 'number') {
        const x = (ev.clientX - m.e) / m.a;
        const y = (ev.clientY - m.f) / m.d;
        // How far along the path the tap is, as a fraction.
        let best = 0;
        let bestD = Infinity;
        const L = lengthOf(path);
        for (let d = 0; d <= L; d += 2) {
          const [px, py] = pointAt(path, d);
          const dd = Math.hypot(px - x, py - y);
          if (dd < bestD) {
            bestD = dd;
            best = d / L;
          }
        }
        nodeName = best < split ? ends[0] : ends[1];
      }
      o.onProbe?.(nodeName, part);
    });
    wires.append(hit);
  };

  for (const pl of placed) {
    if ('path' in pl) {
      const { part, path } = pl;
      if (!where.has(part.a)) where.set(part.a, path[0]);
      if (!where.has(part.b)) where.set(part.b, path[path.length - 1]);
      const [ax, ay] = path[0];
      const [bx, by] = path[1];
      const isWire = part.kind === 'wire';
      const seg = Math.hypot(bx - ax, by - ay);
      const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
      // Where the symbol starts and ends along the first segment.
      const t0 = isWire ? 0.5 : Math.max(0, (seg - BODY) / 2 / seg);
      const t1 = isWire ? 0.5 : 1 - t0;
      const s0: P = [ax + (bx - ax) * t0, ay + (by - ay) * t0];
      const s1: P = [ax + (bx - ax) * t1, ay + (by - ay) * t1];

      const id = `v-grad-${++gradients}`;
      const stopA = svg('stop', { offset: 0 });
      const stopB = svg('stop', { offset: 1 });
      defs.append(svg('linearGradient', { id, gradientUnits: 'userSpaceOnUse', x1: s0[0], y1: s0[1], x2: s1[0], y2: s1[1] }, stopA, stopB));
      paints.push({ el: stopA, attr: 'stop-color', node: part.a }, { el: stopB, attr: 'stop-color', node: part.b });

      const width = 3.2;
      const leadA = svg('polyline', { points: [path[0], s0].map((p) => p.join(',')).join(' '), 'stroke-width': width });
      const leadB = svg('polyline', { points: [s1, ...path.slice(1)].map((p) => p.join(',')).join(' '), 'stroke-width': width });
      wires.append(leadA, leadB);
      paints.push({ el: leadA, attr: 'stroke', node: part.a }, { el: leadB, attr: 'stroke', node: part.b });
      const L = lengthOf(path);
      tappable(path, [part.a, part.b], part, (Math.hypot(s0[0] - ax, s0[1] - ay) + BODY / 2) / L);

      if (!isWire) {
        const sym = symbol(part, `url(#${id})`);
        sym.setAttribute('transform', `translate(${s0[0]} ${s0[1]}) rotate(${angle})`);
        if (part.kind === 'switch') sym.addEventListener('click', () => o.onToggle?.(part.id));
        const glow = sym.querySelector('.glow');
        if (glow) glows.push({ el: glow as SVGElement, part, led: part.kind === 'diode' });
        const lever = sym.querySelector('.lever');
        if (lever && part.kind === 'switch') levers.push({ el: lever as SVGElement, part });
        const element = sym.querySelector('.element');
        if (element && part.kind === 'fuse') fuses.push({ el: element as SVGElement, part });
        bodies.append(sym);
        if (pl.tag) {
          const mx = (s0[0] + s1[0]) / 2;
          const my = (s0[1] + s1[1]) / 2;
          // Perpendicular to the segment, to the chosen side.
          const side = pl.tagSide === 'left' ? -1 : 1;
          const nx = (-(by - ay) / seg) * side;
          const ny = ((bx - ax) / seg) * side;
          const off = ['lamp', 'current', 'load', 'diode'].includes(part.kind) || (part.kind === 'source' && part.wave?.amp) ? 26 : 20;
          const anchor = Math.abs(nx) > 0.5 ? (nx > 0 ? undefined : 'end') : 'middle';
          labels.append(label(mx + nx * off, my + ny * off + 4, pl.tag, { anchor, bold: true }));
        }
      }
      addRun(path, (s) => s.i[part.id]);
    } else {
      const { part, at } = pl;
      const nodes: Record<string, string> = Object.fromEntries(terminals(part));
      const g = body(part);
      // Each pin's stub inside the symbol takes its node's colour.
      g.querySelectorAll('[data-pin]').forEach((el) => {
        const n = nodes[el.getAttribute('data-pin')!];
        if (n) paints.push({ el: el as SVGElement, attr: 'stroke', node: n });
      });
      g.setAttribute('transform', `translate(${at[0]} ${at[1]}) scale(${pl.flip ? -1 : 1} 1)`);
      bodies.append(g);
      for (const [term, n] of terminals(part)) {
        const lead = pl.leads[term];
        const pin = pinOf(pl, term);
        if (!where.has(n)) where.set(n, pin);
        if (!lead) continue;
        const path = lead[0][0] === pin[0] && lead[0][1] === pin[1] ? lead : [pin, ...lead];
        const wire = svg('polyline', { points: path.map((p) => p.join(',')).join(' '), 'stroke-width': 3.2 });
        wires.append(wire);
        paints.push({ el: wire, attr: 'stroke', node: n });
        tappable(path, [n, n], part);
        // Current into the pin runs from the far end of the lead to the pin: against the path.
        addRun(path, (s) => -(s.i[`${part.id}:${term}`] ?? 0));
      }
      if (pl.tag) labels.append(label(at[0] + (pl.flip ? -1 : 1) * (part.kind === 'opamp' ? 4 : 24), at[1] + (part.kind === 'opamp' ? 44 : 4), pl.tag, { anchor: part.kind === 'opamp' ? 'middle' : pl.flip ? 'end' : undefined, bold: true }));
    }
  }
  let last: Solution | null = null;

  const placeDots = (r: Run) => {
    const n = r.dots.length;
    const gap = r.length / n;
    const moving = !covered.dots && last && !last.short && Math.abs(r.amps(last)) > o.typicalAmps * 1e-4;
    r.dots.forEach((dot, k) => {
      const at = (((k * gap + r.phase) % r.length) + r.length) % r.length;
      const [x, y] = pointAt(r.path, at);
      dot.setAttribute('cx', x.toFixed(1));
      dot.setAttribute('cy', y.toFixed(1));
      dot.setAttribute('opacity', moving ? '1' : '0');
    });
  };

  animate(node, ctx, (dt) => {
    if (!last || last.short) return;
    for (const r of runs) {
      const amps = r.amps(last);
      // Speed grows with the current, but slowly enough that ten times the current is still watchable.
      const rel = amps / o.typicalAmps;
      const speed = factor * Math.sign(rel) * PACE * Math.min(6, Math.abs(rel) < 1 ? Math.abs(rel) : 1 + Math.log(Math.abs(rel)));
      r.phase = (r.phase + speed * dt) % r.length;
      placeDots(r);
    }
  });

  const show = (s: Solution) => {
    last = s;
    for (const pt of paints) {
      const c = s.short ? COL.power : covered.colour ? COVERED : voltColour(s.v[pt.node] ?? 0, o.topVolts);
      pt.el.setAttribute(pt.attr, c);
    }
    for (const gl of glows) {
      const amount = gl.led ? Math.abs(s.i[gl.part.id]) / 0.02 : Math.max(0, s.p[gl.part.id]) / Math.max(1e-9, o.topVolts * o.typicalAmps);
      gl.el.setAttribute('opacity', covered.glow || s.short ? '0' : (Math.min(1, amount) * 0.85).toFixed(2));
    }
    for (const lv of levers) lv.el.setAttribute('y2', lv.part.closed ? '0' : '-12');
    for (const f of fuses) f.el.setAttribute('d', f.part.blown ? `M0,0 H${BODY / 2 - 4} M${BODY / 2 + 4},0 H${BODY}` : `M0,0 H${BODY}`);
    for (const r of runs) placeDots(r);
  };

  return {
    node,
    show,
    cover(c) {
      covered = c;
      if (last) show(last);
    },
    pace(f) {
      factor = f;
    },
    pointOf: (n) => where.get(n),
  };
}
