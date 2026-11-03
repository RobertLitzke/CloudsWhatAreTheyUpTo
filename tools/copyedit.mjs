// The final copy edit and fact check of a course's lessons by a second model
// on OpenRouter (default Gemini Argon). Every piece of prose in a lesson's
// JSON (teaches, part titles, paragraphs, key ideas, captions, tasks, quiz
// questions, choices and explanations, summary or learned points, next,
// footnotes) goes in one request, numbered. What comes back is checked before
// it is used: markup (**bold**, *italic*, [[links]]) must survive, and
// nothing may grow by more than a quarter. A piece that fails keeps its old
// words and is listed in the report, with the model's notes on facts it
// changed or doubts.
//
//   OPENROUTER_API_KEY=… node tools/copyedit.mjs <course> <lesson-id …> [--write]
//   OPENROUTER_API_KEY=… node tools/copyedit.mjs <course> --queue [--write]
//
// A course takes part by keeping courses/<course>/tools/copyedit.json, the
// part of the brief that is its own: { "course": "an illustrated online
// geology course", "intro": "what its lessons are like", "voice": optional,
// "spellings": ["metres", "sulphur"] }. The rules every course shares are
// below. Its lessons are read from the folder course.json names.
//
// --queue edits every lesson waiting in courses/<course>/tools/review-queue.json,
// where new prose is listed when it is written (lesson, date, what changed,
// and optionally notes: specific fixes for the editor to make), so the
// reviews can be run later as one batch (tools/review-queue.mjs runs
// every course's). With --write each lesson that comes back cleanly is taken
// off the queue.
//
// Reports go to courses/<course>/tools/copyedit-out/<lesson>.md (not
// committed). With --write the new words go into the lesson's file, in the
// layout it had (didactics/course formatJson).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatJson } from 'didactics/course';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = process.env.MODEL ?? 'google/gemini-4-argon';
const KEY = process.env.OPENROUTER_API_KEY;
const args = process.argv.slice(2);
const write = args.includes('--write');
const [course, ...rest] = args.filter((a) => !a.startsWith('--'));
const usage = 'usage: OPENROUTER_API_KEY=… node tools/copyedit.mjs <course> <lesson-id …> | --queue [--write]';

const dir = course && join(root, 'courses', course);
if (!course || !existsSync(join(dir, 'course.json'))) {
  console.error(course ? `no course "${course}" in courses/` : usage);
  process.exit(1);
}
const briefFile = join(dir, 'tools/copyedit.json');
if (!existsSync(briefFile)) {
  console.error(`${course} has no tools/copyedit.json: write one ({ course, intro, voice?, spellings }) for it to take the copy edit`);
  process.exit(1);
}
const OUT = join(dir, 'tools/copyedit-out');
const QUEUE = join(dir, 'tools/review-queue.json');
const LESSONS = join(dir, JSON.parse(readFileSync(join(dir, 'course.json'), 'utf8')).lessons);
const queued = args.includes('--queue') && existsSync(QUEUE) ? JSON.parse(readFileSync(QUEUE, 'utf8')) : [];
const ids = [...new Set([...rest, ...queued.map((q) => q.lesson)])];
if (!KEY || !ids.length) {
  console.error(KEY ? 'nothing to edit: name lessons, or the queue is empty' : usage);
  process.exit(1);
}

const own = JSON.parse(readFileSync(briefFile, 'utf8'));
const BRIEF = `You are the final copy editor and fact checker for ${own.course}. Readers are smart high schoolers and curious adults: don't talk down to them, and don't swing academic (say "underwater", not "subaqueous"). ${own.intro}
${own.voice ? `\n${own.voice}\n` : ''}
You get one lesson as numbered pieces of prose, each with a note of where it sits. For each piece:
1. Fix factual errors: names, dates, numbers, places, who did what, and the science. Correct them in the text. Do not add new facts or examples beyond a correction.
2. Copy edit: clear, concrete, natural sentences in British-leaning spelling as the source uses (${(own.spellings ?? ['metres', 'colour', 'recognised']).map((w) => `"${w}"`).join(', ')}). Keep the meaning, the order of ideas and the paragraph's role. Pieces that are already good can come back unchanged.
3. Keep markup exactly: **bold** and *italic* spans stay, around the same words, and so do [[links]] to the encyclopedia (keep the words inside the brackets, and anything after a |, as they are).
4. Keep the length: the same or shorter, never more than a quarter longer.
5. Quiz pieces: the choice marked (correct) must stay correct and the others wrong.

Avoid the habits of machine-written text:
- No em dashes or en dashes as punctuation; use commas, colons, full stops or parentheses. (En dashes in number ranges like 1857–1936 are fine.)
- No "It's not just X, it's Y", "not only... but also", "Here's the thing", "Let's", "Imagine", "In short", "Ultimately", "In conclusion".
- No groups of three adjectives or three parallel clauses for rhythm's sake.
- No "delve", "tapestry", "crucial", "vital", "key" as an adjective, "fascinating", "remarkable", "incredible", "journey", "unlock", "harness", "robust", "seamless", "landscape" (as a metaphor), "realm", "testament".
- No exclamation marks (except inside a quotation), no rhetorical questions that the next sentence answers, no sign-off summaries, no sentence that only announces what the next will say.

Reply with JSON only:
{"pieces": [{"n": 1, "text": "..."}, ...], "facts": ["one line per factual change you made or doubt you have, naming the piece number"]}
Include every piece, same numbers.`;

/** Every prose string in the lesson, with a path to put it back. */
function pieces(lesson) {
  const out = [];
  const add = (where, get, set) => typeof get() === 'string' && out.push({ where, text: get(), set });
  const list = (where, arr) => (arr ?? []).forEach((_, i) => add(where, () => arr[i], (v) => (arr[i] = v)));
  add('teaches', () => lesson.teaches, (v) => (lesson.teaches = v));
  lesson.parts.forEach((p, i) => {
    add(`part ${i + 1} title`, () => p.title, (v) => (p.title = v));
    p.blocks.forEach((b, j) => {
      const at = `part ${i + 1} "${p.title}", block ${j + 1}`;
      if (b.type === 'text') add(`${at}, paragraph`, () => b.text, (v) => (b.text = v));
      if (b.type === 'key_ideas') list(`${at}, key idea`, b.points);
      if (b.type === 'diagram' || b.type === 'interactive_diagram') {
        add(`${at}, caption of ${b.id === 'photo' ? `photo "${b.options?.photo}"` : `figure "${b.id}"`}`, () => b.caption, (v) => (b.caption = v));
        add(`${at}, task for the reader`, () => b.task, (v) => (b.task = v));
      }
      if (b.type === 'quiz') (b.options?.items ?? []).forEach((q, k) => {
        add(`quiz ${k + 1}, question`, () => q.ask, (v) => (q.ask = v));
        q.choices.forEach((_, c) => add(`quiz ${k + 1}, choice ${c + 1}${c === q.answer ? ' (correct)' : ' (wrong)'}`, () => q.choices[c], (v) => (q.choices[c] = v)));
        add(`quiz ${k + 1}, explanation`, () => q.why, (v) => (q.why = v));
      });
    });
  });
  list('summary point', lesson.summary);
  list('learned', lesson.learned);
  add('next', () => lesson.next, (v) => (lesson.next = v));
  for (const [id, n] of Object.entries(lesson.footnotes ?? {})) {
    add(`footnote "${id}" (${n.kind}), title`, () => n.title, (v) => (n.title = v));
    add(`footnote "${id}" (${n.kind}), text`, () => n.text, (v) => (n.text = v));
  }
  return out;
}

const MARKUP = /\*\*.+?\*\*|\*[^*]+?\*|\[\[.+?\]\]/g;
function problem(before, after) {
  if (typeof after !== 'string' || !after.trim()) return 'empty';
  const m0 = (before.match(MARKUP) ?? []).length;
  const m1 = (after.match(MARKUP) ?? []).length;
  if (m0 !== m1) return `markup changed (${m0} spans to ${m1})`;
  if (after.length > before.length * 1.25 + 25) return `grew from ${before.length} to ${after.length} characters`;
  if (/—/.test(after) && !/—/.test(before)) return 'uses an em dash';
  return null;
}

mkdirSync(OUT, { recursive: true });
for (const id of ids) {
  const file = join(LESSONS, `${id}.json`);
  if (!existsSync(file)) { console.error(`${id}: no such lesson in ${LESSONS}`); process.exitCode = 1; continue; }
  const source = readFileSync(file, 'utf8');
  const lesson = JSON.parse(source);
  const ps = pieces(lesson);
  // A queue entry may carry reviewers' notes: specific fixes the editor should make in this lesson.
  const notes = queued.filter((q) => q.lesson === id).flatMap((q) => q.notes ?? []);
  const ask = notes.length ? `Reviewers' notes for this lesson. Make these changes where they fall, within the rules above (same pieces, same markup, length limit):\n${notes.map((n) => `- ${n}`).join('\n')}\n\n` : '';
  const prompt = `${ask}Lesson: "${lesson.title}"\n\n${ps.map((p, i) => `[${i + 1}] (${p.where})\n${p.text}`).join('\n\n')}`;
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: BRIEF }, { role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.3 }),
  });
  const d = await r.json();
  const raw = d.choices?.[0]?.message?.content ?? '';
  let reply;
  try { reply = JSON.parse(raw.replace(/^```json\s*|```\s*$/g, '')); } catch { console.error(`${id}: no JSON back`, raw.slice(0, 400), d.error ?? ''); process.exitCode = 1; continue; }
  const report = [`# ${lesson.title}`, '', '## Facts', ...(reply.facts ?? []).map((f) => `- ${f}`), '', '## Changes', ''];
  let changed = 0;
  ps.forEach((p, i) => {
    const after = reply.pieces?.find((x) => x.n === i + 1)?.text;
    if (after === undefined || after === p.text) return;
    const bad = problem(p.text, after);
    report.push(`### [${i + 1}] ${p.where}${bad ? ` (KEPT: ${bad})` : ''}`, '', `- ${p.text}`, `+ ${after}`, '');
    if (!bad) { p.set(after); changed++; }
  });
  writeFileSync(join(OUT, `${id}.md`), report.join('\n'));
  if (write) writeFileSync(file, formatJson(lesson, source));
  if (write && queued.some((q) => q.lesson === id)) {
    const left = JSON.parse(readFileSync(QUEUE, 'utf8')).filter((q) => q.lesson !== id);
    writeFileSync(QUEUE, `${JSON.stringify(left, null, 1)}\n`);
  }
  console.log(`${id}: ${changed} of ${ps.length} pieces changed, ${(reply.facts ?? []).length} fact notes${write ? ', written' : ''} (${d.usage?.total_tokens ?? '?'} tokens)`);
}
