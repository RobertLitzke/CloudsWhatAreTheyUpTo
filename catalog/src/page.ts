// The catalog: every course on the site, listed by department the way a
// printed college catalog lists them, each with its icon, a short summary and
// a link that opens it. Each course keeps its own look once opened; this page
// stays plain paper and ink.

import { el } from 'didactics/dom';
import { dayCounts, migrateCollection } from 'didactics/srs';
import type { CatalogEntry } from '../registry';

/** Cards due today across every course, from each save's review cards. */
export function dueEverywhere(courses: readonly CatalogEntry[], read: (key: string) => string | null): number {
  let n = 0;
  for (const c of courses) {
    try {
      const save = JSON.parse(read(c.save) ?? 'null') as { review?: unknown } | null;
      if (!save?.review) continue;
      const d = dayCounts(migrateCollection(save.review));
      n += d.new + d.learning + d.review;
    } catch {
      // Not a save: nothing due.
    }
  }
  return n;
}

/** How far the reader has got in a course on this device, from its save, or null if not begun. */
export function standing(entry: CatalogEntry, read: (key: string) => string | null): string | null {
  let save: unknown;
  try {
    save = JSON.parse(read(entry.save) ?? 'null');
  } catch {
    return null;
  }
  if (typeof save !== 'object' || save === null) return null;
  const { lessons, resume } = save as { lessons?: Record<string, { done?: boolean }>; resume?: Record<string, unknown> };
  const done = Object.values(lessons ?? {}).filter((l) => l?.done).length;
  const going = Object.keys(resume ?? {}).length > 0;
  if (done >= entry.lessonCount && done > 0) return 'all completed';
  if (done) return `${done} completed`;
  if (going) return 'in progress';
  return null;
}

const lessonsLine = (n: number) => `${n} ${n === 1 ? 'lesson' : 'lessons'}`;

function courseEntry(c: CatalogEntry, read: (key: string) => string | null): HTMLElement {
  const href = `./${c.folder}/`;
  const status = standing(c, read);
  return el(
    'article.course',
    {},
    // An <img> rather than inline SVG, so one icon's ids cannot clash with another's.
    el('a.course-icon', { href, 'aria-hidden': 'true', tabIndex: -1 }, el('img', { src: c.icon, alt: '' })),
    el(
      'div.course-text',
      {},
      el('h3', {}, el('a', { href }, c.title), c.subtitle ? el('span.course-subtitle', {}, c.subtitle) : null),
      el('p.course-summary', {}, c.summary),
      el(
        'p.course-meta',
        {},
        el('span', {}, lessonsLine(c.lessonCount)),
        status ? el('span.course-standing', {}, status) : null,
      ),
      el('a.course-open', { href }, status ? 'Continue the course' : 'Open the course'),
    ),
  );
}

export function catalogPage(courses: readonly CatalogEntry[], read: (key: string) => string | null): HTMLElement {
  const departments = [...new Set(courses.map((c) => c.department))];
  return el(
    'div.catalog',
    {},
    el(
      'header.masthead',
      {},
      el('p.running', {}, el('span', {}, 'Course Catalog'), el('span', {}, 'Self-paced workbooks')),
      el('h1', {}, 'Courses'),
      el(
        'p.lede',
        {},
        'Each course is a workbook of short illustrated lessons with live diagrams to try, a check at the end of each lesson, and flash cards for review. ',
        'Take them in any order, on a phone or a computer, online or off. Your place in each is kept on this device.',
      ),
    ),
    reviewLine(courses, read),
    el('nav.contents', { 'aria-label': 'Departments' }, el('h2', {}, 'Contents'), el('ol', {}, departments.map((d) => el('li', {}, el('a', { href: `#${slug(d)}` }, d))))),
    departments.map((d) =>
      el(
        'section.department',
        { id: slug(d) },
        el('h2', {}, d),
        courses.filter((c) => c.department === d).map((c) => courseEntry(c, read)),
      ),
    ),
    el('footer.colophon', {}, el('p', {}, 'Each course keeps its own colours, progress and settings. The menu in any course leads back here under All courses.')),
  );
}

/** The way to review every course's cards together, with how many are waiting today. */
function reviewLine(courses: readonly CatalogEntry[], read: (key: string) => string | null): HTMLElement {
  const n = dueEverywhere(courses, read);
  return el('p.review-line', {}, el('a', { href: '#review' }, 'Review all courses'), n ? `: ${n} ${n === 1 ? 'card' : 'cards'} waiting today, from every course in one sitting.` : ': the cards from every course’s checks, in one sitting.');
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
