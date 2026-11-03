// Every figure on one page, with its caption from the lessons, for checking
// drawings without playing through: `npm run dev -w soil`, then open
// /figures.html (?only=<id> for one, ?metric for metres, ?frozen for the same
// picture every load). Didactics' gallery page; only the dev server serves it.

import 'didactics/frozen';
import '../../src/app/styles/app.css';
import { el } from 'didactics/dom';
import { galleryPage } from 'didactics/gallery';
import { FIGURES } from '../../src/app/figures';
import { empty as emptySave } from '../../src/store';
import { LESSONS } from '../../src/core/lessons';

const save = emptySave();
if (location.search.includes('metric')) save.units = 'metric';
const gallery = galleryPage({ figures: FIGURES, lessons: LESSONS, save });
// On the lesson's paper, as the figures appear in a lesson.
gallery.node.replaceChildren(el('div.paper', {}, ...gallery.node.children));
document.getElementById('app')!.append(gallery.node);
