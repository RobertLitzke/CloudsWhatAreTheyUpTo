// Every figure on one page, with its caption from the lessons, for checking
// drawings without playing through: `npm run dev`, then open /figures.html.
// Only the dev server serves it; the build ships index.html alone. ?frozen
// makes it the same on every load, ?only=<id> shows one figure, ?imperial
// draws in feet.

import 'didactics/frozen';
import '../../src/app/styles/app.css';
import { el } from 'didactics/dom';
import { galleryPage } from 'didactics/gallery';
import { FIGURES } from '../../src/app/figures';
import { emptySave } from '../../src/core/save';
import { isDiagram } from 'didactics/lesson';
import { SHIFTS, type Forecast } from '../../src/core/shifts';
import { forecastPicture } from '../../src/app/figures/quizzes';

const save = emptySave();
if (location.search.includes('imperial')) save.units = 'imperial';
document.getElementById('app')!.append(galleryPage({ figures: FIGURES, lessons: SHIFTS, save }).node);

// ?skies: every forecast question in every lesson, with the sky it shows, the
// question and the right answer, for checking that the drawings say what the
// question says.
if (location.search.includes('skies')) {
  const list = el('article.article');
  for (const s of SHIFTS) for (const p of s.parts) for (const b of p.blocks) {
    if (!isDiagram(b) || b.id !== 'check') continue;
    const items = (b.options?.items as Forecast[]) ?? [];
    items.forEach((q, k) => list.append(el('figure.fig', { 'data-sky': `${s.id}-${k}` },
      el('div.fig-body', {}, forecastPicture(q), el('p.task', {}, `${s.id} ${k}: ${q.question}`), el('p.fig-readout', {}, `✓ ${q.options[q.answer]}`)))));
  }
  document.getElementById('app')!.replaceChildren(el('main.view', {}, list));
}
