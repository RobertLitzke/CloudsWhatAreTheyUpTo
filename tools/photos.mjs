// Fetches a course's pictures with Didactics' picture pipeline
// (didactics/picture-tools; its README has every source a pick may name:
// Wikimedia Commons, PhyloPic, iNaturalist, BHL, Smithsonian Open Access, or
// a direct link to NOAA, USGS, Flickr, an archive). Each pick in
// courses/<course>/tools/photo-picks.json is downloaded with its licence and
// author read at that moment, resized to 1024 px WebP (a PhyloPic silhouette
// stays SVG) in public/photos/, and credited in src/data/photos.json with its
// `kind` and the `changes` made. A licence the courses do not accept, or a
// Commons file marked inaccurate paleoart, is refused. Picks already saved are
// skipped (--all to redo them); --prune deletes files no longer picked.
//
//   npm run photos -- <course> [--all] [--prune]
//
// BHL_API_KEY and SI_API_KEY (api.data.gov) in the environment unlock BHL's
// and the Smithsonian's APIs. Commons refuses cloud machines: run it on your
// own computer. Photo ids are remembered by saves, so a pick keeps its id for good.

import { join } from 'node:path';
import { fetchPictures } from 'didactics/picture-tools';
import { courseArg, readJson, root } from './lib/course.mjs';

const { name, dir, userAgent } = courseArg('usage: npm run photos -- <course> [--all] [--prune]');
const r = await fetchPictures({
  dir,
  userAgent,
  redo: process.argv.includes('--all'),
  prune: process.argv.includes('--prune'),
  paleoart: readJson(join(root, 'tools/inaccurate-paleoart.json'), undefined),
});
console.log(`${r.records} pictures in courses/${name}/src/data/photos.json${r.failed.length ? `; ${r.failed.length} not fetched` : ''}`);
if (r.failed.length) process.exitCode = 1;
