// Makes every course's icons, the catalog's, and the candidate courses' from
// the painted icon sheets in catalog/icons/sources/, as catalog/icons/icons.json
// maps them. Run `npm run icons` after changing a sheet or the map; name icons
// to do only those: `npm run icons -- clouds catalog`.
//
// Each icon is cropped from its sheet, its soft painted edge trimmed, and
// masked to a clean rounded square. For a folder named by `to`, public/icons/
// gets the whole set a page and its manifest want:
//
// - icon.svg: the favicon and the catalog's picture of the course, an SVG
//   wrapping a 256 px WebP of the rounded tile. It stays an SVG because the
//   pages, Didactics' build (which inlines it as the one-file copy's tab
//   icon) and the catalog's registry all expect icons/icon.svg.
// - favicon-32.png: the tab icon for browsers that want a bitmap.
// - icon-192.png, icon-512.png: the manifest's icons, rounded, corners clear.
// - icon-512-maskable.png: full bleed, the tile shrunk to the centre 80% over
//   a blurred copy of itself, because Android crops maskable icons to a shape
//   of its choosing and only promises the middle 80%.
// - apple-touch-icon.png: 180 px, full bleed over the same blurred ground;
//   iOS rounds the corners itself.
//
// A candidate (no `to`) gets catalog/icons/candidates/<name>.svg and
// <name>-192.png, ready to copy into a course when it is built.
//
// `--sheet out.png` also writes one contact sheet of every tile, to check the
// crops after a sheet is redone.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'catalog', 'icons');
const config = JSON.parse(await readFile(join(iconsDir, 'icons.json'), 'utf8'));

/** The corner radius as a share of the side: a touch over the painted tiles' own, so no paper shows at the corners. */
const CORNER = 0.23;
/** How much of the painted tile's edge to trim, as a share of the side, since its edge is soft. */
const TRIM = 0.012;
/** The size the master tile is cut at; every output is scaled down from it. */
const MASTER = 1024;

const args = process.argv.slice(2);
const sheetOut = args.includes('--sheet') ? args[args.indexOf('--sheet') + 1] : null;
const only = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--sheet');
const names = only.length ? only : Object.keys(config.icons);
for (const n of names) if (!config.icons[n]) throw new Error(`no icon called "${n}" in catalog/icons/icons.json`);

/** A rounded-square mask as SVG, `size` square. */
const roundMask = (size, radius = CORNER) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size * radius}" fill="#fff"/></svg>`);

/** The icon as a MASTER-square rounded tile with clear corners, as a PNG buffer. */
async function masterTile(name) {
  const spec = config.icons[name];
  const file = spec.file ? join(iconsDir, spec.file) : join(iconsDir, config.sheets[spec.sheet].file);
  let img = sharp(file);
  if (spec.box) {
    const [x, y, w, h] = spec.box;
    const t = Math.round(Math.min(w, h) * TRIM);
    img = img.extract({ left: x + t, top: y + t, width: w - 2 * t, height: h - 2 * t });
  }
  const square = await img.resize(MASTER, MASTER, { fit: 'cover' }).png().toBuffer();
  return sharp(square)
    .composite([{ input: roundMask(MASTER), blend: 'dest-in' }])
    .png()
    .toBuffer();
}

/** The tile scaled to `size`, still rounded with clear corners. */
const tileAt = (tile, size) => sharp(tile).resize(size, size).png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 }).toBuffer();

/** The tile over a blurred, slightly enlarged copy of itself, so it fills a square with no corners showing; `scale` shrinks the tile. */
async function fullBleed(tile, size, scale = 1) {
  const big = Math.round(MASTER * 1.1);
  const enlarged = await sharp(tile).resize(big, big).flatten({ background: '#000' }).toBuffer();
  const ground = await sharp(enlarged)
    .extract({ left: Math.round((big - MASTER) / 2), top: Math.round((big - MASTER) / 2), width: MASTER, height: MASTER })
    .blur(40)
    .toBuffer();
  const inner = Math.round(MASTER * scale);
  const front = await sharp(tile).resize(inner, inner).png().toBuffer();
  const off = Math.round((MASTER - inner) / 2);
  // Composited at full size first: sharp resizes before it composites.
  const full = await sharp(ground).composite([{ input: front, left: off, top: off }]).png().toBuffer();
  return sharp(full).resize(size, size).png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 }).toBuffer();
}

/** icon.svg: an SVG the size of the tile, carrying a 256 px WebP of it. */
async function svgOf(tile) {
  const webp = await sharp(tile).resize(256, 256).webp({ quality: 86, alphaQuality: 90, effort: 6 }).toBuffer();
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 256 256" width="256" height="256"><image width="256" height="256" href="data:image/webp;base64,${webp.toString('base64')}"/></svg>\n`;
}

const kb = (b) => `${(b.length / 1024).toFixed(1)} kB`;

async function write(dir, file, data) {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, file), data);
  console.log(`  ${file} (${kb(data)})`);
}

const tiles = {};
for (const name of names) {
  const spec = config.icons[name];
  const tile = await masterTile(name);
  tiles[name] = tile;
  if (spec.to) {
    const dir = join(root, spec.to, 'public', 'icons');
    console.log(`${name} -> ${spec.to}/public/icons/`);
    await write(dir, 'icon.svg', await svgOf(tile));
    await write(dir, 'favicon-32.png', await tileAt(tile, 32));
    await write(dir, 'icon-192.png', await tileAt(tile, 192));
    await write(dir, 'icon-512.png', await tileAt(tile, 512));
    await write(dir, 'icon-512-maskable.png', await fullBleed(tile, 512, 0.8));
    await write(dir, 'apple-touch-icon.png', await fullBleed(tile, 180));
  } else {
    const dir = join(iconsDir, 'candidates');
    console.log(`${name} (candidate) -> catalog/icons/candidates/`);
    await write(dir, `${name}.svg`, await svgOf(tile));
    await write(dir, `${name}-192.png`, await tileAt(tile, 192));
  }
}

if (sheetOut) {
  const cell = 160;
  const pad = 16;
  const cols = Math.min(5, names.length);
  const rows = Math.ceil(names.length / cols);
  const labels = names.map((n, i) => {
    const x = pad + (i % cols) * (cell + pad);
    const y = pad + Math.floor(i / cols) * (cell + pad + 24) + cell + 18;
    return `<text x="${x + cell / 2}" y="${y}" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle" fill="#3a2a1a">${n}</text>`;
  });
  const W = pad + cols * (cell + pad);
  const H = pad + rows * (cell + pad + 24);
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#f6efe2"/>${labels.join('')}</svg>`);
  const layers = await Promise.all(
    names.map(async (n, i) => ({
      input: await sharp(tiles[n]).resize(cell, cell).png().toBuffer(),
      left: pad + (i % cols) * (cell + pad),
      top: pad + Math.floor(i / cols) * (cell + pad + 24),
    })),
  );
  await writeFile(sheetOut, await sharp(bg).composite(layers).png().toBuffer());
  console.log(`contact sheet -> ${sheetOut}`);
}
