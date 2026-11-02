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
// With --coast, the land comes from the Copernicus GLO-30 surface model
// instead (s3://copernicus-dem-30m, public on AWS), which draws the sea as
// exactly 0 m. Use it where a map's coast matters: near the shore the
// Terrain Tiles blend coarse bathymetry into the land, so the sea floor rises
// above sea level offshore and the coast comes out in stair steps (Siccar
// Point did). Sea cells keep the tiles' depths, held at least 1 m under water.
//
// Needs network access to s3.amazonaws.com only. Uses sharp (already a
// dependency of the courses) to read and write PNGs, and geotiff to read the
// Copernicus tiles.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import sharp from 'sharp';
import { fromArrayBuffer } from 'geotiff';

const ATTRIBUTION =
  'Terrain Tiles on AWS (Mapzen/Linux Foundation): USGS 3DEP and SRTM (public domain), ' +
  'Copernicus/EU-DEM, GMTED2010, ETOPO1 and others, as listed at https://github.com/tilezen/joerd/blob/master/docs/attribution.md';
const TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
const COPERNICUS = 'https://copernicus-dem-30m.s3.amazonaws.com';
const COPERNICUS_CREDIT = 'Copernicus GLO-30 DEM (© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA; all rights reserved) for the land';

function args() {
  const a = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((s) => {
    const [k, ...v] = s.trim().split(/\s+/);
    return [k, v.join(' ')];
  }));
  if (!a.name || !a.bbox || !a.out) {
    console.error('usage: relief.mjs --name <name> --bbox west,south,east,north --out <folder> [--zoom 12] [--max 640] [--precision 1] [--coast] [--credit "…"]');
    process.exit(1);
  }
  const bbox = a.bbox.split(',').map(Number);
  if (bbox.length !== 4 || bbox.some((n) => !Number.isFinite(n)) || bbox[0] >= bbox[2] || bbox[1] >= bbox[3]) throw new Error('--bbox is west,south,east,north in degrees');
  return { name: a.name, bbox, out: a.out, zoom: Number(a.zoom ?? 12), max: Number(a.max ?? 640), precision: Number(a.precision ?? 1), credit: a.credit, coast: 'coast' in a };
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

/** One-degree Copernicus GLO-30 tile with its south-west corner at (lat, lon), or null where it is all sea (no tile). */
async function copernicusTile(lat, lon) {
  const ns = `${lat < 0 ? 'S' : 'N'}${String(Math.abs(lat)).padStart(2, '0')}_00`;
  const ew = `${lon < 0 ? 'W' : 'E'}${String(Math.abs(lon)).padStart(3, '0')}_00`;
  const name = `Copernicus_DSM_COG_10_${ns}_${ew}_DEM`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${COPERNICUS}/${name}/${name}.tif`);
      if (res.status === 404 || res.status === 403) return null;
      if (!res.ok) throw new Error(`${res.status} for ${name}`);
      const image = await (await fromArrayBuffer(await res.arrayBuffer())).getImage();
      const [x0, y0] = image.getOrigin();
      const [dx, dy] = image.getResolution();
      const [band] = await image.readRasters();
      return { band, width: image.getWidth(), height: image.getHeight(), x0, y0, dx, dy };
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((ok) => setTimeout(ok, 1000 * 2 ** attempt));
    }
  }
}

/** Height at (lon, lat) from Copernicus, bilinear, or null for sea (the model draws the sea as exactly 0 m). */
function copernicusAt(tiles, lon, lat) {
  const t = tiles.get(`${Math.floor(lat)}/${Math.floor(lon)}`);
  if (!t) return null;
  const fx = (lon - t.x0) / t.dx - 0.5;
  const fy = (lat - t.y0) / t.dy - 0.5;
  const cx = Math.min(t.width - 1, Math.max(0, Math.round(fx)));
  const cy = Math.min(t.height - 1, Math.max(0, Math.round(fy)));
  if (t.band[cy * t.width + cx] === 0) return null;
  const x = Math.min(t.width - 2, Math.max(0, Math.floor(fx)));
  const y = Math.min(t.height - 2, Math.max(0, Math.floor(fy)));
  const u = Math.min(1, Math.max(0, fx - x));
  const v = Math.min(1, Math.max(0, fy - y));
  const at = (i, j) => t.band[(y + j) * t.width + x + i];
  return (at(0, 0) * (1 - u) + at(1, 0) * u) * (1 - v) + (at(0, 1) * (1 - u) + at(1, 1) * u) * v;
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
  const toLonLat = (x, y) => {
    const N = 256 * 2 ** o.zoom;
    return [(x / N) * 360 - 180, (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / N))) * 180) / Math.PI];
  };
  const land = new Map();
  if (o.coast) {
    for (let lat = Math.floor(s); lat <= Math.floor(n - 1e-9); lat++)
      for (let lon = Math.floor(w); lon <= Math.floor(e - 1e-9); lon++) land.set(`${lat}/${lon}`, await copernicusTile(lat, lon));
    console.log(`${o.name}: land from ${land.size} Copernicus tile(s)`);
  }
  const out = Buffer.alloc(width * height * 3);
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      let sum = 0;
      for (let dy = 0; dy < step; dy++) for (let dx = 0; dx < step; dx++) sum += height_at(px0 + i * step + dx, py0 + j * step + dy);
      let m = sum / (step * step);
      if (o.coast) {
        const here = copernicusAt(land, ...toLonLat(px0 + (i + 0.5) * step, py0 + (j + 0.5) * step));
        m = here === null ? Math.min(m, -1) : Math.max(here, 1);
      }
      m = Math.round(m / o.precision) * o.precision;
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
    credit: o.credit ?? (o.coast ? 'Copernicus GLO-30 (© DLR, Airbus; EU/ESA) and Terrain Tiles on AWS' : 'Terrain Tiles on AWS (USGS 3DEP, SRTM and others)'),
    licence: o.coast ? 'Copernicus DEM: free to use with the attribution in source. Terrain Tiles: mostly public domain.' : 'Mostly public domain; some sources ask for attribution (see source).',
    source: o.coast ? `${COPERNICUS_CREDIT}; the sea floor from ${ATTRIBUTION}` : ATTRIBUTION,
    fetched: new Date().toISOString().slice(0, 10),
    made: `node tools/geo/relief.mjs --name ${o.name} --bbox ${o.bbox.join(',')} --zoom ${o.zoom} --max ${o.max} --precision ${o.precision}${o.coast ? ' --coast' : ''} --out ${relative(process.cwd(), dir)}${o.credit ? ` --credit "${o.credit}"` : ''}`,
  };
  writeFileSync(join(dir, `${o.name}.json`), `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`wrote ${o.name}.png and ${o.name}.json (${lo} to ${hi} m)`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
