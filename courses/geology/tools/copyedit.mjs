// The final copy edit and fact check of a lesson by a second model on
// OpenRouter (default Gemini Argon). Every piece of prose in the lesson JSON
// (teaches, paragraphs, key ideas, captions, tasks, quiz questions, choices
// and explanations, learned, next) goes in one request, numbered. What comes
// back is checked before it is used: markup (**bold**, *italic*) must
// survive, and nothing may grow by more than a quarter. A piece that fails
// keeps its old words and is listed in the report, with the model's notes on
// facts it changed or doubts.
//
//   OPENROUTER_API_KEY=… node tools/copyedit.mjs <lesson-id …> [--write]
//
// Reports go to tools/copyedit-out/<lesson>.md (not committed). With
// --write the new words go into src/lessons/<lesson>.json.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'tools/copyedit-out');
const MODEL = process.env.MODEL ?? 'google/gemini-4-argon';
const KEY = process.env.OPENROUTER_API_KEY;
const args = process.argv.slice(2);
const write = args.includes('--write');
const ids = args.filter((a) => !a.startsWith('--'));
if (!KEY || !ids.length) {
  console.error('usage: OPENROUTER_API_KEY=… node tools/copyedit.mjs <lesson-id …> [--write]');
  process.exit(1);
}

const BRIEF = `You are the final copy editor and fact checker for an illustrated online geology course. Readers are smart high schoolers and curious adults: don't talk down to them, and don't swing academic (say "underwater", not "subaqueous"). Each lesson opens on a field or history mystery and follows the evidence.

You get one lesson as numbered pieces of prose, each with a note of where it sits. For each piece:
1. Fix factual errors: names, dates, numbers, places, who did what, and the science. Correct them in the text. Do not add new facts or examples beyond a correction.
2. Copy edit: clear, concrete, natural sentences in British-leaning spelling as the source uses ("metres", "sulphur", "crystallised"). Keep the meaning, the order of ideas and the paragraph's role. Pieces that are already good can come back unchanged.
3. Keep markup exactly: **bold** and *italic* spans stay, around the same words.
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
  const add = (where, get, set) => out.push({ where, text: get(), set });
  add('teaches', () => lesson.teaches, (v) => (lesson.teaches = v));
  lesson.parts.forEach((p, i) => {
    add(`part ${i + 1} title`, () => p.title, (v) => (p.title = v));
    p.blocks.forEach((b, j) => {
      const at = `part ${i + 1} "${p.title}", block ${j + 1}`;
      if (b.type === 'text') add(`${at}, paragraph`, () => b.text, (v) => (b.text = v));
      if (b.type === 'key_ideas') b.points.forEach((_, k) => add(`${at}, key idea`, () => b.points[k], (v) => (b.points[k] = v)));
      if (b.type === 'diagram' || b.type === 'interactive_diagram') {
        add(`${at}, caption of ${b.id === 'photo' ? `photo "${b.options.photo}"` : `figure "${b.id}"`}`, () => b.caption, (v) => (b.caption = v));
        if (b.task) add(`${at}, task for the reader`, () => b.task, (v) => (b.task = v));
      }
      if (b.type === 'quiz') b.options.items.forEach((q, k) => {
        add(`quiz ${k + 1}, question`, () => q.ask, (v) => (q.ask = v));
        q.choices.forEach((_, c) => add(`quiz ${k + 1}, choice ${c + 1}${c === q.answer ? ' (correct)' : ' (wrong)'}`, () => q.choices[c], (v) => (q.choices[c] = v)));
        add(`quiz ${k + 1}, explanation`, () => q.why, (v) => (q.why = v));
      });
    });
  });
  (lesson.summary ?? []).forEach((_, i) => add('summary point', () => lesson.summary[i], (v) => (lesson.summary[i] = v)));
  if (typeof lesson.next === 'string') add('next', () => lesson.next, (v) => (lesson.next = v));
  return out;
}

const MARKUP = /\*\*.+?\*\*|\*[^*]+?\*/g;
function problem(before, after) {
  if (typeof after !== 'string' || !after.trim()) return 'empty';
  const m0 = (before.match(MARKUP) ?? []).length;
  const m1 = (after.match(MARKUP) ?? []).length;
  if (m0 !== m1) return `markup changed (${m0} spans to ${m1})`;
  if (after.length > before.length * 1.25 + 25) return `grew from ${before.length} to ${after.length} characters`;
  if (/—/.test(after) && !/—/.test(before)) return 'uses an em dash';
  return null;
}

/** The lesson as JSON in the files' hand layout: one block to a line, one quiz question to a line. */
function format(lesson) {
  const one = (v) => JSON.stringify(v);
  const block = (b) => b.type === 'quiz'
    ? `{"type": "quiz", "id": ${one(b.id)}, "caption": ${one(b.caption)}, "task": ${one(b.task)}, "options": {"items": [\n${b.options.items.map((q) => `          ${one(q)}`).join(',\n')}\n        ]}}`
    : one(b);
  const parts = lesson.parts.map((p) => `    {\n      "title": ${one(p.title)},\n      "blocks": [\n${p.blocks.map((b) => `        ${block(b)}`).join(',\n')}\n      ]\n    }`).join(',\n');
  const head = Object.entries(lesson).filter(([k]) => k !== 'parts' && !['learned', 'summary', 'next', 'journal', 'footnotes'].includes(k)).map(([k, v]) => `  ${one(k)}: ${one(v)}`);
  const tail = [...(lesson.learned ? [`  "learned": [\n${lesson.learned.map((l) => `    ${one(l)}`).join(',\n')}\n  ]`] : []), ...(lesson.summary ? [`  "summary": [\n${lesson.summary.map((l) => `    ${one(l)}`).join(',\n')}\n  ]`] : []), ...(lesson.next !== undefined ? [`  "next": ${one(lesson.next)}`] : []), `  "journal": ${one(lesson.journal ?? [])}`, `  "footnotes": ${one(lesson.footnotes ?? {})}`];
  return `{\n${[...head, `  "parts": [\n${parts}\n  ]`, ...tail].join(',\n')}\n}\n`;
}

mkdirSync(OUT, { recursive: true });
for (const id of ids) {
  const file = join(ROOT, 'src/lessons', `${id}.json`);
  const lesson = JSON.parse(readFileSync(file, 'utf8'));
  const ps = pieces(lesson);
  const prompt = `Lesson: "${lesson.title}"\n\n${ps.map((p, i) => `[${i + 1}] (${p.where})\n${p.text}`).join('\n\n')}`;
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: BRIEF }, { role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.3 }),
  });
  const d = await r.json();
  const raw = d.choices?.[0]?.message?.content ?? '';
  let reply;
  try { reply = JSON.parse(raw.replace(/^```json\s*|```\s*$/g, '')); } catch { console.error(`${id}: no JSON back`, raw.slice(0, 400), d.error ?? ''); continue; }
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
  if (write) writeFileSync(file, format(lesson));
  console.log(`${id}: ${changed} of ${ps.length} pieces changed, ${(reply.facts ?? []).length} fact notes${write ? ', written' : ''} (${d.usage?.total_tokens ?? '?'} tokens)`);
}
