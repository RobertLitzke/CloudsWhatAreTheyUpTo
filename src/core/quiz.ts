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
import { shuffle, type Rng } from './rng';
import concepts from '../data/quiz.json';

export type CardKind = 'photo' | 'made' | 'means' | 'floor' | 'idea';

export interface Card {
  id: string;
  kind: CardKind;
  question: string;
  /** The right answer is options[0]; the view shuffles them. */
  options: string[];
  why: string;
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

export interface Concept {
  id: string;
  question: string;
  options: string[];
  answer: number;
  why: string;
}

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
    cards.push({
      id: `idea:${c.id}`,
      kind: 'idea',
      question: c.question,
      options: [c.options[c.answer], ...c.options.filter((_, i) => i !== c.answer)],
      why: c.why,
    });
  }
  return cards;
}

// ---- Scheduling ------------------------------------------------------------------

/** Where a card stands: its box (0 = being learned) and when it is next due, in ms. */
export interface CardState {
  box: number;
  due: number;
}

const DAY = 24 * 60 * 60 * 1000;
/** The gap after a right answer, by the box the card moves into. */
export const GAPS_DAYS = [0, 1, 3, 7, 16, 35, 80];

/** The card's next state after an answer. */
export function review(prev: CardState | undefined, right: boolean, now: number): CardState {
  if (!right) return { box: 0, due: now };
  const box = Math.min((prev?.box ?? 0) + 1, GAPS_DAYS.length - 1);
  return { box, due: now + GAPS_DAYS[box] * DAY };
}

/**
 * A sitting: the cards due now, most overdue first, then up to `fresh` new
 * ones, `size` in all. New cards are dealt in a shuffled order so the kinds
 * are mixed, but with the photos and the plain facts ahead of the ideas.
 */
export function deal(deck: readonly Card[], states: Readonly<Record<string, CardState>>, now: number, size: number, fresh: number, rng: Rng): Card[] {
  const due = deck.filter((c) => states[c.id] && states[c.id].due <= now).sort((a, b) => states[a.id].due - states[b.id].due);
  const unseen = shuffle(deck.filter((c) => !states[c.id]), rng);
  const out = due.slice(0, size);
  for (const c of unseen) {
    if (out.length >= size || fresh <= 0) break;
    out.push(c);
    fresh--;
  }
  return shuffle(out, rng);
}

export interface Tally {
  due: number;
  fresh: number;
  learning: number;
  known: number;
}

/** Counts for the quiz page: due now, never seen, still being learned (box 1-2), and known (box 3 and up). */
export function tally(deck: readonly Card[], states: Readonly<Record<string, CardState>>, now: number): Tally {
  const t: Tally = { due: 0, fresh: 0, learning: 0, known: 0 };
  for (const c of deck) {
    const s = states[c.id];
    if (!s) t.fresh++;
    else {
      if (s.due <= now) t.due++;
      if (s.box >= 3) t.known++;
      else t.learning++;
    }
  }
  return t;
}
