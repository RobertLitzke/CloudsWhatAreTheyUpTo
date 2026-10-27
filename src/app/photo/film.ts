// Taking the shot: the part of the app that actually changes a photograph.
//
// A figure hands it a photo, its depth map and a Render from core/shot.ts, and
// it redraws the picture as that camera setting would have taken it. Nothing
// here decides what a setting does; it only carries it out.
//
//   crop      the lens zooms by showing less of the photo
//   focus     each slice of the scene is blurred by how far it is from the
//             focused distance, back to front, so near things blur over far
//   movement  the frame is smeared along one direction, and the subject a
//             little further, by drawing it again and again as it moved
//   light     exposure, white balance and noise, pixel by pixel
//
// The depth map says how far away each part of the picture is: white nearest,
// black farthest. Distances come back from it by inverse depth, which is how
// a camera sees the world (the near metre matters more than the far hundred).

import type { Render } from '../../core/shot';
import type { Photo } from '../../core/photos';

/** How many depth slices the focus pass uses. More is smoother and slower. */
const SLICES = 8;
/** How many copies a smear is drawn from. */
const SMEAR_STEPS = 12;

export interface Loaded {
  photo: Photo;
  image: HTMLImageElement;
  /** The depth map's grey values, one byte a pixel, and its size. */
  depth?: { data: Uint8ClampedArray; w: number; h: number };
}

const cache = new Map<string, Promise<Loaded>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

/** The photo and its depth map, loaded once and kept. `url` turns a file into a URL. */
export function loadPhoto(photo: Photo, url: (file: string) => string): Promise<Loaded> {
  const got = cache.get(photo.id);
  if (got) return got;
  const job = (async (): Promise<Loaded> => {
    const image = await loadImage(url(photo.file));
    if (!photo.depthFile) return { photo, image };
    const map = await loadImage(url(photo.depthFile));
    const c = document.createElement('canvas');
    c.width = map.naturalWidth || map.width;
    c.height = map.naturalHeight || map.height;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(map, 0, 0);
    const rgba = ctx.getImageData(0, 0, c.width, c.height).data;
    const data = new Uint8ClampedArray(c.width * c.height);
    for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4];
    return { photo, image, depth: { data, w: c.width, h: c.height } };
  })();
  cache.set(photo.id, job);
  return job;
}

/**
 * The distance, in metres, that a depth-map value of `v` (0 black and far, 1
 * white and near) stands for. Inverse depth, so that the map's steps are
 * spread the way a camera's blur is: `far` null means the horizon.
 */
export function distanceAt(v: number, near: number, far: number | null): number {
  const invNear = 1 / near;
  const invFar = far === null ? 0 : 1 / far;
  const inv = invFar + (invNear - invFar) * Math.min(1, Math.max(0, v));
  return inv <= 1e-6 ? Infinity : 1 / inv;
}

/** Which depth-map value a distance of `metres` is. */
export function valueAt(metres: number, near: number, far: number | null): number {
  const invNear = 1 / near;
  const invFar = far === null ? 0 : 1 / far;
  return Math.min(1, Math.max(0, (1 / metres - invFar) / (invNear - invFar)));
}

const scratch = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

/**
 * Draws `shot` of `loaded` into `target`. The canvas keeps its own size; the
 * photo is cropped to `render.crop` of its width about the middle and fitted
 * to it. `mirrored` flips the picture, never the credit.
 */
export function develop(target: HTMLCanvasElement, loaded: Loaded, render: Render, mirrored = false): void {
  const { image, photo } = loaded;
  const w = target.width;
  const h = target.height;
  const ctx = target.getContext('2d', { willReadFrequently: true })!;

  // What part of the photo the zoom shows, in the photo's own pixels.
  const srcW = image.naturalWidth * render.crop;
  const srcH = (srcW * h) / w;
  const srcX = (image.naturalWidth - srcW) / 2;
  const srcY = (image.naturalHeight - srcH) / 2;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  if (mirrored) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }

  const scene = photo.scene;
  const depth = loaded.depth;
  if (depth && scene) focusPass(ctx, image, depth, scene, render, { srcX, srcY, srcW, srcH, w, h });
  else {
    const flat = render.blurAt(scene?.subjectAt ?? 10) * w;
    ctx.filter = flat > 0.4 ? `blur(${flat.toFixed(2)}px)` : 'none';
    ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, w, h);
    ctx.filter = 'none';
  }
  ctx.restore();

  if (render.smear > 0.0008 && depth && scene) subjectSmearPass(target, ctx, depth, scene, render.smear * w);
  if (render.shake > 0.0008) smearPass(target, ctx, render.shake * w);
  lightPass(ctx, w, h, render);
}

interface Box {
  srcX: number;
  srcY: number;
  srcW: number;
  srcH: number;
  w: number;
  h: number;
}

/**
 * The focus pass: the picture is cut into slices by distance and each one is
 * blurred by what the lens would do to something that far away, then they are
 * laid down farthest first, so a blurred near thing spreads over what is
 * behind it, as it does in a real photograph.
 */
function focusPass(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  depth: NonNullable<Loaded['depth']>,
  scene: NonNullable<Photo['scene']>,
  render: Render,
  box: Box,
): void {
  const { w, h } = box;
  const layer = scratch(w, h);
  const lc = layer.getContext('2d')!;
  const mask = scratch(depth.w, depth.h);
  const mc = mask.getContext('2d')!;
  const maskData = mc.createImageData(depth.w, depth.h);

  // The crop in the depth map's own pixels, so the mask lines up with the view.
  const kx = depth.w / image.naturalWidth;
  const ky = depth.h / image.naturalHeight;

  // The slices are shifted so that one is centred on the distance the lens is
  // focused at; otherwise the subject is blurred as if it stood at the middle
  // of its slice, which at full zoom is metres out of focus. The end slices
  // run on to the ends of the map.
  let focused = 0;
  for (let v = 0; v <= 1; v += 1 / 256) {
    if (render.blurAt(distanceAt(v, scene.near, scene.far)) < render.blurAt(distanceAt(focused, scene.near, scene.far))) focused = v;
  }
  const shift = focused - (Math.floor(focused * SLICES) + 0.5) / SLICES;

  for (let i = 0; i < SLICES; i++) {
    const lo = i === 0 ? -1 : i / SLICES + shift;
    const hi = i === SLICES - 1 ? 2 : (i + 1) / SLICES + shift;
    const metres = distanceAt((i + 0.5) / SLICES + shift, scene.near, scene.far);
    const blur = render.blurAt(metres) * w;

    // The mask: full where this slice is, fading over one slice either side so
    // the joins do not show as bands.
    let any = false;
    for (let p = 0; p < depth.data.length; p++) {
      const v = depth.data[p] / 255;
      const a = v >= lo && v < hi ? 1 : Math.max(0, 1 - (SLICES * (v < lo ? lo - v : v - hi)) / 0.75);
      if (a > 0) any = true;
      maskData.data[p * 4 + 3] = Math.round(a * 255);
    }
    if (!any) continue;
    mc.putImageData(maskData, 0, 0);

    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.clearRect(0, 0, w, h);
    lc.filter = 'none';
    lc.globalCompositeOperation = 'source-over';
    lc.drawImage(image, box.srcX, box.srcY, box.srcW, box.srcH, 0, 0, w, h);
    lc.globalCompositeOperation = 'destination-in';
    lc.drawImage(mask, box.srcX * kx, box.srcY * ky, box.srcW * kx, box.srcH * ky, 0, 0, w, h);
    lc.globalCompositeOperation = 'source-over';

    ctx.filter = blur > 0.4 ? `blur(${blur.toFixed(2)}px)` : 'none';
    ctx.drawImage(layer, 0, 0);
    ctx.filter = 'none';
  }
}

/**
 * The subject's own smear: only the part of the picture at about the subject's
 * distance is drawn again and again sideways, so a bird blurs while the branch
 * behind it stays sharp. Everything else in the frame is left alone.
 */
function subjectSmearPass(
  target: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  depth: NonNullable<Loaded['depth']>,
  scene: NonNullable<Photo['scene']>,
  pixels: number,
): void {
  const w = target.width;
  const h = target.height;
  const at = valueAt(scene.subjectAt, scene.near, scene.far);
  const band = 0.18;
  const mask = scratch(depth.w, depth.h);
  const mc = mask.getContext('2d')!;
  const md = mc.createImageData(depth.w, depth.h);
  for (let p = 0; p < depth.data.length; p++) {
    const v = depth.data[p] / 255;
    md.data[p * 4 + 3] = Math.round(255 * Math.max(0, 1 - Math.abs(v - at) / band));
  }
  mc.putImageData(md, 0, 0);

  const subject = scratch(w, h);
  const sc = subject.getContext('2d')!;
  sc.drawImage(target, 0, 0);
  sc.globalCompositeOperation = 'destination-in';
  sc.drawImage(mask, 0, 0, w, h);
  sc.globalCompositeOperation = 'source-over';

  ctx.globalAlpha = 1 / SMEAR_STEPS;
  for (let i = 0; i < SMEAR_STEPS; i++) ctx.drawImage(subject, (i / (SMEAR_STEPS - 1) - 0.5) * pixels, 0);
  ctx.globalAlpha = 1;
}

/** A smear: the frame drawn again and again along a line, as the camera moved. */
function smearPass(target: HTMLCanvasElement, ctx: CanvasRenderingContext2D, pixels: number): void {
  const w = target.width;
  const h = target.height;
  const copy = scratch(w, h);
  copy.getContext('2d')!.drawImage(target, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.globalAlpha = 1 / SMEAR_STEPS;
  // Shake wanders rather than running straight: a shallow arc reads as a hand,
  // where a straight line reads as a pan.
  for (let i = 0; i < SMEAR_STEPS; i++) {
    const t = i / (SMEAR_STEPS - 1) - 0.5;
    ctx.drawImage(copy, t * pixels, Math.sin(t * Math.PI) * pixels * 0.35);
  }
  ctx.globalAlpha = 1;
}

/**
 * The light pass: how much light reached the sensor (exposure), what colour
 * the camera thought it was (white balance), and the grain left by counting
 * too few photons (noise). Done in linear light, where doubling really is a
 * stop, and put back into sRGB at the end.
 */
function lightPass(ctx: CanvasRenderingContext2D, w: number, h: number, render: Render): void {
  const { exposure, noise, gains } = render;
  if (Math.abs(exposure - 1) < 0.02 && noise < 0.004 && Math.abs(gains[0] - 1) < 0.02 && Math.abs(gains[2] - 1) < 0.02) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const g = [gains[0] * exposure, gains[1] * exposure, gains[2] * exposure];
  for (let i = 0; i < d.length; i += 4) {
    // One grey noise sample a pixel, plus a weaker one per channel: that is
    // roughly how a camera's noise looks once the colours are worked out.
    const shared = noise > 0 ? gauss() * noise : 0;
    for (let c = 0; c < 3; c++) {
      const s = d[i + c] / 255;
      let lin = s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      lin *= g[c];
      if (noise > 0) lin += shared + gauss() * noise * 0.5;
      lin = Math.min(1, Math.max(0, lin));
      d[i + c] = 255 * (lin <= 0.0031308 ? lin * 12.92 : 1.055 * lin ** (1 / 2.4) - 0.055);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** A standard normal sample, by the polar method, kept cheap. */
let spare: number | null = null;
function gauss(): number {
  if (spare !== null) {
    const v = spare;
    spare = null;
    return v;
  }
  let u = 0;
  let v = 0;
  let s = 0;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u * u + v * v;
  } while (s === 0 || s >= 1);
  const k = Math.sqrt((-2 * Math.log(s)) / s);
  spare = v * k;
  return u * k;
}
