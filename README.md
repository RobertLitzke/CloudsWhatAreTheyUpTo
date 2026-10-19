# Clouds: What are they up to?

A cloud-watching game. You take a summer job as the cloud watcher on Anvil
Peak, a lookout in the Thunderhead National Forest, and Juniper, the district
weather officer, trains you over the radio one shift at a time: how to name
every kind of cloud, what made it, and what it means for the weather to come.
Once training is done, the district's cloud-seeding programme opens and you
start making clouds as well as reading them.

The look comes from the poster in `art/poster.jpg`, which is also the
loading screen and the source of the app icons: a violet and magenta evening,
heaped clouds with peach rims, slanted outlined lettering. The game draws
flat, lightly geometric landscapes and clouds in that palette for teaching,
and uses real photos for testing.

## What is built

- The shell: a vanilla TypeScript PWA on Vite, inlined into one
  `index.html` as in PatchMatch and Fretron, with a service worker, an update
  banner, and progress in `localStorage` with save-to-file and load.
- **Five training shifts**, each an illustrated article in the manner of
  Bartosz Ciechanowski's explainers: paragraphs, words from Juniper over the
  radio, and live figures with sliders to play with. Each part opens once the
  small tasks in the figures above it are done; a finished shift opens in
  full. Every shift ends with a radio check (photos to name, or skies to
  forecast) and a signed logbook page.
  1. **The two textures**: what a cloud is, stable and unstable air, cumulus
     from thermals and stratus from a cooling night.
  2. **The low sky**: the three floors, stratocumulus under a lid, why most
     clouds don't rain, and nimbostratus.
  3. **The middle sky and the hand trick**: names as a code, judging height
     with your hand at arm's length, self-shadows, altocumulus and
     altostratus.
  4. **The ice realm and early warnings**: cirrus hooks, refraction through
     an ice prism, the 22° halo, and a warm front arriving over 48 hours.
  5. **Vertical giants and rare boss clouds**: a sounding that grows
     congestus and cumulonimbus, a storm's life, counting the thunder, and
     the rare lens, mammatus and Kelvin-Helmholtz clouds.
- The **field journal**: notes the shifts unlock, and a card for each of the
  ten genera (what it looks like, what made it, what it means).
- A **photo pipeline** that finds, credits and resizes photos from Wikimedia
  Commons (see below). Until photos are fetched, the radio check uses drawn
  clouds and says so.
- The cloud-seeding mode is shown on the board as opening after training.

## Run

```bash
npm install
npm run dev
```

Opens on http://localhost:5420. On the dev server an orange strip appears
across the top if anything on a page is wider than the screen.

| Command | What it does |
|---|---|
| `npm test` | Vitest: cloud facts, air physics, the save file, dealing the radio check, shift content, photo credits, licence mapping |
| `npm run build` | Typecheck, then build `dist/` |
| `npm run preview` | Serve `dist/` on http://localhost:5421 |
| `npm run icons` | Regenerate the PNG icons from a square of `art/poster.jpg` |
| `npm run photos:find` | List candidate photos from Commons into a contact sheet to pick from |
| `npm run photos:fetch` | Download the picked photos, resize them and write their credits |

## Photos

Every photo carries its author, licence and source, shown under the photo and
on the Credits page. Only public domain, CC0, CC BY and CC BY-SA photos are
accepted: no NonCommercial and no NoDerivatives (photos are resized and
cropped). The WMO International Cloud Atlas is the reference for names and
heights, but its photos are copyrighted and are not used. NOAA's photo
library is public domain and much of it is mirrored on Commons, so it comes
through the same search.

1. `npm run photos:find` searches the Commons categories in
   `tools/photos/config.ts` and writes `tools/photos/candidates/index.html`.
2. Open it, tap the photos that clearly show their cloud (Commons categories
   are often wrong), and copy the JSON at the bottom into
   `tools/photos/picks.json`.
3. `npm run photos:fetch` re-reads each licence, downloads 1280-wide WebP
   copies into `public/photos/` and writes `src/data/photos.json`.
4. `npm test` checks every entry has a credit, an accepted licence and a
   source link.

Photos are not inlined into `index.html`. They are served beside it and the
service worker keeps each one once it has been seen.

## Layout

```
src/core/     pure TypeScript, no DOM; unit-tested
  clouds.ts     the ten genera, the floors, the name roots
  air.ts        a rising parcel, the day's sounding, how tall a heap grows
  sky.ts        angular size, the warm front, night cooling, thunder
  optics.ts     light through an ice prism, the halo
  shifts.ts     the five shifts (parts of text, radio and figures), journal
  photo-call.ts radio-check.ts  dealing the radio checks
  photos.ts     the photo entry shape and accepted licences
  save.ts rng.ts
src/app/      dom.ts, router.ts, store.ts, update.ts, photos.ts
  scene/        landscape.ts (the view from the tower), drawn.ts (drawn clouds)
  figures/      the live figures, by theme, and index.ts naming them
  views/        home, shift (the article player), journal, credits, settings
tools/photos/ find.ts, fetch.ts, commons.ts, config.ts, picks.json
test/
```

## Deploy

Pushes to `main` build and deploy to GitHub Pages
(`.github/workflows/pages.yml`). In the repository's settings, Pages must be
set to deploy from GitHub Actions.
