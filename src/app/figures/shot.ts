// The frame a photograph figure is built in: the picture, one text box that
// says what the settings are doing to it, and the dials under it. It is
// lesson-kit's frame() with a canvas in place of the drawing.
//
// Every figure that re-exposes a photograph goes through here, so they all
// look the same and all say their settings the same way.

import { el } from 'lesson-kit/dom';
import type { Photo } from '../../core/photos';
import { settingsLine, type Shot } from '../../core/shot';
import { photoView, type PhotoView } from '../photo/view';
import { missing } from '../picture';
import { textBox } from './kit';

export interface ShotFrame {
  node: HTMLElement;
  view: PhotoView;
  controls: HTMLElement;
  /** The live line under the picture: what these settings are doing. */
  readout: HTMLElement;
  /** Draw the shot and write its settings under the picture. */
  paint: (shot: Shot, say: string) => void;
}

/** The figure's body for `photo`, with room for `lines` lines of readout. */
export function shotFrame(photo: Photo, lines = 3): ShotFrame {
  const view = photoView(photo);
  const readout = el('p.fig-readout');
  const controls = el('div.fig-controls');
  return {
    node: el('div.fig-body.shot-body', {}, view.node, textBox(readout, lines), controls),
    view,
    controls,
    readout,
    paint: (shot, say) => {
      view.show(shot.render);
      view.caption.textContent = settingsLine(shot);
      readout.textContent = say;
    },
  };
}

/** What a figure shows when the library has no photograph it can re-expose yet. */
export function noPhoto(what: string): { node: HTMLElement } {
  return { node: el('div.fig-body', {}, missing(what)) };
}
