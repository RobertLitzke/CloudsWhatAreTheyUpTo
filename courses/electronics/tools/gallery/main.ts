// Every figure on one page, with its caption from the lessons, for checking
// drawings without playing through: `npm run dev`, then open /figures.html
// (?only=<id> for one, ?frozen for the same picture every load). Only the dev
// server serves it; the build ships index.html alone.

import 'didactics/frozen';
import '../../src/app/styles/app.css';
import { el } from 'didactics/dom';
import { galleryPage } from 'didactics/gallery';
import { FIGURES } from '../../src/app/figures';
import { emptySave } from '../../src/core/save';
import { LESSONS } from '../../src/core/lessons';

const gallery = galleryPage({ figures: FIGURES, lessons: LESSONS, save: emptySave() });
const article = gallery.node.querySelector('article')!;
gallery.node.append(el('div.paper', {}, article));
document.getElementById('app')!.append(gallery.node);
