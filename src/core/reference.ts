// The reference page: everything the lessons teach, set out to look things up
// in the field rather than to read through. Its words are data/reference.json,
// one section per topic, in Didactics' reference format (didactics/reference).
// A section names the lesson it comes from; one whose lesson is not written
// yet has no blocks and shows as coming soon.

import type { RefBlock, RefSection } from 'didactics/reference';
import type { FigureId } from './lessons';
import type { SubjectId } from './photos';
import data from '../data/reference.json';

/** The block this course adds to Didactics' own: a photo of a subject, or its drawing when there is none. */
export type PictureBlock = { type: 'picture'; subject: SubjectId; caption: string };

export type Block = RefBlock<FigureId> | PictureBlock;

export const REFERENCE: readonly RefSection<Block>[] = data.sections as RefSection<Block>[];
