// Every figure on one page, with its caption from the lessons, for checking
// drawings without playing through: `npm run dev`, then open /figures.html
// (Didactics' gallery page). ?only=<id> shows one figure, ?imperial puts
// distances in feet, and ?frozen makes the page the same on every load; the
// page gets data-ready once every photo has been drawn. Only the dev server
// serves it; the build ships index.html alone.

import 'didactics/frozen';
import '../../src/app/styles/app.css';
import { el } from 'didactics/dom';
import { galleryPage } from 'didactics/gallery';
import { FIGURES } from '../../src/app/figures';
import { LESSONS } from '../../src/core/lessons';
import { emptySave } from '../../src/core/save';

const save = emptySave();
if (new URLSearchParams(location.search).has('imperial')) save.units = 'imperial';

const gallery = galleryPage({ figures: FIGURES, lessons: LESSONS, save });
// On the lesson's paper, as the figures appear in a lesson.
gallery.node.replaceChildren(el('div.paper', {}, ...gallery.node.children));
document.getElementById('app')!.append(gallery.node);
