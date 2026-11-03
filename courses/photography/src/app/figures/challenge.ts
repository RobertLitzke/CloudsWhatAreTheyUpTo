// The challenge a lesson opens on: the picture the photographer has in mind,
// beside the one the camera's automatic gave instead (or two pictures meant to
// contrast). Both are drawn by the same renderers the live figures use, from
// settings written in the lesson, so the challenge is a real pair of shots the
// P950 could take and the reader can reproduce later in the lesson.
//
//   { "type": "diagram", "id": "challenge", "caption": "…", "options": {
//       "photo": "snow-scene-01",            // or "stage": "perched"
//       "panels": [
//         { "label": "What Auto gave", "eqFocal": 400, "stops": -1.2 },
//         { "label": "What you wanted", "eqFocal": 400 } ] } }
//
// A panel's settings are those of core/shot.ts (focal length, aperture,
// shutter, ISO, focus, white balance), plus `stops`, an exposure the camera
// got wrong by (a meter fooled by snow is −1.5), and for a stage `behind`,
// how far the movable plane stands behind the subject.

import { el } from 'didactics/dom';
import { P950, fromEquivalent, widestAperture } from '../../core/camera';
import { shoot, settingsLine, type Settings } from '../../core/shot';
import { BRAMBLE, MEADOW, MOONRISE, PERCHED, place, standFor, stepAside, type Stage } from '../../core/stage';
import { develop, loadPhoto } from '../photo/film';
import { PHOTOS, credit } from '../picture';
import { asset } from '../asset';
import { stagePictures } from '../stage/pictures';
import { stageRenderer } from '../stage/render';
import { shoulder } from './after';
import type { FigureContext, Options } from './kit';

export interface Panel extends Settings {
  label: string;
  /** Stops the exposure is off by, + brighter. */
  stops?: number;
  /** For a stage: metres the movable plane stands behind the subject. */
  behind?: number;
  /** For a stage: focus as a share of the subject's distance (1 on the subject). */
  focusRatio?: number;
  /** Shown as a RAW file brightened by `stops` would be: highlights eased into white rather than cut off. */
  raw?: boolean;
  /** A photo of its own, instead of the challenge's. */
  photo?: string;
  /** For a stage: metres the photographer has stepped to the right, still aimed at the subject. */
  step?: number;
  /** For a stage: metres the photographer stands from the subject, instead of where the framing puts them. */
  stand?: number;
}

export interface ChallengeOptions extends Options {
  photo?: string;
  stage?: string;
  panels: Panel[];
}

const STAGES: Record<string, Stage> = { perched: PERCHED, moonrise: MOONRISE, bramble: BRAMBLE, meadow: MEADOW };

/** Canvas size of one panel: the sensor's proportions. */
const W = 560;
const H = Math.round((W * P950.sensor.h) / P950.sensor.w);

export const challengeDiagram = Object.assign(function challengeDiagram(_ctx: FigureContext, _goal?: string, o?: Options): { node: HTMLElement; ready: Promise<void> } {
  const options = o as ChallengeOptions | undefined;
  const waits: Promise<unknown>[] = [];
  const t = { waitFor: (p: Promise<unknown>) => { waits.push(p.catch(() => undefined)); } };
  const panels = options?.panels ?? [];
  const stage = options?.stage ? STAGES[options.stage] : undefined;

  // A photo keeps its own proportions; a stage has the sensor's.
  const cells = panels.map((p) => {
    const own = !stage ? PHOTOS.find((x) => x.id === (p.photo ?? options?.photo)) : undefined;
    const h = own ? Math.round((W * own.height) / own.width) : H;
    const canvas = el('canvas.shot', { width: W, height: h, role: 'img', 'aria-label': p.label }) as HTMLCanvasElement;
    const settings = el('p.shot-settings');
    return { p, canvas, settings, node: el('figure.challenge-panel', {}, el('p.challenge-label', {}, p.label), canvas, settings) };
  });
  const grid = el('div.challenge', {}, ...cells.map((c) => c.node));
  const body = el('div.fig-body.challenge-body', {}, grid);

  if (stage) {
    t.waitFor(stagePictures(stage).then(({ pictures, planes }) => {
      for (const c of cells) {
        const focal = fromEquivalent(P950, c.p.eqFocal);
        const stand = c.p.stand ?? standFor(stage, focal);
        const n = Math.max(c.p.aperture ?? widestAperture(P950, focal), widestAperture(P950, focal));
        const placed = place(stepAside({ ...stage, planes }, c.p.step ?? 0, stand), { focal, n, stand, focusAt: stand * (c.p.focusRatio ?? 1), behind: c.p.behind });
        stageRenderer(c.canvas).draw(placed, pictures);
        c.settings.textContent = settingsLine(shoot({ subjectAt: stand, near: stand, far: null, ev: 12 }, { ...c.p, aperture: n, focusAt: stand }));
      }
    }));
  } else {
    // Each panel may have its own photo; by default the challenge's.
    const used = new Set<string>();
    for (const c of cells) {
      const pic = PHOTOS.find((p) => p.id === (c.p.photo ?? options?.photo));
      if (!pic?.scene) continue;
      const scene = pic.scene;
      used.add(pic.id);
      t.waitFor(loadPhoto(pic, asset).then((loaded) => {
        const shot = shoot(scene, c.p);
        const gain = 2 ** (c.p.stops ?? 0);
        develop(c.canvas, loaded, { ...shot.render, exposure: shot.render.exposure * (c.p.raw ? 1 : gain) });
        if (c.p.raw) easeHighlights(c.canvas, gain);
        c.settings.textContent = settingsLine(shot);
      }));
    }
    const credits = [...used].map((id) => PHOTOS.find((p) => p.id === id)!).map((p) => el('p.challenge-credit', {}, credit(p)));
    body.append(...credits);
  }
  return { node: body, ready: Promise.all(waits).then(() => undefined) };
}, { options: challengeOptions });

function challengeOptions(o: Options | undefined): string[] {
  const c = o as ChallengeOptions | undefined;
  const out: string[] = [];
  if (!c?.panels?.length) out.push('a challenge needs panels');
  if (c?.stage && !STAGES[c.stage]) out.push(`no stage "${c.stage}"`);
  if (c?.photo && !PHOTOS.some((p) => p.id === c.photo && p.scene)) out.push(`no photo "${c.photo}" with a scene`);
  if (!c?.stage && !c?.photo && !(c?.panels ?? []).every((p) => p.photo)) out.push('a challenge needs a photo or a stage');
  for (const p of c?.panels ?? []) if (p.photo && !PHOTOS.some((x) => x.id === p.photo && x.scene)) out.push(`no photo "${p.photo}" with a scene`);
  for (const p of c?.panels ?? []) if (!(p.eqFocal > 0)) out.push(`panel "${p.label}" needs eqFocal`);
  return out;
}

/** Brighten a developed picture by `gain` the way a raw converter would, easing highlights into white. */
function easeHighlights(canvas: HTMLCanvasElement, gain: number): void {
  const g = canvas.getContext('2d', { willReadFrequently: true });
  if (!g) return;
  const img = g.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const out = (c: number) => Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055));
  for (let p = 0; p < d.length; p += 4) for (let k = 0; k < 3; k++) d[p + k] = out(Math.min(1, shoulder(lin(d[p + k]) * gain)));
  g.putImageData(img, 0, 0);
}
