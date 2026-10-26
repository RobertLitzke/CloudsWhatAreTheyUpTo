// A rewrite pass over the lessons' prose by a second model, for a more natural
// voice. Each lesson goes in one request: every paragraph, key point, footnote
// and log line, numbered, as JSON. What comes back is checked before it is
// written: the markup (**bold**, *italic*, [[words|colour]], [^note]) must
// survive exactly, numbers must not change, and nothing may grow by more than
// a fifth. A piece that fails keeps its old words and is listed in the report.
//
//   OPENROUTER_API_KEY=… node tools/rewrite/rewrite.mjs [lesson-id …] [--write]
//
// Without --write it only writes the before-and-after report to
// tools/rewrite/out/<lesson>.md. With it, the new words go into the lesson
// JSON by exact string replacement, so the files keep their hand formatting.
// MODEL picks the OpenRouter model; the default is Gemini Flash.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const LESSONS = join(ROOT, 'src/data/lessons');
const OUT = join(ROOT, 'tools/rewrite/out');
const MODEL = process.env.MODEL ?? 'google/gemini-3.8-flash';
const KEY = process.env.OPENROUTER_API_KEY;

const args = process.argv.slice(2);
const write = args.includes('--write');
const only = args.filter((a) => !a.startsWith('--'));

const STYLE = `You are editing the prose of a short illustrated course on garden soil, for adult gardeners with no science background.
Rewrite each numbered piece so it reads as if a thoughtful, experienced gardener and teacher wrote it by hand: plain, concrete, warm, unhurried, and never condescending.

Keep exactly:
- Every fact, number, unit, name and date. Do not add facts or examples.
- The markup, character for character: **bold**, *italic*, [[words|key]] (you may change neither the words inside nor the key), and footnote markers like [^stokes], which stay straight after the same word.
- The spelling and contractions of the source (it writes "fertilizer", "sulfur", "aluminium", "can't").
- The length: the same or shorter. Never more than a fifth longer.
- The meaning and the order of ideas. Paragraphs that are already good can come back unchanged.

Avoid the habits of machine-written text:
- No em dashes or en dashes; use commas, colons, full stops or parentheses.
- No "It's not just X, it's Y", "not only... but also", "Here's the thing", "Let's", "Imagine", "In short", "Ultimately", "In conclusion".
- No groups of three adjectives or three parallel clauses for rhythm's sake.
- No "delve", "tapestry", "crucial", "vital", "key" (as an adjective), "fascinating", "remarkable", "incredible", "journey", "unlock", "harness", "robust", "seamless", "landscape", "realm".
- No exclamation marks, no rhetorical questions that the next sentence answers, no sign-off summaries.
- No sentence that only announces what the next sentence will say.

Reply with JSON only: {"pieces": [{"n": 1, "text": "..."}, ...]}, one entry per piece, same numbers.`;

/** Every piece of a lesson that is prose, with a path to say where it came from. */
function pieces(lesson) {
  const out = [];
  out.push({ where: 'teaches', text: lesson.teaches });
  lesson.parts.forEach((p, i) => p.blocks.forEach((b, j) => {
    if (b.kind === 'text') out.push({ where: `part ${i + 1}, paragraph ${j + 1}`, text: b.text });
    if (b.kind === 'key') b.points.forEach((pt, k) => out.push({ where: `part ${i + 1}, ${b.title} ${k + 1}`, text: pt }));
  }));
  for (const [id, n] of Object.entries(lesson.footnotes ?? {})) out.push({ where: `note ${id}`, text: n.text });
  lesson.learned.forEach((l, i) => out.push({ where: `learned ${i + 1}`, text: l }));
  out.push({ where: 'next', text: lesson.next });
  return out;
}

const MARKUP = /\*\*.+?\*\*|\*.+?\*|\[\[.+?\|\w+\]\]|\[\^[\w-]+\]/g;
const NUMBER = /\d+(?:[.,]\d+)?/g;
const BANNED = /[–—]|\b(delve|tapestry|crucial|vital|fascinating|remarkable|incredible|journey|unlock|harness|robust|seamless|realm)\b|!/i;

/** Why a rewrite can't be used, or null if it can. */
function problem(before, after) {
  if (typeof after !== 'string' || !after.trim()) return 'empty';
  const m0 = (before.match(MARKUP) ?? []).join('|');
  const m1 = (after.match(MARKUP) ?? []).join('|');
  if (m0 !== m1) return `markup changed: ${m0} → ${m1}`;
  const n0 = (before.match(NUMBER) ?? []).sort().join(',');
  const n1 = (after.match(NUMBER) ?? []).sort().join(',');
  if (n0 !== n1) return `numbers changed: ${n0} → ${n1}`;
  if (after.length > before.length * 1.2 + 20) return `grew from ${before.length} to ${after.length} characters`;
  const banned = after.match(BANNED);
  if (banned && !before.match(BANNED)) return `uses "${banned[0]}"`;
  return null;
}

async function ask(list) {
  const body = {
    model: MODEL,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    usage: { include: true },
    messages: [
      { role: 'system', content: STYLE },
      { role: 'user', content: JSON.stringify({ pieces: list.map((p, i) => ({ n: i + 1, text: p.text })) }) },
    ],
  };
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Dirt lesson rewrite' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? '';
  const parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  return { pieces: parsed.pieces ?? [], cost: json.usage?.cost ?? 0, tokens: json.usage?.total_tokens ?? 0 };
}

async function main() {
  if (!KEY) throw new Error('Set OPENROUTER_API_KEY.');
  mkdirSync(OUT, { recursive: true });
  const files = readdirSync(LESSONS).filter((f) => f.endsWith('.json') && (!only.length || only.includes(f.replace(/\.json$/, ''))));
  let spent = 0;
  for (const f of files) {
    const path = join(LESSONS, f);
    let raw = readFileSync(path, 'utf8');
    const lesson = JSON.parse(raw);
    const list = pieces(lesson);
    const { pieces: back, cost, tokens } = await ask(list);
    spent += cost;
    const report = [`# ${lesson.title}`, '', `Model ${MODEL}, ${tokens} tokens, $${cost.toFixed(4)}.`, ''];
    let changed = 0;
    list.forEach((p, i) => {
      const after = back.find((b) => b.n === i + 1)?.text;
      const why = problem(p.text, after);
      if (why) {
        report.push(`## ${p.where}: kept`, '', `> ${p.text}`, '', `Rejected (${why}): ${after ?? '(missing)'}`, '');
        return;
      }
      if (after === p.text) return;
      changed++;
      report.push(`## ${p.where}`, '', `Before: ${p.text}`, '', `After: ${after}`, '');
      if (write) {
        const from = JSON.stringify(p.text).slice(1, -1);
        const to = JSON.stringify(after).slice(1, -1);
        if (raw.split(from).length === 2) raw = raw.replace(from, () => to);
        else report.push(`(Not written: the old text was not found exactly once in ${f}.)`, '');
      }
    });
    if (write) {
      JSON.parse(raw);
      writeFileSync(path, raw);
    }
    writeFileSync(join(OUT, f.replace(/\.json$/, '.md')), report.join('\n'));
    console.log(`${f}: ${changed} of ${list.length} pieces rewritten, $${cost.toFixed(4)}`);
  }
  console.log(`Total: $${spent.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
