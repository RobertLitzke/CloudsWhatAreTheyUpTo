// The reference page, drawn by Didactics; Dirt adds its photo block and the
// glossary built from data/glossary.json and the lessons' technical notes.

import { glossaryFromFile, glossaryFromLessons, mergeGlossary, type GlossaryFile } from 'didactics/glossary';
import { referenceView as reference } from 'didactics/reference';
import { lesson, LESSONS } from '../../core/lessons';
import glossary from '../../data/glossary.json';
import { REFERENCE, type PictureBlock } from '../../core/reference';
import { FIGURES } from '../figures';
import { prose } from '../figures/kit';
import { picture } from '../picture';
import { store } from '../store';

export const referenceView = reference<ReturnType<typeof store.get>, PictureBlock>({
  sections: REFERENCE,
  store,
  prose: (t) => prose(t),
  figures: FIGURES,
  lessons: LESSONS,
  blocks: { picture: (b) => picture(b.subject, Math.random, b.caption) },
  glossary: {
    entries: mergeGlossary(glossaryFromFile(glossary as GlossaryFile), glossaryFromLessons(LESSONS)),
    prose: (t) => prose(t),
    lesson: (id) => {
      const l = lesson(id);
      return l ? { href: `#/lesson/${l.id}`, label: `Lesson ${l.n}` } : undefined;
    },
  },
  blurb: 'What the lessons teach, to look up in the garden.',
});
