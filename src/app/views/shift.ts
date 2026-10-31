// What Clouds adds to a lesson (Didactics' lesson view, which main.ts sets up
// through defineCourse): its sky over the fields at the top, the clouds it
// introduces under the lede, and Walla Walla on the radio: a short opening as
// the lesson starts, and a few lines typed around the check.

import { el } from 'didactics/dom';
import { genus } from '../../core/clouds';
import type { Shift } from '../../core/shifts';
import { radioFor, STATIONS } from '../../core/talk';
import { clearRadio, playTalk } from '../radio';
import { addToSky, placeCloud, SKY_SPOTS } from '../scene/drawn';
import { makeScene, W } from '../scene/landscape';

/** The sky over the fields, with the clouds this lesson is about. */
function hero(shift: Shift): Node {
  const scene = makeScene({ time: shift.n % 2 ? 'dawn' : 'day', seed: 10 + shift.n, sun: [0.78, 0.62] });
  const xs = shift.sky.length === 1 ? [W * 0.55] : shift.sky.map((_, i) => 70 + (i * (W - 140)) / (shift.sky.length - 1));
  shift.sky.forEach((id, i) => {
    const spot = SKY_SPOTS[id];
    addToSky(scene.sky, placeCloud(id, scene.palette, xs[i], spot.y, spot.scale, i + shift.n));
  });
  return scene.root;
}

export const shiftOptions = {
  hero,
  intro: (shift: Shift) => (shift.clouds.length ? el('ul.meet', {}, shift.clouds.map((id) => el('li', {}, genus(id).name))) : null),
  radio: { talks: (id: string) => radioFor(id).talks, play: playTalk, clear: clearRadio, them: STATIONS.them },
};
