// Puts parked photos back into a course's lessons. Lessons written without
// their photos keep each missing photo block in
// courses/<course>/tools/pending-photos.json, with the lesson, the part, the
// start of the paragraph it followed and, often, a `search` hint for Wikimedia
// Commons. Once a photo is fetched (add a pick to tools/photo-picks.json and
// run `npm run photos -- <course>`), this moves its block back where it was
// and drops it from the queue. Quiz questions that show a photo are parked
// whole (`quiz_item`) and go back at the end of their lesson's check. Lesson
// files keep their layout (didactics/course formatJson).
//
//   npm run restore-photos -- <course>          restore every photo that now exists
//   npm run restore-photos -- <course> --list   list what is still waiting, with hints

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatJson } from 'didactics/course';
import { courseArg, readJson } from './lib/course.mjs';

const { name, dir, lessons } = courseArg('usage: npm run restore-photos -- <course> [--list]');
const pendingFile = join(dir, 'tools/pending-photos.json');
const pending = readJson(pendingFile, null);
if (!pending) {
  console.error(`${name} has no tools/pending-photos.json: nothing is parked`);
  process.exit(1);
}
const photoOf = (e) => (e.quiz_item ? e.quiz_item.photo : e.block.options.photo);
const have = new Set(readJson(join(dir, 'src/data/photos.json'), []).map((p) => p.id));

if (process.argv.includes('--list')) {
  for (const e of pending) {
    const id = photoOf(e);
    console.log(`${have.has(id) ? 'READY  ' : 'waiting'} ${id.padEnd(26)} ${e.lesson.padEnd(14)} ${e.search ?? e.block?.caption ?? e.quiz_item.ask}`);
  }
  process.exit(0);
}

const words = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
/** How well a paragraph matches the remembered start of the one the photo followed (copy edits may have changed it). */
const likeness = (text, after) => {
  const a = words(after).slice(0, 12);
  const b = new Set(words(text).slice(0, 20));
  return a.length ? a.filter((w) => b.has(w)).length / a.length : 0;
};

const left = [];
/** Lessons changed, by file: the parsed lesson and the text it came from. */
const touched = new Map();
const open = (file) => {
  if (!touched.has(file)) {
    const source = readFileSync(file, 'utf8');
    touched.set(file, { lesson: JSON.parse(source), source });
  }
  return touched.get(file).lesson;
};
for (const e of pending) {
  const id = photoOf(e);
  if (!have.has(id)) {
    left.push(e);
    continue;
  }
  const file = join(lessons, `${e.lesson}.json`);
  const lesson = open(file);
  const part = lesson.parts.find((p) => p.title === e.part) ?? lesson.parts[0];
  if (e.quiz_item) {
    const quiz = lesson.parts.flatMap((p) => p.blocks).find((b) => b.type === 'quiz');
    if (quiz && !quiz.options.items.some((q) => q.ask === e.quiz_item.ask)) quiz.options.items.push(e.quiz_item);
    console.log(`restored quiz photo ${id} in ${e.lesson}`);
    continue;
  }
  if (part.blocks.some((b) => b.id === 'photo' && b.options?.photo === id)) continue;
  let at = -1;
  let best = 0.5;
  part.blocks.forEach((b, i) => {
    if (b.type !== 'text') return;
    const s = likeness(b.text, e.after);
    if (s > best) [best, at] = [s, i];
  });
  if (at < 0) at = part.blocks.findIndex((b) => b.type === 'text');
  part.blocks.splice(at + 1, 0, e.block);
  console.log(`restored ${id} in ${e.lesson} (${e.part})`);
}
/** A file that is plain JSON.stringify at some indent (Synthesizers' lessons use one space) is written the same way; others keep their layout. */
const plain = (lesson, source) => {
  const indent = /^\{\r?\n( +)"/.exec(source)?.[1];
  if (!indent || JSON.stringify(JSON.parse(source), null, indent.length) !== source.trimEnd()) return null;
  return JSON.stringify(lesson, null, indent.length) + (source.endsWith('\n') ? '\n' : '');
};
for (const [file, { lesson, source }] of touched) writeFileSync(file, plain(lesson, source) ?? formatJson(lesson, source));
writeFileSync(pendingFile, `${JSON.stringify(left, null, 1)}\n`);
console.log(`${pending.length - left.length} restored, ${left.length} still waiting`);
