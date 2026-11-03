// The courses on the site, read at build time from each course's own
// course.json (courses/<folder>/course.json). The folder's name is the
// course's address on the site (/<folder>/) and must be a plain lowercase
// word or two naming the subject, such as "clouds" or "soil".

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAP_HEIGHT, MAP_WIDTH } from './src/map-size';

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
  /** Its save's localStorage key, so the catalog can say how far the reader got and review its cards. */
  save: string;
  /** Its colours (from its tokens.css), for its cards in the review of all courses. */
  theme?: { bg: string; panel?: string; text: string; accent: string; good?: string; bad?: string; display?: string };
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

/** The catalog's map (catalog/map.json): where each course sits, and the bridges between them. */
export interface CatalogMap {
  /** Each course's place, by folder: x across 0-1000, y down 0-700. */
  courses: Record<string, [number, number]>;
  bridges: Bridge[];
}

/** A short course that joins two courses, drawn on the line between them. */
export interface Bridge {
  id: string;
  title: string;
  /** The two courses it joins, by folder. */
  between: [string, string];
  /** A sentence on what it covers. */
  promise: string;
  /** Its own course's folder, once written; until then it is in preparation. */
  folder?: string;
  /** Where its card sits along the line, from the first course (0) to the second (1). */
  at?: number;
}


/** The problems with the map, as sentences; none when it is fine. */
export function mapProblems(map: CatalogMap, folders: readonly string[]): string[] {
  const out: string[] = [];
  const placed = new Set(Object.keys(map.courses ?? {}));
  for (const [f, xy] of Object.entries(map.courses ?? {})) {
    if (!folders.includes(f)) out.push(`catalog/map.json: no course in courses/${f}`);
    if (!Array.isArray(xy) || xy.length !== 2 || !(xy[0] >= 0 && xy[0] <= MAP_WIDTH && xy[1] >= 0 && xy[1] <= MAP_HEIGHT)) out.push(`catalog/map.json: ${f}'s place should be [x, y] inside ${MAP_WIDTH} by ${MAP_HEIGHT}`);
  }
  const ids = new Set<string>();
  for (const b of map.bridges ?? []) {
    if (ids.has(b.id)) out.push(`catalog/map.json: two bridges are called "${b.id}"`);
    ids.add(b.id);
    if (!b.title?.trim() || !b.promise?.trim()) out.push(`catalog/map.json: bridge "${b.id}" needs a title and a promise`);
    if (!Array.isArray(b.between) || b.between.length !== 2 || b.between[0] === b.between[1]) out.push(`catalog/map.json: bridge "${b.id}" joins two different courses`);
    else for (const f of b.between) if (!placed.has(f)) out.push(`catalog/map.json: bridge "${b.id}" joins ${f}, which is not on the map`);
    if (b.folder !== undefined && !folders.includes(b.folder)) out.push(`catalog/map.json: bridge "${b.id}" names courses/${b.folder}, which has no course.json`);
    if (b.at !== undefined && !(b.at > 0 && b.at < 1)) out.push(`catalog/map.json: bridge "${b.id}" has "at" outside 0 to 1`);
  }
  return out;
}

/** The map, checked against the courses there are. Throws on a mistake in it. */
export function readMap(file: string, courses: readonly CatalogEntry[]): CatalogMap {
  const { courses: places, bridges } = JSON.parse(readFileSync(file, 'utf8')) as CatalogMap;
  const map = { courses: places, bridges };
  const problems = mapProblems(map, courses.map((c) => c.folder));
  if (problems.length) throw new Error(problems.join('\n'));
  return map;
}
