// The journal's glossary: the ten clouds, the core terms in data/glossary.json,
// and every technical footnote in the lessons (Didactics' glossary.ts).

import { glossaryFromFile, glossaryFromLessons, mergeGlossary, type GlossaryEntry, type GlossaryFile } from 'didactics/glossary';
import file from '../data/glossary.json';
import { GENERA, type GenusId } from './clouds';
import { SHIFTS } from './shifts';

/** The lesson that introduces a cloud. */
export const lessonOf = (id: GenusId) => SHIFTS.find((s) => s.clouds.includes(id));

/** The ten clouds, defined by how they look. */
export function cloudEntries(): GlossaryEntry[] {
  return GENERA.map((g) => ({ id: g.id, term: g.name, text: g.look, lesson: lessonOf(g.id)?.id, also: [g.abbr] }));
}

export const TERMS: GlossaryEntry[] = glossaryFromFile(file.terms as GlossaryFile);

/** Everything, A to Z. A term listed twice keeps the first: a cloud, then the file, then a footnote. */
export const GLOSSARY: GlossaryEntry[] = mergeGlossary(cloudEntries(), TERMS, glossaryFromLessons(SHIFTS));
