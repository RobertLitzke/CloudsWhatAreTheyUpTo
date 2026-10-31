# Circuitry

A workbook on circuits for someone who has soldered and wants to design:
short illustrated lessons, in the manner of Bartosz Ciechanowski's
explainers, on what voltage and current really are, how parts shape them,
and how to find out why a board doesn't work. Every circuit is live: wires
are coloured by their voltage and dots move along them with the current.

Built on [Didactics](https://github.com/RobertLitzke/Didactics), the lesson
library shared with [Dirt](https://github.com/RobertLitzke/Dirt) and
[Clouds](https://github.com/RobertLitzke/CloudsWhatAreTheyUpTo), pinned to a
commit in package.json (`npm install github:RobertLitzke/Didactics#<sha>` to
move it). There is no story or radio mentor (the save has no radio). The circuit engine is our own,
`packages/circuit-kit`.

## What is built

- The shell: a vanilla TypeScript PWA on Vite, inlined into one `index.html`,
  with a service worker, an update banner, and progress in `localStorage` with
  save-to-file and load. Nav: Home, Reference, Quiz, Settings (and Credits).
- The look: a drawn circuit board (`src/app/scene/board.ts`), solder-mask
  green, datasheet paper, amber-LED buttons and copper accents; Space Grotesk
  for headings and JetBrains Mono for part labels.
- **The lesson map**, as stubs (title and one line each, no parts yet), in
  three tracks:
  - **The core path**, in order: 1 what is actually flowing, 2 series and
    parallel, 3 every source has a resistor inside, 4 where the energy goes,
    5 voltages that change, 6 things that take time, 7 curved lines (diodes),
    8 a small current steering a big one (transistor switches), 9 turning it
    up (amplifiers and feedback), 10 the dead circuit (fault-finding). The
    plan behind it is the "Circuitry core trunk lesson plan" doc.
  - **Guitar pedals**, after the core: 11 inside a Fuzz Face, 12 inside a
    Tube Screamer. Sound, when it comes, is off by default and only in this
    track.
  - **Off-grid solar**, after the core: 13 solar panels, 14 wiring an
    off-grid system. Lesson 9 can be skipped on the way here.
- **The circuit engine**: `packages/circuit-kit` solves a circuit of
  resistors, lamps, sources, wires and switches (DC, modified nodal analysis),
  and `src/app/circuit/schematic.ts` draws it live. The first figure, `loop`
  (a battery, resistor, lamp and switch), is on the reference page.
- The **reference page**: a glossary, Ohm's law with the live loop, and a
  section per topic still to fill (symbols, parts, wire, capacitors,
  semiconductors, the multimeter, solder faults, pedal standards, solar
  sizing, off-grid safety).
- A **quiz** of flash cards with spaced repetition (`src/data/quiz.json`),
  empty until the first lesson is written.

## Run

```bash
npm install
npm run dev
```

Opens on http://localhost:5450. http://localhost:5450/figures.html shows every
figure on one page (dev server only); add `?frozen` for the same picture every
load, or `?only=<figure id>` for one figure.

| Command | What it does |
|---|---|
| `npm test` | Vitest: the solver, lesson and reference content, every figure built, the views, the save |
| `npm run build` | Typecheck, then build `dist/` |
| `npm run preview` | Serve `dist/` on http://localhost:5451 |
| `npm run icons` | Regenerate the PNG icons (drawn in `tools/icons.mjs`) |

## The circuit engine

A figure lists its parts (`packages/circuit-kit/src/parts.ts`), each between
two named nodes, solves them (`solve.ts`), and hands the solution to a
schematic that draws each part along a path the figure gives it. When a slider
moves, the figure changes the part in place and solves again. The colours
always mean the same thing (`src/app/figures/kit.ts`): voltage runs from
ground's deep blue to orange, current is the yellow of the dots, resistance
violet, power red.

The solver also steps capacitors and inductors through time (backward Euler,
halving a step that won't converge) and solves diodes, LEDs, transistors,
MOSFETs and op-amps by Newton's method around the same matrix. A board view
(`src/app/circuit/board.ts`) draws the same placements as a populated circuit
board, and the fault hunts run on either. Still to come: a solar cell, audio
for the pedals, and a free-play bench. Oscillators are weak: the two-transistor
blinker doesn't converge at its flip yet, so lesson 8 only describes it.

## Adding a lesson

1. Fill its `src/data/lessons/<id>.json` (the format is in
   Didactics' README; `npx didactics-course upgrade src/data/lessons`
   converts a file in the older `kind` shape); a lesson with no parts shows as coming.
2. Put its figures in `src/app/figures/<id>.ts`, add their ids to
   `FIGURE_IDS` in `src/core/lessons.ts`, and name them in
   `src/app/figures/index.ts`.
3. Fill its sections in `src/data/reference.json` and add cards to
   `src/data/quiz.json`.
4. `npm test` catches unknown figures, goals no figure meets, and bad answers.

## Revising the text

The course's longer words are JSON in `src/data` (lessons, reference page,
quiz cards, glossary). To revise them in one file:

```sh
npx didactics-course export src/data --code src --title Circuitry --out course.json
npx didactics-course import course.json
```

`--code src` adds every string in the code that reads as words (figure
labels and commentary, headings, buttons, check feedback) under `"code"`,
one table per source file, as written → as edited; import writes the edited
ones back into the source.

Settings in the app has the same, code words included, for **All** or one
lesson picked from a menu (src/app/course-pieces.ts says what a lesson's
piece holds): **Download**, and **Load edited text** to read an edited file
in the real lessons on that device before it is committed (src/course.ts).

## Layout

```
packages/circuit-kit/  the solver: parts, nodes, solve (pure TypeScript)
src/core/     pure TypeScript, no DOM
  lessons.ts    the tracks and lessons, figure ids
  reference.ts  the reference sections, and the symbols block Circuitry adds to Didactics' reference page
  save.ts       the save, on top of Didactics' progress.ts
src/data/     lessons/*.json, reference.json, glossary.json, quiz.json
src/app/      store.ts, asset.ts
  circuit/      schematic.ts (a live circuit drawing), units.ts (4.7 kΩ, 23 mA)
  scene/        board.ts (the home page's board)
  figures/      kit.ts (palette), one file per lesson, check.ts, index.ts
  views/        home, lesson, reference, quiz, settings, credits
tools/        gallery/, icons.mjs
```

## Deploy

Pushes to `main` build and deploy to GitHub Pages
(`.github/workflows/pages.yml`) at https://robertlitzke.github.io/Circuitry/.
In the repository's settings, Pages must be set to deploy from GitHub Actions.
