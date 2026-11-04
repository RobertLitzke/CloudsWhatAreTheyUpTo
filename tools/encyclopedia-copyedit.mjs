// The final copy edit and fact check of the site's encyclopedia
// (encyclopedia/<course>.json) by a second model on OpenRouter (default
// Gemini Argon), the same pass the lessons get (courses/*/tools/copyedit.mjs).
// Every piece of prose in a file is sent numbered: each course page's line and
// text, and each entry's line, text and "why it matters". Edits that change
// markup or grow too much are reported and kept out.
//
//   OPENROUTER_API_KEY=… node tools/encyclopedia-copyedit.mjs geology astronomy [--write]
//   OPENROUTER_API_KEY=… node tools/encyclopedia-copyedit.mjs --queue --write
//
// The queue is tools/encyclopedia-review-queue.json, entries `{ file, added, what }`
// with file the course's name ("geology"); writers append to it, and
// tools/review-queue.mjs runs it with the lessons' queues. With --write each
// file that comes back is written and taken off the queue. Reports go to
// encyclopedia/copyedit-out/<file>.md (not committed): read their "Facts"
// sections before committing, as the model's fact changes are sometimes wrong.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'encyclopedia');
const OUT = join(ROOT, 'copyedit-out');
const QUEUE = join(ROOT, '..', 'tools', 'encyclopedia-review-queue.json');
const MODEL = process.env.MODEL ?? 'google/gemini-4-argon';
const KEY = process.env.OPENROUTER_API_KEY;
const args = process.argv.slice(2);
const write = args.includes('--write');
const queued = args.includes('--queue') ? JSON.parse(readFileSync(QUEUE, 'utf8')) : [];
const files = [...new Set([...args.filter((a) => !a.startsWith('--')), ...queued.map((q) => q.file)])];
if (!KEY || !files.length) {
  console.error(KEY ? 'nothing to edit: name files, or the queue is empty' : 'usage: OPENROUTER_API_KEY=… node tools/encyclopedia-copyedit.mjs <course …> | --queue [--write]');
  process.exit(1);
}

const BRIEF = `You are the final copy editor and fact checker for the encyclopedia of an illustrated online science course site (geology, astronomy, weather and more). Each entry is a short, vivid account of an idea, a person, a place or a thing: what it is, why it mattered, and what it connects to. The voice is close to Carl Sagan or Richard Feynman: plain words, concrete pictures, a sense of wonder, no showing off. Readers are smart high schoolers and curious adults. Entries are not Wikipedia: no early life, honours or politics, no dry lists, no heavy maths.

The most important thing is that nothing reads as if a language model wrote it. Rob, who reads every entry, notices the tells of machine-written text at once and finds them grating: the list under "Avoid" gives specific examples, but avoid any habit of LLM prose, listed or not.

You get one file as numbered pieces of prose, each with a note of where it sits. For each piece:
1. Fix factual errors: names, dates, numbers, places, who did what, and the science. Correct them in the text. Do not add new facts beyond a correction.
2. Copy edit: clear, concrete, natural sentences in British-leaning spelling as the source uses. Keep the meaning, the order of ideas and the voice. Pieces that are already good can come back unchanged.
3. Keep markup exactly: **bold** and *italic* spans stay, around the same words, and [[links]] stay with the words inside the brackets, and anything after a |, as they are.
4. Keep the length: the same or shorter, never more than a quarter longer.

Avoid the habits of machine-written text. Specific examples:
- No em dashes or en dashes as punctuation; use commas, colons, full stops or parentheses. (En dashes in number ranges like 1857–1936 are fine.)
- No "It's not just X, it's Y", "not only... but also", "Here's the thing", "Let's", "In short", "Ultimately", "In conclusion".
- No groups of three adjectives or three parallel clauses for rhythm's sake.
- No "delve", "tapestry", "crucial", "vital", "key" as an adjective, "fascinating", "remarkable", "incredible", "journey", "unlock", "harness", "robust", "seamless", "landscape" (as a metaphor), "realm", "testament".
- No exclamation marks (except inside a quotation), no sign-off summaries.

Reply with JSON only:
{"pieces": [{"n": 1, "text": "..."}, ...], "facts": ["one line per factual change you made or doubt you have, naming the piece number"]}
Include every piece, same numbers.`;

/** Every prose string in the file, with a path to put it back. */
function pieces(file) {
  const out = [];
  const add = (where, get, set) => out.push({ where, text: get(), set });
  const c = file.course;
  if (c) {
    add('course page: line', () => c.line, (v) => (c.line = v));
    (c.text ?? []).forEach((_, i) => add(`course page: paragraph ${i + 1}`, () => c.text[i], (v) => (c.text[i] = v)));
    (c.tables ?? []).forEach((t) => { if (t.note) add(`course page: note under the table "${t.title}"`, () => t.note, (v) => (t.note = v)); });
  }
  for (const [id, e] of Object.entries(file.entries ?? {})) {
    const who = `${e.kind} "${e.title}"${e.dates ? ` (${e.dates})` : ''}`;
    add(`${who}: one-line summary`, () => e.line, (v) => (e.line = v));
    e.text.forEach((_, i) => add(`${who}: paragraph ${i + 1}`, () => e.text[i], (v) => (e.text[i] = v)));
    if (e.matters) add(`${who}: why it matters`, () => e.matters, (v) => (e.matters = v));
    void id;
  }
  return out;
}

const MARKUP = /\*\*.+?\*\*|\*[^*]+?\*|\[\[.+?\]\]/g;
function problem(before, after) {
  if (typeof after !== 'string' || !after.trim()) return 'empty';
  const m0 = before.match(MARKUP) ?? [];
  const m1 = after.match(MARKUP) ?? [];
  if (m0.length !== m1.length) return `markup changed (${m0.length} spans to ${m1.length})`;
  const links = (xs) => xs.filter((x) => x.startsWith('[[')).join(' ');
  if (links(m0) !== links(m1)) return 'a link changed';
  if (after.length > before.length * 1.25 + 25) return `grew from ${before.length} to ${after.length} characters`;
  if (/—/.test(after) && !/—/.test(before)) return 'uses an em dash';
  return null;
}

mkdirSync(OUT, { recursive: true });
for (const name of files) {
  const path = join(ROOT, `${name}.json`);
  const file = JSON.parse(readFileSync(path, 'utf8'));
  const ps = pieces(file);
  const prompt = `Encyclopedia file: ${name}\n\n${ps.map((p, i) => `[${i + 1}] (${p.where})\n${p.text}`).join('\n\n')}`;
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: BRIEF }, { role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.3 }),
  });
  const d = await r.json();
  const raw = d.choices?.[0]?.message?.content ?? '';
  let reply;
  try { reply = JSON.parse(raw.replace(/^```json\s*|```\s*$/g, '')); } catch { console.error(`${name}: no JSON back`, raw.slice(0, 400), d.error ?? ''); continue; }
  const report = [`# Encyclopedia: ${name}`, '', '## Facts', ...(reply.facts ?? []).map((f) => `- ${f}`), '', '## Changes', ''];
  let changed = 0;
  ps.forEach((p, i) => {
    const after = reply.pieces?.find((x) => x.n === i + 1)?.text;
    if (after === undefined || after === p.text) return;
    const bad = problem(p.text, after);
    report.push(`### [${i + 1}] ${p.where}${bad ? ` (KEPT: ${bad})` : ''}`, '', `- ${p.text}`, `+ ${after}`, '');
    if (!bad) { p.set(after); changed++; }
  });
  writeFileSync(join(OUT, `${name}.md`), report.join('\n'));
  if (write) writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);
  if (write && queued.some((q) => q.file === name)) {
    const rest = JSON.parse(readFileSync(QUEUE, 'utf8')).filter((q) => q.file !== name);
    writeFileSync(QUEUE, `${JSON.stringify(rest, null, 1)}\n`);
  }
  console.log(`${name}: ${changed} of ${ps.length} pieces changed, ${(reply.facts ?? []).length} fact notes${write ? ', written' : ''} (${d.usage?.total_tokens ?? '?'} tokens)`);
}
