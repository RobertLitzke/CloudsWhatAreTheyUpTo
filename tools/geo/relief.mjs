// Makes a relief for Didactics' maps (didactics/maps): a grid of heights for
// one fixed view, as <name>.png (Terrarium-encoded heights) and <name>.json
// (where it lies, where it came from, under what licence), for a course's
// public/maps/ folder.
//
//   node tools/geo/relief.mjs --name auvergne --bbox 2.85,45.68,3.12,45.90 \
//     --zoom 13 --max 640 --out courses/geology/public/maps
//
// Heights come from the Terrain Tiles on AWS (s3://elevation-tiles-prod,
// Terrarium PNGs), which merge USGS 3DEP and SRTM (public domain), the
// Copernicus and EU-DEM models, GMTED2010 and ETOPO1 bathymetry, among
// others; see ATTRIBUTION below. The grid stays in the tiles' own Web
// Mercator pixels: tiles are fetched, stitched, cropped to the box, and
// averaged down by a whole number of pixels until it is at most --max wide.
// Heights are rounded to --precision metres (default 1), which makes the
// PNG much smaller; the maps are drawings, not survey data.
//
// Needs network access to s3.amazonaws.com only. Uses sharp (already a
// dependency of the courses) to read and write PNGs.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import sharp from 'sharp';

const ATTRIBUTION =
  'Terrain Tiles on AWS (Mapzen/Linux Foundation): USGS 3DEP and SRTM (public domain), ' +
  'Copernicus/EU-DEM, GMTED2010, ETOPO1 and others, as listed at https://github.com/tilezen/joerd/blob/master/docs/attribution.md';
const TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';

function args() {
  const a = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((s) => {
    const [k, ...v] = s.trim().split(/\s+/);
    return [k, v.join(' ')];
  }));
  if (!a.name || !a.bbox || !a.out) {
    console.error('usage: relief.mjs --name <name> --bbox west,south,east,north --out <folder> [--zoom 12] [--max 640] [--precision 1] [--credit "…"]');
    process.exit(1);
  }
  const bbox = a.bbox.split(',').map(Number);
  if (bbox.length !== 4 || bbox.some((n) => !Number.isFinite(n)) || bbox[0] >= bbox[2] || bbox[1] >= bbox[3]) throw new Error('--bbox is west,south,east,north in degrees');
  return { name: a.name, bbox, out: a.out, zoom: Number(a.zoom ?? 12), max: Number(a.max ?? 640), precision: Number(a.precision ?? 1), credit: a.credit };
}

const mercator = (lon, lat, z) => {
  const n = 256 * 2 ** z;
  const s = Math.sin((lat * Math.PI) / 180);
  return [((lon + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n];
};

async function tile(z, x, y) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${TILES}/${z}/${x}/${y}.png`);
      if (!res.ok) throw new Error(`${res.status} for tile ${z}/${x}/${y}`);
      const { data } = await sharp(Buffer.from(await res.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      return data;
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((ok) => setTimeout(ok, 1000 * 2 ** attempt));
    }
  }
}

async function main() {
  const o = args();
  const [w, s, e, n] = o.bbox;
  const [px0, py0] = mercator(w, n, o.zoom).map(Math.floor);
  const [px1, py1] = mercator(e, s, o.zoom).map(Math.ceil);
  const step = Math.max(1, Math.ceil((px1 - px0) / o.max));
  const width = Math.floor((px1 - px0) / step);
  const height = Math.floor((py1 - py0) / step);
  const tiles = [];
  for (let ty = Math.floor(py0 / 256); ty <= Math.floor((py1 - 1) / 256); ty++)
    for (let tx = Math.floor(px0 / 256); tx <= Math.floor((px1 - 1) / 256); tx++) tiles.push([tx, ty]);
  console.log(`${o.name}: ${tiles.length} tiles at zoom ${o.zoom}, grid ${width}×${height}, ${step} px per cell`);
  const got = new Map();
  for (const [tx, ty] of tiles) got.set(`${tx}/${ty}`, await tile(o.zoom, tx, ty));
  const height_at = (gx, gy) => {
    const t = got.get(`${Math.floor(gx / 256)}/${Math.floor(gy / 256)}`);
    const i = ((gy % 256) * 256 + (gx % 256)) * 4;
    return t[i] * 256 + t[i + 1] + t[i + 2] / 256 - 32768;
  };
  const out = Buffer.alloc(width * height * 3);
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      let sum = 0;
      for (let dy = 0; dy < step; dy++) for (let dx = 0; dx < step; dx++) sum += height_at(px0 + i * step + dx, py0 + j * step + dy);
      const m = Math.round(sum / (step * step) / o.precision) * o.precision;
      lo = Math.min(lo, m);
      hi = Math.max(hi, m);
      const v = m + 32768;
      const r = Math.floor(v / 256);
      const g = Math.floor(v - r * 256);
      const b = Math.round((v - r * 256 - g) * 256);
      out.set([r, g, Math.min(255, b)], (j * width + i) * 3);
    }
  }
  const dir = resolve(o.out);
  mkdirSync(dir, { recursive: true });
  await sharp(out, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(join(dir, `${o.name}.png`));
  const toLonLat = (x, y) => {
    const N = 256 * 2 ** o.zoom;
    return [(x / N) * 360 - 180, (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / N))) * 180) / Math.PI];
  };
  const [west, north] = toLonLat(px0, py0);
  const [east, south] = toLonLat(px0 + width * step, py0 + height * step);
  const meta = {
    format: 'didactics-relief',
    version: 1,
    image: `${o.name}.png`,
    width,
    height,
    zoom: o.zoom,
    x0: px0,
    y0: py0,
    step,
    bounds: [west, south, east, north].map((v) => Number(v.toFixed(5))),
    range: [lo, hi],
    credit: o.credit ?? 'Terrain Tiles on AWS (USGS 3DEP, SRTM and others)',
    licence: 'Mostly public domain; some sources ask for attribution (see source).',
    source: ATTRIBUTION,
    fetched: new Date().toISOString().slice(0, 10),
    made: `node tools/geo/relief.mjs --name ${o.name} --bbox ${o.bbox.join(',')} --zoom ${o.zoom} --max ${o.max} --precision ${o.precision} --out ${relative(process.cwd(), dir)}${o.credit ? ` --credit "${o.credit}"` : ''}`,
  };
  writeFileSync(join(dir, `${o.name}.json`), `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`wrote ${o.name}.png and ${o.name}.json (${lo} to ${hi} m)`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
