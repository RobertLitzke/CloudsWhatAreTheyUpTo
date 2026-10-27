// The lessons: a gardener's workbook on soil, in eight short illustrated
// articles. Each is paragraphs and live figures to play with, in parts; the
// next part opens once the figures in this one have had their small task done.
// The last part is a check, and the lesson ends with a log to sign.
//
// Each lesson opens on a gardener's question, meets the thing before it names
// it, and ends with something to try in the garden. A lesson with no parts is
// planned and not yet written; it shows as coming soon and its route goes
// home. Each lesson's words are a JSON file in data/lessons.
//
// The lesson format and the view that reads it are lesson-kit's lesson.ts.
// Text takes a little markup (see app/figures/kit.ts prose): **bold**,
// *italic*, [[words|colour]] to tie a word to the same colour in a figure, and
// [^id] for a note from the lesson's `footnotes`, which opens in a popup.

import type { Block as KitBlock, Lesson as KitLesson, Part as KitPart } from 'lesson-kit/lesson';
import madeOf from '../data/lessons/made-of.json';
import water from '../data/lessons/water.json';
import foodWeb from '../data/lessons/food-web.json';
import organicMatter from '../data/lessons/organic-matter.json';
import structure from '../data/lessons/structure.json';
import nutrients from '../data/lessons/nutrients.json';
import seasons from '../data/lessons/seasons.json';
import diagnosis from '../data/lessons/diagnosis.json';

export const FIGURE_IDS = [
  'handful', 'surface', 'sizes', 'feel', 'jar', 'triangle',
  'pores', 'rain', 'drying',
  'teaspoon', 'web',
  'heap', 'rot',
  'crumb', 'slake',
  'parking', 'ph', 'leaf',
  'year',
  'detective',
  'photo', 'check',
] as const;
export type FigureId = (typeof FIGURE_IDS)[number];

export type Block = KitBlock<FigureId>;
export type Part = KitPart<FigureId>;
export type Lesson = KitLesson<FigureId>;

export const LESSONS: readonly Lesson[] = [
  madeOf as Lesson,
  water as Lesson,
  foodWeb as Lesson,
  organicMatter as Lesson,
  structure as Lesson,
  nutrients as Lesson,
  seasons as Lesson,
  diagnosis as Lesson,
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
