// Vowels as two formants: lesson 2's figure, the vowel engine and the
// vocoder figure (branch lesson O4) all use these.

/** Rough average formants of an adult speaker (Peterson and Barney's 1952 measurements, rounded). */
export const VOWELS: readonly { name: string; as: string; f1: number; f2: number }[] = [
  { name: 'ee', as: 'heed', f1: 280, f2: 2250 },
  { name: 'eh', as: 'head', f1: 550, f2: 1800 },
  { name: 'ah', as: 'father', f1: 750, f2: 1100 },
  { name: 'aw', as: 'law', f1: 600, f2: 900 },
  { name: 'oo', as: 'who', f1: 310, f2: 850 },
];

/** The two formants at a place along the vowels (0 is ee, 1 is oo), blended on a log scale between neighbours. */
export function formantsAt(pos: number): { f1: number; f2: number } {
  const p = Math.min(1, Math.max(0, pos)) * (VOWELS.length - 1);
  const i = Math.min(VOWELS.length - 2, Math.floor(p));
  const f = p - i;
  const mix = (a: number, b: number) => a * Math.pow(b / a, f);
  return { f1: mix(VOWELS[i].f1, VOWELS[i + 1].f1), f2: mix(VOWELS[i].f2, VOWELS[i + 1].f2) };
}

/** The vowel engine's formant shift: a smaller or larger mouth, by Timbre (×0.7 to ×1.4, ×1 at 50 %). */
export const mouth = (timbre: number) => 0.7 * Math.pow(2, timbre);
