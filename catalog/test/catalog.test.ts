// @vitest-environment happy-dom
// The catalog: every course folder's course.json, and the page listing them.

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { infoProblems, mapProblems, readCatalog, readMap, type CatalogEntry, type CatalogMap } from '../registry';
import { catalogPage, standing } from '../src/page';

const courses = resolve(__dirname, '../../courses');

describe('the courses on the site', () => {
  const all = readCatalog(courses);

  it('reads every course folder with a course.json, with its lessons counted and its icon', () => {
    expect(all.map((c) => c.folder)).toContain('clouds');
    for (const c of all) {
      expect(c.lessonCount).toBeGreaterThan(0);
      expect(c.icon).toMatch(/^data:image\//);
    }
  });

  it('keeps each course\'s save key, so progress from before the move is still found', () => {
    expect(all.find((c) => c.folder === 'clouds')!.save).toBe('clouds.save');
    expect(new Set(all.map((c) => c.save)).size).toBe(all.length);
  });

  it('refuses a cute folder name or a course.json missing its words', () => {
    expect(infoProblems('Out_of_Auto', { title: 'x', department: 'x', summary: 'x', lessons: 'x', icon: 'x', save: 'x', order: 1 })[0]).toMatch(/lowercase/);
    expect(infoProblems('soil', { title: 'Soil' }).join('\n')).toMatch(/"summary" should be words/);
  });

  it('lists courses by their order', () => {
    const dir = mkdtempSync(join(tmpdir(), 'catalog-'));
    for (const [folder, order] of [['zebra', 1], ['apple', 2]] as const) {
      mkdirSync(join(dir, folder, 'lessons'), { recursive: true });
      writeFileSync(join(dir, folder, 'lessons', 'one.json'), '{}');
      writeFileSync(join(dir, folder, 'icon.svg'), '<svg/>');
      writeFileSync(join(dir, folder, 'course.json'), JSON.stringify({ title: folder, department: 'D', order, summary: 'S', lessons: 'lessons', icon: 'icon.svg', save: `${folder}.save` }));
    }
    expect(readCatalog(dir).map((c) => c.folder)).toEqual(['zebra', 'apple']);
  });
});

const entry = (over: Partial<CatalogEntry> = {}): CatalogEntry => ({
  folder: 'soil', title: 'Soil', department: 'Earth Sciences', order: 1, summary: 'About soil.', save: 'soil.save', lessonCount: 4, icon: 'data:image/svg+xml,%3Csvg%2F%3E', ...over,
});

describe('the catalog page', () => {
  it('lists each course under its department with its icon, summary and a link into its folder', () => {
    const page = catalogPage([entry(), entry({ folder: 'electronics', title: 'Electronics', department: 'Engineering', save: 'e.save' })], () => null);
    expect([...page.querySelectorAll('.department h2')].map((h) => h.textContent)).toEqual(['Earth Sciences', 'Engineering']);
    const soil = page.querySelector('.course')!;
    expect(soil.querySelector('h3 a')!.getAttribute('href')).toBe('./soil/');
    expect(soil.querySelector('.course-summary')!.textContent).toBe('About soil.');
    expect(soil.querySelector('img')!.getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
    expect(soil.querySelector('.course-open')!.textContent).toBe('Open the course');
  });

  it('says how far the reader got, from the course\'s own save', () => {
    const save = (s: object) => (key: string) => (key === 'soil.save' ? JSON.stringify(s) : null);
    expect(standing(entry(), () => null)).toBeNull();
    expect(standing(entry(), () => 'not json')).toBeNull();
    expect(standing(entry(), save({ lessons: { a: { done: true }, b: { done: false } } }))).toBe('1 completed');
    expect(standing(entry(), save({ lessons: {}, resume: { a: {} } }))).toBe('in progress');
    expect(standing(entry({ lessonCount: 1 }), save({ lessons: { a: { done: true } } }))).toBe('all completed');
    const page = catalogPage([entry()], save({ lessons: { a: { done: true } } }));
    expect(page.querySelector('.course-open')!.textContent).toBe('Continue the course');
  });
});

describe('the map', () => {
  const all = readCatalog(courses);

  it('places every course, and its bridges join courses that are on it', () => {
    const map = readMap(resolve(__dirname, '../map.json'), all);
    for (const c of all) expect(map.courses[c.folder], c.folder).toBeDefined();
    expect(map.bridges.length).toBeGreaterThan(0);
  });

  it('refuses a bridge to a course not on the map, a place off the map, or a folder with no course', () => {
    const bad: CatalogMap = {
      courses: { soil: [100, 100], clouds: [2000, 100] },
      bridges: [
        { id: 'a', title: 'A', promise: 'P', between: ['soil', 'geology'] },
        { id: 'b', title: 'B', promise: 'P', between: ['soil', 'clouds'], folder: 'nowhere' },
      ],
    };
    const problems = mapProblems(bad, ['soil', 'clouds']).join('\n');
    expect(problems).toMatch(/clouds's place/);
    expect(problems).toMatch(/joins geology, which is not on the map/);
    expect(problems).toMatch(/courses\/nowhere/);
  });

  it('draws each course and bridge, and lists the bridges after the departments', () => {
    const map: CatalogMap = {
      courses: { soil: [100, 100], electronics: [800, 400] },
      bridges: [{ id: 'mud', title: 'Muddy circuits', promise: 'Soil sensors.', between: ['soil', 'electronics'] }],
    };
    const page = catalogPage([entry(), entry({ folder: 'electronics', title: 'Electronics', department: 'Engineering', save: 'e.save' })], () => null, map);
    expect(page.querySelectorAll('.map-course').length).toBe(2);
    const bridge = page.querySelector('.map-bridge')!;
    expect(bridge.tagName).toBe('BUTTON');
    expect(bridge.classList.contains('coming')).toBe(true);
    expect(page.querySelectorAll('line.edge.coming').length).toBe(1);
    expect(page.querySelector('#bridges .course h3')!.textContent).toMatch(/Muddy circuits.*between Soil and Electronics/);
    expect(page.querySelector('#course-soil .course-bridges')!.textContent).toBe('Bridges: Muddy circuits (with Electronics)');
    // The panel starts on a course and its bridge's line is lit.
    expect(page.querySelector('.map-panel h3')!.textContent).toBe('Soil');
    expect(page.querySelectorAll('line.lit').length).toBe(1);
  });
});
