// Compost and organic matter: the carbon and nitrogen in common materials, the
// ratio a heap of them makes, and how a pile of dead plants rots away over the
// years, leaving humus. Pure TypeScript, no DOM.

export type Material = 'leaves' | 'straw' | 'chips' | 'cardboard' | 'grass' | 'scraps' | 'manure' | 'coffee';

export interface MaterialInfo {
  name: string;
  kind: 'brown' | 'green';
  /** Nitrogen, as a percentage of dry weight. */
  n: number;
  /** Carbon to nitrogen, by weight. */
  cn: number;
  /**
   * How a bucket of it rots: the shares that go fast (sugars and proteins,
   * weeks), at a middling pace (cellulose, months) and slowly (lignin, years).
   */
  pools: [fast: number, middle: number, slow: number];
}

/**
 * Typical values from the Cornell Waste Management Institute and the On-Farm
 * Composting Handbook (NRAES-54). Real materials vary by half again either way.
 */
export const MATERIALS: Record<Material, MaterialInfo> = {
  leaves: { name: 'Autumn leaves', kind: 'brown', n: 0.9, cn: 55, pools: [0.25, 0.5, 0.25] },
  straw: { name: 'Straw', kind: 'brown', n: 0.6, cn: 80, pools: [0.2, 0.6, 0.2] },
  chips: { name: 'Wood chips', kind: 'brown', n: 0.15, cn: 350, pools: [0.05, 0.55, 0.4] },
  cardboard: { name: 'Cardboard', kind: 'brown', n: 0.1, cn: 400, pools: [0.1, 0.7, 0.2] },
  grass: { name: 'Grass clippings', kind: 'green', n: 3.2, cn: 15, pools: [0.6, 0.32, 0.08] },
  scraps: { name: 'Kitchen scraps', kind: 'green', n: 2.5, cn: 15, pools: [0.65, 0.3, 0.05] },
  manure: { name: 'Horse manure', kind: 'green', n: 1.6, cn: 25, pools: [0.35, 0.45, 0.2] },
  coffee: { name: 'Coffee grounds', kind: 'green', n: 2.1, cn: 20, pools: [0.3, 0.5, 0.2] },
};

export const MATERIAL_IDS = Object.keys(MATERIALS) as Material[];

/** The carbon-to-nitrogen ratio of a heap, from parts by dry weight of each material. */
export function heapRatio(parts: Partial<Record<Material, number>>): number | null {
  let c = 0;
  let n = 0;
  for (const id of MATERIAL_IDS) {
    const w = parts[id] ?? 0;
    const m = MATERIALS[id];
    n += (w * m.n) / 100;
    c += (w * m.n * m.cn) / 100;
  }
  return n > 0 ? c / n : null;
}

export type HeapVerdict = 'empty' | 'smelly' | 'hot' | 'slow' | 'stalled';

/** What a heap of that ratio will do, kept moist and turned now and then. */
export function verdict(ratio: number | null): HeapVerdict {
  if (ratio === null) return 'empty';
  if (ratio < 20) return 'smelly';
  if (ratio <= 40) return 'hot';
  if (ratio <= 80) return 'slow';
  return 'stalled';
}

export const VERDICTS: Record<HeapVerdict, string> = {
  empty: 'An empty bin. Add a bucket to start.',
  smelly: 'Too many greens: the microbes have more nitrogen than they can use, so the excess escapes as smelly ammonia gas and the pile slumps into a wet mat.',
  hot: 'Well balanced. The microbes have enough carbon for energy and nitrogen to build proteins, so a full-sized heap will heat up and turn to compost in a few months.',
  slow: 'A bit brown-heavy. The pile will still break down, though it will stay cool and take a year or more.',
  stalled: 'Far too brown. The microbes are short of nitrogen, so the pile will sit for years without much decay.',
};

// ---- Rotting away --------------------------------------------------------------

/** Half-lives, in months, of the fast, middle and slow parts of dead plant matter in a garden soil. */
export const HALF_LIFE_MONTHS: [number, number, number] = [0.75, 5, 48];

/** The share of the slow part that ends up as stable humus rather than air, once it has rotted. */
export const TO_HUMUS = 0.35;

export interface Remains {
  /** What is left of each part, as shares of what went in. */
  fast: number;
  middle: number;
  slow: number;
  /** Humus made so far, as a share of what went in. */
  humus: number;
  /** The rest went back to the air as carbon dioxide, and to the soil's life as food. */
  gone: number;
}

/** What is left of a bucket of `material`, `months` after it went into the soil. */
export function remains(material: Material, months: number): Remains {
  const [pf, pm, ps] = MATERIALS[material].pools;
  const left = (h: number) => Math.pow(0.5, months / h);
  const fast = pf * left(HALF_LIFE_MONTHS[0]);
  const middle = pm * left(HALF_LIFE_MONTHS[1]);
  const slow = ps * left(HALF_LIFE_MONTHS[2]);
  // Humus comes from the woody part as it rots, and from the bodies of the microbes that ate the rest.
  const humus = TO_HUMUS * (ps - slow) + 0.1 * (pf - fast + pm - middle);
  return { fast, middle, slow, humus, gone: 1 - fast - middle - slow - humus };
}
