// Depth maps.
//
// The figures that fake an aperture need to know how far away each part of a
// photograph is. A single photograph does not say, so one is estimated with
// MiDaS, a small neural network that guesses relative depth from one picture
// (Ranftl and others, 2019). The result is a grey image, white where the scene
// is nearest and black where it is farthest, stored beside the photo as
// <id>-depth.webp and read back by app/photo/film.ts.
//
// It is only a guess, and it is relative: the metres come from the `scene`
// written by hand beside each photo in src/data/photos.json. What the map has
// to get right is the order of things and where their edges are, which it
// mostly does. Check each one on the contact sheet the tools write, and throw
// out a photograph whose map is wrong rather than shipping a figure that
// blurs the bird and not the branch.
//
// The model file (about 65 MB) is downloaded once into tools/photos/model/,
// which is not in git.

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const modelDir = path.join(here, 'model');
const MODEL_URL = 'https://github.com/isl-org/MiDaS/releases/download/v2_1/model-small.onnx';
const MODEL_FILE = path.join(modelDir, 'midas-small.onnx');
/** What the model takes: 256 by 256, ImageNet-normalised, channels first. */
const SIDE = 256;
const MEAN = [0.485, 0.456, 0.406];
const DEV = [0.229, 0.224, 0.225];

/** The model, downloaded on first use and kept. */
async function modelFile(): Promise<string> {
  try {
    await stat(MODEL_FILE);
    return MODEL_FILE;
  } catch {
    console.log('fetching the depth model, once (about 65 MB)…');
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`the depth model answered ${res.status}; download it by hand to ${MODEL_FILE}`);
    await mkdir(modelDir, { recursive: true });
    await writeFile(MODEL_FILE, Buffer.from(await res.arrayBuffer()));
    return MODEL_FILE;
  }
}

let session: unknown;

/** onnxruntime-node is a big dependency and only the photo tools need it, so it is loaded here. */
async function runtime(): Promise<any> {
  try {
    // The specifier is hidden from the typechecker: this is an optional
    // dependency that only the photo tools need, and a checkout without it
    // must still typecheck.
    return await import(/* @vite-ignore */ 'onnxruntime' + '-node');
  } catch {
    throw new Error('depth maps need onnxruntime-node: npm install --no-save onnxruntime-node');
  }
}

/**
 * The depth map of an image, as a `width`-wide grey WebP: white near, black
 * far. The photograph is the one that will be shipped, so that the map lines
 * up with it pixel for pixel once both are scaled.
 */
export async function depthMap(photo: Buffer, width: number): Promise<Buffer> {
  const ort = await runtime();
  session ??= await ort.InferenceSession.create(await modelFile());
  const s = session as any;

  const { data, info } = await sharp(photo).resize(SIDE, SIDE, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const input = new Float32Array(3 * SIDE * SIDE);
  for (let i = 0; i < SIDE * SIDE; i++) {
    for (let c = 0; c < 3; c++) input[c * SIDE * SIDE + i] = (data[i * info.channels + c] / 255 - MEAN[c]) / DEV[c];
  }
  const name = s.inputNames[0];
  const out = await s.run({ [name]: new ort.Tensor('float32', input, [1, 3, SIDE, SIDE]) });
  const map = out[s.outputNames[0]].data as Float32Array;

  // MiDaS returns inverse depth in arbitrary units: near is large. Stretched
  // to 0..255 it becomes exactly what film.ts wants, white nearest.
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of map) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const side = Math.round(Math.sqrt(map.length));
  const grey = Buffer.alloc(map.length);
  for (let i = 0; i < map.length; i++) grey[i] = Math.round(((map[i] - lo) / (hi - lo || 1)) * 255);

  const shape = await sharp(photo).metadata();
  return sharp(grey, { raw: { width: side, height: side, channels: 1 } })
    .resize(width, Math.round((width * (shape.height ?? 2)) / (shape.width ?? 3)), { fit: 'fill' })
    // A little blur: the map is a guess, and hard edges in a guess show up as
    // hard edges in the blur, which look worse than a soft mistake.
    .blur(1.5)
    .webp({ quality: 80, effort: 6 })
    .toBuffer();
}

/** Written beside the photo it belongs to. */
export const depthName = (id: string): string => `${id}-depth.webp`;

/** For a tool that has the photo on disk already. */
export async function depthMapOf(file: string, width: number): Promise<Buffer> {
  return depthMap(await readFile(file), width);
}
