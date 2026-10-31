// The reference page (Didactics' reference view): a contents list, then a
// section per topic. This course adds one block of its own, a picture.

import { glossaryFromFile, glossaryFromLessons, mergeGlossary, type GlossaryFile } from 'didactics/glossary';
import { referenceView as kitReferenceView } from 'didactics/reference';
import { lesson, LESSONS } from '../../core/lessons';
import { REFERENCE, type PictureBlock } from '../../core/reference';
import glossary from '../../data/glossary.json';
import { FIGURES } from '../figures';
import { prose } from '../figures/kit';
import { picture } from '../picture';
import { store } from '../store';

export const referenceView = kitReferenceView<ReturnType<typeof store.get>, PictureBlock>({
  sections: REFERENCE,
  store,
  prose: (t) => prose(t),
  figures: FIGURES,
  lessons: LESSONS,
  blurb: 'What the lessons teach, to look up in the field.',
  blocks: { picture: (b) => picture(b.subject, Math.random, b.caption) },
  glossary: {
    entries: mergeGlossary(glossaryFromFile(glossary as GlossaryFile), glossaryFromLessons(LESSONS)),
    prose: (t) => prose(t),
    lesson: (id) => {
      const l = lesson(id);
      return l ? { href: `#/lesson/${l.id}`, label: `Lesson ${l.n}` } : undefined;
    },
  },
});
