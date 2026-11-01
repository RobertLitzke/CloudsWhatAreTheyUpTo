// The stars for lesson 9's Hertzsprung-Russell diagram: every star in the HYG
// catalogue (v3.8, David Nash, CC BY-SA 4.0; from Hipparcos, Yale Bright Star
// and Gliese) within 20 parsecs that has a colour and a distance, as surface
// temperature (from its B-V colour, Ballesteros 2012) and brightness compared
// with the Sun (the catalogue's visual luminosity). Written to
// src/data/stars.json as [log10 T × 1000, log10 L × 100] pairs.
//   npm run stars -w astronomy

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const URL = 'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/v3/hyg_v38.csv.gz';
const out = join(dirname(fileURLToPath(import.meta.url)), '../src/data/stars.json');

const csv = gunzipSync(Buffer.from(await (await fetch(URL)).arrayBuffer())).toString('utf8');
const [head, ...rows] = csv.trim().split('\n');
const col = Object.fromEntries(head.split(',').map((h, i) => [h.replace(/"/g, ''), i]));
const tempOf = (bv) => 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));

const stars = [];
for (const line of rows) {
  const f = line.split(',');
  const dist = Number(f[col.dist]);
  const ci = f[col.ci];
  const lum = Number(f[col.lum]);
  if (!(dist > 0 && dist <= 20) || ci === '' || !(lum > 0) || Number(f[col.id]) === 0) continue;
  const t = tempOf(Number(ci));
  if (!(t > 2000 && t < 40000)) continue;
  stars.push([Math.round(Math.log10(t) * 1000), Math.round(Math.log10(lum) * 100)]);
}
writeFileSync(out, JSON.stringify({
  source: 'HYG database v3.8 (David Nash, astronexus.com), CC BY-SA 4.0: stars within 20 parsecs with a B-V colour',
  stars,
}));
console.log(`${stars.length} stars written`);
