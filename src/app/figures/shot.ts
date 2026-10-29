// The frame a photograph figure is built in: the picture, one text box that
// says what the settings are doing to it, and the dials under it. It is
// Didactics' frame() around the photo's canvas rather than an SVG.
//
// Every figure that re-exposes a photograph goes through here, so they all
// look the same and all say their settings the same way.

import { el } from 'didactics/dom';
import type { Photo } from '../../core/photos';
import { settingsLine, type Shot } from '../../core/shot';
import { photoView, type PhotoView } from '../photo/view';
import { missing } from '../picture';
import { frame, type Task } from './kit';

export interface ShotFrame {
  node: HTMLElement;
  view: PhotoView;
  controls: HTMLElement;
  /** The live line under the picture: what these settings are doing. */
  readout: HTMLElement;
  /** Draw the shot and write its settings under the picture. */
  paint: (shot: Shot, say: string) => void;
  /**
   * Paint now, and again once the photo has loaded; the figure counts as
   * ready (Didactics' `t.waitFor`) once that second paint is on the canvas.
   */
  start: (t: Task, paint: () => void) => void;
}

/** One animation frame from now: the photo view draws on the next one. */
const nextFrame = () => new Promise<void>((done) => requestAnimationFrame(() => done()));

/** The figure's body for `photo`, with room for `lines` lines of readout. */
export function shotFrame(photo: Photo, lines = 3): ShotFrame {
  const view = photoView(photo);
  const f = frame({ drawing: view.node, lines });
  f.node.classList.add('shot-body');
  return {
    node: f.node,
    view,
    controls: f.controls,
    readout: f.readout,
    paint: (shot, say) => {
      view.show(shot.render);
      view.caption.textContent = settingsLine(shot);
      f.readout.textContent = say;
    },
    start: (t, paint) => {
      t.waitFor(view.ready.then(paint).then(nextFrame));
      paint();
    },
  };
}

/** What a figure shows when the library has no photograph it can re-expose yet. */
export function noPhoto(what: string): { node: HTMLElement } {
  return { node: el('div.fig-body', {}, missing(what)) };
}
