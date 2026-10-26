// Who lives in soil: how many of each in a teaspoon of healthy garden soil,
// who eats whom, and what each does for a plant. Counts are the ranges given
// in the USDA NRCS Soil Biology Primer for farmland and garden soils. Pure
// TypeScript, no DOM.

export type Dweller = 'roots' | 'litter' | 'bacteria' | 'fungi' | 'protozoa' | 'nematodes' | 'arthropods' | 'worms' | 'birds';

export const DWELLERS: readonly Dweller[] = ['roots', 'litter', 'bacteria', 'fungi', 'protozoa', 'nematodes', 'arthropods', 'worms', 'birds'];

export interface DwellerInfo {
  name: string;
  /** What it does in a line, for the figure's readout. */
  does: string;
  /** What the bed loses without it. */
  without: string;
}

export const INFO: Record<Dweller, DwellerInfo> = {
  roots: {
    name: 'Plant roots',
    does: 'Roots leak sugars into the soil around them, as much as a fifth of what the leaves make, and feed the crowd that gathers there.',
    without: 'With no living roots, the bacteria and fungi that feed on root sugars dwindle, and so does everything that eats them.',
  },
  litter: {
    name: 'Dead plants',
    does: 'Fallen leaves, old roots and compost: the food at the bottom of the web, for everything that cannot feed on a living root.',
    without: 'With nothing dead to eat, the decomposers starve, and the soil slowly loses its organic matter.',
  },
  bacteria: {
    name: 'Bacteria',
    does: 'Single cells that eat root sugars and dead matter, lock nutrients up in their bodies, and make the gums that stick grains together.',
    without: 'Without bacteria, dead matter barely rots and nothing feeds the protozoa and nematodes that release their nutrients.',
  },
  fungi: {
    name: 'Fungi',
    does: 'Threads that break down tough woody matter, and partners that join roots and reach water and phosphorus a root cannot.',
    without: 'Without fungi, woody matter piles up, crumbs fall apart sooner, and plants lose their reach for phosphorus and water.',
  },
  protozoa: {
    name: 'Protozoa',
    does: 'Single cells that hunt bacteria. A bacterium holds more nitrogen than a protozoan needs, so the surplus comes out right by the roots.',
    without: 'Without protozoa, the nitrogen stays locked inside the bacteria, out of a plant’s reach.',
  },
  nematodes: {
    name: 'Nematodes',
    does: 'Tiny worms, most of them harmless: they graze bacteria and fungi and release nitrogen as protozoa do. A few eat roots.',
    without: 'Without nematodes, less nitrogen is released, and the bacteria and fungi are kept in check by less.',
  },
  arthropods: {
    name: 'Mites, springtails and beetles',
    does: 'Shredders chew dead leaves into pieces small enough for fungi and bacteria; hunters keep the shredders and nematodes in check.',
    without: 'Without the shredders, dead leaves sit whole on the surface for far longer.',
  },
  worms: {
    name: 'Earthworms',
    does: 'They pull dead leaves underground, eat soil with it, and leave behind casts rich in nutrients and burrows that let water and roots in.',
    without: 'Without worms, the litter stays on top, the soil is less mixed, and rain has fewer ways in.',
  },
  birds: {
    name: 'Birds, moles and beetles above',
    does: 'The top of the web: they eat worms and insects, and their droppings and bodies go back into the soil.',
    without: 'Without them, worms and insects are kept in check only by each other.',
  },
};

/** Who eats whom: [eater, eaten]. */
export const EATS: readonly [Dweller, Dweller][] = [
  ['bacteria', 'roots'],
  ['bacteria', 'litter'],
  ['fungi', 'litter'],
  ['fungi', 'roots'],
  ['protozoa', 'bacteria'],
  ['nematodes', 'bacteria'],
  ['nematodes', 'fungi'],
  ['nematodes', 'roots'],
  ['arthropods', 'litter'],
  ['arthropods', 'fungi'],
  ['arthropods', 'nematodes'],
  ['worms', 'litter'],
  ['worms', 'bacteria'],
  ['birds', 'worms'],
  ['birds', 'arthropods'],
];

export const eatenBy = (d: Dweller): Dweller[] => EATS.filter(([, b]) => b === d).map(([a]) => a);
export const eats = (d: Dweller): Dweller[] => EATS.filter(([a]) => a === d).map(([, b]) => b);

/** Everything that starves, directly or down the chain, when `gone` is taken out. */
export function starves(gone: Dweller): Dweller[] {
  const lost = new Set<Dweller>([gone]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of DWELLERS) {
      if (lost.has(d) || d === 'roots' || d === 'litter') continue;
      const food = eats(d);
      if (food.length && food.every((f) => lost.has(f))) {
        lost.add(d);
        changed = true;
      }
    }
  }
  lost.delete(gone);
  return [...lost];
}

/**
 * How many of each live in a teaspoon (about 5 g) of healthy garden soil, as
 * a low and a high count. Fungi are measured by the length of their threads,
 * in metres; earthworms by the square metre of ground, not the teaspoon.
 */
export const TEASPOON = [
  { who: 'bacteria', low: 1e8, high: 1e9, unit: 'cells' },
  { who: 'fungi', low: 1, high: 40, unit: 'metres of thread' },
  { who: 'protozoa', low: 5e3, high: 5e4, unit: 'cells' },
  { who: 'nematodes', low: 10, high: 20, unit: 'worms' },
] as const;

/** The number of people on Earth, for scale. */
export const PEOPLE = 8.2e9;

/** A big count said the way a person would: 120 million, 3 thousand. */
export function sayCount(n: number): string {
  if (n >= 1e9) return `${+(n / 1e9).toPrecision(2)} billion`;
  if (n >= 1e6) return `${+(n / 1e6).toPrecision(2)} million`;
  if (n >= 1e4) return `${+(n / 1e3).toPrecision(2)} thousand`;
  return String(Math.round(n));
}
