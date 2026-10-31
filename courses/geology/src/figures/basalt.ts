// Lesson 4, The rock that was once on fire: molten rock that cools fast makes
// glass, slowly makes crystals; a cooling lava flow cracks into columns.

import { el } from 'didactics/dom';
import { makeRng } from 'didactics/rng';
import { segmented } from 'didactics/ui';
import { photoNode } from '../photos';
import { choices, figure, frame, lock, lockIn, rgbOf, slider } from './kit';

// ---- Hall's furnace: cooling speed and crystal size ----------------------------------

type Melt = 'dark' | 'pale';

interface Mineral {
  color: string;
  share: number;
}

const MINERALS: Record<Melt, Mineral[]> = {
  // Basalt's minerals: plagioclase feldspar, pyroxene, a little olivine and magnetite.
  dark: [
    { color: '#d8d2c4', share: 0.45 },
    { color: '#2f2b28', share: 0.38 },
    { color: '#617b3c', share: 0.11 },
    { color: '#121212', share: 0.06 },
  ],
  // Granite's: quartz, two feldspars, a little black mica.
  pale: [
    { color: '#b9b4ad', share: 0.3 },
    { color: '#d6a088', share: 0.35 },
    { color: '#efe9dd', share: 0.25 },
    { color: '#1f1a17', share: 0.1 },
  ],
};
const GLASS: Record<Melt, string> = { dark: '#1d1b20', pale: '#151317' };

interface Rock {
  name: string;
  photo?: string;
  says: string;
}

/** The rock a melt becomes, by crystal size in millimetres (0 for glass). */
function rockFor(melt: Melt, mm: number, crystalline: number): Rock {
  if (crystalline < 0.5) {
    return melt === 'dark'
      ? { name: 'Black glass', says: 'like the glassy skin on a lava flow that met water or cold air' }
      : { name: 'Obsidian', photo: 'obsidian', says: 'volcanic glass, sharp enough for stone-age blades' };
  }
  if (mm < 1) return melt === 'dark' ? { name: 'Basalt', photo: 'basalt', says: 'crystals too small to see without a lens' } : { name: 'Rhyolite', photo: 'rhyolite', says: 'crystals too small to see without a lens' };
  if (mm < 3) return melt === 'dark' ? { name: 'Dolerite', says: 'crystals about a millimetre across, just visible' } : { name: 'Microgranite', says: 'crystals about a millimetre across, just visible' };
  return melt === 'dark' ? { name: 'Gabbro', photo: 'gabbro', says: 'crystals several millimetres across, easy to see' } : { name: 'Granite', photo: 'granite', says: 'crystals several millimetres across, easy to see' };
}

/** Crystal size in mm after cooling for `seconds`; glass below about ten minutes. */
const crystalMm = (seconds: number) => 0.02 * Math.pow(Math.max(1, seconds / 60), 0.25);
/** How much of the melt has crystallised, 0 to 1. */
const crystallised = (seconds: number) => Math.min(1, Math.max(0, (Math.log10(seconds) - 2.6) / 1.6));

const sayTime = (s: number) => {
  const units: [number, string][] = [[3.15e7, 'year'], [86400, 'day'], [3600, 'hour'], [60, 'minute'], [1, 'second']];
  for (const [u, name] of units) {
    if (s >= u) {
      const v = s / u;
      const n = v >= 100 ? Math.round(v / 10 ** (Math.floor(Math.log10(v)) - 1)) * 10 ** (Math.floor(Math.log10(v)) - 1) : Math.round(v);
      return `${n.toLocaleString('en')} ${name}${n === 1 ? '' : 's'}`;
    }
  }
  return '1 second';
};

const TW = 400;
const TH = 170;
/** The view is 2 cm across. */
const MM_PER_PX = 20 / TW;

function paintTexture(ctx: CanvasRenderingContext2D, melt: Melt, mm: number, crystalline: number): void {
  const img = ctx.createImageData(TW, TH);
  const glass = rgbOf(GLASS[melt]);
  const minerals = MINERALS[melt].map((m) => ({ ...m, rgb: rgbOf(m.color) }));
  const cell = Math.max(1.2, mm / MM_PER_PX);
  const gw = Math.ceil(TW / cell) + 2;
  const gh = Math.ceil(TH / cell) + 2;
  // One seed per grid square, jittered; each seed is a crystal (or glass).
  const seeds: { x: number; y: number; c: readonly number[]; crystal: boolean }[] = [];
  const rng = makeRng(7);
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      let r = rng();
      let m = minerals[0];
      for (const mi of minerals) {
        if (r < mi.share) { m = mi; break; }
        r -= mi.share;
      }
      // Lighter and darker grains of the same mineral, as light catches them.
      const tint = 0.85 + rng() * 0.3;
      seeds.push({ x: (i - 1 + rng()) * cell, y: (j - 1 + rng()) * cell, c: m.rgb.map((v) => v * tint), crystal: rng() < crystalline });
    }
  }
  for (let y = 0; y < TH; y++) {
    for (let x = 0; x < TW; x++) {
      const gi = Math.floor(x / cell) + 1;
      const gj = Math.floor(y / cell) + 1;
      let d1 = Infinity;
      let d2 = Infinity;
      let best = seeds[0];
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const s = seeds[(gj + dj) * gw + gi + di];
          if (!s) continue;
          const d = (s.x - x) ** 2 + (s.y - y) ** 2;
          if (d < d1) { d2 = d1; d1 = d; best = s; } else if (d < d2) d2 = d;
        }
      }
      // Glass shines in broad, curved bands.
      const sheen = 1 + 0.25 * Math.max(0, Math.sin(x / 47 + y / 23 + Math.sin(y / 31) * 2));
      let c: readonly number[] = best.crystal ? best.c : glass.map((v) => v * sheen);
      if (best.crystal && cell > 4 && Math.sqrt(d2) - Math.sqrt(d1) < 0.9) c = c.map((v) => v * 0.6);
      const k = (y * TW + x) * 4;
      img.data[k] = c[0];
      img.data[k + 1] = c[1];
      img.data[k + 2] = c[2];
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export const furnaceFigure = figure(['crystals'], (_ctx, t) => {
  const canvas = el('canvas', { width: TW, height: TH, role: 'img', 'aria-label': 'A close-up of the cooled rock, 2 centimetres across.' }) as HTMLCanvasElement;
  canvas.style.cssText = `display:block;width:100%;height:auto;aspect-ratio:${TW} / ${TH};border-radius:4px;`;
  const ctx = canvas.getContext?.('2d') ?? null;
  const name = el('p.fig-readout');
  name.style.cssText = 'margin:0;font-weight:600;';
  const shot = el('div');
  shot.style.cssText = 'width:42%;flex:none;';
  const side = el('div', {}, name);
  side.style.cssText = 'flex:1;min-width:0;';
  const row = el('div', {}, shot, side);
  row.style.cssText = 'display:flex;gap:10px;align-items:flex-start;margin-top:8px;';
  const scale = el('p.fig-readout', {}, 'Close-up, 2 cm across');
  scale.style.cssText = 'margin:2px 0 0;font-size:0.8em;opacity:0.75;';
  const f = frame({ drawing: el('div', {}, canvas, scale, row), lines: 3 });
  let melt: Melt = 'dark';
  let logT = 1.5;
  let open = false;
  let shown = '';
  const paint = () => {
    const seconds = 10 ** logT;
    const mm = crystalMm(seconds);
    const cr = crystallised(seconds);
    const rock = rockFor(melt, mm, cr);
    if (ctx) paintTexture(ctx, melt, mm, cr);
    if (rock.photo !== shown) {
      shown = rock.photo ?? '';
      shot.replaceChildren(...(rock.photo ? [photoNode(rock.photo, { aspect: 1.5 })] : []));
      shot.style.display = rock.photo ? '' : 'none';
    }
    name.textContent = `${rock.name}: ${rock.says}.`;
    if (!open) return;
    f.readout.textContent = cr < 0.5
      ? `Cooled in ${sayTime(seconds)}. The atoms had no time to line up into crystals, so the melt froze as glass.`
      : `Cooled over ${sayTime(seconds)}. Crystals had time to grow, to about ${mm < 1 ? `${Math.round(mm * 100) / 100} mm` : `${Math.round(mm)} mm`} across. ${melt === 'dark' ? 'Same melt, same minerals' : 'A paler melt, richer in silica, makes quartz and pink feldspar'}; only the cooling time changed the size.`;
    if (melt === 'dark' && cr >= 0.5 && t.goal === 'crystals') t.done();
  };
  const ts = slider('Cooling time', 0, 13, 0.1, logT, (v) => sayTime(10 ** v), (v) => { logT = v; paint(); }, 'heat');
  const mix = segmented([{ value: 'dark', label: 'Basalt melt' }, { value: 'pale', label: 'Granite melt' }] as const, 'dark', (v) => { melt = v; paint(); });
  mix.style.display = 'none';
  const pick = choices(['Black glass', 'Basalt again, with crystals', 'A loose powder'], () => (go.disabled = false));
  const go = lockIn('Lock it in', () => {
    const guess = pick.picked();
    if (guess < 0) return;
    t.keep(guess);
    pick.freeze(true);
    go.remove();
    lock([ts], false);
    mix.style.display = '';
    open = true;
    paint();
    f.readout.textContent = guess === 0
      ? 'Right: cooled in a minute or so, the melted basalt froze as black glass. Now let it cool more slowly.'
      : 'Cooled in a minute or so, the melted basalt froze as black glass, with no crystals at all. Now let it cool more slowly.';
  });
  go.disabled = true;
  lock([ts], true);
  f.controls.append(pick.node, go, mix, ts.node);
  paint();
  f.readout.textContent = 'Hall melts a lump of basalt in a furnace, then takes it out and lets it cool in about a minute. What does he get? Guess first.';
  if (typeof t.kept === 'number') {
    pick.pick(t.kept);
    go.click();
  }
  return f.node;
});

// ---- Columns: a cooling flow cracks into hexagons --------------------------------------

const CW = 300;
const CH = 165;
const MAX_STEPS = 12;

interface Pattern {
  /** Which column each pixel belongs to. */
  owner: Int16Array;
  /** Sides of each column (0 where it touches the edge). */
  sides: number[];
}

/**
 * Cracks at each depth. At the cold surface they start wherever the rock first
 * gives, at random; deeper in, each crack follows the one above but is nudged
 * toward meeting its neighbours at even angles, so the pattern relaxes toward
 * hexagons. Drawn as points moving from random spots to a hexagonal grid.
 */
function columns(n: number): Pattern[] {
  const rng = makeRng(11 + n);
  const a = Math.sqrt((2 * CW * CH) / (Math.sqrt(3) * n));
  const home: [number, number][] = [];
  for (let r = 0, y = a / 2; y < CH + a; r++, y += (a * Math.sqrt(3)) / 2) {
    for (let x = (r % 2 ? a / 2 : 0) - a / 2; x < CW + a; x += a) home.push([x, y]);
  }
  const jitter = home.map(() => [(rng() - 0.5) * a * 1.1, (rng() - 0.5) * a * 1.1] as [number, number]);
  n = home.length;
  const out: Pattern[] = [];
  for (let step = 0; step <= MAX_STEPS; step++) {
    const loose = 0.42 + 0.58 * (1 - step / MAX_STEPS);
    const seeds = home.map(([x, y], k) => [x + jitter[k][0] * loose, y + jitter[k][1] * loose] as [number, number]);
    const owner = new Int16Array(CW * CH);
    for (let y = 0; y < CH; y++) {
      for (let x = 0; x < CW; x++) {
        let best = 0;
        let bd = Infinity;
        for (let k = 0; k < n; k++) {
          const d = (seeds[k][0] - x) ** 2 + (seeds[k][1] - y) ** 2;
          if (d < bd) { bd = d; best = k; }
        }
        owner[y * CW + x] = best;
      }
    }
    const touch = new Uint8Array(n);
    // Two columns are neighbours if they share a stretch of crack, not just a corner.
    const contact: Map<number, number>[] = Array.from({ length: n }, () => new Map());
    const meet = (a: number, b: number) => {
      if (a === b) return;
      contact[a].set(b, (contact[a].get(b) ?? 0) + 1);
      contact[b].set(a, (contact[b].get(a) ?? 0) + 1);
    };
    for (let y = 0; y < CH; y++) {
      for (let x = 0; x < CW; x++) {
        const o = owner[y * CW + x];
        if (x === 0 || y === 0 || x === CW - 1 || y === CH - 1) touch[o] = 1;
        if (x + 1 < CW) meet(o, owner[y * CW + x + 1]);
        if (y + 1 < CH) meet(o, owner[(y + 1) * CW + x]);
      }
    }
    const nb = contact.map((m) => [...m.values()].filter((v) => v >= 4));
    out.push({ owner, sides: nb.map((s, k) => (touch[k] ? 0 : s.length)) });
  }
  return out;
}

/** Hexagons blue-grey, every other shape a warmer brown. */
const HEX = '#5d6672';
const OTHER = '#8f7b69';

export const columnsFigure = figure(['hexagons'], (_ctx, t) => {
  const canvas = el('canvas', { width: CW, height: CH, role: 'img', 'aria-label': 'Looking down on the tops of the columns in a cooled lava flow.' }) as HTMLCanvasElement;
  canvas.style.cssText = `display:block;width:100%;height:auto;aspect-ratio:${CW} / ${CH};border-radius:4px;`;
  const ctx = canvas.getContext?.('2d') ?? null;
  const f = frame({ drawing: canvas, lines: 3 });
  let depth = 0;
  let speed = 1;
  const cache = new Map<number, Pattern[]>();
  const patternFor = () => {
    const n = [55, 100, 170][speed];
    if (!cache.has(n)) cache.set(n, columns(n));
    return cache.get(n)!;
  };
  const paint = () => {
    const p = patternFor()[depth];
    if (ctx) {
      const img = ctx.createImageData(CW, CH);
      for (let i = 0; i < p.owner.length; i++) {
        const o = p.owner[i];
        const x = i % CW;
        const edge = (x + 1 < CW && p.owner[i + 1] !== o) || (i + CW < p.owner.length && p.owner[i + CW] !== o);
        const s = p.sides[o];
        const c = rgbOf(edge ? '#1b1a1d' : s === 0 ? '#aaa59e' : s === 6 ? HEX : OTHER);
        img.data.set([c[0], c[1], c[2], 255], i * 4);
      }
      ctx.putImageData(img, 0, 0);
    }
    const inner = p.sides.filter((s) => s > 0);
    const hex = inner.filter((s) => s === 6).length / Math.max(1, inner.length);
    const mean = inner.reduce((a, b) => a + b, 0) / Math.max(1, inner.length);
    const pct = Math.round(hex * 100);
    f.readout.textContent = depth === 0
      ? `At the cold surface, cracks start wherever the rock first gives, in a jumble of shapes. Only ${pct}% of the columns are hexagons (blue-grey). Go deeper.`
      : hex > 0.6
        ? `${depth * 10} cm in, the cracks have settled into a pattern: ${pct}% of the columns are hexagons, and the average is ${mean.toFixed(1)} sides. Cracks meeting at even angles release the stress most evenly.`
        : `${depth * 10} cm in, each new crack follows the one above it, nudged toward meeting its neighbours at even angles. ${pct}% hexagons so far.`;
    if (hex > 0.6 && t.goal === 'hexagons') t.done();
  };
  const ds = slider('Depth into the flow', 0, MAX_STEPS, 1, 0, (v) => `${v * 10} cm`, (v) => { depth = v; paint(); }, 'heat');
  const ss = segmented([{ value: 0, label: 'Slow cooling' }, { value: 1, label: 'Medium' }, { value: 2, label: 'Fast' }] as const, 1, (v) => { speed = v; paint(); });
  f.controls.append(ss, ds.node);
  paint();
  return f.node;
});
