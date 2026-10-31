// The same circuit a schematic draws, as a populated board: solder-mask green,
// copper traces along the schematic's wires, and each part as it looks from
// above, with its leads soldered to pads. Resistors wear their colour bands,
// so a wrong value can be read off the board as it can on a real one. Nothing
// shows the voltages; only lamps and LEDs light. Tapping a trace or a pad
// asks for its node, as on the schematic, so a fault hunt (bench.ts) can run
// on either.

import { svg } from 'didactics/dom';
import { label, type P } from 'didactics/draw';
import { terminals, type Part } from 'circuit-kit/parts';
import type { Solution } from 'circuit-kit/solve';
import { COL, type FigureContext } from '../figures/kit';
import { wire } from './build';
import { ledColour, lengthOf, pinOf, pointAt, type Cover, type Placement, type Schematic, type SchematicOptions } from './schematic';

/** How long a part's body is along its first segment, as on the schematic. */
const BODY = 36;

/** The colour code's colours, 0 to 9, and gold for the tolerance band. */
const BANDS = ['#1d1d1d', '#8b4a1f', '#c7362f', '#e3762a', '#e8c21c', '#2f8a4f', '#3a6ff0', '#7a4fb0', '#8a8f96', '#f3f1ea'];
const GOLD = '#c9a13b';

/** A resistance's four bands: two digits, a multiplier, and gold. */
export function bandsOf(ohms: number): string[] {
  const exp = Math.floor(Math.log10(ohms)) - 1;
  const two = Math.round(ohms / 10 ** exp);
  const [d1, d2] = two >= 100 ? [1, 0] : [Math.floor(two / 10), two % 10];
  const mult = two >= 100 ? exp + 1 : exp;
  return [BANDS[d1], BANDS[d2], mult >= 0 ? BANDS[mult] : GOLD, GOLD];
}

const pad = ([x, y]: P) => svg('g', {}, svg('circle', { cx: x, cy: y, r: 4.6, fill: COL.solder }), svg('circle', { cx: x, cy: y, r: 1.6, fill: '#0e2a20' }));

const silk = (x: number, y: number, text: string, anchor: 'middle' | 'end' | undefined = 'middle') =>
  label(x, y, text, { size: 'small', anchor, fill: COL.silk, attrs: { 'font-family': 'var(--mono)', opacity: 0.9 } });

/** A tag as the silkscreen prints it: the name alone, or a value such as '9 V' closed up to '9V'. */
const silkName = (tag: string) => (/^\d/.test(tag) ? tag.replace(/ /g, '') : tag.split(' ')[0]);

/** A two-terminal part from above, drawn along +x from 0 to BODY, centred on y = 0. */
function footprint(part: Part): SVGElement {
  const m = BODY / 2;
  const leg = (x1: number, x2: number) => svg('line', { x1, y1: 0, x2, y2: 0, stroke: '#9aa0a6', 'stroke-width': 1.6 });
  switch (part.kind) {
    case 'resistor':
      return svg('g', {}, leg(0, BODY),
        svg('rect', { x: 6, y: -5.5, width: BODY - 12, height: 11, rx: 4.5, fill: '#d9c7a0' }),
        ...bandsOf(part.ohms).map((c, k) => svg('rect', { x: 10 + k * 4.2 + (k === 3 ? 3 : 0), y: -5.5, width: 2.4, height: 11, fill: c })));
    case 'capacitor':
      return part.farads >= 1e-6
        ? svg('g', {}, leg(0, BODY), svg('circle', { cx: m, cy: 0, r: 11, fill: '#1f3f8f' }), svg('path', { d: `M${m},-11 A11,11 0 0 1 ${m + 9.5},-5.5 L${m},0Z`, fill: '#c9d3e8', opacity: 0.85 }))
        : svg('g', {}, leg(0, BODY), svg('rect', { x: m - 7, y: -5, width: 14, height: 10, rx: 2, fill: '#d6a93a' }));
    case 'diode': {
      const led = ledColour(part);
      if (led) {
        return svg('g', {}, leg(0, BODY),
          svg('circle', { class: 'glow', cx: m, cy: 0, r: 18, fill: led, opacity: 0 }),
          svg('circle', { cx: m, cy: 0, r: 8, fill: led, opacity: 0.85 }),
          // The flat on the rim marks the cathode, the b end.
          svg('line', { x1: m + 7, y1: -4, x2: m + 7, y2: 4, stroke: COL.mask, 'stroke-width': 2 }));
      }
      return svg('g', {}, leg(0, BODY), svg('rect', { x: 9, y: -3.5, width: BODY - 18, height: 7, rx: 2, fill: '#2a2d33' }), svg('rect', { x: BODY - 13, y: -3.5, width: 2.4, height: 7, fill: '#c9ccd1' }));
    }
    case 'lamp':
      return svg('g', {}, leg(0, BODY), svg('circle', { class: 'glow', cx: m, cy: 0, r: 16, fill: COL.current, opacity: 0 }), svg('circle', { cx: m, cy: 0, r: 8, fill: '#f5eccf', stroke: '#9aa0a6' }));
    case 'source':
      return svg('g', {}, leg(0, BODY), svg('rect', { x: 4, y: -9, width: BODY - 8, height: 18, rx: 2, fill: '#f3f1ea' }), label(m, 3.5, part.wave?.amp ? 'IN' : `${part.volts}V`, { size: 'small', anchor: 'middle', bold: true, fill: COL.ink }));
    case 'switch':
      return svg('g', {}, leg(0, BODY), svg('rect', { x: 6, y: -6, width: BODY - 12, height: 12, rx: 2, fill: '#3a3e45' }), svg('rect', { x: part.closed ? m : 10, y: -3, width: 8, height: 6, fill: '#c9ccd1' }));
    case 'inductor':
      return svg('g', {}, leg(0, BODY), svg('rect', { x: 7, y: -8, width: BODY - 14, height: 16, rx: 3, fill: '#2f6a3f' }));
    default:
      return svg('g', {}, leg(0, BODY), svg('rect', { x: 6, y: -6, width: BODY - 12, height: 12, rx: 2, fill: '#3a3e45' }));
  }
}

export interface BoardViewOptions extends Pick<SchematicOptions, 'onProbe' | 'typicalAmps' | 'grounds'> {
  /** The board's size, from the top-left corner. */
  size: [number, number];
}

/** A board drawn from the same placements as a schematic, with the schematic's interface. */
export function boardView(_ctx: FigureContext, placed: readonly Placement[], o: BoardViewOptions): Schematic {
  const traces = svg('g', { fill: 'none', stroke: COL.copper, 'stroke-width': 3.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.85 });
  const hits = svg('g', { fill: 'none' });
  const parts = svg('g');
  const pads = svg('g');
  const node = svg('g', { class: 'board' },
    svg('rect', { x: 0, y: 0, width: o.size[0], height: o.size[1], rx: 6, fill: COL.mask }),
    traces, pads, parts, hits) as SVGGElement;
  const where = new Map<string, P>();
  const glows: { el: SVGElement; part: Part; led: boolean }[] = [];
  let covered: Cover = {};
  let last: Solution | null = null;

  const tappable = (path: P[], ends: [string, string], part: Part, split = 0.5) => {
    const hit = svg('polyline', { points: path.map((p) => p.join(',')).join(' '), stroke: 'transparent', 'stroke-width': 14, style: 'cursor: crosshair' });
    hit.addEventListener('click', (e) => {
      let nodeName = ends[0];
      const m = (hit as SVGGraphicsElement).getScreenCTM?.();
      const ev = e as MouseEvent;
      if (m && ends[0] !== ends[1] && typeof ev.clientX === 'number') {
        const x = (ev.clientX - m.e) / m.a;
        const y = (ev.clientY - m.f) / m.d;
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
    hits.append(hit);
  };

  for (const pl of placed) {
    if ('path' in pl) {
      const { part, path } = pl;
      if (!where.has(part.a)) where.set(part.a, path[0]);
      if (!where.has(part.b)) where.set(part.b, path[path.length - 1]);
      const [ax, ay] = path[0];
      const [bx, by] = path[1];
      const seg = Math.hypot(bx - ax, by - ay);
      const isWire = part.kind === 'wire';
      const t0 = isWire ? 0.5 : Math.max(0, (seg - BODY) / 2 / seg);
      const s0: P = [ax + (bx - ax) * t0, ay + (by - ay) * t0];
      const s1: P = [ax + (bx - ax) * (1 - t0), ay + (by - ay) * (1 - t0)];
      const L = lengthOf(path);
      if (isWire) {
        traces.append(svg('polyline', { points: path.map((p) => p.join(',')).join(' ') }));
      } else {
        traces.append(svg('polyline', { points: [path[0], s0].map((p) => p.join(',')).join(' ') }), svg('polyline', { points: [s1, ...path.slice(1)].map((p) => p.join(',')).join(' ') }));
        const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
        const fp = footprint(part);
        fp.setAttribute('transform', `translate(${s0[0]} ${s0[1]}) rotate(${angle})`);
        const glow = fp.querySelector('.glow');
        if (glow) glows.push({ el: glow as SVGElement, part, led: part.kind === 'diode' });
        parts.append(fp);
        pads.append(pad(s0), pad(s1));
        // The silkscreen name, beside the part.
        if (pl.tag) {
          const side = pl.tagSide === 'left' ? -1 : 1;
          const nx = (-(by - ay) / seg) * side;
          const ny = ((bx - ax) / seg) * side;
          const mx = (s0[0] + s1[0]) / 2;
          const my = (s0[1] + s1[1]) / 2;
          parts.append(silk(mx + nx * 16, my + ny * 16 + 3, silkName(pl.tag), Math.abs(nx) > 0.5 ? (nx > 0 ? undefined : 'end') : 'middle'));
        }
      }
      tappable(path, [part.a, part.b], part, isWire ? 0.5 : (Math.hypot(s0[0] - ax, s0[1] - ay) + BODY / 2) / L);
    } else {
      const { part, at } = pl;
      const legs = terminals(part).filter(([term]) => part.kind !== 'opamp' || pl.leads[term]);
      for (const [term, n] of legs) {
        const pin = pinOf(pl, term);
        if (!where.has(n)) where.set(n, pin);
        const lead = pl.leads[term];
        const path = lead && !(lead[0][0] === pin[0] && lead[0][1] === pin[1]) ? [pin, ...lead] : (lead ?? [pin]);
        if (path.length > 1) traces.append(svg('polyline', { points: path.map((p) => p.join(',')).join(' ') }));
        pads.append(pad(pin));
        if (path.length > 1) tappable(path, [n, n], part);
      }
      // Its legs, bent out to the pads.
      if (part.kind !== 'opamp') for (const [term] of legs) { const [px, py] = pinOf(pl, term); parts.append(svg('line', { x1: at[0], y1: at[1], x2: px, y2: py, stroke: '#9aa0a6', 'stroke-width': 1.6 })); }
      // A TO-92 transistor or an eight-pin chip, from above.
      parts.append(part.kind === 'opamp'
        ? svg('rect', { x: at[0] - 26, y: at[1] - 24, width: 52, height: 48, rx: 3, fill: '#22252a' })
        : svg('path', { d: `M${at[0] - 4},${at[1] - 14} A14,14 0 0 1 ${at[0] - 4},${at[1] + 14} Z`, fill: '#22252a', transform: pl.flip ? `translate(${2 * at[0]} 0) scale(-1 1)` : '' }));
      // Above the base lead, clear of the pads below.
      if (pl.tag) parts.append(part.kind === 'opamp' ? silk(at[0], at[1] + 38, silkName(pl.tag)) : silk(at[0] + (pl.flip ? 10 : -10), at[1] - 10, silkName(pl.tag), pl.flip ? undefined : 'end'));
    }
  }

  // The schematic's ground symbols become one ground trace along the bottom of the board.
  if (o.grounds?.length) {
    const bus = Math.max(...o.grounds.map(([, y]) => y)) + 14;
    const xs = o.grounds.map(([x]) => x);
    traces.append(svg('polyline', { points: `${Math.min(...xs)},${bus} ${Math.max(...xs)},${bus}` }));
    for (const g of o.grounds) {
      traces.append(svg('polyline', { points: `${g[0]},${g[1]} ${g[0]},${bus}` }));
      tappable([g, [g[0], bus]], ['gnd', 'gnd'], wire('gnd', 'gnd', 'gnd'));
    }
    parts.append(silk(Math.max(...xs) - 4, bus - 6, 'GND', 'end'));
  }

  const show = (s: Solution) => {
    last = s;
    for (const gl of glows) {
      const amount = gl.led ? Math.max(0, s.i[gl.part.id]) / 0.02 : Math.max(0, s.p[gl.part.id]) / Math.max(1e-9, 9 * o.typicalAmps);
      gl.el.setAttribute('opacity', covered.glow || s.short ? '0' : (Math.min(1, amount) * 0.85).toFixed(2));
    }
  };

  return {
    node,
    show,
    cover(c) {
      covered = c;
      if (last) show(last);
    },
    pace() {},
    pointOf: (n) => where.get(n),
  };
}
