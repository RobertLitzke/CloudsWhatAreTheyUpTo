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
import type { FigureContext, Options } from './kit';

export interface Panel extends Settings {
  label: string;
  /** Stops the exposure is off by, + brighter. */
  stops?: number;
  /** For a stage: metres the movable plane stands behind the subject. */
  behind?: number;
  /** For a stage: focus as a share of the subject's distance (1 on the subject). */
  focusRatio?: number;
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
  const photo = options?.photo ? PHOTOS.find((p) => p.id === options.photo) : undefined;

  // A photo keeps its own proportions; a stage has the sensor's.
  const h = photo && !stage ? Math.round((W * photo.height) / photo.width) : H;
  const cells = panels.map((p) => {
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
  } else if (photo?.scene) {
    const scene = photo.scene;
    t.waitFor(loadPhoto(photo, asset).then((loaded) => {
      for (const c of cells) {
        const shot = shoot(scene, c.p);
        const render = { ...shot.render, exposure: shot.render.exposure * 2 ** (c.p.stops ?? 0) };
        develop(c.canvas, loaded, render);
        c.settings.textContent = settingsLine(shot);
      }
    }));
    body.append(el('p.challenge-credit', {}, credit(photo)));
  }
  return { node: body, ready: Promise.all(waits).then(() => undefined) };
}, { options: challengeOptions });

function challengeOptions(o: Options | undefined): string[] {
  const c = o as ChallengeOptions | undefined;
  const out: string[] = [];
  if (!c?.panels?.length) out.push('a challenge needs panels');
  if (c?.stage && !STAGES[c.stage]) out.push(`no stage "${c.stage}"`);
  if (c?.photo && !PHOTOS.some((p) => p.id === c.photo && p.scene)) out.push(`no photo "${c.photo}" with a scene`);
  if (!c?.stage && !c?.photo) out.push('a challenge needs a photo or a stage');
  for (const p of c?.panels ?? []) if (!(p.eqFocal > 0)) out.push(`panel "${p.label}" needs eqFocal`);
  return out;
}
