// The reference page: a contents list, then a section per topic. A section
// whose lesson is not written yet shows only its title and what it will hold.

import { el } from 'lesson-kit/dom';
import { glossaryFromFile, glossaryFromLessons, glossaryView, mergeGlossary, type GlossaryFile } from 'lesson-kit/glossary';
import type { View } from 'lesson-kit/router';
import { lesson, LESSONS } from '../../core/lessons';
import glossary from '../../data/glossary.json';
import { REFERENCE, type RefBlock, type RefSection } from '../../core/reference';
import { FIGURES } from '../figures';
import { prose } from '../figures/kit';
import { picture } from '../picture';
import { getSave } from '../store';

function block(b: RefBlock, closed: AbortSignal): HTMLElement {
  switch (b.kind) {
    case 'text':
      return prose(b.text);
    case 'terms':
      return el('dl.terms', {}, b.items.flatMap((t) => [el('dt', {}, t.term), el('dd', {}, t.means)]));
    case 'table':
      return el('div.table-wrap', {}, el('table.ref-table', {},
        el('thead', {}, el('tr', {}, b.columns.map((c) => el('th', {}, c)))),
        el('tbody', {}, b.rows.map((r) => el('tr', {}, r.map((c) => el('td', {}, c))))),
      ));
    case 'steps':
      return el('ol.steps', {}, b.items.map((s) => el('li', {}, s)));
    case 'figure': {
      const handle = FIGURES[b.figure]({ save: getSave(), closed, score: () => {} });
      const caption = el('p.fig-lead', {}, b.caption);
      const box = handle.node.querySelector('.fig-text');
      if (box) box.prepend(caption);
      return el('figure.fig', {}, handle.node, box ? null : el('div.fig-text', {}, caption));
    }
    case 'picture':
      return picture(b.subject, Math.random, b.caption);
    case 'glossary':
      return glossaryView({
        entries: mergeGlossary(glossaryFromFile(glossary as GlossaryFile), glossaryFromLessons(LESSONS)),
        prose: (t) => prose(t),
        lesson: (id) => {
          const l = lesson(id);
          return l ? { href: `#/lesson/${l.id}`, label: `Lesson ${l.n}` } : undefined;
        },
      });
  }
}

export const referenceView: View = (root) => {
  const closed = new AbortController();
  const nodes = new Map<string, HTMLElement>();
  const section = (s: RefSection) => {
    const from = lesson(s.lesson);
    const soon = s.blocks.length === 0;
    const node = el(
      'section.ref-section',
      { className: `ref-section${soon ? ' soon' : ''}`, id: `ref-${s.id}` },
      el('h2', {}, s.title),
      el('p.summary', {}, s.summary + '.'),
      soon ? el('p', {}, from ? `Comes with lesson ${from.n}, “${from.title}”.` : 'Coming.') : s.blocks.map((b) => block(b, closed.signal)),
      !soon && from ? el('p.from-lesson', {}, 'From ', el('a', { href: `#/lesson/${from.id}` }, `lesson ${from.n}, “${from.title}”`), '.') : null,
    );
    nodes.set(s.id, node);
    return node;
  };
  // Buttons, not links: the hash is the router's.
  const contents = el('ol.contents', {}, REFERENCE.map((s) => el('li', { className: s.blocks.length ? '' : 'soon' },
    el('button', { type: 'button', onclick: () => nodes.get(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, s.title, el('span', {}, s.blocks.length ? s.summary : 'coming')),
  )));
  root.append(el('div.page.reference', {},
    el('h1', {}, 'Reference'),
    el('p.muted', {}, 'What the lessons teach, to look up in the field.'),
    contents,
    REFERENCE.map(section),
  ));
  return () => closed.abort();
};
