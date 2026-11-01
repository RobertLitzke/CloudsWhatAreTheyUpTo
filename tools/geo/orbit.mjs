// Writes courses/geology/src/data/orbit.json: the Earth's orbit over the last
// 800,000 years, one row per thousand years, from the Laskar et al. (2004)
// solution as shipped in the `inso` wheel on PyPI (the IMCCE site is not
// reachable from here). Usage:
//   pip download --no-deps inso && unzip inso-*.whl 'inso/astrofiles/Laskar2004/*'
//   node tools/geo/orbit.mjs inso/astrofiles/Laskar2004/INSOLN.LA2004.BTL.ASC
// Columns of the source: time (kyr, negative = past), eccentricity,
// obliquity (rad), longitude of perihelion from the moving equinox (rad).

import { readFileSync, writeFileSync } from 'node:fs';

const [file, kyr = '800'] = process.argv.slice(2);
if (!file) throw new Error('usage: node tools/geo/orbit.mjs INSOLN.LA2004.BTL.ASC [kyr]');
const rows = readFileSync(file, 'utf8').trim().split('\n').map((l) => l.trim().split(/\s+/).map((v) => Number(v.replace('D', 'E'))));
const e = [];
const tilt = [];
const peri = [];
for (const [t, ecc, obl, varpi] of rows) {
  if (t > 0 || -t > Number(kyr)) continue;
  e.push(Math.round(ecc * 1e5) / 1e5);
  tilt.push(Math.round(((obl * 180) / Math.PI) * 1000) / 1000);
  // The Sun's longitude at perihelion is varpi + 180°; longitude 0 is the March equinox (about 20 March,
  // month 2.65 counting January as 0), and the Sun moves about 30.4° a month.
  const lam = (((varpi * 180) / Math.PI + 180) % 360 + 360) % 360;
  peri.push(Math.round((((2.65 + lam / 30.44) % 12) + 12) % 12 * 100) / 100);
}
const out = {
  source: 'Laskar, J., Robutel, P., Joutel, F., Gastineau, M., Correia, A. C. M., and Levrard, B. (2004), A long-term numerical solution for the insolation quantities of the Earth, Astronomy & Astrophysics 428, 261-285, doi:10.1051/0004-6361:20041335; table INSOLN.LA2004.BTL.ASC as shipped in the inso package (PyPI)',
  note: 'One row per thousand years from today (index 0) back. e: eccentricity; tilt: obliquity in degrees; peri: month of closest approach to the Sun, 0 = start of January, fractional.',
  e, tilt, peri,
};
writeFileSync('courses/geology/src/data/orbit.json', JSON.stringify(out) + '\n');
console.log(`wrote ${e.length} rows`);
