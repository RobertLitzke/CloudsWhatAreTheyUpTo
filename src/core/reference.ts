// The reference page: everything the lessons teach, set out to look things up
// in the garden rather than to read through. Its words are data/reference.json,
// one section per topic. A section names the lesson it comes from; one whose
// lesson is not written yet has no blocks and shows as coming soon.

import type { FigureId } from './lessons';
import type { SubjectId } from './photos';
import data from '../data/reference.json';

export type RefBlock =
  /** A paragraph, with the same markup as lesson text. */
  | { kind: 'text'; text: string }
  /** Terms and what they mean. */
  | { kind: 'terms'; items: { term: string; means: string }[] }
  /** A table; the first column is the row's name. */
  | { kind: 'table'; columns: string[]; rows: string[][] }
  /** Numbered steps. */
  | { kind: 'steps'; items: string[] }
  /** A lesson figure, live, with no task. */
  | { kind: 'figure'; figure: FigureId; caption: string }
  /** A photo of a subject, or its drawing when there is none. */
  | { kind: 'picture'; subject: SubjectId; caption: string };

export interface RefSection {
  id: string;
  title: string;
  /** One line under the title, and the line in the contents. */
  summary: string;
  /** The lesson it comes from, by id. */
  lesson: string;
  blocks: RefBlock[];
}

export const REFERENCE: readonly RefSection[] = data.sections as RefSection[];
