// Lesson 1, Two shadows: Eratosthenes measures the Earth from a shadow; a
// flat Earth under a near Sun fits two shadows but not three; Aristarchus's
// half Moon, where a small error in an angle is a large error in a distance.

import { svg } from 'didactics/dom';
import { label, line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { big, COL, figure, frame, guessFirst, sig, slider } from './kit';

const W = 400;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Syene to Alexandria along the ground, km (about 5,000 stadia). */
export const APART = 800;
/** The angle of the shadow at Alexandria at noon on midsummer's day, degrees (a fiftieth of a circle). */
export const ALEX_ANGLE = 7.2;
/** Shadow angle at a city `km` north of Syene on a round Earth `around` km round. */
export const roundAngle = (km: number, around: number) => (360 * km) / around;

// ---- Measuring the Earth --------------------------------------------------------------

export const shadowFigure = figure(['matched'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let around = 20000;
  const paint = () => {
    const a = roundAngle(APART, around);
    const th = rad(a);
    // Syene at the top of the circle; the arc to Alexandria is drawn about 250 units long.
    const R = 125 / Math.sin(th / 2);
    const sy: P = [80, 70];
    const c: P = [sy[0], sy[1] + R];
    const at = (u: number): P => [c[0] + R * Math.sin(u), c[1] - R * Math.cos(u)];
    const al = at(th);
    const arc: P[] = [];
    for (let k = -8; k <= 48; k++) arc.push(at((k / 40) * th));
    const stick = 30;
    const out = (p: P, u: number, len: number): P => [p[0] + len * Math.sin(u), p[1] - len * Math.cos(u)];
    const alTop = out(al, th, stick);
    // The shadow: where the Sun's (vertical) ray past the stick's top meets the ground, along the tangent.
    const shadowLen = stick * Math.tan(th);
    const shadowEnd: P = [al[0] + shadowLen * Math.cos(th), al[1] + shadowLen * Math.sin(th)];
    const parts: SVGElement[] = [svg('rect', { width: W, height: 250, fill: COL.paper })];
    for (let x = 30; x <= 390; x += 26) parts.push(line(x, 0, x, 250, COL.light, 1, { opacity: 0.35 }));
    parts.push(
      small(392, 14, 'Sunlight, in parallel rays', { anchor: 'end', fill: COL.light, bold: true }),
      polyline(arc, COL.earth, 3),
    );
    // Lines to the centre, when the centre is near enough to draw.
    if (c[1] < 600) {
      parts.push(
        line(sy[0], sy[1], c[0], c[1], COL.soft, 1, { 'stroke-dasharray': '4 4' }),
        line(al[0], al[1], c[0], c[1], COL.soft, 1, { 'stroke-dasharray': '4 4' }),
      );
      if (c[1] < 240) parts.push(small(c[0] + 6, c[1] - 6, `${sig(a, 2)}° at the centre`, { soft: true }), svg('circle', { cx: c[0], cy: c[1], r: 2.5, fill: COL.soft }));
    }
    parts.push(
      line(sy[0], sy[1], sy[0], sy[1] - stick, COL.ink, 3),
      note(sy[0], sy[1] + 18, 'Syene', { anchor: 'middle', bold: true }),
      small(sy[0], sy[1] + 30, 'no shadow', { anchor: 'middle', soft: true }),
      line(al[0], al[1], alTop[0], alTop[1], COL.ink, 3),
      line(alTop[0], alTop[1], shadowEnd[0], shadowEnd[1], COL.light, 1.5, { 'stroke-dasharray': '3 2' }),
      line(al[0], al[1], shadowEnd[0], shadowEnd[1], COL.ink, 5, { opacity: 0.55 }),
      note(Math.min(al[0], 370), al[1] + 20, 'Alexandria', { anchor: 'middle', bold: true }),
      small(Math.min(al[0], 370), al[1] + 32, `shadow at ${sig(a, 2)}°`, { anchor: 'middle', soft: true }),
      small((sy[0] + al[0]) / 2, Math.min(sy[1], al[1]) - 40, `${big(APART)} km apart`, { anchor: 'middle' }),
    );
    redraw(g, ...parts);
    const close = Math.abs(a - ALEX_ANGLE) < 0.2;
    f.readout.textContent = close
      ? `An Earth ${big(around)} km round puts Alexandria ${sig(a, 2)}° around the curve from Syene, a fiftieth of a circle, and the stick's shadow leans ${sig(a, 2)}°, as measured. Eratosthenes's answer, 250,000 stadia, is within a few per cent of this if a stadion was about 160 m.`
      : `On an Earth ${big(around)} km round, ${big(APART)} km of ground is ${sig(a, 2)}° of the circle, so the Sun's parallel rays meet the Alexandria stick ${sig(a, 2)}° off its length. The measured shadow was ${ALEX_ANGLE}°: ${a > ALEX_ANGLE ? 'make the Earth bigger' : 'make the Earth smaller'}.`;
    if (close && t.goal === 'matched') t.done();
  };
  const s = slider('Distance around the Earth', 10000, 100000, 500, around, (v) => `${big(v)} km`, (v) => { around = v; paint(); }, 'earth');
  f.controls.append(s.node);
  paint();
  return f.node;
});

// ---- A flat Earth and a near Sun --------------------------------------------------------

/** Places roughly north of Syene along the Nile and beyond, km (from their latitudes). */
const PLACES: { name: string; km: number }[] = [
  { name: 'Alexandria', km: 800 },
  { name: 'Rhodes', km: 1340 },
  { name: 'Athens', km: 1550 },
  { name: 'Massalia (Marseille)', km: 2100 },
  { name: 'Britain', km: 3050 },
  { name: 'Thule (Iceland)', km: 4600 },
];
/** The noon shadow angle on a flat Earth with the Sun `h` km above Syene. */
export const flatAngle = (km: number, h: number) => deg(Math.atan(km / h));
/** The angle measured at a place: the real Earth is round, about 40,000 km. */
export const measured = (km: number) => roundAngle(km, 40000);

export const flatFigure = figure(['ruled-out'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let h = 2000;
  let third = 800;
  let fitted = false;
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { width: W, height: 250, fill: COL.paper })];
    // The scene: 1 unit = 40 km.
    const gx = (km: number) => 24 + km / 40;
    const gy = 222;
    const sunY = Math.max(16, gy - h / 40);
    parts.push(
      line(14, gy, 150, gy, COL.earth, 3),
      svg('circle', { cx: gx(0), cy: sunY, r: 8, fill: COL.sun }),
      small(gx(0) + 12, sunY + 4, h / 40 > gy - 16 ? `Sun ${big(h)} km up (off the top)` : `Sun ${big(h)} km up`, { fill: COL.sun, bold: true }),
      small(14, gy + 16, 'Flat Earth, near Sun', { bold: true }),
    );
    const stickAt = (km: number, color: string) => {
      const x = gx(km);
      parts.push(line(gx(0), sunY, x, gy - 10, COL.light, 1, { opacity: 0.8 }), line(x, gy, x, gy - 10, color, 3));
    };
    stickAt(0, COL.ink);
    stickAt(APART, COL.ink);
    stickAt(third, COL.model);
    // The chart: shadow angle against distance north of Syene.
    const cx = (km: number) => 196 + (km / 5000) * 190;
    const cy = (a: number) => 214 - (a / 45) * 180;
    parts.push(
      line(196, 214, 386, 214, COL.ink, 1), line(196, 214, 196, 30, COL.ink, 1),
      small(291, 236, 'km north of Syene', { anchor: 'middle' }),
      small(200, 26, 'Noon shadow angle', { bold: true }),
      ...[0, 15, 30, 45].map((a) => small(192, cy(a) + 4, `${a}°`, { anchor: 'end', soft: true })),
      ...[0, 2500, 5000].map((km) => small(cx(km), 226, big(km), { anchor: 'middle', soft: true })),
    );
    const roundLine: P[] = [];
    const flatLine: P[] = [];
    for (let km = 0; km <= 5000; km += 50) {
      if (measured(km) <= 46) roundLine.push([cx(km), cy(measured(km))]);
      if (flatAngle(km, h) <= 46) flatLine.push([cx(km), cy(flatAngle(km, h))]);
    }
    parts.push(
      polyline(roundLine, COL.seen, 2),
      polyline(flatLine, COL.model, 2, { 'stroke-dasharray': '5 3' }),
      small(cx(3600), cy(measured(3600)) - 6, 'measured', { anchor: 'end' }),
      small(cx(4400), Math.max(44, cy(flatAngle(4400, h)) + 14), 'flat, near Sun', { anchor: 'middle', fill: COL.model }),
      svg('circle', { cx: cx(APART), cy: cy(ALEX_ANGLE), r: 4, fill: COL.seen }),
      svg('circle', { cx: cx(third), cy: cy(measured(third)), r: 4, fill: COL.seen }),
      svg('circle', { cx: cx(third), cy: cy(flatAngle(third, h)), r: 4, fill: 'none', stroke: COL.model, 'stroke-width': 2 }),
    );
    redraw(g, ...parts);
    const alex = flatAngle(APART, h);
    fitted = Math.abs(alex - ALEX_ANGLE) < 0.3;
    const place = PLACES.reduce((b, p) => (Math.abs(p.km - third) < Math.abs(b.km - third) ? p : b));
    const where = Math.abs(place.km - third) < 150 ? place.name : `a place ${big(third)} km north`;
    const miss = measured(third) - flatAngle(third, h);
    f.readout.textContent = !fitted
      ? `With the Sun ${big(h)} km up, the flat Earth gives Alexandria a ${sig(alex, 2)}° shadow; the measured one is ${ALEX_ANGLE}°. ${alex > ALEX_ANGLE ? 'Raise' : 'Lower'} the Sun until they agree.`
      : third <= APART + 100
        ? `A Sun about ${big(h)} km up gives the same two shadows as a round Earth. Two measurements can't tell the shapes apart. Now move the third stick north.`
        : Math.abs(miss) < 1
          ? `At ${where} the two pictures still nearly agree (${sig(measured(third), 2)}° measured, ${sig(flatAngle(third, h), 2)}° flat). Go farther.`
          : `At ${where} the noon shadow is measured at ${sig(measured(third), 2)}°, but the flat Earth gives ${sig(flatAngle(third, h), 2)}°. No height of the Sun fits every place; a round Earth with a distant Sun does.`;
    if (fitted && Math.abs(miss) >= 3 && t.goal === 'ruled-out') t.done();
  };
  const sh = slider('Height of the Sun', 1000, 15000, 50, h, (v) => `${big(v)} km`, (v) => { h = v; paint(); }, 'sun');
  const s3 = slider('Third stick, north of Syene', 0, 5000, 50, third, (v) => `${big(v)} km`, (v) => { third = v; paint(); }, 'model');
  f.controls.append(sh.node, s3.node);
  paint();
  guessFirst(t, f, {
    ask: 'Suppose the Earth were flat and the Sun near, straight above Syene at noon. Could it cast no shadow at Syene and a 7.2° shadow at Alexandria? Guess first.',
    options: ['Yes, at the right height', 'No, never'],
    sliders: [sh, s3],
    after: (guess) => {
      paint();
      f.readout.textContent = `${guess === 0 ? 'Right: it can. ' : 'It can, in fact. '}${f.readout.textContent}`;
    },
  });
  return f.node;
});

// ---- Aristarchus and the half Moon --------------------------------------------------------

/** How many times farther the Sun is than the Moon, if the angle between them at half Moon is `a` degrees. */
export const sunFarther = (a: number) => 1 / Math.cos(rad(a));

export const halfMoonFigure = figure(['true-angle'], (_ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let a = 87;
  const paint = () => {
    const n = sunFarther(a);
    const e: P = [40, 180];
    const m: P = [40, 60];
    // The Sun's distance from the Moon, squeezed: 1 to 1000 Moon distances over the width.
    const sx = 40 + (Math.log10(n) / 3) * 330;
    const s: P = [Math.max(80, sx), 60];
    const parts: SVGElement[] = [svg('rect', { width: W, height: 220, fill: COL.paper })];
    parts.push(
      line(e[0], e[1], m[0], m[1], COL.ink, 1.5),
      line(m[0], m[1], s[0], s[1], COL.light, 1.5),
      line(e[0], e[1], s[0], s[1], COL.ink, 1.5, { 'stroke-dasharray': '5 3' }),
      polyline([[m[0], m[1] + 12], [m[0] + 12, m[1] + 12], [m[0] + 12, m[1]]], COL.soft, 1),
      svg('circle', { cx: e[0], cy: e[1], r: 9, fill: COL.earth }),
      note(e[0] + 14, e[1] + 18, 'Earth', { bold: true }),
      // The half Moon: lit on the side facing the Sun.
      svg('circle', { cx: m[0], cy: m[1], r: 8, fill: '#3a3a44' }),
      svg('path', { d: `M${m[0]},${m[1] - 8} A8,8 0 0 1 ${m[0]},${m[1] + 8} Z`, fill: '#f2efe6' }),
      note(m[0] - 4, m[1] - 16, 'half Moon', { bold: true }),
      svg('circle', { cx: s[0], cy: s[1], r: 14, fill: COL.sun }),
      note(s[0], s[1] - 22, 'Sun', { anchor: 'middle', bold: true }),
      small(m[0] + 18, m[1] + 26, 'a right angle at the Moon', { soft: true }),
      label(e[0] + 26, e[1] - 30, `${a.toFixed(2)}°`, { bold: true }),
      small(200, 210, 'Not to scale: the Sun’s distance is squeezed so it fits.', { anchor: 'middle', soft: true }),
    );
    redraw(g, ...parts);
    f.readout.textContent = `If the angle at Earth between the half Moon and the Sun is ${a.toFixed(2)}°, the Sun is ${n < 100 ? sig(n, 2) : big(n)} times as far away as the Moon, and since the two look the same size in the sky, ${n < 100 ? sig(n, 2) : big(n)} times as wide.${a >= 89.8 ? ' This is the true angle.' : a <= 87.05 && a >= 86.95 ? ' This is what Aristarchus measured.' : ''}`;
    if (a >= 89.8 && t.goal === 'true-angle') t.done();
  };
  const s = slider('Angle between the half Moon and the Sun', 80, 89.9, 0.05, a, (v) => `${v.toFixed(2)}°`, (v) => { a = v; paint(); }, 'sun');
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'Aristarchus measured 87°, which puts the Sun 19 times as far as the Moon. The true angle is 89.85°, less than three degrees more. With the true angle, how far is the Sun? Guess first.',
    options: ['A little farther, about 20 Moon distances', 'Twice as far, about 40', 'About twenty times farther, near 400'],
    sliders: [s],
    after: () => {
      paint();
      f.readout.textContent = `${f.readout.textContent} Push the angle toward 90°.`;
    },
  });
  return f.node;
});
