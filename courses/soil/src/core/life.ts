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
    does: 'Roots release up to a fifth of the plant\'s sugars into the surrounding soil, feeding the microbes that gather there.',
    without: 'With no living roots, the bacteria and fungi that rely on root sugars dwindle, along with the predators that eat them.',
  },
  litter: {
    name: 'Dead plants',
    does: 'Fallen leaves, dead roots and compost feed the decomposers at the base of the food web.',
    without: 'Without dead plant matter to eat, decomposers starve and the soil gradually loses its organic matter.',
  },
  bacteria: {
    name: 'Bacteria',
    does: 'Single-celled microbes that eat root sugars and dead matter, store nutrients in their bodies, and produce sticky gums that hold soil grains together.',
    without: 'Without bacteria, soft plant matter rots much slower, and the protozoa and nematodes that release bacterial nutrients go hungry.',
  },
  fungi: {
    name: 'Fungi',
    does: 'Microscopic threads that break down tough, woody debris, or partner with roots to fetch water and phosphorus from tiny soil pores.',
    without: 'Without fungi, woody debris piles up, soil clumps fall apart more easily, and plants have a harder time reaching phosphorus and water.',
  },
  protozoa: {
    name: 'Protozoa',
    does: 'Single-celled predators that hunt bacteria. Because bacteria contain more nitrogen than a protozoan needs, the excess is excreted right by the roots.',
    without: 'Without protozoa, much of that nitrogen stays locked inside bacterial cells where plants cannot reach it.',
  },
  nematodes: {
    name: 'Nematodes',
    does: 'Microscopic worms that mostly graze on bacteria and fungi, releasing extra nitrogen just like protozoa do, though a few species eat plant roots.',
    without: 'Without nematodes, less nitrogen is released for plants, and fewer predators keep bacteria and fungi in check.',
  },
  arthropods: {
    name: 'Mites, springtails and beetles',
    does: 'Some chew fallen leaves into tiny bits that fungi and bacteria can digest, while predatory species hunt nematodes and other small insects.',
    without: 'Without these chewing creatures, fallen leaves sit intact on the soil surface for much longer.',
  },
  worms: {
    name: 'Earthworms',
    does: 'Worms drag fallen leaves underground and swallow soil, leaving behind nutrient-rich casts and burrows that carry air, water and roots downward.',
    without: 'Without worms, leaf litter stays on the surface, the soil is poorly mixed, and heavy rain drains more slowly.',
  },
  birds: {
    name: 'Birds, moles and beetles above',
    does: 'Top predators that hunt worms and insects, eventually returning nutrients to the soil through their droppings and bodies.',
    without: 'Without top predators, worm and insect numbers are only kept in check by their food supply and each other.',
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
