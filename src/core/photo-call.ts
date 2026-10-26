// The radio check at the end of a shift: photos are shown one at a time and the
// watcher calls in what each one is. Dealing is seeded, so a check can be
// dealt again exactly.

import { genus, type Floor, type GenusId } from './clouds';
import { mirrorFor, photosOf, type Photo } from './photos';
import { shuffle, type Rng } from 'lesson-kit/rng';

export interface Call {
  genus: GenusId;
  /** The photo to show, or null when the library has none for this genus and a drawing stands in. */
  photo: Photo | null;
  /** Show the photo flipped left to right, for variety. */
  mirrored: boolean;
  answer: Floor;
}

/**
 * Deal `count` calls over the given genera. Each genus is used before any is
 * repeated, and when the library has photos of a genus they are used before
 * any is repeated, so a short check is as varied as the library allows.
 */
export function dealFloorCalls(pool: readonly GenusId[], library: readonly Photo[], count: number, rng: Rng): Call[] {
  if (pool.length === 0) return [];
  const calls: Call[] = [];
  const used = new Set<string>();
  let order: GenusId[] = [];
  while (calls.length < count) {
    if (order.length === 0) {
      order = shuffle(pool, rng);
      // Never the same genus twice in a row across a reshuffle.
      if (calls.length && order.length > 1 && order[0] === calls[calls.length - 1].genus) order.push(order.shift()!);
    }
    const id = order.shift()!;
    const mine = photosOf(library, id);
    const fresh = mine.filter((p) => !used.has(p.id));
    const choices = fresh.length ? fresh : mine;
    const photo = choices.length ? choices[Math.floor(rng() * choices.length)] : null;
    if (photo) used.add(photo.id);
    calls.push({ genus: id, photo, mirrored: photo ? mirrorFor(photo, rng) : false, answer: genus(id).floor });
  }
  return calls;
}
