# Dirt

A gardener's workbook on soil: short illustrated lessons, in the manner of
Bartosz Ciechanowski's explainers, on what soil is made of, how it holds
water and air, what lives in it, and how to feed it and build it up. Each
lesson is paragraphs and live figures to play with, a check at the end, and a
log to sign. A reference page sets out what the lessons teach, to look up in
the garden.

Built on [Didactics](https://github.com/RobertLitzke/Didactics), the lesson
library taken out of
[Clouds](https://github.com/RobertLitzke/CloudsWhatAreTheyUpTo), pinned to a
commit in package.json. There is no story or radio mentor for now (the
library's radio is off). To move to a newer Didactics, run
`npm install github:RobertLitzke/Didactics#<sha>`, then `npm test` and
`npm run build`.

## What is built

- The shell: a vanilla TypeScript PWA on Vite, inlined into one `index.html`,
  with a service worker that downloads every photo when it installs, an
  update banner, and progress in `localStorage` with save-to-file and load. A
  lesson left part way opens where the reader was. Pages (Home, Reference,
  Quiz, Settings) are in Didactics' dropdown menu; Credits is linked from
  Settings.
- The look: a drawn garden (`src/app/scene/garden.ts`), a vegetable bed with
  the soil cut away under it, roots, a worm and fungal threads; dark hedge
  green, seed-packet cream, leaf-green buttons, terracotta accents; Fraunces
  for headings.
- **Eight lessons**, each built around live figures:
  1. Inside a handful of soil: a handful by volume, a cube cut down to clay size,
     the three grain sizes, texture by feel, the jar test, the texture triangle.
  2. Water and air in the pores: pores, a rainstorm on a bed, drying to wilting.
  3. The living soil: a teaspoon's census and a tap-through food web.
  4. Organic matter and compost: mixing a heap by C:N, how fast things rot.
  5. Crumb: building or breaking structure, and the slake test.
  6. Feeding plants: parking spots (CEC), the pH chart, leaf symptoms.
  7. Building soil through the year: a seasons wheel of covers and digging.
  8. Reading your soil: a symptom-to-cause detective that links back.
- **Footnotes** (`[^id]` in lesson text, from Didactics): technical terms and
  digressions open in a sheet; technical ones also feed the glossary.
- The **reference page**: a glossary, and a section per lesson (texture,
  water by texture, the food web, C:N, structure, home tests, amendments,
  deficiencies, pH, cover crops, the year, symptoms, reading a soil test).
- A **quiz** of flash cards with spaced repetition (`src/data/quiz.json`).
- **Photos with drawn fallbacks**: wherever the app shows a subject (a soil
  type, a jar test, later creatures and practices) it uses a photo from the
  library if there is one, and a drawing of it if not (`src/app/picture.ts`).

## Run

```bash
npm install
npm run dev
```

Opens on http://localhost:5440. http://localhost:5440/figures.html shows every
lesson figure on one page (dev server only); add `?frozen` for the same
picture every load, or `?only=<figure id>` for one figure.

| Command | What it does |
|---|---|
| `npm test` | Vitest: texture classes and the jar test, lesson and reference content, every figure built, drawings, photo credits, the save |
| `npm run build` | Typecheck, then build `dist/` |
| `npm run preview` | Serve `dist/` on http://localhost:5441 |
| `npm run icons` | Regenerate the PNG icons (drawn in `tools/icons.mjs`) |
| `npm run photos:find` | List candidate photos from Commons into a contact sheet to pick from |
| `npm run photos:fetch` | Download the picked photos, resize them and write their credits |

## Photos

Every photo carries its author, licence and source, shown under the photo and
on the Credits page. Only public domain, CC0, CC BY and CC BY-SA photos are
accepted. Subjects are listed in `src/core/photos.ts` (`SUBJECTS`); each one
needs a drawing in `src/app/scene/subjects.ts` and Commons categories in
`tools/photos/config.ts` (the categories are a first guess and may need
adjusting).

1. `npm run photos:find` writes `tools/photos/candidates/index.html`.
2. Open it, tap the photos that clearly show their subject, and copy the JSON
   at the bottom into `tools/photos/picks.json`.
3. `npm run photos:fetch` downloads 1024-wide WebP copies into
   `public/photos/` and writes `src/data/photos.json`.
4. `npm test` checks every entry has a credit, an accepted licence and a
   source link.

## Adding a lesson

1. Write `src/data/lessons/<id>.json` (the format, typed blocks such as
   `text`, `key_ideas`, `interactive_diagram`, `diagram` and `quiz`, is in
   Didactics' README) and import it in `src/core/lessons.ts`.
2. Put its figures in `src/app/figures/<id>.ts`, add their ids to
   `FIGURE_IDS`, and name them in `src/app/figures/index.ts`.
3. Fill its sections in `src/data/reference.json` and add cards to
   `src/data/quiz.json`.
4. `npm test` catches unknown figures, goals no figure meets, and bad answers.

## Rewriting lesson prose

`tools/rewrite/rewrite.mjs` sends each lesson's prose to a model on OpenRouter
(default `google/gemini-3.8-flash`) with a style brief against AI tropes, then
checks each piece kept its markup, numbers and length. It reports to
`tools/rewrite/out/` and only changes the JSON with `--write`.

```bash
OPENROUTER_API_KEY=... node tools/rewrite/rewrite.mjs            # dry run, all lessons
OPENROUTER_API_KEY=... node tools/rewrite/rewrite.mjs water --write
```

## Revising the text

The course's longer words are JSON in `src/data` (lessons, reference page,
quiz cards, glossary). To revise them in one file:

```sh
npx didactics-course export src/data --skip src/data/photos.json --code src --title Dirt --out course.json
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
src/core/     pure TypeScript, no DOM
  soil.ts       grain sizes, the USDA texture classes, settling in a jar
  water.ts, life.ts, compost.ts, structure.ts, nutrients.ts, seasons.ts,
  diagnosis.ts  the models behind each lesson's figures
  lessons.ts    the eight lessons, figure ids
  reference.ts  the reference page's shape
  photos.ts     subjects, the photo entry shape and accepted licences
  save.ts       the save, on top of Didactics' progress.ts
src/data/     lessons/*.json, reference.json, quiz.json, photos.json
src/app/      store.ts, asset.ts, picture.ts (photo or drawing)
  scene/        garden.ts, jar.ts, subjects.ts (drawn stand-ins for photos)
  figures/      kit.ts (palette), one file per lesson, check.ts, index.ts
  views/        home, lesson, reference, quiz, settings, credits
tools/        photos/, gallery/, rewrite/, icons.mjs
```

## Deploy

Pushes to `main` build and deploy to GitHub Pages
(`.github/workflows/pages.yml`) at https://robertlitzke.github.io/Dirt/. In
the repository's settings, Pages must be set to deploy from GitHub Actions.
