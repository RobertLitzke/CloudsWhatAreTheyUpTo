// The pictures a stage is built from: real ones from public/stage/<stage>/
// where they exist (listed in REAL below once they are added), drawn stand-ins
// (placeholder.ts) for the rest. A real picture's own proportions (of one copy,
// for a plane that repeats) replace the plane's height, keeping its bottom edge where the stage put it.

import type { Plane, Stage } from '../../core/stage';
import { asset } from '../asset';
import { placeholder } from './placeholder';
import type { Picture } from './render';

/**
 * The planes that have a real picture, by stage: `stage/<stage>/<plane>.webp`.
 * Empty until the pictures are made; every other plane is drawn.
 */
export const REAL: Record<string, readonly string[]> = {
  perched: [],
};

const cache = new Map<string, Promise<{ pictures: Map<string, Picture>; planes: Plane[] }>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

/** Every plane's picture, and the planes with their heights set from the pictures. Loaded once per stage. */
export function stagePictures(stage: Stage): Promise<{ pictures: Map<string, Picture>; planes: Plane[] }> {
  const got = cache.get(stage.id);
  if (got) return got;
  const job = (async () => {
    const pictures = new Map<string, Picture>();
    const planes: Plane[] = [];
    const real = new Set(REAL[stage.id] ?? []);
    for (const plane of stage.planes) {
      let pic: Picture | null = null;
      if (real.has(plane.id)) {
        try {
          pic = await loadImage(asset(`stage/${stage.id}/${plane.id}.webp`));
        } catch {
          pic = null;
        }
      }
      if (pic instanceof HTMLImageElement && pic.naturalWidth) {
        planes.push({ ...plane, height: ((plane.tile ?? plane.width) * pic.naturalHeight) / pic.naturalWidth });
      } else {
        pic = placeholder(plane.id, plane.height / (plane.tile ?? plane.width));
        planes.push(plane);
      }
      if (pic) pictures.set(plane.id, pic);
    }
    return { pictures, planes };
  })();
  cache.set(stage.id, job);
  return job;
}
