// npm run photos:import -- <folder>
//
// Brings photographs in from a folder on this machine: your own, or a set
// downloaded from somewhere that is not Wikimedia Commons. It resizes them,
// makes a depth map for each one (tools/photos/depth.ts), and adds them to
// src/data/photos.json beside anything photos:fetch put there.
//
// The folder must hold a credits.json saying, for each file, what it is of and
// who took it:
//
//   {
//     "DSC_4812.JPG": {
//       "id": "perched-bird-01",
//       "subject": "perched-bird",
//       "author": "Rob Litzke",
//       "license": "CC-BY-4.0",
//       "sourceUrl": "https://github.com/RobertLitzke/Photography",
//       "source": "the author",
//       "scene": { "subjectAt": 14, "near": 6, "far": 60, "speed": 0, "kelvin": 6000, "ev": 11, "eqFocal": 1400 }
//     }
//   }
//
// `scene` is what the figures need in order to say what a camera setting would
// have done: how far away the subject was, the nearest and farthest things in
// the frame (null for the horizon), how fast the subject was moving in metres
// a second, the colour and brightness of the light, and the zoom it was taken
// at. Estimates are fine, but they should be the right order of magnitude; for
// your own photographs the camera wrote most of it into the file's EXIF.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { problems, type Photo } from '../../src/core/photos.ts';
import { depthMap, depthName } from './depth.ts';
import { DEPTH_WIDTH, STORE_WIDTH, WEBP } from './config.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const photoDir = path.join(root, 'public', 'photos');
const libraryFile = path.join(root, 'src', 'data', 'photos.json');

const folder = process.argv[2];
if (!folder) {
  console.error('usage: npm run photos:import -- <folder with credits.json>');
  process.exit(1);
}

const credits: Record<string, Partial<Photo> & { id: string }> = JSON.parse(await readFile(path.join(folder, 'credits.json'), 'utf8'));
await mkdir(photoDir, { recursive: true });

const library: Photo[] = JSON.parse(await readFile(libraryFile, 'utf8').catch(() => '[]'));
const files = new Set(await readdir(folder));
let added = 0;

for (const [file, entry] of Object.entries(credits)) {
  if (!files.has(file)) {
    console.warn(`skip ${file}: not in ${folder}`);
    continue;
  }
  const source = await readFile(path.join(folder, file));
  const out = await sharp(source)
    .rotate()
    .resize({ width: STORE_WIDTH, withoutEnlargement: true })
    .webp(WEBP)
    .toBuffer({ resolveWithObject: true });
  await writeFile(path.join(photoDir, `${entry.id}.webp`), out.data);
  await writeFile(path.join(photoDir, depthName(entry.id)), await depthMap(source, DEPTH_WIDTH));

  const photo: Photo = {
    ...(entry as Photo),
    file: `photos/${entry.id}.webp`,
    depthFile: `photos/${depthName(entry.id)}`,
    width: out.info.width,
    height: out.info.height,
  };
  const wrong = problems(photo);
  if (wrong.length) {
    console.warn(`skip ${entry.id}: ${wrong.join('; ')}`);
    continue;
  }
  const at = library.findIndex((p) => p.id === photo.id);
  if (at >= 0) library[at] = photo;
  else library.push(photo);
  added++;
  console.log(`${photo.id}  ${(out.data.length / 1024).toFixed(0)} kB  ${photo.license}  ${photo.author}`);
}

library.sort((a, b) => a.id.localeCompare(b.id));
await writeFile(libraryFile, JSON.stringify(library, null, 2) + '\n');
console.log(`\n${added} photographs imported; ${library.length} in the library. Run npm test to check every credit.`);
