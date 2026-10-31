// The courses on the site, read at build time from each course's own
// course.json (courses/<folder>/course.json). The folder's name is the
// course's address on the site (/<folder>/) and must be a plain lowercase
// word or two naming the subject, such as "clouds" or "soil".

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** What a course says about itself, in its course.json. */
export interface CourseInfo {
  /** The course's own name, as on its top bar. */
  title: string;
  subtitle?: string;
  /** The catalog's section it is listed under, such as "Earth Sciences". */
  department: string;
  /** Its place within the catalog; lower first. */
  order: number;
  /** Two or three sentences on what the course covers. */
  summary: string;
  /** The folder of its lesson JSON files, from the course's folder, to count them. */
  lessons: string;
  /** Its square icon, an SVG or PNG, from the course's folder. */
  icon: string;
  /** Its save's localStorage key, so the catalog can say how far the reader got. */
  save: string;
}

/** A course as the catalog page gets it. */
export interface CatalogEntry extends Omit<CourseInfo, 'lessons' | 'icon'> {
  /** The course's folder, and its address on the site. */
  folder: string;
  /** How many lessons it has. */
  lessonCount: number;
  /** The icon as a data URI, so the page carries it inline. */
  icon: string;
}

export const FOLDER = /^[a-z]+(-[a-z]+)?$/;

/** The problems with one course.json, as sentences; none when it is fine. */
export function infoProblems(folder: string, info: unknown): string[] {
  const out: string[] = [];
  if (!FOLDER.test(folder)) out.push(`courses/${folder}: a course's folder is a lowercase word or two, naming its subject`);
  if (typeof info !== 'object' || info === null) return [...out, `courses/${folder}/course.json: not a table`];
  const o = info as Record<string, unknown>;
  for (const k of ['title', 'department', 'summary', 'lessons', 'icon', 'save'] as const) {
    if (typeof o[k] !== 'string' || !(o[k] as string).trim()) out.push(`courses/${folder}/course.json: "${k}" should be words`);
  }
  if (typeof o.order !== 'number') out.push(`courses/${folder}/course.json: "order" should be a number`);
  return out;
}

/** A file as a data URI: an SVG as its text, so it stays small; anything else in base64. */
function dataUri(file: string): string {
  if (file.endsWith('.svg')) return `data:image/svg+xml,${encodeURIComponent(readFileSync(file, 'utf8'))}`;
  const type = file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  return `data:${type};base64,${readFileSync(file).toString('base64')}`;
}

/** Every course under `coursesDir`, in catalog order. Throws on a malformed course.json. */
export function readCatalog(coursesDir: string): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const folder of readdirSync(coursesDir).sort()) {
    const file = join(coursesDir, folder, 'course.json');
    if (!existsSync(file)) continue;
    const info = JSON.parse(readFileSync(file, 'utf8')) as CourseInfo;
    const problems = infoProblems(folder, info);
    if (problems.length) throw new Error(problems.join('\n'));
    const { lessons, icon, ...rest } = info;
    entries.push({
      ...rest,
      folder,
      lessonCount: readdirSync(join(coursesDir, folder, lessons)).filter((f) => f.endsWith('.json')).length,
      icon: dataUri(join(coursesDir, folder, icon)),
    });
  }
  return entries.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}
