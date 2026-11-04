// The site as a whole: what every workspace must agree on (one Didactics pin
// at the root, the shared tsconfig, the page head), and the root tools'
// agreements with the courses (photo picks keep their ids, queued copy edits
// name lessons that exist, Commons licences map onto the ids Didactics knows).

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isLicenseId } from 'didactics/photos';
import { licenceId, plainText } from '../../tools/lib/commons.mjs';

const root = resolve(__dirname, '../..');
const courses = readdirSync(join(root, 'courses')).filter((c) => existsSync(join(root, 'courses', c, 'course.json')));
const json = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const workspaces = [...courses.map((c) => join(root, 'courses', c)), join(root, 'catalog')];

describe('every workspace', () => {
  it('leaves the Didactics pin to the root package.json', () => {
    expect(json(join(root, 'package.json')).dependencies?.didactics).toMatch(/^github:RobertLitzke\/Didactics#/);
    for (const w of workspaces) {
      const pkg = json(join(w, 'package.json'));
      expect({ ...pkg.dependencies, ...pkg.devDependencies }.didactics, w).toBeUndefined();
    }
  });

  it('extends the root tsconfig.base.json', () => {
    for (const w of workspaces) expect(json(join(w, 'tsconfig.json')).extends, w).toMatch(/tsconfig\.base\.json$/);
  });

  it('has the same page head: a theme colour, the icons the icons tool writes, and the app title', () => {
    for (const w of workspaces) {
      const head = readFileSync(join(w, 'index.html'), 'utf8').split('</head>')[0];
      for (const line of [
        '<meta name="theme-color"',
        '<link rel="icon" type="image/svg+xml" href="./icons/icon.svg" />',
        '<link rel="icon" type="image/png" sizes="32x32" href="./icons/favicon-32.png" />',
        '<link rel="apple-touch-icon" sizes="180x180" href="./icons/apple-touch-icon.png" />',
        '<meta name="apple-mobile-web-app-title"',
        '<meta name="mobile-web-app-capable" content="yes" />',
      ]) expect(head, `${w}: ${line}`).toContain(line);
      for (const f of ['icon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png']) {
        expect(existsSync(join(w, 'public/icons', f)), `${w}: icons/${f}`).toBe(true);
      }
    }
  });
});

describe('the photo tools', () => {
  it('map the accepted Commons licences onto the ids Didactics knows, and no others', () => {
    expect(licenceId('Public domain')).toBe('PD');
    expect(licenceId('CC0')).toBe('CC0');
    expect(licenceId('CC BY 2.0')).toBe('CC-BY-2.0');
    expect(licenceId('CC BY-SA 3.0')).toBe('CC-BY-SA-3.0');
    expect(licenceId('CC BY-SA 4.0')).toBe('CC-BY-SA-4.0');
    for (const s of ['CC BY-NC 2.0', 'CC BY-ND 4.0', 'CC BY-NC-SA 3.0', 'GFDL', 'CC BY-SA 2.5', '']) expect(licenceId(s)).toBeNull();
    for (const s of ['Public domain', 'CC0', 'CC BY 3.0', 'CC BY 4.0', 'CC BY-SA 2.0']) expect(isLicenseId(licenceId(s)!)).toBe(true);
  });

  it('strip the author HTML', () => {
    expect(plainText('<a href="//commons.wikimedia.org/wiki/User:X">Jane &amp; Joe</a>')).toBe('Jane & Joe');
    expect(plainText('Simon Eugster --Simon 13:24, 18 April 2006 (UTC)')).toBe('Simon Eugster');
  });

  it('keep every photo id: each picked once, and every credited photo still picked', () => {
    for (const c of courses) {
      const picksFile = join(root, 'courses', c, 'tools/photo-picks.json');
      if (!existsSync(picksFile)) continue;
      const picks: { id: string; title?: string; url?: string }[] = json(picksFile);
      const ids = picks.map((p) => p.id);
      expect(new Set(ids).size, `${c}: a pick id repeats`).toBe(ids.length);
      for (const p of picks) expect(p.title || p.url, `${c}: ${p.id} names no file`).toBeTruthy();
      const library: { id: string }[] = json(join(root, 'courses', c, 'src/data/photos.json'));
      for (const p of library) expect(ids, `${c}: ${p.id} is credited but no longer picked`).toContain(p.id);
    }
  });
});

describe('the copy edit', () => {
  it('finds every queued lesson in its course, which has a brief', () => {
    for (const c of courses) {
      const queueFile = join(root, 'courses', c, 'tools/review-queue.json');
      if (!existsSync(queueFile)) continue;
      expect(existsSync(join(root, 'courses', c, 'tools/copyedit.json')), `${c}: queue without a copyedit.json`).toBe(true);
      const lessons = join(root, 'courses', c, json(join(root, 'courses', c, 'course.json')).lessons);
      for (const q of json(queueFile) as { lesson: string }[]) expect(existsSync(join(lessons, `${q.lesson}.json`)), `${c}: queued ${q.lesson}`).toBe(true);
    }
  });
});

describe('the status table', () => {
  it('reads every course, and tools/lesson-status.json names only lessons that exist', async () => {
    const { collect } = await import('../../tools/status.mjs');
    const data = collect();
    expect(data.warnings).toEqual([]);
    const courses = readdirSync(join(root, 'courses')).filter((c) => existsSync(join(root, 'courses', c, 'course.json')));
    expect(data.courses.filter((c: { outlineOnly?: boolean }) => !c.outlineOnly).map((c: { folder: string }) => c.folder).sort()).toEqual(courses.sort());
  });
});
