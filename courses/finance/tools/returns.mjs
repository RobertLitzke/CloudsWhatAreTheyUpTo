// Annual US returns from Robert Shiller's monthly data, as republished by the
// datasets/s-and-p-500 project (ODC Public Domain Dedication; sources: Shiller,
// http://www.econ.yale.edu/~shiller/data.htm, and FRED). tools/data/shiller-monthly.csv
// is that project's data/data.csv, fetched 2026-11-04 from
// https://raw.githubusercontent.com/datasets/s-and-p-500/main/data/data.csv
//
//   node tools/returns.mjs     writes src/data/returns.json
//
// Each year runs January to January, as Bengen and most retirement studies do:
// - stocks: S&P composite price change plus a year of dividends, nominal
// - bonds: a 10-year US Treasury held for a year, bought at par at January's
//   yield and sold as a 9-year bond at the next January's yield (the usual
//   reconstruction, as in Bengen 1994 and cFIREsim)
// - inflation: CPI, January to January
// - cape: Shiller's cyclically adjusted P/E in January (blank before 1881)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rows = readFileSync(join(here, 'data/shiller-monthly.csv'), 'utf8').trim().split('\n').slice(1)
  .map((l) => l.split(','))
  .map(([date, price, div, , cpi, rate, , , , cape]) => ({ y: +date.slice(0, 4), m: +date.slice(5, 7), price: +price, div: +div, cpi: +cpi, rate: +rate / 100, cape: +cape }))
  .filter((r) => r.price > 0 && r.div > 0 && r.cpi > 0 && r.rate > 0);

const at = (y, m) => rows.find((r) => r.y === y && r.m === m);

/** Price of a bond paying coupon c a year (twice a year) for n years, at yield y. */
function bondPrice(c, y, n) {
  const k = 2 * n;
  const i = y / 2;
  return (c / 2) * (1 - (1 + i) ** -k) / i + (1 + i) ** -k;
}

const out = [];
for (let y = 1871; ; y++) {
  const a = at(y, 1);
  const b = at(y + 1, 1);
  if (!a || !b) break;
  const months = rows.filter((r) => r.y === y);
  const dividends = months.reduce((s, r) => s + r.div / 12, 0);
  const stocks = (b.price + dividends) / a.price - 1;
  const bonds = bondPrice(a.rate, b.rate, 9) + a.rate - 1;
  const inflation = b.cpi / a.cpi - 1;
  const r = (v) => Math.round(v * 1e5) / 1e5;
  out.push({ year: y, stocks: r(stocks), bonds: r(bonds), inflation: r(inflation), cape: a.cape > 0 ? Math.round(a.cape * 10) / 10 : null });
}
writeFileSync(join(here, '../src/data/returns.json'), JSON.stringify(out).replace(/\},\{/g, '},\n{') + '\n');
console.log(`Wrote src/data/returns.json: ${out[0].year} to ${out.at(-1).year}, ${out.length} years.`);
