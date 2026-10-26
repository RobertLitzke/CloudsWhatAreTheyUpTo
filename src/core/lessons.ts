// The lessons: a gardener's workbook on soil, in nine short illustrated
// articles. Each is paragraphs and live figures to play with, in parts; the
// next part opens once the figures in this one have had their small task done.
// The last part is a check, and the lesson ends with a log to sign.
//
// PLAN is the whole series, so the home page can show where it is going. A
// lesson with no parts is planned and not yet written; it shows as coming soon
// and its route goes home. Each written lesson's words are a JSON file in
// data/lessons.
//
// The lesson format and the view that reads it are lesson-kit's lesson.ts.
// Text takes a little markup (see app/figures/kit.ts prose): **bold**,
// *italic*, and [[words|colour]] to tie a word to the same colour in a figure.

import type { Block as KitBlock, Lesson as KitLesson, Part as KitPart } from 'lesson-kit/lesson';
import madeOf from '../data/lessons/made-of.json';

export const FIGURE_IDS = ['handful', 'sizes', 'jar', 'triangle', 'check'] as const;
export type FigureId = (typeof FIGURE_IDS)[number];

export type Block = KitBlock<FigureId>;
export type Part = KitPart<FigureId>;
export type Lesson = KitLesson<FigureId>;

/** A lesson that is planned but not written: its place in the series and what it will teach. */
const planned = (id: string, n: number, title: string, teaches: string): Lesson => ({ id, n, title, teaches, parts: [], learned: [], next: '', journal: [] });

export const LESSONS: readonly Lesson[] = [
  madeOf as Lesson,
  planned('structure', 2, 'Crumbs and pores', 'How soil grains build into crumbs, why air matters to roots, and what digging and footsteps do'),
  planned('water', 3, 'Holding water', 'How water soaks in, drains and clings, and how mulch and organic matter keep it there'),
  planned('food-web', 4, 'The soil food web', 'The bacteria, fungi, worms and others that live in soil, and what they do for plants'),
  planned('organic-matter', 5, 'Compost and organic matter', 'Greens and browns, the carbon-to-nitrogen ratio, and how compost becomes humus'),
  planned('nutrients', 6, 'Feeding plants', 'Nitrogen, phosphorus, potassium and the rest: what each does, which move, and how to read a leaf'),
  planned('ph', 7, 'pH and holding on', 'How acidity decides which nutrients a plant can reach, and how soil holds them'),
  planned('seasons', 8, 'Building soil over the seasons', 'Cover crops, nitrogen fixers, rotation and mulch: soil care through the year'),
  planned('diagnosis', 9, 'Reading your soil', 'Putting it together: a soil test, the signs in your plants, and what to do about them'),
];

export const isWritten = (l: Lesson): boolean => l.parts.length > 0;

export function lesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

/** A multiple-choice question in a lesson's check, with an optional picture of a subject above it. */
export interface Question {
  picture?: string;
  question: string;
  options: string[];
  answer: number;
  why: string;
}
