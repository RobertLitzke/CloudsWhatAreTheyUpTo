// The reference page (Didactics' reference.ts): a contents list, then a
// section per topic. Circuitry draws its own symbols block; the rest,
// glossary included, is Didactics'.

import { el } from 'didactics/dom';
import { glossaryFromFile, glossaryFromLessons, mergeGlossary, type GlossaryFile } from 'didactics/glossary';
import { referenceView as kitReferenceView } from 'didactics/reference';
import { LESSONS } from '../../core/lessons';
import { REFERENCE, type SymbolsBlock } from '../../core/reference';
import type { SaveData } from '../../core/save';
import glossary from '../../data/glossary.json';
import { symbolDrawing } from '../circuit/symbols';
import { FIGURES } from '../figures';
import { prose } from '../figures/kit';
import { store } from '../store';

export const referenceView = kitReferenceView<SaveData, SymbolsBlock>({
  sections: REFERENCE,
  store,
  prose: (t) => prose(t),
  figures: FIGURES,
  lessons: LESSONS,
  blurb: 'What the lessons teach, to look up at the bench.',
  blocks: {
    symbols: (b, ctx) =>
      el('div.symbols', {}, b.items.map((s) => {
        const from = ctx.lessonLink(s.lesson);
        return el('div.symbol', {},
          symbolDrawing(s.symbol, s.name),
          el('div', {},
            el('h3', {}, s.name),
            ctx.prose(s.means),
            from ? el('a.symbol-lesson', { href: from.href }, from.label) : null,
          ),
        );
      })),
  },
  glossary: {
    entries: mergeGlossary(glossaryFromFile(glossary as GlossaryFile), glossaryFromLessons(LESSONS)),
    prose: (t) => prose(t),
    lesson: (id) => {
      const l = LESSONS.find((x) => x.id === id);
      return l ? { href: `#/lesson/${l.id}`, label: `Lesson ${l.n}` } : undefined;
    },
  },
});
