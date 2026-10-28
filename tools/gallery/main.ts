// Every figure on one page, with its caption from the lessons, for checking
// drawings without playing through: `npm run dev`, then open /figures.html.
// Only the dev server serves it; the build ships index.html alone.

import '../../src/app/styles/app.css';
import { el } from 'didactics/dom';
import { FIGURES } from '../../src/app/figures';
import type { FigureContext } from '../../src/app/figures/kit';
import { emptySave } from '../../src/core/save';
import { SHIFTS, type Block, type FigureId, type Forecast } from '../../src/core/shifts';
import { forecastPicture } from '../../src/app/figures/quizzes';

const save = emptySave();
if (location.search.includes('imperial')) save.units = 'imperial';
const ctx: FigureContext = { save, closed: new AbortController().signal, score: () => {} };

const uses = new Map<FigureId, Extract<Block, { kind: 'figure' }>>();
for (const s of SHIFTS) for (const p of s.parts) for (const b of p.blocks) if (b.kind === 'figure' && !uses.has(b.figure)) uses.set(b.figure, b);

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
document.getElementById('app')!.append(el('main.view', {}, article));

// ?skies: every forecast question in every lesson, with the sky it shows, the
// question and the right answer, for checking that the drawings say what the
// question says.
if (location.search.includes('skies')) {
  const list = el('article.article');
  for (const s of SHIFTS) for (const p of s.parts) for (const b of p.blocks) {
    if (b.kind !== 'figure' || b.figure !== 'check') continue;
    const items = (b.options?.items as Forecast[]) ?? [];
    items.forEach((q, k) => list.append(el('figure.fig', { 'data-sky': `${s.id}-${k}` },
      el('div.fig-body', {}, forecastPicture(q), el('p.task', {}, `${s.id} ${k}: ${q.question}`), el('p.fig-readout', {}, `✓ ${q.options[q.answer]}`)))));
  }
  document.getElementById('app')!.replaceChildren(el('main.view', {}, list));
}
