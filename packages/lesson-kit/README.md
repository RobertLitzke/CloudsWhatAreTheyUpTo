# lesson-kit

The parts of Clouds that are not about clouds. Use it to build an interactive
explainer on any topic: lessons written as JSON, made of paragraphs and live
figures that show cause and effect, with tasks that open the next part, a
check at the end, and a log the reader signs. It also includes a
spaced-repetition quiz, optional radio talks typed out on a paper slip, a
settings page, and a PWA shell that works offline and as a single HTML file.

It is plain TypeScript with no framework. The DOM comes from a small `el()`
helper and drawings are SVG. Vite compiles the source files directly, so
there is no build step for the kit itself.

For now it lives in the Clouds repo as an npm workspace. Clouds imports it as
`lesson-kit/<module>`. The plan for a new topic is a template repo that
carries a copy of this folder. Fixes made in one copy have to be copied to
the others by hand.

---

## 1. What is in it

| Module | What it gives you |
| --- | --- |
| `dom` | `el('div.card', props, ...children)` and `svg(tag, attrs, ...children)` |
| `router` | `new Router(outlet, hooks).add('/x/:id', view).start('/home')`, hash routes, views return a teardown |
| `ui` | `page()`, `toast()`, `segmented()`, `sheet()` (a card over the page), `freshSeed()` |
| `rng` | `makeRng(seed)` (mulberry32), `shuffle(items, rng)` |
| `store` | `createStore({ key, empty, migrate })`, localStorage with repair, export and import |
| `progress` | The shared save shape (`Progress`): lessons done, best scores, journal, units, radio, quiz, lessons left part way. Also `migrateProgress`, `finishLesson`, `moveLesson` |
| `resume` | Lessons left part way: `LessonResume`, `lessonSignature`, `resumeFor`, `migrateResume`. `lessonView` uses it by itself |
| `tree` | The home page's lesson tree: `treeView`, `treeStates`, `nextLesson`, `treeProblems`, `TreeLesson`, `TreeBranch` |
| `units` | `height(m, units)`, `feet`, `deg`, `temp` |
| `figure` | What a figure is: `figure(goals, build)`, `quiz(build)`, `frame`, `slider`, `animate`, guess-first helpers (`lock`, `choices`, `lockIn`, `placeable`) |
| `draw` | SVG pieces: `still`, `label`/`small`/`note`/`heading`, `line`, `polyline`, `arrow`, `wavy`, `curve`, `hexagon`, `redraw` |
| `lesson` | The lesson JSON types, `prose(text, palette, notes?)`, `lessonView(options)` (the lesson player and log card), `lessonTexts()`, `lessonProblems()` for content tests |
| `footnote` | Footnotes that open in a popup: `footnoteSet`, `footnoteMarker`, `openFootnote`, `closeFootnote`, `footnoteLegend`, `footnoteProblems` |
| `glossary` | `glossaryFromLessons`, `glossaryFromFile`, `mergeGlossary`, `glossaryView({ entries, prose, lesson? })` (search, letter index, A to Z), `glossaryProblems` |
| `quiz` | Leitner scheduling: `review`, `deal`, `tally`, `GAPS_DAYS`, the `Card` shape, `conceptCard` for hand-written cards |
| `quiz-view` | `quizView({ deck, store, blurb, media? })`, the quiz page |
| `radio` | Talk, Turn and Reply types, `transcript()` |
| `slip` | `createSlip({ stations, snubs, signOff, onHeard, onOff })` returns `{ play, clear }`, the typewriter slip |
| `settings` | `settingsView({ store, empty, appName, saveFile, units?, radio?, offline?, oneFile?, about? })`; `offline` shows how many photos are saved on the device, `oneFile.offline` offers the copy with photos inside |
| `update` | `watchForUpdates({ title, text, icon?, beforeReload? })`, gets a new deploy into the installed app, with a "new version" banner |
| `splash` | `showSplash({ src, alt })`, a poster as the loading screen |
| `asset` | `assetFrom(siteUrl)`, `fromDisk` (lets the one-file copy fetch photos from the live site), `selfContained` (the offline copy, photos inlined) |
| `offline` | `savedCount(folder)`, `retireWhenSaved(folder, total, oldCaches)` |
| `overflow` | Dev only: flags anything wider than the screen |
| `vite` | `lessonApp({...})`, the whole Vite config (single-file build, one-file copy, PWA) |
| `styles/kit.css` | All the styles above, themed through CSS custom properties |

Not in the kit (Clouds keeps these): the cloud palette, cloud rendering
(`src/app/clouds`, `scene/`), photos and their pipeline, the home screen,
the journal page itself (it uses the kit's glossary and sheet), credits, the
seeding game, and all of the content.

---

## 2. A new topic, step by step

The example is a made-up topic, "Levers", using a single file layout. Copy
`packages/lesson-kit` into the new repo and add it as a workspace, as Clouds
does:

```jsonc
// package.json
{
  "type": "module",
  "workspaces": ["packages/*"],
  "dependencies": { "lesson-kit": "*" },
  "devDependencies": { "typescript": "^5.7.2", "vite": "^6.0.5", "vite-plugin-pwa": "^1.0.0",
                       "vite-plugin-singlefile": "^2.3.0", "vitest": "^3.0.0", "happy-dom": "^20.14.6" },
  "scripts": { "dev": "vite", "build": "tsc --noEmit && vite build", "test": "vitest run" }
}
```

Copy `tsconfig.json` and `vitest.config.ts` from Clouds. Copy `src/env.d.ts`
too, which declares `__APP_VERSION__`.

### vite.config.ts

```ts
import { defineConfig } from 'vite';
import { lessonApp } from 'lesson-kit/vite';
import pkg from './package.json';

export default defineConfig(lessonApp({
  root: __dirname,
  version: pkg.version,
  port: 5430,                       // one block of ten ports per project
  oneFile: 'levers.html',
  precache: ['poster.webp', 'photos/*.webp'], // optional: downloaded when the service worker installs
  offlineFile: 'levers-offline.html', // optional: one-file copy with every precache file inlined
  manifest: { name: 'Levers', short_name: 'Levers', description: '…', theme_color: '#1b172f' },
}));
```

`public/icons/icon-192.png`, `icon-512.png` and `icon-512-maskable.png` must
exist. If `public/icons/icon.svg` exists and index.html links it as the
favicon (`href="./icons/icon.svg"`), the build inlines it, so the one-file
copy has a tab icon too. Clouds makes all of them with `tools/icons.mjs`.

### The save

```ts
// src/save.ts
import { emptyProgress, migrateProgress, type Progress } from 'lesson-kit/progress';
export type SaveData = Progress;                 // or `interface SaveData extends Progress { … }`
export const emptySave = (): SaveData => emptyProgress('metric');
export const migrate = (raw: unknown): SaveData => migrateProgress(raw, emptySave());

// src/store.ts
import { createStore } from 'lesson-kit/store';
export const store = createStore({ key: 'levers.save', empty: emptySave, migrate });
```

If you add your own fields, repair them in `migrate` after
`migrateProgress` runs. Clouds' `src/core/save.ts` shows how. Rename a lesson
with `moveLesson(save, 'old-id', 'new-id')` so readers keep their progress.

### A palette and the figure kit

Each topic picks a few colours that always mean the same thing in every
figure and in the text, like Clouds' orange for rising air.

```ts
// src/figures/kit.ts
import { slider as kitSlider, type Slider } from 'lesson-kit/figure';
import { prose as kitProse } from 'lesson-kit/lesson';
export * from 'lesson-kit/figure';
export const COL = { ink: '#2a2547', soft: '#6a5c80', paper: '#fffaf0', effort: '#e0663f', load: '#3a7bd5', pivot: '#0e7a8f' } as const;
export type ColorKey = keyof typeof COL;
export const slider = (label: string, min: number, max: number, step: number, value: number,
  show: (v: number) => string, onInput: (v: number) => void, color: ColorKey = 'ink'): Slider =>
  kitSlider(label, min, max, step, value, show, onInput, COL[color]);
export const prose = (text: string) => kitProse(text, COL);
```

### A figure

A live figure lists the goals a lesson can set it. When the reader meets
the goal, it calls `t.done()`. It must show cause and effect: moving a
slider should change something the reader can predict, not just make a
drawing bigger.

```ts
// src/figures/lever.ts
import { svg } from 'lesson-kit/dom';
import { line, label, redraw } from 'lesson-kit/draw';
import { COL, figure, frame, slider } from './kit';

export const leverFigure = figure(['balance'], (_ctx, t) => {
  const f = frame(400, 200, 2);                // drawing 400×200, a two-line readout
  const g = svg('g');
  f.svg.append(g);
  let pivot = 200;
  const paint = () => {
    const tilt = (pivot - 200) / 10;           // load 1 kg at the left end, 1 kg at the right
    redraw(g, line(40, 120 + tilt, 360, 120 - tilt, COL.ink, 4), label(pivot, 160, '▲', { anchor: 'middle' }));
    f.readout.textContent = Math.abs(tilt) < 0.5 ? 'Balanced: equal turning on each side.' : 'The longer side wins.';
    if (Math.abs(tilt) < 0.5 && t.goal === 'balance') t.done();
  };
  f.controls.append(slider('Pivot', 60, 340, 1, 120, (v) => `${v}`, (v) => { pivot = v; paint(); }, 'pivot').node);
  paint();
  return f.node;
});
```

A **still** is a plain function that returns `{ node }`, built with
`still(w, h)` from `draw`. A **quiz** figure is `quiz((ctx, t) => …)`. It
reports the reader's score with `ctx.score(right, of)` and calls `t.done()`
once it has been answered. The lesson's check is a quiz figure.

Use `animate(node, ctx, dt => …)` for motion. It runs only while the figure
is on screen and stops when the lesson closes. Guess-first figures lock
their sliders with `lock(sliders, true)`, offer a `choices([...])` row and a
`lockIn('Lock it in', …)` button, then unlock the sliders. See Clouds'
`heaps.ts` parcel figure for a full example.

### Leaving a lesson part way

A reader who leaves a lesson part way (another page, a reload, the app
closed or updated) comes back to where they were. `lessonView` does this by
itself and keeps it in the save under `resume`, by lesson id:

- the parts already passed open without their Continue buttons, and the
  page scrolls back to the block that was at the top of the screen;
- figures whose tasks were done count as done, and every figure's sliders
  are put back where they were (only sliders the figure leaves unlocked, so
  a guess-first figure still waiting for its guess stays locked);
- each check's score is kept, so the log adds up the same;
- the opening radio talk is not played again past the first part, and a
  footnote popup is never reopened.

It is saved at once when a task is done or a part is passed, a moment after
a slider or the scroll stops, and when the page is hidden or closed.
Finishing the lesson (signing the log) forgets it. A lesson already finished
opens in full as before and keeps no place.

A figure with a state worth coming back to (a guess made, quiz answers
given, a random deal) keeps it with `t.keep(state)` (any JSON) and puts
itself back from `t.kept` when built. `t.restored` says its task was done on
an earlier visit, for a figure that unlocks more once done:

```ts
const markIt = lockIn('Mark it', () => { t.keep(pick.picked()); /* …unlock… */ });
if (typeof t.kept === 'number') { pick.pick(t.kept); markIt.click(); }
```

For a quiz, keep the random seed and the answers, and on build replay the
answers and go on from the next question; a finished one reports its score
again. Clouds' `quizzes.ts` (radio check, forecast, sort, names) and its six
guess-first figures show how.

On the lesson board, show "Continue" instead of "Start" when
`resumeFor(save.resume, id, lesson)` finds something. A lesson can be
skipped with `skipLesson(save, id)`: it records `skipped: true` (not done, no
score), `passed(save, id)` is then true so the next lesson opens, and the
skipped one can still be started. Finishing it later replaces the skip.
Clouds' home view shows both (a Skip button on the lesson that is next).

A resume belongs to one version of a lesson. `lessonSignature` hashes the
kind of every block and each figure's name, goal, task and options, but not
the words, so editing text keeps readers' places, while adding, moving or
re-optioning a figure drops them (they start that lesson over). The record
has its own `v: 1`; one that can't be read is dropped and the rest of the
save loads as before.

### A lesson, as JSON

```json
{
  "id": "levers", "n": 1, "title": "Why a long handle helps",
  "teaches": "How a lever trades distance for force",
  "parts": [
    { "title": "The seesaw", "blocks": [
      { "kind": "text", "text": "Push near the **pivot** and it barely moves; push at the [[end|effort]] and it swings." },
      { "kind": "figure", "figure": "lever", "caption": "A plank on a pivot", "task": "Find the balance point", "goal": "balance" },
      { "kind": "key", "title": "Hold on to", "points": ["Turning = force × distance from the pivot."] }
    ]},
    { "title": "Check", "blocks": [ { "kind": "figure", "figure": "check", "caption": "Three questions", "task": "Answer them" } ] }
  ],
  "learned": ["A lever trades distance for force."],
  "next": "Next: pulleys.",
  "journal": []
}
```

Text markup: `**bold**`, `*italic*`, `[[words|key]]`, which colours the
words with `COL[key]`, and `[^id]`, a footnote. A part opens once every task
in the part before it is done. The last part is the check, and its score goes
into the log.

### Footnotes

A footnote opens in a small popup beside the text, which the reader closes
with its ×, Escape or a tap elsewhere, instead of sitting at the foot of the
page. Put the marker straight after the word or sentence it belongs to, with
no space, and the note in the lesson's `footnotes` table under the same id:

```json
{ "kind": "text", "text": "A longer handle turns the nut more easily.[^torque]" }

"footnotes": {
  "torque": { "kind": "technical", "title": "Torque", "text": "Engineers call turning force **torque**: force × distance." },
  "archimedes": { "kind": "digression", "title": "Give me a lever", "text": "…" }
}
```

There are two kinds, coloured apart: `technical` (a term or detail the main
text does without; `--fn-technical`, teal by default) and `digression` (a
side trip off the main line; `--fn-digression`, rose). Markers show as small
raised numbers counted through the lesson, and the lesson's intro gets a
one-line legend. Technical notes also go into the glossary; add
`"glossary": false` to keep one out, `"glossary": true` to put a digression
in, or a string to list it under another term. `lessonProblems` reports a
marker with no note and a note with no marker. Use them sparingly: a note
for what would trip up a casual reader, or what is interesting but off the
line, not for every term. Clouds keeps it to about four per lesson.

### Glossary (optional)

```ts
import { glossaryFromFile, glossaryFromLessons, glossaryView, mergeGlossary } from 'lesson-kit/glossary';
import terms from './glossary.json';      // { "fulcrum": { "term": "Fulcrum", "text": "…", "lesson": "levers", "also": ["pivot"] } }
const entries = mergeGlossary(glossaryFromFile(terms), glossaryFromLessons(LESSONS));
page.append(glossaryView({ entries, prose, lesson: (id) => ({ href: `#/lesson/${id}`, label: 'Lesson 1' }) }));
```

The view is a search box (it searches terms, `also` names and definitions),
a row of letters to jump by, and the terms A to Z, each with a tag linking to
its lesson. An entry with `open` becomes a button, for an app with more to
show; Clouds opens a cloud's photo card with `sheet()`. A term listed twice
keeps its first entry, so pass the lists in order of preference.

### The app

```ts
// src/main.ts
import 'lesson-kit/styles/kit.css';
import './tokens.css';                         // your colours and fonts (see below)
import { el } from 'lesson-kit/dom';
import { lessonView } from 'lesson-kit/lesson';
import { Router } from 'lesson-kit/router';
import { settingsView } from 'lesson-kit/settings';
import { watchForUpdates } from 'lesson-kit/update';
import levers from './lessons/levers.json';
import { leverFigure } from './figures/lever';
import { checkFigure } from './figures/check';
import { prose } from './figures/kit';
import { emptySave } from './save';
import { store } from './store';

const LESSONS = [levers];
const FIGURES = { lever: leverFigure, check: checkFigure };

const outlet = el('main');
document.getElementById('app')!.replaceChildren(outlet);
new Router(outlet, { before: (p) => document.body.classList.toggle('in-lesson', p.startsWith('/lesson/')) })
  .add('/home', (root) => { root.append(el('div.page', {}, LESSONS.map((l) => el('p', {}, el('a', { href: `#/lesson/${l.id}` }, l.title))))); })
  .add('/lesson/:id', lessonView({ lessons: LESSONS, figures: FIGURES, store, prose }))
  .add('/settings', settingsView({ store, empty: emptySave, appName: 'Levers', saveFile: 'levers-save.json' }))
  .start('/home');

if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  watchForUpdates({ title: 'New version', text: 'A fresh version of Levers is ready.' });
}
```

How updates reach an installed app: a waiting service worker only takes over
once no page uses the old one, and an installed app (on Android especially)
is resumed or reloaded in the same window rather than closed, so left alone
it stays on the old version, and the banner's offer comes back each time.
`watchForUpdates` looks for a new sw.js at launch, on return to the
foreground, on coming back online and every half hour, and applies one
itself: straight away at launch if the player has not touched anything yet,
from the banner's Reload, or else the next time the app goes to the
background, so it opens on the new version. Applying is a reload that keeps
the URL hash; save anything else, such as the step a lesson is on, in
`beforeReload` or as it changes.

`lessonView` also takes these options:

- `hero(lesson)`: the picture above the paper.
- `intro(lesson)`: extra lines under the lede, such as Clouds' chips naming
  the clouds a lesson introduces.
- `radio`: the lesson's talks (see below).
- `home`: the route the back arrow goes to.
- `noun`: what a lesson is called. The default is "Lesson".

If you put extra fields on your lessons, such as Clouds' `clouds` and `sky`,
type them as `interface MyLesson extends Lesson<FigureId> { … }`.

### The lesson tree

`treeView` draws the lessons as a trunk running down the page, with each
branch forking off the trunk lesson it grows from as a pill that opens into
its own rail. Give each lesson a `branch` (left out on the trunk), hard
`needs` (shut until each is passed or skipped) and soft `betterAfter` (opens,
but says what to do first), and mark unwritten ones `coming`. Exactly one
lesson is Next: the first open trunk lesson, or once the trunk is done, the
first open branch lesson. The app draws each lesson's card from the
`TreeNode` it is handed (`state`, and the `missing` and `wanting` lessons;
`missing` leaves out the trunk lesson just before, which the trunk's order
already says).

Give a branch a `prefix` and its lessons are named like course codes, P1, P2,
P3, instead of carrying on the trunk's numbers: `lessonCodes(lessons,
branches)` returns each lesson's code, to set as its `code` (shown in its dot
and, on a `Lesson`, in the lesson's header).

```ts
const branches: TreeBranch[] = [
  { id: 'pedals', title: 'Guitar pedals', promise: 'Inside a Fuzz Face', from: 'amps', color: 'var(--sun)', prefix: 'G' },
  { id: 'epilogue', title: 'Afterwards', promise: '', from: 'faults', leaf: true },
];
root.append(treeView({ lessons, branches, save, card: ({ lesson, state }) => myCard(lesson, state), remember: 'myapp.tree' }));
```

A pill shows how many of its lessons are done. The pill holding Next starts open;
`remember` keeps the others as they were left on this device. Test the shape
with `treeProblems(lessons, branches)`. Its styles are in kit.css.

### Theme

`kit.css` sets default values for every custom property it uses. Override
them in your own `:root` after importing it, and add `@font-face` rules for
the fonts you name. Clouds' `src/app/styles/tokens.css` is the example. The
properties are `--bg`, `--bg-2`, `--panel`, `--panel-2`, `--ink`,
`--ink-soft`, `--text`, `--muted`, `--sun`, `--sun-deep`, `--rose`,
`--teal`, `--title`, `--paper`, `--good`, `--bad`, `--radius`, `--font`,
`--display` and `--hand`. The slip's typewriter face is named
'Special Elite'.

### Quiz (optional)

```ts
import { conceptCard, type Concept } from 'lesson-kit/quiz';
import { quizView } from 'lesson-kit/quiz-view';
import ideas from './quiz.json';           // { "cards": Concept[] }
const deck = (ideas.cards as Concept[]).map((c) => conceptCard(c));
// A card with `after: 'lesson-id'` is dealt only once that lesson is passed or skipped.
router.add('/quiz', quizView({ deck, store, blurb: 'Cards on the ideas behind the lessons.' }));
```

Generated cards work too. Any object with `{ id, question, options, why }`
is a card, with the right answer at `options[0]`. To show a picture above a
card, pass `media: (card) => node | null`.

### Radio talks (optional)

```ts
import { createSlip } from 'lesson-kit/slip';
const slip = createSlip({
  stations: { them: { call: 'G2XX', place: 'The workshop' }, you: { call: 'G2YOU', place: 'Home' } },
  signOff: 'Thanks. Signing off.',
  onHeard: (id, picks) => store.update((s) => ({ ...s, heard: { ...s.heard, [id]: picks } })),
  onOff: () => store.update((s) => ({ ...s, talk: false })),
});
lessonView({ …, radio: { talks: (id) => TALKS[id] ?? [], play: slip.play, clear: slip.clear } });
```

A talk has `{ id, cue: 'start' | 'check', when, turns: [{ them, replies?: [{ say, back?, right?, off? }] }] }`.
It plays once, when the lesson opens (`start`) or after the check
(`check`), and only if the reader has the radio on. Pass `radio: { blurb }`
to `settingsView` to show the on/off switch.

### Tests

```ts
// test/content.test.ts (happy-dom)
import { lessonProblems } from 'lesson-kit/lesson';
expect(lessonProblems(LESSONS, FIGURES)).toEqual([]);   // unknown figures, unknown goals, tasks with no goal
```

Clouds' `test/figures.test.ts` builds every figure in both unit systems and
checks that none of them throws, and that the guess-first figures and checks
come back as they were from what they kept. `figures.html` with `tools/gallery`
renders every figure on one page, and `?frozen` makes the page the same on
every load, so before and after screenshots can be pixel-diffed.

---

## 3. Conventions that keep lessons good

- Put each lesson's words in one JSON file, so they can be edited without
  touching code.
- Use one file per lesson for its figures, in lesson order.
- An interactive figure must show cause and effect. If it can't, make it a
  still. When the text describes something the reader can't see, add a
  still that shows it.
- Give each figure one text box of fixed height (`frame(w, h, lines)`), so
  the controls don't move as the readout changes.
- Ask for a guess before unlocking sliders when a figure turns on a single
  threshold.
- Keep colours consistent: a colour means the same thing in every figure and
  in the prose.

---

## 4. Topics that would suit this treatment

Each of these has hidden mechanisms that a slider can expose: the reader
changes one cause and watches a predictable effect.

1. **How a bicycle stays up.** Trail, steering geometry and gyroscopic
   effects. Sliders for fork rake and speed show whether the bike
   self-steers back under its own weight.
2. **Sourdough and bread.** Yeast, bacteria, gluten and temperature.
   Sliders for hydration, temperature and time show rise, sourness and
   crumb.
3. **Sailing.** Apparent wind, lift from a sail, and why you can sail
   upwind. Turning a boat and trimming a sail shows the force arrows
   change.
4. **How music works.** Strings, harmonics, why some intervals sound sweet,
   and timbre. You can hear and see the waves add up.
5. **Tides.** The Moon and Sun, spring and neap tides, and why there are
   two high tides a day. Moving the Moon around shows the bulges follow it.
6. **Rivers.** Meanders, oxbows, deltas and floods. Changing the slope and
   the sediment load shows a channel cut, braid or wander.
7. **The heart and blood pressure.** Valves, the pressure loop, and why
   arteries stiffen. A pump with adjustable resistance shows the numbers on
   a cuff.
8. **How an engine works.** The four strokes, compression and timing,
   echoing Ciechanowski's own "Internal Combustion Engine". Turning a crank
   shows each stroke.
9. **The night sky.** Seasons, Moon phases, and why planets loop
   backwards. A small orrery figure with a time slider explains each one.
10. **Soil and gardening.** Water holding, pH, and nitrogen. Sliders for
    texture and watering show roots thrive or rot. This one could be set
    in eastern Washington, like Clouds.
