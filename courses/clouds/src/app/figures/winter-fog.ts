// Figures for a winter basin under fog: the cold pool a run of calm nights
// builds and the wind that clears it, which fog a surface and the air over it
// make, rime on a fence, and what falls through a warm layer aloft onto a cold
// one at the ground.

import { el, svg } from 'didactics/dom';
import { fallThrough, fogKind, meltShare, poolDay, stirDepth, type Fall, type FogKind } from '../../core/winter-fog';
import { arrow, crystal, label, line, note, points, polyline, redraw, small, still, type P } from './draw';
import { COL, choices, deg, figure, frame, height, lock, lockIn, slider, tint, type FigureFactory } from './kit';

const WATER = '#9cc3dc';

// ---- The cold pool --------------------------------------------------------------------------

const POOL_GUESSES = ['A sunny afternoon', 'An even colder, clearer night', 'A strong wind from a passing storm'] as const;
const POOL_RIGHT = 2;

export const coldPoolFigure = figure(['scour'], (ctx, t) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H, 3);
  const floor = 214;
  const yOf = (m: number) => floor - m * 0.17;
  // The basin floor is flat for 120 px in the middle; the slopes climb to ridges 1,000 m up.
  const groundM = (x: number) => 1000 * Math.min(1, Math.max(0, (Math.abs(x - 200) - 60) / 140) ** 1.5);
  const terrain: P[] = [];
  for (let x = 0; x <= W; x += 5) terrain.push([x, yOf(groundM(x))]);
  const g = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.sky }), g);
  let nights = 10;
  let wind = 0;
  const paint = () => {
    const day = poolDay(nights, wind);
    const top = yOf(day.depthM);
    const stir = Math.min(day.depthM, stirDepth(wind));
    redraw(g,
      svg('circle', { cx: 350, cy: 30, r: 13, fill: COL.sun }),
      // The cold pool: grey cloud along its top when it is grey all day, clear but cold when it burns off.
      day.scoured ? null : svg('rect', { x: 0, y: top, width: W, height: floor - top, fill: day.grey ? tint(COL.cold, 0.35) : tint(COL.cold, 0.2) }),
      day.grey ? svg('rect', { x: 0, y: top, width: W, height: Math.min(floor - top, 46), fill: COL.cloudShade, opacity: 0.9 }) : null,
      day.grey ? svg('rect', { x: 0, y: top + 46, width: W, height: Math.max(0, floor - top - 46), fill: COL.fog, opacity: 0.55 }) : null,
      day.scoured ? null : line(0, top, W, top, COL.warmInk, 1.5, { 'stroke-dasharray': '5 3' }),
      wind > 0 && !day.scoured ? svg('rect', { x: 0, y: yOf(stir), width: W, height: floor - yOf(stir), fill: 'none', stroke: COL.ink, 'stroke-dasharray': '2 3' }) : null,
      svg('polygon', { points: points([...terrain, [W, H], [0, H]]), fill: COL.field }),
      // A farm on the basin floor.
      svg('rect', { x: 186, y: floor - 12, width: 16, height: 12, fill: '#f6e7c8', stroke: COL.ink }),
      svg('polygon', { points: points([[183, floor - 12], [194, floor - 20], [205, floor - 12]]), fill: COL.red }),
      day.scoured ? null : small(W / 2, top - 5, `the lid, ${height(day.depthM, ctx.save.units)} up: milder air above`, { anchor: 'middle', fill: COL.warmInk, bold: true, halo: COL.sky }),
      small(W - 8, 64, `on the ridge: ${deg(day.ridgeC)}, sunny`, { anchor: 'end', bold: true, fill: COL.sunInk }),
      label(212, floor - 3, deg(day.floorC), { bold: true, fill: day.grey ? COL.coldInk : COL.ink, halo: day.grey ? COL.stratus : COL.sky }),
      ...(wind > 0 ? [arrow(14, 26, 14 + 24 + wind * 1.4, 26, COL.ink, 1.5 + wind / 20), small(14, 18, `wind ${wind} km/h`, { bold: true })] : []),
    );
    if (asking) {
      f.readout.textContent = `Ten calm, clear nights under a high. The basin is full of grey, ${height(day.depthM, ctx.save.units)} deep, ${deg(day.floorC)} at noon, while the ridges above are in sunshine at ${deg(day.ridgeC)}. What will clear it?`;
      return;
    }
    const verdict = pick.picked() < 0 || !day.scoured || nights < 5 ? '' : pick.picked() === POOL_RIGHT ? 'As you guessed. ' : 'Not what you guessed. ';
    const nightsSaid = nights === 1 ? 'One calm night' : `${nights} calm nights`;
    f.readout.textContent = verdict + (day.scoured
      ? `The wind stirs the air ${height(stirDepth(wind), ctx.save.units)} deep, deeper than the cold pool: the cold air is mixed up into the mild air above, and the basin clears.`
      : day.burnsOff
        ? `${nightsSaid}: a shallow pool and a thin fog by morning. Even January’s weak sun heats through that by early afternoon.`
        : `${nightsSaid}: cold air ${height(day.depthM, ctx.save.units)} deep under the lid, with grey cloud along its top. The weak January sun cannot heat through it, so the basin stays cold all day, and colder nights only feed it.${wind > 0 ? ` A ${wind} km/h wind stirs only the bottom ${height(stir, ctx.save.units)}.` : ''}`);
    if (t.goal === 'scour' && nights >= 5 && day.scoured) t.done();
  };
  let asking = t.goal === 'scour';
  const nightsS = slider('Calm nights in a row', 1, 14, 1, nights, (v) => (v === 1 ? '1 night' : `${v} nights`), (v) => { nights = v; paint(); }, 'ice');
  const windS = slider('Wind', 0, 50, 1, wind, (v) => (v === 0 ? 'calm' : `${v} km/h`), (v) => { wind = v; paint(); }, 'ink');
  const pick = choices(POOL_GUESSES, () => (markIt.disabled = false));
  const markIt = lockIn('Try them', () => {
    asking = false;
    t.keep(pick.picked());
    pick.freeze(true);
    markIt.hidden = true;
    lock([nightsS, windS], false);
    paint();
  });
  markIt.disabled = true;
  if (asking) f.controls.append(el('div.fig-guess', {}, pick.node, markIt));
  f.controls.append(nightsS.node, windS.node);
  lock([nightsS, windS], asking);
  if (asking && typeof t.kept === 'number' && POOL_GUESSES[t.kept]) {
    pick.pick(t.kept);
    markIt.click();
  }
  paint();
  return f.node;
});

// ---- Which fog --------------------------------------------------------------------------------

const FOG_SAY: Record<FogKind, string> = {
  none: '',
  shallow: 'Still air: only the air touching the cold surface chills to its dew point. Dew or frost, and a fog a few metres deep, like Lesson 1’s night fog.',
  advection: 'A breeze carries the damp air over the colder surface and stirs the chill up through a deep layer: advection fog, tens to hundreds of metres deep. Sea fog on a cold coast, or fog over melting snow.',
  stratus: 'A strong wind stirs the chilled air so high that the cloud lifts off the surface: a low grey deck of stratus, not fog.',
  steam: 'Water much warmer than the air evaporates into air too cold to hold the vapour, and it condenses at once, like breath on a cold morning: steam fog.',
};

export const fogMakerFigure = figure(['steam'], (_ctx, t) => {
  const W = 400;
  const H = 200;
  const f = frame(W, H, 3);
  const surfaceY = 168;
  const g = svg('g');
  f.svg.append(g);
  let surfaceC = 4;
  let airC = 10;
  let wind = 0;
  let water = 0;
  let sawChill = false;
  const paint = () => {
    const kind = fogKind(surfaceC, airC, wind, water === 1);
    if (kind === 'advection') sawChill = true;
    const freezing = kind !== 'none' && kind !== 'steam' && surfaceC < 0;
    const wisps: SVGElement[] = [];
    if (kind === 'steam') {
      for (let i = 0; i < 9; i++) {
        const x = 30 + i * 42 + (wind > 0 ? 0 : 0);
        const pts: P[] = [];
        for (let k = 0; k <= 10; k++) pts.push([x + Math.sin(k * 0.9 + i) * 6 + k * wind * 0.5, surfaceY - k * 7]);
        wisps.push(polyline(pts, '#ffffff', 5, { opacity: 0.85 }));
      }
    }
    redraw(g,
      svg('rect', { x: 0, y: 0, width: W, height: surfaceY, fill: COL.sky }),
      kind === 'shallow' ? svg('rect', { x: 0, y: surfaceY - 16, width: W, height: 16, fill: COL.fog, opacity: 0.95 }) : null,
      kind === 'advection' ? svg('rect', { x: 0, y: surfaceY - 110, width: W, height: 110, fill: COL.fog, opacity: 0.95 }) : null,
      kind === 'stratus' ? svg('rect', { x: 0, y: 40, width: W, height: 60, fill: COL.stratus }) : null,
      ...wisps,
      svg('rect', { x: 0, y: surfaceY, width: W, height: H - surfaceY, fill: water ? WATER : COL.field }),
      small(10, surfaceY + 20, `${water ? 'water' : 'ground'}: ${deg(surfaceC)}`, { bold: true, fill: '#fff' }),
      small(W - 10, 22, `damp air: ${deg(airC)}, dew point ${deg(airC - 1)}`, { anchor: 'end', bold: true }),
      ...(wind > 0 ? [arrow(14, 40, 14 + 24 + wind * 1.4, 40, COL.ink, 1.5 + wind / 20), small(14, 32, `wind ${wind} km/h`, { bold: true })] : [small(14, 32, 'still air', { bold: true })]),
      kind === 'none' ? null : note(W / 2, kind === 'stratus' ? 76 : surfaceY - (kind === 'advection' ? 56 : kind === 'shallow' ? 24 : 80), freezing ? `freezing ${kind === 'stratus' ? 'stratus' : 'fog'}` : kind === 'stratus' ? 'stratus' : kind === 'steam' ? 'steam fog' : 'fog', { anchor: 'middle', bold: true, fill: COL.ink }),
    );
    let say = FOG_SAY[kind];
    if (kind === 'none') {
      if (!water && surfaceC - airC >= 8) say = 'Ground much warmer than the air. Over water this would steam, but dry ground has no water to give it.';
      else if (water && surfaceC - airC >= 8) say = 'The water steams, but the wind tears the steam away as fast as it forms.';
      else say = `The surface is no colder than the air’s dew point, ${deg(airC - 1)}, so nothing chills the air to saturation: no fog.`;
    }
    if (freezing) say += ' Below freezing: its droplets stay liquid until they touch something, and coat it in rime.';
    f.readout.textContent = say;
    if (t.goal === 'steam' && sawChill && kind === 'steam') t.done();
  };
  const surfaceS = slider('Surface temperature', -10, 20, 1, surfaceC, deg, (v) => { surfaceC = v; paint(); }, 'ice');
  const airS = slider('Air temperature', -15, 20, 1, airC, deg, (v) => { airC = v; paint(); }, 'parcel');
  const windS = slider('Wind', 0, 40, 1, wind, (v) => (v === 0 ? 'still' : `${v} km/h`), (v) => { wind = v; paint(); }, 'ink');
  const kind = choices(['Ground', 'Water'], (i) => { water = i; paint(); });
  f.controls.append(el('div.fig-guess', {}, kind.node), surfaceS.node, airS.node, windS.node);
  kind.pick(0);
  paint();
  return f.node;
});

// ---- Rime and frost ------------------------------------------------------------------------------

export const rimeDiagram: FigureFactory = () => {
  const W = 400;
  const H = 190;
  const d = still(W, H);
  const feathers: SVGElement[] = [];
  // Rime: feathers of ice on the windward side of a fence wire, growing into the wind.
  for (let i = 0; i < 14; i++) {
    const x = 30 + i * 11;
    const len = 20 + (i % 3) * 7;
    const tip = 96 + ((i % 5) - 2) * 7;
    feathers.push(svg('polygon', { points: points([[x, 91], [x - len, tip], [x, 101]]), fill: '#ffffff', stroke: '#c9cfdd', 'stroke-width': 0.8 }));
  }
  const frost: SVGElement[] = [];
  for (let i = 0; i < 8; i++) frost.push(crystal(240 + i * 19, 96 + (i % 2 ? -9 : 9), 6));
  d.svg.append(
    svg('rect', { x: 0, y: 0, width: 200, height: H, fill: COL.stratus }),
    svg('rect', { x: 200, y: 0, width: 200, height: H, fill: '#2f3a63' }),
    ...[0, 1, 2, 3, 4].map((i) => svg('circle', { cx: 230 + i * 37, cy: 20 + (i % 2) * 14, r: 1.4, fill: '#fff' })),
    line(10, 96, 190, 96, COL.ink, 2),
    ...feathers,
    arrow(120, 40, 60, 40, COL.ink, 2),
    small(124, 44, 'wind and fog', { bold: true }),
    line(210, 96, 390, 96, '#e9e3f3', 2),
    ...frost,
    note(100, 150, 'Rime', { anchor: 'middle', bold: true }),
    small(100, 168, 'fog droplets freeze where they hit:', { anchor: 'middle' }),
    small(100, 182, 'feathers grow into the wind', { anchor: 'middle' }),
    note(300, 150, 'Hoar frost', { anchor: 'middle', bold: true, fill: '#fff' }),
    small(300, 168, 'vapour turns straight to ice on a', { anchor: 'middle', fill: '#fff' }),
    small(300, 182, 'clear, still night: crystals all round', { anchor: 'middle', fill: '#fff' }),
  );
  return { node: d.node };
};

// ---- Through a warm layer ------------------------------------------------------------------

const FALL_GUESSES = ['Snow: it is below freezing at the ground', 'Rain that freezes on whatever it touches', 'Ordinary rain'] as const;
const FALL_RIGHT = 1;

const FALL_SAY: Record<Fall, string> = {
  snow: 'No air above freezing anywhere: the snow falls as snow all the way down.',
  'wet snow': 'The warm layer only softens the flakes, and with no cold layer below they land as wet, heavy snow.',
  rain: 'The snow melts in the warm layer and, with nothing below freezing under it, lands as rain.',
  sleet: 'The drops freeze again on the way down, into little pellets of clear ice that bounce off the ground: sleet, or ice pellets.',
  'freezing rain': 'The snow melts to rain in the warm layer, then falls through cold air too shallow to freeze it. The drops land supercooled and freeze the moment they touch a road, a wire or a branch: freezing rain, the glaze of an ice storm.',
};

export const iceLayersFigure = figure(['pellets'], (ctx, t) => {
  const W = 400;
  const H = 240;
  const f = frame(W, H, 3);
  const xOf = (c: number) => 150 + c * 14;
  const yOf = (m: number) => 220 - m * 0.065;
  const g = svg('g');
  f.svg.append(
    svg('rect', { x: 0, y: 0, width: W, height: 220, fill: COL.air }),
    svg('rect', { x: 0, y: 220, width: W, height: H - 220, fill: COL.field }),
    g,
    line(xOf(0), yOf(3000), xOf(0), 220, COL.ink, 1, { 'stroke-dasharray': '4 3' }),
    small(xOf(0) + 4, yOf(3000) + 10, '0 °C', { bold: true }),
    ...[-8, -4, 4, 8].map((c) => small(xOf(c), 234, deg(c), { anchor: 'middle', fill: '#fff' })),
  );
  let warm = 4;
  let cold = 400;
  const paint = () => {
    const coldM = cold;
    const prof: P[] = [];
    const nose = coldM + 600;
    const pts: [number, number][] = coldM >= 50 ? [[0, -4], [coldM, Math.min(0, warm)]] : [[0, warm]];
    pts.push([nose, warm], [nose + 600, warm - 4], [3000, warm - 4 - 6.5 * Math.max(0, 3000 - nose - 600) / 1000]);
    for (const [m, c] of pts) prof.push([xOf(c), yOf(m)]);
    const fall = fallThrough(warm, coldM);
    const melt = meltShare(warm);
    const px = 330;
    const midWarm = yOf(nose);
    const atGround: SVGElement = fall === 'snow' || fall === 'wet snow'
      ? crystal(px, 206, 6)
      : fall === 'sleet'
        ? svg('circle', { cx: px, cy: 208, r: 4, fill: '#ffffff', stroke: COL.ice, 'stroke-width': 1.5 })
        : svg('ellipse', { cx: px, cy: 208, rx: 3, ry: 4.5, fill: fall === 'freezing rain' ? COL.ice : COL.rain });
    redraw(g,
      warm > 0 ? svg('polygon', { points: points([[xOf(0), yOf(coldM)], ...prof.filter(([x]) => x > xOf(0)), [xOf(0), yOf(nose + 600 * (warm / (warm + 4)))]]), fill: tint(COL.warm, 0.35) }) : null,
      coldM >= 50 ? svg('rect', { x: 0, y: yOf(coldM), width: W, height: 220 - yOf(coldM), fill: tint(COL.cold, 0.25) }) : null,
      polyline(prof, COL.env, 2.5),
      coldM >= 50 ? small(160, yOf(coldM) + 14, `below freezing, ${height(coldM, ctx.save.units)} deep`, { fill: COL.coldInk, bold: true }) : null,
      small(8, midWarm - 4, warm > 0 ? `warm layer, up to ${deg(warm)}` : `never above freezing (${deg(warm)})`, { fill: warm > 0 ? COL.warmInk : COL.coldInk, bold: true }),
      crystal(px, yOf(2700), 7),
      melt > 0 ? (melt >= 1 ? svg('ellipse', { cx: px, cy: midWarm, rx: 3, ry: 4.5, fill: COL.rain }) : crystal(px, midWarm, 5)) : crystal(px, midWarm, 6),
      line(px, yOf(2700) + 12, px, midWarm - 10, COL.soft, 1, { 'stroke-dasharray': '2 3' }),
      line(px, midWarm + 10, px, 196, COL.soft, 1, { 'stroke-dasharray': '2 3' }),
      asking ? small(px + 12, 212, '?', { bold: true }) : small(px - 10, 212, fall, { anchor: 'end', bold: true, fill: COL.ink, halo: tint(COL.cold, 0.25) }),
      asking ? null : atGround,
    );
    if (asking) {
      f.readout.textContent = `Snow falls from a cloud 3 km up. On the way down it meets a warm layer up to ${deg(4)}, then cold air ${height(400, ctx.save.units)} deep at the ground, at ${deg(-4)}. What lands?`;
      return;
    }
    const verdict = pick.picked() < 0 || fall !== 'freezing rain' ? '' : pick.picked() === FALL_RIGHT ? 'As you guessed. ' : 'Not what you guessed. ';
    f.readout.textContent = verdict + FALL_SAY[fall];
    if (t.goal === 'pellets' && fall === 'sleet') t.done();
  };
  let asking = t.goal === 'pellets';
  const warmS = slider('Warmest air aloft', -3, 6, 0.5, warm, deg, (v) => { warm = v; paint(); }, 'parcel');
  const coldS = slider('Freezing layer at the ground', 0, 1500, 50, cold, (v) => (v === 0 ? 'none' : height(v, ctx.save.units)), (v) => { cold = v; paint(); }, 'ice');
  const pick = choices(FALL_GUESSES, () => (markIt.disabled = false));
  const markIt = lockIn('Let it fall', () => {
    asking = false;
    t.keep(pick.picked());
    pick.freeze(true);
    markIt.hidden = true;
    lock([warmS, coldS], false);
    paint();
  });
  markIt.disabled = true;
  if (asking) f.controls.append(el('div.fig-guess', {}, pick.node, markIt));
  f.controls.append(warmS.node, coldS.node);
  lock([warmS, coldS], asking);
  if (asking && typeof t.kept === 'number' && FALL_GUESSES[t.kept]) {
    pick.pick(t.kept);
    markIt.click();
  }
  paint();
  return f.node;
});
