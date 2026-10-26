// The field journal, in four tabs. Clouds: the ten kinds and the rare sights,
// as photos to tap for their card. Glossary: every term the lessons use, A to
// Z (core/glossary.ts). Notes: what each finished lesson wrote in. And, with
// the radio on, the transcripts of every talk heard.

import { GENERA, floorInfo, genus, type Genus, type GenusId } from '../../core/clouds';
import { GLOSSARY, lessonOf } from '../../core/glossary';
import { JOURNAL, SHIFTS, shiftById } from '../../core/shifts';
import { FEATURES, photoFile, photosOf, photosOfFeature, type FeatureId, type Photo } from '../../core/photos';
import { el, svg, type Child } from 'lesson-kit/dom';
import { glossaryView } from 'lesson-kit/glossary';
import type { View } from 'lesson-kit/router';
import { sheet } from 'lesson-kit/ui';
import { asset } from '../asset';
import { prose } from '../figures/kit';
import { photoFigure, PHOTOS } from '../photos';
import { drawCloud } from '../scene/drawn';
import { PALETTES } from '../scene/landscape';
import { getSave } from '../store';
import { allTalks, STATIONS, transcript } from '../../core/talk';

type Save = ReturnType<typeof getSave>;
type Tab = 'clouds' | 'glossary' | 'notes' | 'radio';

const FLOORS: readonly { floor: Genus['floor']; title: string }[] = [
  { floor: 'low', title: 'Low floor' },
  { floor: 'middle', title: 'Middle floor' },
  { floor: 'high', title: 'High floor' },
  { floor: 'tower', title: 'All three floors' },
];

/** The rare sights and the lesson whose notes they are. */
const RARE: readonly { id: FeatureId; name: string; sub: string }[] = [
  { id: 'lenticularis', name: 'Lens cloud', sub: 'Lenticularis' },
  { id: 'fluctus', name: 'Breaking waves', sub: 'Fluctus' },
  { id: 'mammatus', name: 'Mammatus', sub: 'Under an anvil' },
];
const lessonWithNote = (id: string) => SHIFTS.find((s) => s.journal.includes(id));

export const journalView: View = (root, nav) => {
  const save = getSave();
  const radio = save.talk && allTalks().some((t) => save.heard[t.id]);
  const tabs: [Tab, string][] = [['clouds', 'Clouds'], ['glossary', 'Glossary'], ['notes', 'Notes'], ...(radio ? [['radio', 'Radio'] as [Tab, string]] : [])];
  const tab = (tabs.find(([t]) => t === nav.params.tab)?.[0] ?? 'clouds') as Tab;

  const body =
    tab === 'glossary' ? glossaryTab(save)
    : tab === 'notes' ? notesTab(save)
    : tab === 'radio' ? radioTab(save)
    : cloudsTab(save);

  root.append(
    el('div.page.journal', {},
      el('h1', {}, 'Field journal'),
      el('nav.seg.journal-tabs', { 'aria-label': 'Journal sections' },
        tabs.map(([t, label]) => el('a', { href: t === 'clouds' ? '#/journal' : `#/journal/${t}`, className: t === tab ? 'on' : undefined, 'aria-current': t === tab ? 'page' : undefined }, label))),
      body,
    ),
  );
};

// ---- Clouds ---------------------------------------------------------------

function cloudsTab(save: Save): HTMLElement {
  const tile = (name: string, sub: string, photo: Photo | undefined, art: () => Child, open: () => void) =>
    el('button.cloud-tile', { type: 'button', onclick: open },
      photo ? el('img', { src: asset(photoFile(photo)), alt: '', loading: 'lazy', decoding: 'async' }) : el('div.tile-art', {}, art()),
      el('span.tile-name', {}, name),
      el('span.tile-sub', {}, sub));

  return el('div', {},
    el('p.muted.journal-lede', {}, 'The ten kinds of cloud, by the floor they live on, and a few rare sights. Tap one for its card.'),
    FLOORS.map(({ floor, title }) => {
      const here = GENERA.filter((g) => g.floor === floor);
      return el('section.cloud-floor', {},
        el('h2', {}, title),
        el('div.cloud-tiles', {}, here.map((g) => tile(g.name, g.abbr, photosOf(PHOTOS, g.id)[0], () => cloudArt(g.id), () => openCloud(g.id, save)))));
    }),
    el('section.cloud-floor', {},
      el('h2', {}, 'Rare sights'),
      el('div.cloud-tiles', {}, RARE.map((r) => tile(r.name, r.sub, photosOfFeature(PHOTOS, r.id)[0], () => null, () => openRare(r.id))))),
  );
}

function cloudArt(id: GenusId): SVGElement {
  const tall = genus(id).floor === 'tower';
  return svg('svg', { viewBox: tall ? '-80 -150 160 185' : '-90 -40 180 70' }, drawCloud(id, PALETTES.day, 2));
}

/** A link to the lesson that teaches something. */
function lessonLink(id: string | undefined): HTMLElement | null {
  const s = id ? shiftById(id) : undefined;
  if (!s) return null;
  return el('a.sheet-lesson', { href: `#/shift/${s.id}` }, `Lesson ${s.n}: ${s.title} ›`);
}

function openCloud(id: GenusId, save: Save): void {
  const g = genus(id);
  const photo = photosOf(PHOTOS, id)[0];
  const note = save.journal.includes(id) ? JOURNAL[id] : undefined;
  sheet(g.name,
    photo ? photoFigure(photo, g.name) : el('div.sheet-art', {}, cloudArt(id)),
    el('div.sheet-text', {},
      el('p.sheet-floor', {}, g.floor === 'tower' ? 'All three floors' : `${floorInfo(g.floor).name} floor`),
      el('h2', {}, g.name, el('span.abbr', {}, g.abbr)),
      el('dl.cloud-facts', {},
        el('dt', {}, 'Looks like'), el('dd', {}, g.look),
        el('dt', {}, 'Made by'), el('dd', {}, g.made),
        el('dt', {}, 'Means'), el('dd', {}, g.means),
        el('dt', {}, 'Often taken for'), el('dd', {}, g.confused.map((c) => genus(c).name).join(', ')),
        note ? [el('dt', {}, 'Your notes'), el('dd', {}, note.text)] : null),
      lessonLink(lessonOf(id)?.id),
    ),
  );
}

function openRare(id: FeatureId): void {
  const n = JOURNAL[id];
  const photo = photosOfFeature(PHOTOS, id)[0];
  const lesson = lessonWithNote(id);
  sheet(n?.title ?? id,
    photo ? photoFigure(photo, n?.title ?? id) : null,
    el('div.sheet-text', {},
      el('p.sheet-floor', {}, 'Rare sight'),
      el('h2', {}, n?.title ?? id),
      n ? el('p', {}, n.text) : null,
      lessonLink(lesson?.id),
    ),
  );
}

// ---- Glossary -------------------------------------------------------------

function glossaryTab(save: Save): HTMLElement {
  const clouds = new Set<string>(GENERA.map((g) => g.id));
  const rare = new Set<string>(FEATURES);
  const entries = GLOSSARY.map((e) =>
    clouds.has(e.id) ? { ...e, open: () => openCloud(e.id as GenusId, save) }
    : rare.has(e.id) ? { ...e, open: () => openRare(e.id as FeatureId) }
    : e);
  return el('div', {},
    el('p.muted.journal-lede', {},
      'Every term the lessons use. ',
      el('span.gl-dot.fn-technical', { 'aria-hidden': 'true' }),
      ' marks a technical note from a lesson; a name with an arrow opens its card.'),
    glossaryView({
      entries,
      prose,
      lesson: (id) => {
        const s = shiftById(id);
        return s && { href: `#/shift/${s.id}`, label: `Lesson ${s.n}` };
      },
    }),
  );
}

// ---- Notes ----------------------------------------------------------------

function notesTab(save: Save): HTMLElement {
  // A cloud's notes are on its card, under Clouds.
  const onCards = new Set<string>([...GENERA.map((g) => g.id), ...FEATURES]);
  const groups = SHIFTS.map((s) => ({ s, notes: s.journal.filter((id) => !onCards.has(id)) }));
  const open = groups.filter((g) => g.notes.some((id) => save.journal.includes(id)));
  const waiting = groups.reduce((sum, g) => sum + g.notes.filter((id) => !save.journal.includes(id)).length, 0);
  return el('div', {},
    el('p.muted.journal-lede', {}, 'What each lesson wrote in when you signed its log. The clouds’ own notes are on their cards.'),
    open.length
      ? open.map(({ s, notes }) =>
          el('section.note-group', {},
            el('h2', {}, el('span.note-n', {}, String(s.n)), s.title),
            el('div.notes', {}, notes.filter((id) => save.journal.includes(id)).map((id) => {
              const n = JOURNAL[id];
              return el('article.note', { className: n.rare ? 'note rare' : 'note' }, el('h3', {}, n.title, n.rare ? el('span.tag', {}, 'Rare') : null), el('p', {}, n.text));
            }))))
      : el('p.muted', {}, 'Nothing written yet. Finish a lesson and its notes land here.'),
    waiting ? el('p.muted.notes-waiting', {}, `${waiting} more ${waiting === 1 ? 'page' : 'pages'} to come as you finish lessons.`) : null,
  );
}

// ---- Radio ----------------------------------------------------------------

function radioTab(save: Save): HTMLElement {
  const heard = allTalks().filter((t) => save.heard[t.id]);
  return el('div.radio-log', {}, heard.map((t) =>
    el('details.radio-transcript', {},
      el('summary', {}, t.when),
      transcript(t, save.heard[t.id]).map((line) =>
        el('p', { className: line.who }, el('b', {}, `${(line.who === 'them' ? STATIONS.them : STATIONS.you).place.toUpperCase()}: `), line.text)))));
}
