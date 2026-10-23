// The three renderers bundled for a page that times them on the viewer's own
// device: window.cloudBench(id, host) draws the test sky into `host` and
// returns how long it took.

import { makeScene } from '../../src/app/scene/landscape';
import { marchClouds } from './volume';
import { paintClouds } from './paint';
import { softClouds } from './soft';
import { flatClouds } from './flat';
import { contourClouds } from './contour';
import { SUN, testSky } from './scene';

const RENDER = { soft: softClouds, paint: paintClouds, volume: marchClouds, flat: flatClouds, contour: contourClouds };

(window as unknown as { cloudBench: unknown }).cloudBench = async (id: keyof typeof RENDER, host: HTMLElement, scale: number): Promise<number> => {
  const scene = makeScene({ time: 'dusk', sun: [SUN[0] / 400, SUN[1] / 260] });
  scene.root.setAttribute('style', 'display:block;width:100%;height:auto');
  const t0 = performance.now();
  const { node } = id === 'soft' || id === 'flat' || id === 'contour' ? RENDER[id](testSky(), scene.palette) : RENDER[id](testSky(), scene.palette, scale);
  scene.sky.append(node);
  host.replaceChildren(scene.root);
  // Count the browser's own drawing too: wait until the next frame is painted.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return performance.now() - t0;
};
