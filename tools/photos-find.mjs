// Lists candidate pictures for a course to pick from, with Didactics' picture
// pipeline (didactics/picture-tools findCandidates).
// courses/<course>/tools/photo-search.json says where to look: Commons
// categories per key ({ "cirrus": ["Cirrus clouds", ...] }), other sources
// per key ({ "sources": { "amanita": { "inaturalist": "Amanita muscaria",
// "phylopic": "Amanita", "smithsonian": "fly agaric" } } }), optional
// "features" (keys whose photos belong to another key's genus: { "mammatus":
// { "genus": "cumulonimbus", "categories": [...] } }), "minWidth" (default
// 1200) and "field" (the pick field the key goes in). Only pictures under an
// accepted licence are kept, spread across authors. The result is
// courses/<course>/tools/candidates/index.html, a contact sheet: tap the
// pictures that clearly show their subject, then paste the JSON at the bottom
// into tools/photo-picks.json (ids follow on from the picks there; set "kind"
// where it is not a photograph) and run `npm run photos -- <course>`.
//
//   npm run photos:find -- <course>          PER_KEY=60 to see more or fewer per key

import { join, relative } from 'node:path';
import { findCandidates } from 'didactics/picture-tools';
import { courseArg, readJson } from './lib/course.mjs';

const { name, dir, userAgent } = courseArg('usage: npm run photos:find -- <course>');
const spec = readJson(join(dir, 'tools/photo-search.json'), null);
if (!spec) {
  console.error(`${name} has no tools/photo-search.json: write one ({ categories?, sources?, features?, minWidth? }) to search for it`);
  process.exit(1);
}
const out = await findCandidates({ dir, userAgent, spec, perKey: Number(process.env.PER_KEY ?? 60), title: `${name} photo candidates` });
console.log(`\nOpen ${relative(process.cwd(), out)} to pick.`);
