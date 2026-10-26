# Dirt

A gardener's workbook on soil: short illustrated lessons, in the manner of
Bartosz Ciechanowski's explainers, on what soil is made of, how it holds
water and air, what lives in it, and how to feed it and build it up. Each
lesson is paragraphs and live figures to play with, a check at the end, and a
log to sign. A reference page sets out what the lessons teach, to look up in
the garden.

Built on `packages/lesson-kit`, copied from
[Clouds](https://github.com/RobertLitzke/CloudsWhatAreTheyUpTo). There is no
story or radio mentor for now (the kit's radio is off).

## What is built

- The shell: a vanilla TypeScript PWA on Vite, inlined into one `index.html`,
  with a service worker, an update banner, and progress in `localStorage` with
  save-to-file and load. Nav: Home, Reference, Quiz, Settings (and Credits).
- The look: a drawn garden (`src/app/scene/garden.ts`), a vegetable bed with
  the soil cut away under it, roots, a worm and fungal threads; dark hedge
  green, seed-packet cream, leaf-green buttons, terracotta accents; Fraunces
  for headings.
- **Lesson 1, What soil is made of**: a handful by volume, the three grain
  sizes, a live jar test (pick a soil, slide time from 1 s to 3 days), the
  texture triangle (sliders for sand and clay, with the twelve USDA classes),
  and a seven-question check.
- Lessons 2 to 9 are planned in `src/core/lessons.ts` and show as "Coming" on
  the home page.
- The **reference page**: a glossary, what is in a handful, the texture
  triangle, and the jar test steps, with sections for the later lessons shown
  as coming.
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

1. Write `src/data/lessons/<id>.json` (the format is in
   `packages/lesson-kit/README.md`) and swap its `planned(...)` line in
   `src/core/lessons.ts` for the import.
2. Put its figures in `src/app/figures/<id>.ts`, add their ids to
   `FIGURE_IDS`, and name them in `src/app/figures/index.ts`.
3. Fill its sections in `src/data/reference.json` and add cards to
   `src/data/quiz.json`.
4. `npm test` catches unknown figures, goals no figure meets, and bad answers.

## Layout

```
src/core/     pure TypeScript, no DOM
  soil.ts       grain sizes, the USDA texture classes, settling in a jar
  lessons.ts    the nine lessons (written and planned), figure ids
  reference.ts  the reference page's shape
  photos.ts     subjects, the photo entry shape and accepted licences
  save.ts       the save, on top of lesson-kit's progress.ts
src/data/     lessons/*.json, reference.json, quiz.json, photos.json
src/app/      store.ts, asset.ts, picture.ts (photo or drawing)
  scene/        garden.ts, jar.ts, subjects.ts (drawn stand-ins for photos)
  figures/      kit.ts (palette), one file per lesson, check.ts, index.ts
  views/        home, lesson, reference, quiz, settings, credits
tools/        photos/, gallery/, icons.mjs
packages/lesson-kit/   the lesson engine, figures, quiz, shell and build
```

## Deploy

Pushes to `main` build and deploy to GitHub Pages
(`.github/workflows/pages.yml`) at https://robertlitzke.github.io/Dirt/. In
the repository's settings, Pages must be set to deploy from GitHub Actions.
