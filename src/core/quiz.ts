// Clouds' quiz deck. The scheduling is Didactics' quiz.ts.
//
// The quiz: plain flash cards, outside the lessons and the story, scheduled
// by spaced repetition. A card answered right comes back after longer and
// longer gaps; a card answered wrong starts over and comes back in the same
// sitting.
//
// The deck is built from what the app already knows: every photo in the
// library (name the cloud), every genus (what makes it, what it means, which
// floor), and hand-written questions on the ideas behind the lessons, kept in
// data/quiz.json so they can be edited like the lessons.

import { GENERA, floorInfo, genus, type Floor, type GenusId } from './clouds';
import type { FeatureId, Photo } from './photos';
import { conceptCard, type Card as KitCard, type Concept } from 'didactics/quiz';
import { shuffle, type Rng } from 'didactics/rng';
import concepts from '../data/quiz.json';

export type CardKind = 'photo' | 'made' | 'means' | 'floor' | 'idea';

export interface Card extends KitCard {
  kind: CardKind;
  photo?: Photo;
}

const FEATURE_NAMES: Record<FeatureId, string> = {
  lenticularis: 'Lens cloud (lenticularis)',
  mammatus: 'Mammatus pouches',
  fluctus: 'Breaking waves (fluctus)',
};

/** Up to three wrong answers: the genus's own look-alikes first, then any. */
function others(id: GenusId, rng: Rng): GenusId[] {
  const g = genus(id);
  const rest = shuffle(GENERA.map((x) => x.id).filter((x) => x !== id && !g.confused.includes(x)), rng);
  return [...g.confused, ...rest].slice(0, 3);
}

/**
 * Three wrong answers for a question about causes or weather: never a
 * look-alike, whose cause or weather can be close enough to read as right.
 */
function far(id: GenusId, rng: Rng): GenusId[] {
  const g = genus(id);
  return shuffle(GENERA.map((x) => x.id).filter((x) => x !== id && !g.confused.includes(x) && !genus(x).confused.includes(id)), rng).slice(0, 3);
}

const FLOOR_ANSWERS: Record<Floor, string> = {
  low: 'Low',
  middle: 'Middle',
  high: 'High',
  tower: 'All three',
};

/** The whole deck. Wrong answers are drawn with `rng`, so the deck is the same for the same seed. */
export function buildDeck(photos: readonly Photo[], rng: Rng): Card[] {
  const cards: Card[] = [];
  for (const p of photos) {
    if (p.feature) {
      const g = genus(p.genus);
      cards.push({
        id: `photo:${p.id}`,
        kind: 'photo',
        question: 'A rare one. What is it?',
        options: [FEATURE_NAMES[p.feature], ...Object.entries(FEATURE_NAMES).filter(([k]) => k !== p.feature).map(([, v]) => v), g.name],
        why: `${FEATURE_NAMES[p.feature]}, a rare form of ${g.name.toLowerCase()}.`,
        photo: p,
      });
    } else {
      const g = genus(p.genus);
      cards.push({
        id: `photo:${p.id}`,
        kind: 'photo',
        question: 'What cloud is this?',
        options: [g.name, ...others(g.id, rng).map((o) => genus(o).name)],
        why: `${g.name}. ${g.look}`,
        photo: p,
      });
    }
  }
  for (const g of GENERA) {
    const wrong = far(g.id, rng).map((o) => genus(o));
    cards.push({
      id: `made:${g.id}`,
      kind: 'made',
      question: `What makes ${g.name.toLowerCase()}?`,
      options: [g.made, ...wrong.map((w) => w.made)],
      why: `${g.name}: ${g.made}`,
    });
    cards.push({
      id: `cause:${g.id}`,
      kind: 'made',
      question: `Which cloud is made like this? “${g.made}”`,
      options: [g.name, ...wrong.map((w) => w.name)],
      why: `${g.name}. ${g.look}`,
    });
    cards.push({
      id: `means:${g.id}`,
      kind: 'means',
      question: `You see ${g.name.toLowerCase()}. What does it usually mean for the weather?`,
      options: [g.means, ...wrong.map((w) => w.means)],
      why: `${g.name}: ${g.means}`,
    });
    const f = floorInfo(g.floor);
    cards.push({
      id: `floor:${g.id}`,
      kind: 'floor',
      question: `Which floor of the sky is ${g.name.toLowerCase()} on?`,
      options: [FLOOR_ANSWERS[g.floor], ...(['low', 'middle', 'high', 'tower'] as Floor[]).filter((x) => x !== g.floor).map((x) => FLOOR_ANSWERS[x])],
      why: g.floor === 'tower' ? `${g.name} starts on the low floor and reaches the top of the sky.` : `${g.name} is on the ${f.name.toLowerCase()} floor, made of ${f.stuff}.`,
    });
  }
  for (const c of concepts.cards as Concept[]) {
    cards.push({ ...conceptCard(c), kind: 'idea' });
  }
  return cards;
}

export { deal, GAPS_DAYS, review, tally, type CardState, type Tally } from 'didactics/quiz';
