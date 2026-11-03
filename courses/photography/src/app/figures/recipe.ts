// The course's capstone figure: set every dial for a bird, and the camera
// scores the shot on what matters (exposure, grain, shake, the bird's own
// movement, and whether focus is set for a still or a moving subject in
// clutter or open sky). Two situations, a perched bird in shade and a bird
// flying overhead in sun, want two different recipes.

import { el, svg } from 'didactics/dom';
import { label, note, redraw } from 'didactics/draw';
import {
  APERTURE_STEPS, P950, SHUTTER_STEPS, apertureLabel, fromEquivalent, isoFor, motionBlur, safeShutter, shutterLabel, widestAperture,
} from '../../core/camera';
import { COL, choices, figure, frame, slider, tint } from './kit';

interface Situation {
  name: string;
  /** The light, as an exposure value. */
  ev: number;
  /** Metres away, metres a second, equivalent mm. */
  at: number;
  speed: number;
  eqFocal: number;
  /** Twigs and leaves around it, which a big focus area would grab. */
  clutter: boolean;
}

export const SITUATIONS: readonly Situation[] = [
  { name: 'Perched in shade', ev: 10, at: 10, speed: 0, eqFocal: 1000, clutter: true },
  { name: 'Flying overhead', ev: 14, at: 40, speed: 12, eqFocal: 600, clutter: false },
];

const FOCUS = ['Single', 'Continuous'] as const;
const AREA = ['Spot', 'Centre', 'Wide'] as const;

export interface Recipe {
  shutter: number;
  aperture: number;
  focus: (typeof FOCUS)[number];
  area: (typeof AREA)[number];
}

export interface Check { name: string; ok: boolean; say: string }

/** The shot these settings make of this bird, as the checks a photographer would make of it. Auto ISO, 100 to 6400. */
export function score(s: Situation, r: Recipe): Check[] {
  const focal = fromEquivalent(P950, s.eqFocal);
  const n = Math.max(r.aperture, widestAperture(P950, focal));
  const want = isoFor(s.ev, n, r.shutter);
  const iso = Math.min(P950.iso.max, Math.max(P950.iso.min, want));
  const off = Math.log2(iso / want); // + bright
  const smear = motionBlur(s.eqFocal, s.speed, s.at, r.shutter); // frame widths
  const safe = safeShutter(s.eqFocal, true);
  const moving = s.speed > 0;
  return [
    { name: 'Exposure', ok: Math.abs(off) < 0.4, say: Math.abs(off) < 0.4 ? 'right' : `${Math.abs(off).toFixed(1)} stops ${off > 0 ? 'bright' : 'dark'}` },
    { name: 'Grain', ok: iso <= 3200, say: `ISO ${Math.round(iso / 10) * 10}${iso > 3200 ? ', too grainy' : iso > 1600 ? ', some grain' : ''}` },
    { name: 'Your shake', ok: r.shutter <= safe * 1.05, say: r.shutter <= safe * 1.05 ? 'held' : `needs ${shutterLabel(safe)} s or faster` },
    { name: 'Its movement', ok: smear < 0.003, say: moving ? (smear < 0.003 ? 'frozen' : `smears ${(smear * 100).toFixed(1)}% of the frame`) : 'still' },
    { name: 'Focus mode', ok: moving ? r.focus === 'Continuous' : true, say: moving ? (r.focus === 'Continuous' ? 'follows it' : 'locks on one distance') : `${r.focus.toLowerCase()} is fine` },
    { name: 'Focus area', ok: s.clutter ? r.area === 'Spot' : r.area !== 'Spot', say: s.clutter ? (r.area === 'Spot' ? 'on the bird' : 'may take a twig') : (r.area === 'Spot' ? 'too small to keep on it' : 'easy to keep on it') },
  ];
}

export const recipeFigure = figure(['both'], (_ctx, t) => {
  const W = 400;
  const H = 200;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let which = 0;
  const recipes: Recipe[] = SITUATIONS.map(() => ({ shutter: 1 / 1000, aperture: 5.6, focus: 'Single', area: 'Wide' }));
  const solved = new Set<number>();

  const shutters = SHUTTER_STEPS.filter((x) => x >= 1 / 4000 && x <= 1 / 15);
  const shutterSlider = slider('Shutter', { steps: shutters, value: 1 / 1000, show: (v) => `${shutterLabel(v)} s`, onInput: (v) => { recipes[which].shutter = v; paint(); }, color: 'time' });
  const apertureSlider = slider('Aperture', { steps: APERTURE_STEPS, value: 5.6, show: apertureLabel, onInput: (v) => { recipes[which].aperture = v; paint(); }, color: 'aperture' });
  const focusPick = choices(FOCUS.map((x) => `${x} AF`), (i) => { recipes[which].focus = FOCUS[i]; paint(); });
  const areaPick = choices(AREA.map((x) => `${x} area`), (i) => { recipes[which].area = AREA[i]; paint(); });

  const paint = () => {
    const s = SITUATIONS[which];
    const checks = score(s, recipes[which]);
    const all = checks.every((c) => c.ok);
    if (all) solved.add(which);
    redraw(
      g,
      label(12, 22, `${s.name}: ${s.eqFocal} mm, ${s.at} m away`, { bold: true, fill: COL.ink }),
      ...checks.flatMap((c, i) => {
        const y = 46 + i * 24;
        return [
          svg('rect', { x: 10, y: y - 14, width: 380, height: 20, rx: 4, fill: c.ok ? tint(COL.sharp, 0.12) : tint(COL.time, 0.12) }),
          label(20, y, c.ok ? '✓' : '✗', { bold: true, fill: c.ok ? COL.sharp : COL.time }),
          note(40, y, c.name, { fill: COL.ink }),
          note(160, y, c.say, { fill: c.ok ? COL.soft : COL.time }),
        ];
      }),
    );
    f.readout.textContent = all
      ? `Every check passes for ${s.name.toLowerCase()}.${solved.size < SITUATIONS.length ? ' Now the other bird.' : ' Both recipes work.'}`
      : `Fix what is red. ${s.speed ? 'This bird is moving: think about the shutter and the focus mode first.' : 'This bird is still: think about light and steadiness first.'}`;
    if (t.goal === 'both' && solved.size === SITUATIONS.length) t.done();
  };

  const situationPick = choices(SITUATIONS.map((s) => s.name), (i) => {
    which = i;
    const r = recipes[i];
    // Show this bird's own recipe on the dials.
    shutterSlider.set(r.shutter);
    apertureSlider.set(r.aperture);
    focusPick.pick(FOCUS.indexOf(r.focus));
    areaPick.pick(AREA.indexOf(r.area));
    paint();
  });
  f.controls.append(
    el('div.fig-row', {}, situationPick.node),
    shutterSlider.node,
    apertureSlider.node,
    el('div.fig-row', {}, focusPick.node),
    el('div.fig-row', {}, areaPick.node),
  );
  situationPick.pick(0);
  solved.clear();
  paint();
  return f.node;
});
