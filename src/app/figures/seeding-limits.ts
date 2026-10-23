// Figures for what seeding can and can't do: how much water a cloud holds,
// the cloud as a conveyor, the temperatures where seeding can help, fog and
// a fair test, and a seeding trial against luck.

import { judge, runTrial, STORMS_PER_WINTER, TRUE_EFFECT } from '../../core/cold-cloud';
import type { GenusId } from '../../core/clouds';
import { makeRng } from '../../core/rng';
import { el, svg } from '../dom';
import { drawCloud } from '../scene/drawn';
import { realClouds } from '../clouds/real';
import { DAY } from '../clouds/tones';
import { PALETTES } from '../scene/landscape';
import { arrow, flake, heading, label, line, note, redraw, still } from './draw';
import { COL, deg, figure, frame, slider, type FigureFactory } from './kit';
import { JUST_RIGHT, TOO_MUCH } from './seeding';

// ---- How much water a cloud holds -------------------------------------------

export const cloudWaterDiagram: FigureFactory = () => {
  const d = still(400, 240);
  const base = 180;
  const mmPx = 10; // a bar 10 px tall per millimetre of water
  const bar = (x: number, mm: number, value: string, broken = false) => {
    const h = Math.max(1.5, Math.min(140, mm * mmPx));
    return svg('g', {},
      svg('rect', { x: x - 22, y: base - h, width: 44, height: h, fill: COL.rain }),
      broken ? svg('g', {}, svg('rect', { x: x - 26, y: base - 104, width: 52, height: 8, fill: COL.paper }), line(x - 26, base - 98, x + 26, base - 104, COL.ink, 1), line(x - 26, base - 90, x + 26, base - 96, COL.ink, 1)) : null as unknown as SVGElement,
      note(x, base - h - 6, value, { bold: true, anchor: 'middle' }),
    );
  };
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 240, fill: COL.paper }),
    line(20, base, 380, base, COL.ink, 1.5),
    bar(70, 0.2, '0.2 mm'), bar(200, 12, '10 to 15 mm'), bar(330, 250, '250 mm', true),
    arrow(30, 146, 46, base - 2, COL.ink, 1.2),
    note(30, 140, 'this sliver', { anchor: 'middle' }),
    note(200, 34, '60 times the cloud', { soft: true, anchor: 'middle' }),
    note(200, base + 46, 'The year’s bar is cut short to fit: it is really 20 storm days’ worth.', { soft: true, anchor: 'middle' }),
    note(70, base + 14, 'all the water in a', { anchor: 'middle' }),
    note(70, base + 26, 'cloud layer 1 km deep', { anchor: 'middle' }),
    note(200, base + 14, 'a day of steady rain', { anchor: 'middle' }),
    note(200, base + 26, 'from a passing storm', { anchor: 'middle' }),
    note(330, base + 14, 'a whole year in the', { anchor: 'middle' }),
    note(330, base + 26, 'dry Columbia Basin', { anchor: 'middle' }),
  );
  return { node: d.node };
};

export const conveyorDiagram: FigureFactory = () => {
  const d = still(400, 230);
  const ground = 196;
  const cloud = svg('path', { d: 'M120,112 Q118,84 146,82 Q156,58 190,64 Q214,46 244,64 Q276,60 282,86 Q306,92 298,114 Z', fill: '#ffffff', stroke: COL.cloudShade, 'stroke-width': 1.2 });
  const rain = Array.from({ length: 14 }, (_, i) => line(140 + i * 11, 118, 134 + i * 11, ground - 2, COL.rain, 1.4, { opacity: 0.7 }));
  const gauge = (x: number, mm: number, when: string) => svg('g', {},
    svg('rect', { x: x - 9, y: ground - 46, width: 18, height: 46, fill: '#ffffff', stroke: COL.soft }),
    svg('rect', { x: x - 8, y: ground - 1 - mm * 3, width: 16, height: mm * 3, fill: COL.rain }),
    note(x, ground + 14, when, { anchor: 'middle', fill: '#fff' }),
    note(x, ground - 52, `${mm} mm`, { bold: true, anchor: 'middle' }),
  );
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: COL.air }),
    svg('rect', { x: 0, y: ground, width: 400, height: 34, fill: COL.ground }),
    // New moist air streams in and is lifted through the cloud.
    arrow(4, 170, 100, 160, COL.parcel, 2.6),
    arrow(4, 150, 96, 140, COL.parcel, 2.6),
    arrow(118, 150, 150, 104, COL.parcel, 2),
    note(112, 160, 'lifted', { anchor: 'end', fill: COL.parcel }),
    note(6, 118, 'new moist air keeps', { bold: true, fill: COL.parcel }),
    note(6, 130, 'arriving off the Pacific', { fill: COL.parcel }),
    arrow(300, 70, 380, 54, COL.soft, 1.6),
    note(306, 48, 'dried air leaves', { fill: COL.soft }),
    ...rain,
    cloud,
    note(210, 90, 'holds only 0.2 mm', { bold: true, anchor: 'middle' }),
    note(210, 102, 'at any moment', { anchor: 'middle' }),
    gauge(312, 1, '1 h'), gauge(346, 6, '6 h'), gauge(380, 12, '12 h'),
    note(346, 124, 'rain gauge', { soft: true, anchor: 'middle' }),
    heading(200, 20, 'A cloud is a conveyor, not a bucket'),
  );
  return { node: d.node };
};

// ---- Where seeding can help -------------------------------------------------

export const seedWindowDiagram: FigureFactory = () => {
  const d = still(400, 320);
  const yOf = (c: number) => 12 + ((10 - c) / 60) * 290;
  const bx = 124; // bands start here; the height scales sit to the left
  const band = (from: number, to: number, fill: string, lines: string[], color: string) => {
    const mid = (yOf(from) + yOf(to)) / 2 - ((lines.length - 1) * 12) / 2 + 3.5;
    return svg('g', {},
      svg('rect', { x: bx, y: yOf(from), width: 400 - bx, height: yOf(to) - yOf(from), fill }),
      ...lines.map((text, i) => note(bx + 6, mid + i * 12, text, { fill: color, bold: i === 0 })),
    );
  };
  // How high each temperature is, in summer (warm ground) and in winter (0 °C at the ground).
  const heightScale = (x: number, groundC: number, title: string) => svg('g', {},
    note(x - 6, 9, title, { bold: true }),
    note(x - 6, yOf(-50) + 14, groundC > 10 ? 'ground 20 °C' : 'ground 0 °C', { soft: true }),
    line(x, yOf(Math.min(10, groundC)), x, yOf(-50), COL.soft, 1),
    ...[0, 2, 4, 6, 8].map((km) => {
      const c = groundC - 6.5 * km;
      return c <= 10 && c >= -50 ? svg('g', {}, line(x - 3, yOf(c), x + 3, yOf(c), COL.soft, 1), note(x + 5, yOf(c) + 3.5, `${km} km`, { soft: true })) : null as unknown as SVGElement;
    }),
  );
  const cloud = (id: GenusId, x: number, c: number, s: number) => svg('g', { transform: `translate(${x} ${yOf(c)}) scale(${s})` }, drawCloud(id, PALETTES.day, 4));
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 320, fill: COL.paper }),
    band(10, 0, COL.warmAir, ['Above 0 °C: nothing to freeze'], COL.warmInk),
    band(0, -5, '#f3e6b8', ['0 to −5 °C: dry ice only'], '#7a5a10'),
    band(-5, -25, COL.subzero, ['−5 to −25 °C: the seeding window', 'supercooled water, and', 'little ice of its own'], COL.blue),
    band(-25, -38, TOO_MUCH, ['−25 to −38 °C: natural specks', 'take over, more so the colder'], COL.env),
    band(-38, -50, '#f2f6fc', ['Below −38 °C: all ice'], COL.ink),
    ...[10, 0, -10, -20, -30, -40, -50].map((c) => note(bx - 4, yOf(c) + 3.5, deg(c), { soft: true, anchor: 'end' })),
    heightScale(10, 20, 'summer'),
    heightScale(54, 0, 'winter'),
    cloud('cumulus', 350, 4, 0.42),
    note(350, yOf(4) + 14, 'summer cumulus', { anchor: 'middle' }),
    cloud('stratus', 350, -8, 0.42),
    note(350, yOf(-8) + 14, 'winter fog, stratus', { anchor: 'middle' }),
    cloud('altocumulus', 350, -18, 0.42),
    note(350, yOf(-18) + 14, 'winter altocumulus', { anchor: 'middle' }),
    cloud('cirrus', 350, -44, 0.5),
    note(350, yOf(-44) + 14, 'cirrus', { anchor: 'middle' }),
  );
  return { node: d.node };
};

// ---- Where it works: fog, and a fair test -----------------------------------

export const fogHoleDiagram: FigureFactory = () => {
  const d = still(400, 204);
  const ground = 170;
  // The fog bank either side of the hole the seeding cleared.
  const fog = (x0: number, x1: number) => ({ kind: 'sheet' as const, x0, x1, top: 104, bottom: ground + 8, density: 2.2, detail: 12 });
  const clouds = realClouds({ width: 400, height: ground, sun: [300, -200, -200], tones: DAY }, [fog(-40, 150), fog(270, 440)]);
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: ground, fill: '#9cc0e0' }),
    clouds.node,
    ...Array.from({ length: 16 }, (_, i) => flake(160 + (i % 8) * 14, 120 + Math.floor(i / 8) * 22 + (i % 3) * 5, 2.4, '#ffffff', 1.2)),
    svg('rect', { x: 0, y: ground, width: 400, height: 34, fill: '#8a8f7a' }),
    svg('rect', { x: 130, y: ground + 8, width: 160, height: 12, fill: '#4a4a52' }),
    ...[150, 180, 210, 240, 270].map((x) => line(x, ground + 14, x + 12, ground + 14, '#ffffff', 1.5)),
    svg('g', { transform: 'translate(120 60)' }, svg('ellipse', { cx: 0, cy: 0, rx: 14, ry: 3, fill: COL.ink }), line(-3, 0, 3, -8, COL.ink, 2.5), line(-13, 0, -16, -5, COL.ink, 2)),
    line(140, 62, 290, 62, COL.ink, 1, { 'stroke-dasharray': '3 3' }),
    note(140, 54, 'dry ice dropped along the runway'),
    note(8, 112, 'supercooled fog, −7 °C', { bold: true }),
    note(296, 112, 'a clear hole for', { bold: true }),
    note(296, 124, 'an hour or so'),
    note(8, 20, 'Fog warmer than 0 °C: no effect at all.', { soft: true }),
  );
  return { node: d.node };
};

export const fairTestDiagram: FigureFactory = () => {
  const d = still(400, 230);
  const coins = ['H', 'T', 'T', 'H', 'H', 'T', 'H', 'T', 'T', 'H'];
  const row = coins.map((c, i) => {
    const x = 30 + i * 37;
    return svg('g', {},
      svg('path', { d: `M${x - 13},48 Q${x - 14},36 ${x - 4},36 Q${x},28 ${x + 8},34 Q${x + 16},34 ${x + 14},48 Z`, fill: c === 'H' ? '#bcd3f2' : '#ffffff', stroke: COL.cloudShade }),
      svg('circle', { cx: x, cy: 66, r: 8, fill: '#e2c46d', stroke: '#b0894f' }),
      heading(x, 70, c, { fill: '#6b5420' }),
      note(x, 88, c === 'H' ? 'seed' : 'leave', { anchor: 'middle', fill: c === 'H' ? COL.ice : COL.soft }),
    );
  });
  const area = (x: number, name: string, fill: string, says: string) => svg('g', {},
    svg('ellipse', { cx: x, cy: 168, rx: 62, ry: 30, fill, stroke: COL.soft }),
    note(x, 166, name, { bold: true, anchor: 'middle' }),
    note(x, 178, says, { anchor: 'middle' }),
  );
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 400, height: 230, fill: COL.paper }),
    heading(200, 18, 'Two ways to keep luck out'),
    ...row,
    line(10, 104, 390, 104, COL.grid, 1),
    note(10, 122, 'Toss a coin for each storm before it comes, and compare.', { bold: true }),
    arrow(10, 152, 392, 152, COL.soft, 1.6),
    arrow(10, 186, 392, 186, COL.soft, 1.6),
    note(10, 146, 'storms', { fill: COL.soft }),
    area(150, 'target area', COL.subzero, 'seeded'),
    area(300, 'control area', '#ece8df', 'never seeded'),
    note(8, 214, 'The same storms cross both areas. Compare the target with the control.'),
  );
  return { node: d.node };
};

// ---- Did it work? -----------------------------------------------------------

export const trialFigure = figure(['clear'], (_ctx, t) => {
  const W = 400;
  const H = 292;
  const f = frame(W, H, 5);
  let winters = 1;
  let random = true;
  let draw = 0; // which run of winters: "new winters" deals another
  let truth = false;
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), g);
  const x0 = 84;
  const x1 = 390;
  const xOf = (mm: number) => x0 + ((Math.log(mm) - Math.log(1.5)) / (Math.log(45) - Math.log(1.5))) * (x1 - x0);
  const rows = { seeded: 50, unseeded: 118 };
  // The number line for the result: how many times the snow, 0.5 to 2.5.
  const r0 = 84;
  const r1 = 390;
  const rOf = (v: number) => r0 + ((Math.min(2.5, Math.max(0.5, v)) - 0.5) / 2) * (r1 - r0);
  const paint = () => {
    // The same storms each time, so more winters only add to what was seen.
    const storms = runTrial(winters, random, (random ? 1 : 2) + draw * 10);
    const v = judge(storms);
    const jitter = makeRng(5);
    const dots = storms.map((s) => {
      const y = (s.seeded ? rows.seeded : rows.unseeded) + (jitter() - 0.5) * 44;
      return svg('circle', { cx: Math.max(x0, Math.min(x1, xOf(s.mm))), cy: y, r: winters > 12 ? 1.8 : 2.6, fill: s.seeded ? COL.ice : COL.soft, opacity: 0.6 });
    });
    const gm = (list: number[]) => Math.exp(list.map((m) => Math.log(m)).reduce((a, b) => a + b, 0) / Math.max(1, list.length));
    const seededMm = gm(storms.filter((s) => s.seeded).map((s) => s.mm));
    const otherMm = gm(storms.filter((s) => !s.seeded).map((s) => s.mm));
    const pickedNatural = gm(storms.filter((s) => s.seeded).map((s) => s.natural));
    const ry = 238;
    redraw(g,
      ...dots,
      line(xOf(seededMm), rows.seeded - 26, xOf(seededMm), rows.seeded + 26, COL.ice, 2.5),
      line(xOf(otherMm), rows.unseeded - 26, xOf(otherMm), rows.unseeded + 26, COL.ink, 2.5),
      !random ? line(xOf(pickedNatural), rows.seeded - 26, xOf(pickedNatural), rows.seeded + 26, COL.ice, 1.5, { 'stroke-dasharray': '3 3' }) : null,
      !random ? note(Math.min(x1 - 4, xOf(pickedNatural) - 4), rows.seeded + 38, 'dashed: the same storms, unseeded', { anchor: 'end', fill: COL.ice }) : null,
      label(6, rows.seeded + 4, random ? 'seeded' : 'picked,', { bold: true, fill: COL.ice }),
      !random ? label(6, rows.seeded + 17, 'seeded', { bold: true, fill: COL.ice }) : null,
      label(6, rows.unseeded + 4, 'not seeded', { bold: true, fill: COL.soft }),
      line(x0, 148, x1, 148, COL.ink, 1),
      ...[2, 5, 10, 20, 40].map((mm) => note(xOf(mm), 160, `${mm}`, { soft: true, anchor: 'middle' })),
      note(x0 - 6, 160, 'mm of water', { soft: true, anchor: 'end' }),
      note(x0, 14, `${storms.length} storms; each dot is one storm’s snow; the line is each group’s middle storm`, { soft: true }),
      // The verdict: how many times the snow, and the range luck allows.
      note(x0 - 6, ry + 4, 'seeded ÷', { bold: true, anchor: 'end' }),
      note(x0 - 6, ry + 16, 'not seeded', { bold: true, anchor: 'end' }),
      line(r0, ry + 14, r1, ry + 14, COL.ink, 1),
      ...[0.5, 1, 1.5, 2, 2.5].map((k) => note(rOf(k), ry + 27, `${k}×`, { soft: true, anchor: 'middle' })),
      line(rOf(1), ry - 22, rOf(1), ry + 14, COL.ink, 1.2, { 'stroke-dasharray': '3 3' }),
      note(rOf(1), ry - 26, 'no difference', { soft: true, anchor: 'middle' }),
      random ? svg('rect', { x: rOf(v.low), y: ry - 5, width: rOf(v.high) - rOf(v.low), height: 10, rx: 5, fill: v.low > 1 ? JUST_RIGHT : TOO_MUCH }) : null,
      random ? note(r1, ry - 26, 'bar: the range luck allows', { soft: true, anchor: 'end' }) : null,
      svg('circle', { cx: rOf(v.ratio), cy: ry, r: 4.5, fill: COL.ice }),
      v.ratio > 2.5 ? note(r1 - 8, ry - 8, `${v.ratio.toFixed(1)}× →`, { bold: true, anchor: 'end', fill: COL.ice }) : null,
      truth ? line(rOf(TRUE_EFFECT), ry - 22, rOf(TRUE_EFFECT), ry + 14, '#3f9b6a', 2.2) : null,
      truth ? note(rOf(TRUE_EFFECT) + 4, ry + 42, 'the truth: seeding adds 15%', { bold: true, fill: '#3f9b6a' }) : null,
    );
    const times = `${v.ratio.toFixed(2)} times`;
    const range = `Luck alone could have put it anywhere from ${v.low.toFixed(2)} to ${v.high.toFixed(2)} times.`;
    f.readout.textContent = !random
      ? `The picked storms brought ${times} the snow of the others. But unseeded, the same storms would still have brought ${(pickedNatural / otherMm).toFixed(2)} times as much: the seeder picked storms that were going to snow anyway. Most of the gap is the pick, not the dry ice.`
      : v.low > 1
        ? `Seeded storms brought ${times} the snow of the others. ${range} The whole range is above 1: after ${winters} winters, seeding has made a difference, and a small one.`
        : `Seeded storms brought ${times} the snow of the others. ${range} That range includes 1, “no difference”, so ${winters === 1 ? 'one winter' : `${winters} winters`} can’t tell.`;
    if (t.goal === 'clear' && random && v.low > 1) t.done();
  };
  const seg = el('div.seg', {}, ...[['Coin toss', true], ['Seeder’s pick', false]].map(([text, r]) => el('button', {
    type: 'button',
    className: r === random ? 'on' : '',
    onclick: (e: MouseEvent) => {
      random = r as boolean;
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget));
      paint();
    },
  }, text as string)));
  const buttons = el('div.chips', {},
    el('button.chip', { type: 'button', onclick: () => { draw++; paint(); } }, 'New winters'),
    el('button.chip', { type: 'button', onclick: (e: MouseEvent) => { truth = !truth; (e.currentTarget as HTMLElement).textContent = truth ? 'Hide the truth' : 'Show the true effect'; paint(); } }, 'Show the true effect'),
  );
  f.controls.append(
    slider('Winters', 1, 30, 1, winters, (v) => `${v} (${v * STORMS_PER_WINTER} storms)`, (v) => { winters = v; paint(); }, 'ice').node,
    el('label.fig-slider', {}, el('span', {}, 'Which storms are seeded'), seg),
    buttons,
  );
  paint();
  return f.node;
});
