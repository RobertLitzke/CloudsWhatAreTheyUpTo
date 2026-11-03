// The globe preview (not in the lesson tree yet): two figures on the shared
// globe (didactics/globe) and its cut-away (didactics/cutaway), to try the
// three views together. `plateGlobe` turns the Earth with the continents
// carried back through time by the PALEOMAP model, and can be cut open to
// the core; `cutEarth` paints today's Earth from the world relief, with the
// plate boundaries on it, and draws the section under any line the reader
// drags across it.

import { el, svg } from 'didactics/dom';
import { canvasFrame, figure, frame, player, slider, type FigureContext } from 'didactics/figure';
import {
  GlobePainter, angle, arc, dragGlobe, globeView, lonLat, octant, project, xyz,
  type GlobeView, type V3,
} from 'didactics/globe';
import { drawSection, section, type Boundaries, type Section } from 'didactics/cutaway';
import { loadRelief, paintRelief, reliefFor, toCell, type Relief } from 'didactics/maps';
import { asset } from '../asset';
import plates from '../data/plates.json';
import { COL } from './kit';
import { PALEOMAP_CREDIT, anchor, carried, centreAt, land, onPlateModel, shelf } from './paleomap';

/** Inside the Earth, from the surface in (radius as a share of the Earth's). */
export const SHELLS = [
  { r: 1, fill: COL.mantle, name: 'mantle (solid, creeping)' },
  { r: 0.546, fill: '#e08a3c', name: 'outer core (liquid iron)' },
  { r: 0.192, fill: '#f3c35b', name: 'inner core' },
];
const SEA = '#9cc3d8';
const SHELF = '#c9dccf';
const LAND = '#e2cf9b';

/** Canvas pixels per drawing unit: the figure is drawn 400 units wide but shown up to about 700 px wide on a desktop, so draw finer than the screen's pixel ratio alone. */
const dpr = () => Math.min(3, 1.75 * ((typeof window !== 'undefined' && window.devicePixelRatio) || 1));

/** A chip that turns something on and off. */
function chip(name: string, on: boolean, change: (on: boolean) => void): HTMLButtonElement {
  const b = el('button.chip', { type: 'button', 'aria-pressed': String(on) }, name) as HTMLButtonElement;
  b.classList.toggle('on', on);
  b.addEventListener('click', () => {
    on = !on;
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('on', on);
    change(on);
  });
  return b;
}

/** Calls `draw` at most once a frame. */
function onFrame(ctx: FigureContext, draw: () => void): () => void {
  let queued = false;
  return () => {
    if (queued || ctx.closed.aborted) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!ctx.closed.aborted) draw();
    });
  };
}

// ---- The plates through time ---------------------------------------------------------

/** Points whose motion is drawn as arrows: where each continent is heading next. */
const MOVERS = ['africa', 'samerica', 'india', 'australia', 'laurentia', 'antarctica', 'siberia', 'baltica', 'china'];

export const plateGlobe = figure(['pangaea'], (ctx, t) => {
  const W = 400;
  const H = 320;
  const k = dpr();
  const f = canvasFrame(W, H, 3, { scale: k });
  const c = f.ctx;
  return onPlateModel(t, f, () => {
    if (!c) return;
    let ma = 0;
    let cut = false;
    let arrows = true;
    let follow = true;
    let lon = 10;
    let lat = 15;
    const view = (): GlobeView => globeView({ cx: W / 2, cy: H / 2, r: 140, lon, lat });
    const paint = () => {
      if (follow) lon = centreAt(ma);
      const v = view();
      c.clearRect(0, 0, W, H);
      const g = new GlobePainter(c, v);
      g.disc(SEA);
      g.graticule(30, { stroke: 'rgba(43,38,34,0.12)', width: 0.6 });
      g.rings(carried(shelf(), ma).map((s) => s.pts), { fill: SHELF });
      g.rings(carried(land(), ma).map((s) => s.pts), { fill: LAND });
      if (arrows && !cut) {
        for (const name of MOVERS) {
          const now = anchor(name, ma);
          const next = anchor(name, ma - 40);
          if (angle(now, next) < 0.004) continue;
          const v0 = view();
          if (now[0] * v0.toward[0] + now[1] * v0.toward[1] + now[2] * v0.toward[2] < 0.2) continue;
          // Forty million years of travel, drawn to scale.
          g.dot(now, 2.5, { fill: COL.heat });
          g.arrow(now, next, { stroke: COL.heat, width: 2.2, head: 7 });
        }
      }
      if (cut) {
        // The corner taken out faces us, and turns with the planet if the reader turns it.
        g.cutOpen(octant(lon - 45 - 30, lat >= 0), SHELLS, { ink: COL.ink, hole: '#3a2a20', labels: true, font: '600 9.5px system-ui, sans-serif' });
      }
      g.limb({ stroke: COL.ink, width: 1 });
      c.save();
      c.font = '700 13px system-ui, sans-serif';
      c.fillStyle = COL.ink;
      c.fillText(ma <= 0 ? (ma === 0 ? 'Today' : `${-ma} million years ahead`) : `${ma} million years ago`, 8, 18);
      c.font = '10px system-ui, sans-serif';
      c.fillStyle = COL.soft;
      c.fillText(PALEOMAP_CREDIT, 8, H - 8);
      c.restore();
      f.readout.textContent = readout();
      if (t.goal === 'pangaea' && ma >= 250 && ma <= 320) t.done();
    };
    const readout = () => {
      if (cut) return 'Cut open: the plates are the thin skin at the very top. Under them the mantle is solid rock that creeps a few centimetres a year; only the outer core is liquid. Drag the globe to turn it.';
      if (ma >= 250 && ma <= 320) return 'Pangaea: nearly all the land in one supercontinent, with one ocean round it. The arrows show each continent’s next forty million years.';
      if (ma > 320) return 'Before Pangaea the continents were coming together from scattered pieces. The arrows show where each was heading next.';
      if (ma > 0) return 'The Atlantic narrows as you go back: the arrows point the way each continent moves over the next forty million years.';
      return 'The arrows show where each continent will be forty million years from now, at today’s speeds. Drag the globe to turn it, or run time back.';
    };
    const redraw = onFrame(ctx, paint);
    const s = slider('Time', { min: 0, max: 400, step: 5, value: 0, show: (v) => (v === 0 ? 'today' : v < 0 ? `+${-v} Myr` : `${v} Ma`), onInput: (v) => { ma = v; redraw(); } });
    const play = player(s, ctx, { seconds: 14 });
    f.controls.append(
      el('div.fig-row', {}, s.node, play.node),
      el('div.chips', {}, chip('Motion', true, (on) => { arrows = on; redraw(); }), chip('Cut open', false, (on) => { cut = on; redraw(); })),
    );
    f.drawing.setAttribute('aria-label', 'A globe with the continents where they were at the chosen time. Drag to turn it.');
    dragGlobe(f.drawing, {
      view, units: () => k,
      middle: () => [lon, lat],
      turn: (a, b) => { follow = false; lon = a; lat = b; },
      changed: () => redraw(),
    });
    paint();
  });
});

// ---- Cut the Earth along a line ---------------------------------------------------

/**
 * Rough dips of the slabs under well-known trenches, degrees, measured over
 * the slab's upper few hundred km and rounded to 5°: read from Slab2 (Hayes et
 * al. 2018) and Lallemand et al. (2005). The nearest one within 1,500 km is
 * used; elsewhere 35°. To be checked before any of this goes into a lesson.
 */
export const DIPS: { lon: number; lat: number; dip: number; name: string }[] = [
  { lon: -126, lat: 46, dip: 20, name: 'Cascadia' },
  { lon: -150, lat: 59, dip: 25, name: 'Alaska' },
  { lon: -172, lat: 52, dip: 50, name: 'Aleutians' },
  { lon: 160, lat: 53, dip: 50, name: 'Kamchatka' },
  { lon: 150, lat: 45, dip: 45, name: 'Kuril' },
  { lon: 143, lat: 39, dip: 30, name: 'Japan' },
  { lon: 142, lat: 30, dip: 60, name: 'Izu–Bonin' },
  { lon: 146, lat: 17, dip: 75, name: 'Mariana' },
  { lon: 127, lat: 26, dip: 45, name: 'Ryukyu' },
  { lon: 127, lat: 10, dip: 45, name: 'Philippines' },
  { lon: 97, lat: 3, dip: 30, name: 'Sumatra' },
  { lon: 110, lat: -10, dip: 55, name: 'Java' },
  { lon: 152, lat: -6, dip: 65, name: 'New Britain' },
  { lon: 167, lat: -16, dip: 70, name: 'New Hebrides' },
  { lon: -174, lat: -20, dip: 55, name: 'Tonga' },
  { lon: -177, lat: -32, dip: 60, name: 'Kermadec' },
  { lon: 178, lat: -40, dip: 25, name: 'Hikurangi' },
  { lon: -102, lat: 17, dip: 20, name: 'Mexico' },
  { lon: -90, lat: 12, dip: 55, name: 'Central America' },
  { lon: -79, lat: -3, dip: 25, name: 'Ecuador' },
  { lon: -77, lat: -12, dip: 15, name: 'Peru' },
  { lon: -71, lat: -22, dip: 30, name: 'northern Chile' },
  { lon: -72, lat: -31, dip: 15, name: 'central Chile' },
  { lon: -74, lat: -40, dip: 30, name: 'southern Chile' },
  { lon: -60, lat: 15, dip: 50, name: 'Lesser Antilles' },
  { lon: -26, lat: -57, dip: 65, name: 'South Sandwich' },
  { lon: 23, lat: 35, dip: 30, name: 'Hellenic' },
  { lon: 17, lat: 38, dip: 70, name: 'Calabria' },
  { lon: 62, lat: 25, dip: 10, name: 'Makran' },
];

export function nearestDip(lon: number, lat: number): { dip: number; name?: string } {
  const p = xyz(lon, lat);
  let best: (typeof DIPS)[number] | undefined;
  let bestD = Infinity;
  for (const d of DIPS) {
    const a = angle(p, xyz(d.lon, d.lat)) * 6371;
    if (a < bestD) { bestD = a; best = d; }
  }
  return best && bestD < 1500 ? { dip: best.dip, name: best.name } : { dip: 35 };
}

const BOUNDARIES = plates as unknown as Boundaries;
const KIND_COL: Record<string, { stroke: string; width: number; dash?: number[] }> = {
  ridge: { stroke: COL.young, width: 1.6 },
  rift: { stroke: COL.young, width: 1.4, dash: [3, 2] },
  transform: { stroke: 'rgba(43,38,34,0.5)', width: 0.8 },
  trench: { stroke: COL.heat, width: 2.2 },
  collision: { stroke: COL.rose, width: 2 },
};
const BOUNDARY_LINES = Object.entries(BOUNDARIES).map(([kind, lines]) => ({ kind, lines: (lines ?? []).map((l) => l.map(([lo, la]) => xyz(lo, la))) }));

/** Colours for the relief by height: the sea floor in blues, deepest darkest; land from pale lowland to brown mountains. */
const RAMP = [
  [-9000, '#21486a'], [-6000, '#2f6189'], [-4500, '#4d82a8'], [-3000, '#78a8c6'], [-1500, '#a6c9da'], [-150, '#c3dde4'],
  [0, '#dcd3a2'], [500, '#d2bf86'], [1500, '#bf9f6c'], [3000, '#9c7a58'], [5000, '#7d6250'],
] as const;

/** The relief's colours, painted once, read by place. */
function texture(r: Relief): (p: V3) => readonly [number, number, number] | null {
  const px = paintRelief(r, { ground: RAMP, exaggeration: 25, relief: 0.6 });
  const [w, s, e, n] = r.meta.bounds;
  return (p) => {
    const [lon, lat] = lonLat(p);
    if (lat > n || lat < s) return lat > n ? [232, 236, 236] : [236, 240, 242];
    const [cx, cy] = toCell(r, Math.max(w, Math.min(e, lon)), lat);
    const i = (Math.max(0, Math.min(r.height - 1, Math.round(cy))) * r.width + Math.max(0, Math.min(r.width - 1, Math.round(cx)))) * 4;
    return [px[i], px[i + 1], px[i + 2]];
  };
}

/** A few words for each kind of crossing, as the readout lists them. */
function describe(s: Section): string {
  const bits: string[] = [];
  const km = (d: number) => `${Math.round(d / 10) * 10} km`;
  for (const c of s.crossings) {
    if (c.kind === 'trench') {
      const side = c.under === 1 ? 'right' : 'left';
      const slant = c.seenDip !== undefined && c.dip !== undefined && c.dip - c.seenDip > 4 ? ` (${Math.round(c.dip)}° in truth; the cut crosses at a slant)` : '';
      bits.push(`a trench at ${km(c.at)}, where the plate dives ${side}ward at ${Math.round(c.seenDip ?? 35)}°${slant}${c.arcAt !== undefined ? `, with volcanoes ${km(c.arcAt)} behind it` : ''}`);
    } else if (c.kind === 'ridge') bits.push(`a spreading ridge at ${km(c.at)}`);
    else if (c.kind === 'rift') bits.push(`a rift at ${km(c.at)}`);
    else if (c.kind === 'collision') bits.push(`a collision at ${km(c.at)}`);
  }
  const transforms = s.crossings.filter((c) => c.kind === 'transform').length;
  if (transforms) bits.push(`${transforms === 1 ? 'a transform fault' : `${transforms} transform faults`}`);
  const head = `The cut is ${km(s.length)} long.`;
  if (!bits.length) return `${head} It crosses no plate boundary: one plate all the way.`;
  return `${head} It crosses ${bits.join('; ')}.`;
}

export const cutEarth = figure(['trench'], (ctx, t) => {
  const W = 400;
  const GH = 300;
  const SH = 210;
  const k = dpr();
  const canvas = el('canvas', { width: W * k, height: GH * k, role: 'img', 'aria-label': 'Today’s Earth, the sea floor shaded by depth, with the plate boundaries drawn on it and a line between two handles. Drag the handles to move the cut; drag elsewhere to turn the globe.' }) as HTMLCanvasElement;
  canvas.style.aspectRatio = `${W} / ${GH}`;
  canvas.style.width = '100%';
  canvas.style.display = 'block';
  const sec = svg('svg', { viewBox: `0 0 ${W} ${SH}`, class: 'fig-svg', role: 'img', 'aria-label': 'The cross-section under the line: crust, plates and mantle, true to scale down and across.' }) as SVGSVGElement;
  const g = svg('g');
  sec.append(g);
  const drawing = el('div', {}, canvas, sec);
  const f = frame({ drawing, lines: 4 });
  const c = canvas.getContext('2d');
  if (c) c.scale(k, k);
  const ready = reliefFor((p) => loadRelief(asset(p)), 'maps/globe').then((relief) => {
    if (!c) return;
    const colour = texture(relief);
    let ends: [V3, V3] = [xyz(-25, -30), xyz(-3, -30)];
    let lon = -35;
    let lat = -18;
    let close = false;
    let whole = false;
    let model: Section | null = null;
    const view = (): GlobeView => globeView({ cx: W / 2, cy: GH / 2, r: close ? 300 : 135, lon, lat });
    const paintGlobe = (rough: boolean) => {
      const v = view();
      c.clearRect(0, 0, W, GH);
      c.fillStyle = COL.paper;
      c.fillRect(0, 0, W, GH);
      const p = new GlobePainter(c, v);
      p.raster(colour, { pixelRatio: k, step: rough ? 3 * k : 1, shade: close ? 0.05 : 0.2 });
      for (const b of BOUNDARY_LINES) p.lines(b.lines, KIND_COL[b.kind]);
      const line = arc(ends[0], ends[1], 80);
      p.lines([line], { stroke: '#fffaf0', width: 5, alpha: 0.9 });
      p.lines([line], { stroke: COL.ink, width: 2 });
      // Ticks every 500 km along the cut, matching the section below.
      const L = angle(ends[0], ends[1]) * 6371;
      for (let d = 500; d < L; d += 500) p.dot(arc(ends[0], ends[1], 1000)[Math.round((d / L) * 1000)], 2, { fill: COL.ink });
      ends.forEach((e, i) => {
        p.dot(e, 8, { fill: '#fffaf0', stroke: COL.ink, width: 2 });
        p.label(e, i ? 'B' : 'A', { dx: 0, font: '700 10px system-ui, sans-serif', align: 'center' });
      });
      p.limb({ stroke: COL.ink, width: 1 });
      c.save();
      c.font = '10px system-ui, sans-serif';
      c.fillStyle = COL.soft;
      c.fillText('Heights: Terrain Tiles on AWS. Boundaries: PB2002 (Bird 2003).', 8, GH - 8);
      c.restore();
    };
    const paintSection = () => {
      model = section(ends[0], ends[1], { relief, boundaries: BOUNDARIES, dipAt: (lo, la) => nearestDip(lo, la).dip });
      const { parts, stretch, depth } = drawSection(model, {
        width: W, height: SH, scale: whole ? 'whole' : 'plate',
        colours: { paper: COL.paper, ink: COL.ink, soft: COL.soft, sea: SEA, mantle: COL.mantle, deepMantle: '#e7b394', lid: COL.lid, oceanCrust: COL.oceanCrust, landCrust: COL.landCrust, outerCore: '#e08a3c', innerCore: '#f3c35b', heat: COL.heat },
      });
      const note = (x: number, y: number, text: string, anchor = 'start', fill: string = COL.ink) => {
        const n = svg('text', { x, y, 'font-size': 10, 'font-weight': 600, fill, 'text-anchor': anchor });
        n.textContent = text;
        return n;
      };
      parts.push(
        note(4, 12, 'A', 'start'), note(W - 4, 12, 'B', 'end'),
        note(4, SH - 5, whole ? `Down to the centre, true to scale; heights ×${stretch}` : `True to scale across and down; heights and sea depths ×${stretch}`, 'start', COL.soft),
      );
      if (!whole) parts.push(note(W - 4, SH - 5, `${Math.round(depth)} km down`, 'end', COL.soft));
      g.replaceChildren(...parts);
      f.readout.textContent = describe(model);
      if (t.goal === 'trench' && model.crossings.some((x) => x.kind === 'trench' && x.arcAt !== undefined)) t.done();
    };
    // For the screenshot script: where the handles sit on the canvas.
    const exposeHandles = () => {
      if (!import.meta.env.DEV) return;
      const w = window as unknown as { __handles: () => number[][]; __cut: (a: number[], b: number[]) => void };
      w.__handles = () => ends.map((e) => { const q = project(view(), e); return [q.x, q.y]; });
      (w as unknown as { __model: () => unknown }).__model = () => model;
      w.__cut = (a, b) => { ends = [xyz(a[0], a[1]), xyz(b[0], b[1])]; [lon, lat] = lonLat(arc(ends[0], ends[1], 2)[1]); fine(); };
    };
    exposeHandles();
    const rough = onFrame(ctx, () => paintGlobe(true));
    const fine = onFrame(ctx, () => { paintGlobe(false); paintSection(); });
    let sectionQueued = false;
    const sectionSoon = () => {
      if (sectionQueued) return;
      sectionQueued = true;
      requestAnimationFrame(() => { sectionQueued = false; paintSection(); });
    };
    dragGlobe(canvas, {
      view, units: () => k,
      middle: () => [lon, lat],
      turn: (a, b) => { lon = a; lat = b; },
      handles: {
        at: () => ends,
        move: (i, p) => {
          const other = ends[1 - i];
          // Keep the cut between 300 and 3,000 km, so the section stays readable.
          let q = p;
          const d = angle(other, q) * 6371;
          if (d < 300) return;
          if (d > 3000) q = arc(other, q, 1000)[Math.round((3000 / d) * 1000)];
          ends = i ? [ends[0], q] : [q, ends[1]];
          exposeHandles();
          sectionSoon();
        },
      },
      changed: (dragging) => (dragging ? rough() : fine()),
    });
    f.controls.append(el('div.chips', {},
      chip('Closer', false, (on) => {
        close = on;
        // Look straight down on the middle of the cut.
        if (on) [lon, lat] = lonLat(arc(ends[0], ends[1], 2)[1]);
        fine();
      }),
      chip('Down to the centre', false, (on) => { whole = on; paintSection(); }),
    ));
    paintGlobe(false);
    paintSection();
  }).catch(() => {
    f.readout.textContent = 'The world relief could not be loaded here. Open the page again when you are online.';
  });
  t.waitFor(ready);
  return f.node;
});

/** The preview's figures, by the ids its lesson names. */
export const GLOBE_PREVIEW = { plateGlobe, cutEarth };
