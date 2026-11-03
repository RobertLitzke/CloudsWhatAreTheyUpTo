// Figures about measuring light: what the camera's meter does with a scene
// (it makes whatever it sees average out to mid-grey), the histogram that
// shows where an exposure put the picture's tones, and the shooting modes,
// which decide which dial the camera turns when the light changes.

import { el, svg } from 'didactics/dom';
import { label, line, note, redraw } from 'didactics/draw';
import { ISO_STEPS, P950, SHUTTER_STEPS, apertureLabel, exposureValue, fromEquivalent, shutterLabel, widestAperture } from '../../core/camera';
import { shoot } from '../../core/shot';
import { lightOf, histogram, METER_GREY, type Light } from '../photo/stats';
import { PHOTOS } from '../picture';
import { COL, apertureSlider, choices, figure, frame, isoSlider, shutterSlider, slider, tint, type Options } from './kit';
import { noPhoto, shotFrame } from './shot';

/** The nearest shutter time the camera offers. */
const nearestShutter = (t: number) => SHUTTER_STEPS.reduce((a, b) => (Math.abs(Math.log(b / t)) < Math.abs(Math.log(a / t)) ? b : a));

const stopsLabel = (s: number) => (Math.abs(s) < 0.05 ? '±0' : `${s > 0 ? '+' : '−'}${Math.abs(s).toFixed(1)}`);

/**
 * The meter, on a real photo. The camera measures the scene's average
 * brightness and sets the exposure that makes that average mid-grey: right
 * for a meadow, two stops dark for snow, a silhouette for a bird against the
 * sky. Exposure compensation tells it how far off its grey you want the
 * scene, and the histogram under the picture shows where the tones landed,
 * with anything pushed past white counted as clipped.
 */
export const meterFigure = figure<Options>(['right'], (_ctx, t, options) => {
  const photo = PHOTOS.find((p) => p.id === (options?.photo ?? 'snow-scene-01'));
  if (!photo?.scene) return noPhoto('snow').node;
  const scene = photo.scene;

  const f = shotFrame(photo, 4);
  const hist = svg('svg', { viewBox: '0 0 400 84', class: 'fig-svg meter-hist', role: 'img' }) as SVGSVGElement;
  const g = svg('g');
  hist.append(g);
  f.view.node.append(hist);

  let comp = 0;
  let light: Light | null = null;
  let touched = false;

  const paint = () => {
    const base = shoot(scene, { eqFocal: scene.eqFocal ?? 200 });
    // The meter makes the average mid-grey: this many stops from the photo as it was taken.
    const meter = light ? Math.log2(METER_GREY / Math.max(1e-4, light.mean)) : 0;
    const stops = meter + comp;
    const shutter = nearestShutter(base.shutter * 2 ** stops);
    const shot = { ...base, shutter, render: { ...base.render, exposure: 2 ** stops } };

    let clipped = 0;
    if (light) {
      const h = histogram(light, 2 ** stops, 50);
      clipped = h.clipped;
      const top = Math.max(...h.counts) || 1;
      redraw(
        g,
        svg('rect', { x: 20, y: 8, width: 360, height: 52, fill: tint(COL.ink, 0.06) }),
        ...h.counts.map((c, i) => svg('rect', {
          x: 20 + i * 7.2, y: 60 - (52 * c) / top, width: 6.6, height: (52 * c) / top,
          fill: i === h.counts.length - 1 && clipped > 0.005 ? COL.time : COL.soft,
        })),
        line(20 + 360 * 0.46, 6, 20 + 360 * 0.46, 62, COL.light, 1.2, { 'stroke-dasharray': '3 2' }),
        note(20, 76, 'black', { fill: COL.soft }),
        note(20 + 360 * 0.46, 76, 'mid-grey', { anchor: 'middle', fill: COL.light }),
        note(380, 76, clipped > 0.005 ? `${(clipped * 100).toFixed(0)}% clipped` : 'white', { anchor: 'end', fill: clipped > 0.005 ? COL.time : COL.soft }),
      );
    }

    // The photo as its photographer exposed it is stops = 0.
    const off = stops;
    const say = `The meter makes the scene's average mid-grey: here that is ${stopsLabel(meter)} stops. With ${stopsLabel(comp)} compensation, ` +
      (Math.abs(off) <= 0.5 ? 'right: whites are white, and the histogram reaches the right edge without piling up.'
        : off < 0 ? `${Math.abs(off).toFixed(1)} stops dark: the histogram stops short of the right edge, and white has gone grey.`
          : `${off.toFixed(1)} stops bright: ${(clipped * 100).toFixed(0)}% of the picture is pure white, and its detail is gone.`);
    f.paint(shot, say);
    f.view.caption.textContent += ` · ${stopsLabel(comp)} EV`;
    if (t.goal === 'right' && touched && Math.abs(off) <= 0.5) t.done();
  };

  f.controls.append(
    slider('Exposure compensation', { min: -3, max: 3, step: 1 / 3, value: 0, show: (v) => `${stopsLabel(v)} stops`, onInput: (v) => { comp = v; touched = true; paint(); }, color: 'light' }).node,
  );
  t.waitFor(f.view.ready.then((loaded) => { light = lightOf(loaded); paint(); }));
  paint();
  return f.node;
}, { options: (o) => (o?.photo === undefined || PHOTOS.some((p) => p.id === o.photo && p.scene) ? [] : [`no photo "${String(o?.photo)}"`]) });

const MODES = ['P', 'A', 'S', 'M'] as const;
type Mode = (typeof MODES)[number];
const MODE_SAYS: Record<Mode, string> = {
  P: 'Program: the camera picks aperture and shutter both.',
  A: 'Aperture priority: you pick the aperture, the camera picks the shutter.',
  S: 'Shutter priority: you pick the shutter, the camera picks the aperture.',
  M: 'Manual: you pick both, and the ISO; the camera only tells you if it agrees.',
};

/**
 * The modes as a question of who turns which dial. A cloud comes over (the
 * light slider): in A the camera lengthens the shutter, in S it opens the
 * aperture (until it can open no wider, and then the ISO climbs), in M
 * nothing moves and the picture goes dark. ISO is on auto except in M.
 */
export const modesFigure = figure(['follow'], (_ctx, t) => {
  const W = 400;
  const H = 170;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  const eqFocal = 1000;
  const focal = fromEquivalent(P950, eqFocal);
  const widest = widestAperture(P950, focal);

  let mode: Mode = 'A';
  let ev = 13;
  let n = 6.3;
  let shutterSet = 1 / 500;
  let isoSet = 400;
  const seen = new Set<number>();

  const dial = (x: number, name: string, value: string, mine: boolean, color: string) => [
    svg('circle', { cx: x, cy: 66, r: 34, fill: mine ? tint(color, 0.18) : tint(COL.ink, 0.05), stroke: color, 'stroke-width': mine ? 2.4 : 1.2 }),
    label(x, 70, value, { anchor: 'middle', bold: true, fill: color }),
    note(x, 116, name, { anchor: 'middle', fill: color }),
    note(x, 132, mine ? 'you set it' : 'camera sets it', { anchor: 'middle', fill: mine ? COL.ink : COL.soft }),
  ];

  const paint = () => {
    // What each mode settles on for this light, with auto ISO from 100 to 1600 where it is the camera's.
    let N = n;
    let T = shutterSet;
    let iso = 100;
    const needT = (N: number, iso: number) => (N * N) / 2 ** (ev + Math.log2(iso / 100));
    if (mode === 'P') {
      N = widest;
      T = 1 / 500;
      iso = Math.min(1600, Math.max(100, 100 * 2 ** (Math.log2((N * N) / T) - ev)));
      T = needT(N, iso);
    } else if (mode === 'A') {
      iso = 100;
      T = needT(N, iso);
      if (T > 1 / 125) { iso = Math.min(1600, 100 * (T * 125)); T = needT(N, iso); }
    } else if (mode === 'S') {
      iso = 100;
      N = Math.min(8, Math.max(widest, Math.sqrt(T * 2 ** ev)));
      const need = Math.log2((N * N) / T) - ev; // stops the aperture could not make up
      if (need > 0.05) iso = Math.min(1600, 100 * 2 ** need);
    } else {
      iso = isoSet;
    }
    T = nearestShutter(T);
    const off = ev - exposureValue(N, T, iso); // + bright
    const state = Math.abs(off) < 0.4 ? 'exposed right' : `${Math.abs(off).toFixed(1)} stops ${off > 0 ? 'bright' : 'dark'}`;
    redraw(
      g,
      ...dial(80, 'aperture', apertureLabel(N), mode === 'A' || mode === 'M', COL.aperture),
      ...dial(200, 'shutter', `${shutterLabel(T)}`, mode === 'S' || mode === 'M', COL.time),
      ...dial(320, 'ISO', String(ISO_STEPS.reduce((a, b) => (Math.abs(Math.log(b / iso)) < Math.abs(Math.log(a / iso)) ? b : a))), mode === 'M', COL.sensor),
      svg('rect', { x: 130, y: 146, width: 140, height: 20, rx: 10, fill: Math.abs(off) < 0.4 ? tint(COL.sharp, 0.2) : tint(COL.time, 0.2) }),
      note(200, 160, state, { anchor: 'middle', fill: Math.abs(off) < 0.4 ? COL.sharp : COL.time }),
    );
    f.readout.textContent = `${MODE_SAYS[mode]} ${ev >= 14 ? 'Full sun.' : ev >= 12 ? 'Thin cloud.' : ev >= 10 ? 'Heavy cloud.' : 'Dusk.'} ` +
      (mode === 'M' && Math.abs(off) >= 0.4 ? 'In manual the light changed and nothing followed it.' : '');
    seen.add(Math.round(ev));
    if (t.goal === 'follow' && mode !== 'P' && seen.size >= 3) t.done();
  };

  const aSlider = apertureSlider(n, (v) => { n = v; paint(); });
  const sSlider = shutterSlider(shutterSet, (v) => { shutterSet = v; paint(); });
  const iSlider = isoSlider(isoSet, (v) => { isoSet = v; paint(); });
  const show = () => {
    aSlider.node.style.display = mode === 'A' || mode === 'M' ? '' : 'none';
    sSlider.node.style.display = mode === 'S' || mode === 'M' ? '' : 'none';
    iSlider.node.style.display = mode === 'M' ? '' : 'none';
  };
  const pick = choices(MODES.map((m) => `${m}`), (i) => { mode = MODES[i]; show(); paint(); });
  f.controls.append(
    el('div.fig-row', {}, pick.node),
    slider('The light', { min: 9, max: 15, step: 0.5, value: ev, show: (v) => (v >= 14 ? 'full sun' : v >= 12 ? 'thin cloud' : v >= 10 ? 'heavy cloud' : 'dusk'), onInput: (v) => { ev = v; paint(); }, color: 'light' }).node,
    aSlider.node, sSlider.node, iSlider.node,
  );
  pick.pick(1);
  show();
  paint();
  return f.node;
});
