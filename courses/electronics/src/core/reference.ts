// The reference page: everything the lessons teach, set out to look things up
// at the bench rather than to read through. Its words are data/reference.json,
// one section per topic, in Didactics' reference format (blocks.ts): a section
// names the lesson it comes from, and one whose lesson is not written yet has
// no blocks and shows as coming soon. Circuitry adds one block type of its own.

import type { RefBlock, RefSection } from 'didactics/reference';
import type { FigureId } from './lessons';
import type { SymbolId } from '../app/circuit/symbols';
import data from '../data/reference.json';

/** Schematic symbols, each drawn as the figures draw it, with what it is and the lesson that brings it in. */
export interface SymbolsBlock {
  type: 'symbols';
  items: { symbol: SymbolId; name: string; means: string; lesson: string }[];
}

export type Block = RefBlock<FigureId> | SymbolsBlock;

export const REFERENCE: readonly RefSection<Block>[] = data.sections as RefSection<Block>[];
