// Three ways to draw real-looking clouds, side by side on the same sky, with
// today's drawn clouds for comparison: `npm run dev`, then open
// /cloudlab.html. Dev only, like figures.html. ?only=<renderer>&time=<day|dusk>.

import '../../src/app/styles/app.css';
import { el } from '../../src/app/dom';
import { placeCloud } from '../../src/app/scene/drawn';
import { makeScene, type TimeOfDay } from '../../src/app/scene/landscape';
import { paintClouds } from './paint';
import { SUN, testSky } from './scene';
import { softClouds } from './soft';
import { marchClouds } from './volume';

type Renderer = (time: TimeOfDay) => { node: SVGElement; ms: number };

const today: Renderer = (time) => {
  const t0 = performance.now();
  const p = makeScene({ time }).palette;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.append(
    placeCloud('cirrus', p, 120, 52, 1.1, 3),
    placeCloud('altocumulus', p, 284, 118, 1.2, 5),
    placeCloud('cumulus', p, 232, 182, 0.4, 11),
    placeCloud('cumulus', p, 306, 180, 0.75, 7),
    placeCloud('cumulus', p, 118, 176, 1.5, 2),
  );
  return { node: g, ms: performance.now() - t0 };
};

const RENDERERS: Record<string, [string, Renderer]> = {
  today: ['Today: flat drawn puffs', today],
  soft: ['A: soft SVG filters', (time) => softClouds(testSky(), makeScene({ time }).palette)],
  paint: ['B: canvas density painter', (time) => paintClouds(testSky(), makeScene({ time }).palette)],
  volume: ['C: WebGL ray-marched volumes', (time) => marchClouds(testSky(), makeScene({ time }).palette)],
};

const q = new URLSearchParams(location.search);
const only = q.get('only');
const times: TimeOfDay[] = q.get('time') ? [q.get('time') as TimeOfDay] : ['day', 'dusk'];
const app = document.getElementById('app')!;
for (const [id, [title, render]] of Object.entries(RENDERERS)) {
  if (only && only !== id) continue;
  for (const time of times) {
    const scene = makeScene({ time, sun: [SUN[0] / 400, SUN[1] / 260] });
    const { node, ms } = render(time);
    scene.sky.append(node);
    app.append(el('figure.lab', { dataset: { id, time } }, scene.root, el('figcaption', {}, `${title} · ${time} · ${ms.toFixed(0)} ms`)));
  }
}
