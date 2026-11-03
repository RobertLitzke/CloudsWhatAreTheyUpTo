// The globe preview (not in the lesson tree yet): two figures on the shared
// globe (didactics/globe), the same code that draws the Earth's plates in
// Geology. `moonPhases` puts the Moon on its orbit, seen from above, beside
// the Moon as it looks from the Earth, maria and all; `seasons` lights the
// Earth from the side through the year, with the line of 48° N split into the
// part in daylight and the part in night.

import { el } from 'didactics/dom';
import { canvasFrame, figure, player, type FigureContext } from 'didactics/figure';
import {
  GlobePainter, add, clipLine, dot, globeView, parallel, project, scale, unit, viewFrom, xyz,
  type GlobeView, type V3,
} from 'didactics/globe';
import land from '../data/land110.json';
import { COL, slider } from './kit';

/** Canvas pixels per drawing unit: the figure is drawn 400 units wide but shown up to about 700 px wide on a desktop, so draw finer than the screen's pixel ratio alone. */
const dpr = () => Math.min(3, 1.75 * ((typeof window !== 'undefined' && window.devicePixelRatio) || 1));

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

// ---- The Moon's phases ---------------------------------------------------------------

/**
 * The Moon's dark plains (maria) as overlapping circles on its near side:
 * centre (selenographic longitude east, latitude) and radius in degrees of
 * the Moon's surface (1° ≈ 30 km), rounded from the IAU's sizes. A rough
 * likeness, enough to show that the face stays the same while the light
 * moves across it.
 */
export const MARIA: { lon: number; lat: number; r: number }[] = [
  { lon: -16, lat: 33, r: 17 }, // Imbrium
  { lon: 17, lat: 28, r: 10 }, // Serenitatis
  { lon: 31, lat: 8, r: 12 }, // Tranquillitatis
  { lon: 59, lat: 17, r: 8 }, // Crisium
  { lon: 52, lat: -6, r: 9 }, // Fecunditatis
  { lon: 49, lat: -12, r: 6 },
  { lon: 34, lat: -15, r: 5 }, // Nectaris
  { lon: -17, lat: -21, r: 10 }, // Nubium
  { lon: -38, lat: -24, r: 6 }, // Humorum
  { lon: -57, lat: 30, r: 12 }, // Oceanus Procellarum
  { lon: -58, lat: 14, r: 13 },
  { lon: -50, lat: -2, r: 11 },
  { lon: -35, lat: 8, r: 9 },
  { lon: -25, lat: -8, r: 7 }, // Cognitum
  { lon: 4, lat: 13, r: 5 }, // Vaporum
  { lon: -30, lat: 56, r: 6 }, // Frigoris
  { lon: -5, lat: 57, r: 6 },
  { lon: 20, lat: 57, r: 5 },
];
const MOON_ROCK = '#cfc9bc';
const MOON_SEA = '#8f8a82';
const MONTH = 29.53;

/** The phase's name for an angle from the Sun (degrees, 0 = new, 180 = full). */
function phaseName(a: number): string {
  if (a < 8 || a > 352) return 'New Moon';
  if (a < 82) return 'Waxing crescent';
  if (a <= 98) return 'First quarter';
  if (a < 172) return 'Waxing gibbous';
  if (a <= 188) return 'Full Moon';
  if (a < 262) return 'Waning gibbous';
  if (a <= 278) return 'Last quarter';
  return 'Waning crescent';
}

const clock = (h: number) => {
  const x = ((Math.round(h) % 24) + 24) % 24;
  return x === 0 ? 'midnight' : x === 12 ? 'noon' : x < 12 ? `${x} am` : `${x - 12} pm`;
};

export const moonPhases = figure(['quarter'], (ctx, t) => {
  const W = 400;
  const H = 240;
  const k = dpr();
  const f = canvasFrame(W, H, 3, { scale: k });
  const c = f.ctx;
  if (!c) return f.node;
  const E: [number, number] = [112, 122];
  const ORBIT = 78;
  const moonFace = MARIA.map((m) => ({ centre: xyz(m.lon, m.lat), radiusDeg: m.r }));
  let days = 3;
  const angleOf = () => (days / MONTH) * 360;
  const paint = () => {
    const a = angleOf();
    const th = (a * Math.PI) / 180;
    c.clearRect(0, 0, W, H);
    c.fillStyle = COL.sky;
    c.fillRect(0, 0, W, H);
    // Sunlight from the left.
    c.strokeStyle = COL.light;
    c.lineWidth = 1.5;
    for (let y = 28; y < H - 20; y += 30) {
      c.beginPath();
      c.moveTo(6, y);
      c.lineTo(24, y);
      c.lineTo(20, y - 3);
      c.moveTo(24, y);
      c.lineTo(20, y + 3);
      c.stroke();
    }
    c.fillStyle = COL.light;
    c.font = '600 10px system-ui, sans-serif';
    c.fillText('sunlight', 6, 16);
    // Earth's shadow, pointing away from the Sun.
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(E[0], E[1] - 14, 226 - E[0], 28);
    // The orbit, and the Earth seen from above its north pole.
    c.strokeStyle = COL.skyLine;
    c.setLineDash([2, 3]);
    c.beginPath();
    c.arc(E[0], E[1], ORBIT, 0, 2 * Math.PI);
    c.stroke();
    c.setLineDash([]);
    const earth = new GlobePainter(c, globeView({ cx: E[0], cy: E[1], r: 14, lon: -90, lat: 90 }));
    earth.disc(COL.earth);
    earth.rings(land.rings.map((r) => r.map(([lo, la]) => xyz(lo, la))), { fill: '#d8c99a' });
    // Seen from above the pole with the Sun off to the left of the picture.
    const ev = earth.view;
    const sunAbove = unit(add(scale(ev.right, -1), scale(ev.toward, 0)));
    earth.night(sunAbove, { alpha: 0.75, bands: 2 });
    // The Moon on its orbit (anticlockwise seen from the north), lit on its Sun side.
    const mx = E[0] - ORBIT * Math.cos(th);
    const my = E[1] + ORBIT * Math.sin(th);
    c.fillStyle = '#2a2e40';
    c.beginPath();
    c.arc(mx, my, 9, 0, 2 * Math.PI);
    c.fill();
    c.fillStyle = MOON_ROCK;
    c.beginPath();
    c.arc(mx, my, 9, Math.PI / 2, (3 * Math.PI) / 2);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.beginPath();
    c.arc(mx, my, 12, 0, 2 * Math.PI);
    c.stroke();
    // A line of sight from the Earth to the Moon.
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.moveTo(E[0], E[1]);
    c.lineTo(mx, my);
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.font = '10px system-ui, sans-serif';
    c.fillText('from above (not to scale)', 34, H - 8);

    // The Moon as it looks from the Earth: the same face, lit from wherever the Sun is.
    const sunBody: V3 = [-Math.cos(th), Math.sin(th), 0];
    const v = globeView({ cx: 318, cy: 112, r: 66, lon: 0, lat: 0 });
    const g = new GlobePainter(c, v);
    g.disc(MOON_ROCK);
    g.caps(moonFace, { fill: MOON_SEA, alpha: 0.85 });
    g.night(sunBody, { fill: '#0d1020', alpha: 0.88, bands: 3, twilightDeg: 6 });
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.font = '600 11px system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText('from the Earth', 318, 30);
    c.font = '700 13px system-ui, sans-serif';
    c.fillText(phaseName(a), 318, 202);
    c.font = '11px system-ui, sans-serif';
    c.fillText(`${Math.round(((1 - Math.cos(th)) / 2) * 100)}% lit`, 318, 218);
    c.textAlign = 'left';

    const rise = 6 + a / 15;
    const name = phaseName(a);
    let words = `${name}, ${days.toFixed(1)} days after new Moon. It rises about ${clock(rise)} and is highest about ${clock(rise + 6)}.`;
    if (name === 'Full Moon') words += ' From above it seems to pass through the Earth’s shadow, but its orbit is tilted 5°, so most months it passes just above or below: only a few full Moons a year are eclipsed.';
    else if (name === 'New Moon') words += ' The lit side faces away from us; the Moon is up in daylight, lost in the Sun’s glare.';
    else words += ' The Earth’s shadow plays no part: the dark side is just the Moon’s own night.';
    f.readout.textContent = words;
    if (t.goal === 'quarter' && name === 'First quarter') t.done();
  };
  const redraw = onFrame(ctx, paint);
  const s = slider('Days', 0, 29.5, 0.1, days, (v) => `${v.toFixed(1)} d`, (v) => { days = v; redraw(); }, 'moon');
  const play = player(s, ctx, { seconds: 15 });
  f.controls.append(el('div.fig-row', {}, s.node, play.node));
  // Drag the Moon round its orbit.
  const canvas = f.drawing;
  canvas.style.touchAction = 'none';
  let dragging = false;
  const toAngle = (e: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * W;
    const y = ((e.clientY - box.top) / box.height) * H;
    let a = (Math.atan2(y - E[1], -(x - E[0])) * 180) / Math.PI;
    if (a < 0) a += 360;
    return { a, near: Math.abs(Math.hypot(x - E[0], y - E[1]) - ORBIT) < 26 };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const p = toAngle(e);
    if (!p.near) return;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    s.set(Math.round(((p.a / 360) * MONTH) * 10) / 10);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) s.set(Math.round(((toAngle(e).a / 360) * MONTH) * 10) / 10);
  });
  canvas.addEventListener('pointerup', () => (dragging = false));
  canvas.setAttribute('aria-label', 'Left: the Earth and the Moon’s orbit seen from above, sunlight coming from the left. Right: the Moon as it looks from the Earth at that point in the month.');
  paint();
  return f.node;
});

// ---- Seasons at 48° N ----------------------------------------------------------------

const LAND_RINGS = land.rings.map((r) => r.map(([lo, la]) => xyz(lo, la)));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/** A day of the year (0 = 1 Jan) as a date. */
function dateOf(d: number): string {
  let x = Math.round(d) % 365;
  for (let m = 0; m < 12; m++) {
    if (x < DAYS_IN[m]) return `${x + 1} ${MONTHS[m]}`;
    x -= DAYS_IN[m];
  }
  return '31 Dec';
}
const LAT = 48;
const RAD = Math.PI / 180;
/** How long the Sun is up at `lat` when its declination is `dec`, hours. */
export function dayLength(lat: number, dec: number): number {
  const x = -Math.tan(lat * RAD) * Math.tan(dec * RAD);
  if (x <= -1) return 24;
  if (x >= 1) return 0;
  return (2 * Math.acos(x)) / RAD / 15;
}
/** The Sun's direction from the Earth along the ecliptic on day `d` (0 = 1 Jan): its longitude, degrees (0 at the March equinox, about 20 Mar). */
const sunLongitude = (d: number) => (360 * (d - 79)) / 365.25;

export const seasons = figure(['longest'], (ctx, t) => {
  const W = 400;
  const H = 300;
  const k = dpr();
  const f = canvasFrame(W, H, 3, { scale: k });
  const c = f.ctx;
  if (!c) return f.node;
  let day = 79;
  let tilt = 23.4;
  const paint = () => {
    const lam = sunLongitude(day) * RAD;
    const eps = tilt * RAD;
    // In the frame of the Earth's orbit: the Sun's direction, the axis, and our seat beside the Earth, side-on to the sunlight.
    const sun: V3 = [Math.cos(lam), Math.sin(lam), 0];
    const axis: V3 = [0, Math.sin(eps), Math.cos(eps)];
    const toward: V3 = [-Math.sin(lam), Math.cos(lam), 0];
    // The Earth's own axes in that frame, turned so the Americas face us.
    const ez = axis;
    const e1 = unit(add(toward, scale(ez, -dot(toward, ez))));
    const e2: V3 = [ez[1] * e1[2] - ez[2] * e1[1], ez[2] * e1[0] - ez[0] * e1[2], ez[0] * e1[1] - ez[1] * e1[0]];
    const L0 = -100 * RAD;
    const ex = unit(add(scale(e1, Math.cos(L0)), scale(e2, -Math.sin(L0))));
    const ey = unit(add(scale(e1, Math.sin(L0)), scale(e2, Math.cos(L0))));
    const inBody = (w: V3): V3 => [dot(w, ex), dot(w, ey), dot(w, ez)];
    // The camera: the Sun on the left, the orbit's north up.
    const v: GlobeView = viewFrom(200, 152, 112, inBody(toward), inBody([0, 0, 1]));
    const sunB = inBody(sun);
    c.clearRect(0, 0, W, H);
    c.fillStyle = COL.sky;
    c.fillRect(0, 0, W, H);
    c.strokeStyle = COL.light;
    c.lineWidth = 1.5;
    for (let y = 40; y < H - 30; y += 34) {
      c.beginPath();
      c.moveTo(8, y);
      c.lineTo(32, y);
      c.lineTo(27, y - 3);
      c.moveTo(32, y);
      c.lineTo(27, y + 3);
      c.stroke();
    }
    c.fillStyle = COL.light;
    c.font = '600 10px system-ui, sans-serif';
    c.fillText('sunlight', 8, 24);
    const g = new GlobePainter(c, v);
    g.disc(COL.earth);
    g.graticule(30, { stroke: 'rgba(255,255,255,0.15)', width: 0.6 });
    g.rings(LAND_RINGS, { fill: '#d8c99a' });
    g.night(sunB, { alpha: 0.7, bands: 3, twilightDeg: 8 });
    // The axis, through the poles and out beyond them.
    const n = project(v, scale([0, 0, 1], 1.32));
    const sP = project(v, scale([0, 0, -1], 1.32));
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(n.x, n.y);
    c.lineTo(project(v, [0, 0, 1]).x, project(v, [0, 0, 1]).y);
    c.moveTo(sP.x, sP.y);
    c.lineTo(project(v, [0, 0, -1]).x, project(v, [0, 0, -1]).y);
    c.stroke();
    // 48° N, gold where it is day, dashed where it is night.
    const ring = parallel(LAT, 240);
    const runs: { day: boolean; pts: V3[] }[] = [];
    for (const p of [...ring, ring[0]]) {
      const lit = dot(p, sunB) > 0;
      const last = runs[runs.length - 1];
      if (last && last.day === lit) last.pts.push(p);
      else runs.push({ day: lit, pts: last ? [last.pts[last.pts.length - 1], p] : [p] });
    }
    for (const r of runs) {
      for (const run of clipLine(v, r.pts)) {
        c.beginPath();
        run.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.strokeStyle = r.day ? COL.sun : '#9aa3c7';
        c.lineWidth = r.day ? 3 : 1.5;
        c.setLineDash(r.day ? [] : [4, 3]);
        c.stroke();
      }
    }
    c.setLineDash([]);
    g.label(xyz(-100, LAT), '48° N', { fill: '#fff', dx: 0, dy: -10, align: 'center', font: '700 11px system-ui, sans-serif', halo: 'rgba(20,26,46,0.8)' });
    g.limb({ stroke: 'rgba(255,255,255,0.4)', width: 1 });
    c.fillStyle = '#fff';
    c.font = '700 13px system-ui, sans-serif';
    c.fillText(dateOf(day), W - 70, 24);

    const dec = Math.asin(Math.sin(eps) * Math.sin(lam)) / RAD;
    const hours = dayLength(LAT, dec);
    const noon = 90 - Math.abs(LAT - dec);
    const dist = 149.6 * (1 - 0.0167 * Math.cos((2 * Math.PI * (day - 3)) / 365.25));
    const hm = `${Math.floor(hours)} h ${String(Math.round((hours % 1) * 60)).padStart(2, '0')} min`;
    f.readout.textContent = tilt < 0.5
      ? `With no tilt, the Sun is up ${hm} every day of the year at 48° N and stands ${Math.round(noon)}° high at noon. There are no seasons, even though the distance to the Sun still swings from 147 to 152 million km.`
      : `${dateOf(day)}: at 48° N the Sun is up ${hm} and stands ${Math.round(noon)}° high at noon. The Earth is ${dist.toFixed(1)} million km from the Sun${dist < 148 ? ', near its closest, in the northern winter' : dist > 151.5 ? ', near its farthest, in the northern summer' : ''}.`;
    const longest = dayLength(LAT, tilt);
    if (t.goal === 'longest' && tilt >= 20 && hours >= longest - 1 / 60) t.done();
  };
  const redraw = onFrame(ctx, paint);
  const sd = slider('Date', 0, 364, 1, day, dateOf, (v) => { day = v; redraw(); }, 'sun');
  const play = player(sd, ctx, { seconds: 16 });
  const st = slider('Tilt', 0, 40, 0.1, tilt, (v) => `${v.toFixed(1)}°`, (v) => { tilt = v; redraw(); }, 'earth');
  f.controls.append(el('div.fig-row', {}, sd.node, play.node), st.node);
  f.drawing.setAttribute('aria-label', 'The Earth seen side-on to the sunlight, which comes from the left, with its axis tilted. The line of 48 degrees north is gold where it is in daylight and dashed where it is night.');
  paint();
  return f.node;
});

/** The preview's figures, by the ids its lesson names. */
export const GLOBE_PREVIEW = { moonPhases, seasons };
