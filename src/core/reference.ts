// The reference page: everything the lessons teach, set out to look things up
// in the garden rather than to read through. Its words are data/reference.json,
// one section per topic, in Didactics' reference format (didactics/reference).
// A section names the lesson it comes from; one whose lesson is not written
// yet has no blocks and shows as coming soon.

import type { RefBlock, RefSection as KitSection } from 'didactics/reference';
import type { FigureId } from './lessons';
import type { SubjectId } from './photos';
import data from '../data/reference.json';

/** Dirt's own block: a photo of a subject, or its drawing when there is none. */
export type PictureBlock = { type: 'picture'; subject: SubjectId; caption: string };

export type RefSection = KitSection<RefBlock<FigureId> | PictureBlock>;

export const REFERENCE: readonly RefSection[] = data.sections as RefSection[];
