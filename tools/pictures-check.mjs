// Checks every course's picture records (didactics/picture-tools
// checkPictures): each record's fields (kind, licence, author, source link),
// and none on Commons' inaccurate-paleoart list as last saved in
// tools/inaccurate-paleoart.json. The site test runs the same check offline.
//
//   npm run pictures:check [-- <course>...] [--live]     --live asks Commons again for each reconstruction
//   npm run pictures:paleoart                            save the list again from Commons (your own computer)

import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkPictures, fetchPaleoart } from 'didactics/picture-tools';
import { readJson, root } from './lib/course.mjs';

const listFile = join(root, 'tools/inaccurate-paleoart.json');
const userAgent = 'CoursesSite/0.1 (https://github.com/RobertLitzke/Courses)';

if (process.argv.includes('--paleoart')) {
  const list = await fetchPaleoart({ userAgent });
  writeFileSync(listFile, `${JSON.stringify(list, null, 1)}\n`);
  console.log(`${list.files.length} files from ${list.from.join(', ')} saved to tools/inaccurate-paleoart.json`);
  process.exit(0);
}

const named = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const courses = named.length ? named : readdirSync(join(root, 'courses')).filter((c) => existsSync(join(root, 'courses', c, 'src/data/photos.json')));
const paleoart = readJson(listFile, undefined);
if (!paleoart) console.warn('no tools/inaccurate-paleoart.json yet: run npm run pictures:paleoart on your own computer');
let bad = 0;
for (const c of courses) {
  const r = await checkPictures(readJson(join(root, 'courses', c, 'src/data/photos.json'), []), { paleoart, live: process.argv.includes('--live') ? { userAgent } : undefined });
  for (const p of [...r.problems, ...r.paleoart]) console.log(`${c}: ${p.id}: ${p.problem}`);
  bad += r.problems.length + r.paleoart.length;
}
console.log(bad ? `${bad} problems` : `every picture in ${courses.length} courses is in order`);
if (bad) process.exitCode = 1;
