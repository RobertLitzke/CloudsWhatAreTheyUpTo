# Clouds: What are they up to?

A cloud-watching game. You take a summer job as the cloud watcher on Anvil
Peak, a lookout in the Thunderhead National Forest, and Juniper, the district
weather officer, trains you over the radio one shift at a time: how to name
every kind of cloud, what made it, and what it means for the weather to come.
Once training is done, the district's cloud-seeding programme opens and you
start making clouds as well as reading them.

The look is a national-park poster at dusk: flat, saturated, faceted
landscapes and drawn clouds for teaching, and real photos for testing.

## What is built

- The shell: a vanilla TypeScript PWA on Vite, inlined into one
  `index.html` as in PatchMatch and Fretron, with a service worker, an update
  banner, and progress in `localStorage` with save-to-file and load.
- **Shift 1, The three floors of the sky**: what a cloud is (lift a parcel of
  air until it reaches its dew point), the three heights of cloud, filing
  drawn clouds onto their floors, building names from their Latin roots, and
  a radio check where you call in the floor of eight photos. It ends in a
  signed logbook page.
- The **field journal**: notes the shifts unlock, and a card for each of the
  ten genera (what it looks like, what made it, what it means).
- A **photo pipeline** that finds, credits and resizes photos from Wikimedia
  Commons (see below). Until photos are fetched, the radio check uses drawn
  clouds and says so.
- The shift board lists the planned shifts and the cloud-seeding mode as
  coming next.

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
| `npm run icons` | Regenerate the PNG icons from `public/icons/icon.svg` |
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
  air.ts        a rising parcel: dry and moist cooling, the cloud base
  shifts.ts     the tutorial script and journal entries
  photo-call.ts dealing the radio check
  photos.ts     the photo entry shape and accepted licences
  save.ts rng.ts
src/app/      dom.ts, router.ts, store.ts, update.ts, photos.ts
  scene/        landscape.ts (the view from the tower), drawn.ts (drawn clouds)
  views/        home, shift (the step players), journal, credits, settings
tools/photos/ find.ts, fetch.ts, commons.ts, config.ts, picks.json
test/
```

## Deploy

Pushes to `main` build and deploy to GitHub Pages
(`.github/workflows/pages.yml`). In the repository's settings, Pages must be
set to deploy from GitHub Actions.
