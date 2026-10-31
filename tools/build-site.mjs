// Builds the whole site into dist/: each course (courses/<folder>/, any
// folder with a course.json) with its own build, copied to dist/<folder>/,
// then the catalog into dist/ itself, whose service worker covers them all.
//
// A course's own build still writes a service worker and manifest for itself
// (Didactics' lessonApp with inSite); they are left out here, as the site has
// one of each, at its root.

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const OWN_WORKER = /^(sw\.js|workbox-[^/]*\.js|registerSW\.js|manifest\.webmanifest)$/;

const run = (args, cwd = root) => execFileSync('npm', args, { cwd, stdio: 'inherit' });

rmSync(dist, { recursive: true, force: true });
const courses = readdirSync(join(root, 'courses')).filter((f) => existsSync(join(root, 'courses', f, 'course.json'))).sort();
for (const folder of courses) {
  const dir = join(root, 'courses', folder);
  console.log(`\n== ${folder}`);
  run(['run', 'build'], dir);
  cpSync(join(dir, 'dist'), join(dist, folder), {
    recursive: true,
    filter: (src) => !OWN_WORKER.test(src.slice(join(dir, 'dist').length + 1)),
  });
}
console.log('\n== catalog');
run(['run', 'build'], join(root, 'catalog'));
console.log(`\nBuilt ${courses.length} courses and the catalog into dist/.`);
