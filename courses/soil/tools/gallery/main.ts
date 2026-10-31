// Every figure on one page, with its caption from the lessons, for checking
// drawings without playing through: `npm run dev`, then open /figures.html.
// Only the dev server serves it; the build ships index.html alone.

import '../../src/app/styles/app.css';
import { isDiagram, type DiagramBlock } from 'didactics/blocks';
import { el } from 'didactics/dom';
import { FIGURES } from '../../src/app/figures';
import type { FigureContext } from '../../src/app/figures/kit';
import { emptySave } from '../../src/core/save';
import { LESSONS, type FigureId } from '../../src/core/lessons';

const save = emptySave();
if (location.search.includes('metric')) save.units = 'metric';
const ctx: FigureContext = { save, closed: new AbortController().signal, score: () => {} };

const uses = new Map<FigureId, DiagramBlock<FigureId>>();
for (const l of LESSONS) for (const p of l.parts) for (const b of p.blocks) if (isDiagram(b) && !uses.has(b.id)) uses.set(b.id, b);

const only = new URLSearchParams(location.search).get('only');
const article = el('article.article');
for (const id of Object.keys(FIGURES) as FigureId[]) {
  if (only && only !== id) continue;
  const b = uses.get(id);
  const handle = FIGURES[id](ctx, b?.goal, b?.options);
  const caption = el('p.fig-lead', {}, `${id}: ${b?.caption ?? '(not in any lesson)'}`);
  const box = handle.node.querySelector('.fig-text');
  if (box) box.prepend(caption);
  article.append(el('figure.fig', { 'data-figure': id }, handle.node, box ? null : el('div.fig-text', {}, caption)));
}
document.getElementById('app')!.append(el('main.view', {}, el('div.paper', {}, article)));
