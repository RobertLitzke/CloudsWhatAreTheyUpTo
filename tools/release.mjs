// A course's version: bumped on demand, not with every change.
//
//   npm run release                                   every course's version, and what stands between each beta and its release
//   npm run release -- geology "Branches S1 to S4"    the next version: 0.3 -> 0.4, or 1.2 -> 1.3
//   npm run release -- geology "A new trunk" --major  a released course's next whole version: 1.3 -> 2.0
//   npm run release -- geology "First release" --release
//                                                     out of beta: 0.x -> 1.0 (Rob's call)
//
// A course is in beta (0.x) while it is being written and checked, and is
// released (1.0) when Rob says so. The bar for asking him (tools/status.mjs
// releaseGaps): every planned lesson written, and every lesson through the
// student read-through, the Gemini copy edit, the fact check and its photos.
// --release says what is still short of the bar but does not refuse, since
// the call is his.
//
// Bump when a batch of work is done (new lessons, a round of fixes, a
// review pass), with a sentence on what changed: it shows in the course's
// Settings, under About. The version and its history live in the course's
// course.json under `release`; readers' progress is kept by lesson id, so a
// new version never touches a save. Afterwards: npm run status, and commit
// course.json with docs/status.*.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { collect, releaseGaps } from './status.mjs';
import { root as ROOT } from './lib/course.mjs';

const courseFolders = () => readdirSync(join(ROOT, 'courses')).filter((f) => existsSync(join(ROOT, 'courses', f, 'course.json')));

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const [folder, note] = args.filter((a) => !a.startsWith('--'));
const today = new Date().toISOString().slice(0, 10);

const data = collect();
const statusOf = (f) => data.courses.find((c) => c.folder === f);

if (!folder) {
  for (const c of data.courses.filter((x) => !x.outlineOnly)) {
    const r = c.release;
    const gaps = releaseGaps(c);
    const stand = r?.stage === 'released' ? 'released' : gaps.length ? `to release: ${gaps.join(', ')}` : 'meets the bar; Rob can release it';
    console.log(`${c.title.padEnd(28)} ${r ? `${r.version} ${r.stage}`.padEnd(14) : 'no release'.padEnd(14)} ${stand}`);
  }
  process.exit(0);
}

if (!courseFolders().includes(folder)) {
  console.error(`No course in courses/${folder}. Courses: ${courseFolders().join(', ')}`);
  process.exit(1);
}
if (!note?.trim()) {
  console.error('Say in a sentence what changed: npm run release -- <course> "What changed"');
  process.exit(1);
}

const file = join(ROOT, 'courses', folder, 'course.json');
const info = JSON.parse(readFileSync(file, 'utf8'));
const old = info.release;
const [major, minor] = old.version.split('.').map(Number);
let next;
if (flags.has('--release')) {
  if (old.stage === 'released') {
    console.error(`${info.title} is already released (${old.version}).`);
    process.exit(1);
  }
  const gaps = releaseGaps(statusOf(folder));
  if (gaps.length) console.warn(`Releasing ${info.title} though it is short of the bar: ${gaps.join(', ')}.`);
  next = { version: '1.0', stage: 'released' };
} else if (flags.has('--major')) {
  if (old.stage === 'beta') {
    console.error(`${info.title} is in beta: a beta goes to 1.0 only with --release.`);
    process.exit(1);
  }
  next = { version: `${major + 1}.0`, stage: 'released' };
} else {
  next = { version: `${major}.${minor + 1}`, stage: old.stage };
}

const { history = [], ...was } = old;
info.release = { ...next, date: today, note: note.trim(), history: [was, ...history] };
writeFileSync(file, JSON.stringify(info, null, 2) + '\n');
console.log(`${info.title}: ${old.version} ${old.stage} -> ${next.version} ${next.stage}. Now npm run status, and commit courses/${folder}/course.json with docs/status.*.`);
