# Geology: mysteries in the rocks

A course of short illustrated lessons on reading rocks, each opening on a
puzzle: something odd in a cliff or a hand of rock, or a question people
argued about for decades. The trunk is geology anywhere; branches read
Seattle, Whidbey Island and the ice age floods with it, and go further, to
the Moon, into fossils and down to the core. Live at
https://robertlitzke.github.io/Courses/geology/.

Geology is one course of several in this repository (see the README at its
root) and is built on [Didactics](https://github.com/RobertLitzke/Didactics):
its `src/main.ts` is one `defineCourse` call, so the lesson page, the home
tree, the review deck, Settings and the service worker are the library's.
What is the course's own is here: the lessons, the figures, the photos, the
map reliefs and the plate model.

## Layout

```
course.json          what the catalog shows, and where the lessons are
src/
  main.ts            the defineCourse call: title, lessons, figures, photos, settings
  lessons.ts         the lesson list read from src/lessons/*.json, the branches, what is coming
  lessons/<id>.json  one lesson: parts of text, figure and quiz blocks, summary, footnotes
  figures/           one file per lesson's figures (figure(goals, build) from ./kit),
                     kit.ts (the palette COL and courseKit), paleomap.ts (the plate model)
  photos.ts          the photo library (src/data/photos.json) and the photo figure
  data.ts            large data files fetched from data/ on first use
  data/photos.json   every photo's credit; plates.json and the small data tables
  styles/tokens.css  the course's colours and type over Didactics' kit.css
public/
  photos/            the photos, 1024 px wide WebP
  maps/              relief maps (heights as Terrarium PNG + a JSON of where and credit)
  data/paleomap.json the PALEOMAP plate model, a quarter of a megabyte, not inlined
  icons/             the app icon in every size
tools/
  icons.mjs          the icon drawing (written out by the root's tools/lib/icons.mjs)
  photo-picks.json   the photos picked, by id; pending-photos.json, photo blocks parked
                     until their photo is fetched; copyedit.json, the copy-edit brief;
                     review-queue.json, lessons waiting for their copy edit
  gallery.ts         figures.html, every figure on one page (dev server only)
test/                content (every lesson's shape, figure options, footnotes, links),
                     figures (every figure builds in both unit systems, tasks can be met),
                     cards (the flash cards)
```

## Run

```bash
npm install            # at the repository's root
npm run dev -w geology
```

Opens on http://localhost:5470. http://localhost:5470/figures.html shows every
figure on one page (dev server only); add `?frozen` for the same picture every
load, `?metric` for metres, or `?only=<figure id>` for one figure.

| Command | What it does |
|---|---|
| `npm test -w geology` | Vitest: content, figures, cards |
| `npm run build -w geology` | Typecheck, then build `dist/` |
| `npm run preview -w geology` | Serve `dist/` on http://localhost:5471 |
| `npm run icons -w geology` | Regenerate the icons from the drawing in `tools/icons.mjs` |
| `npm run photos -- geology` | At the root: fetch the photos in `tools/photo-picks.json` and write their credits |
| `npm run restore-photos -- geology` | At the root: put parked photo blocks back once their photo is fetched (`--list` to see what waits) |
| `npm run copyedit -- geology <lesson> --write` | At the root: the Gemini copy edit of a lesson (`--queue` for every lesson waiting) |
| `node tools/geo/relief.mjs …` | At the root: make a relief map into `public/maps/` (see the script's header) |

## Lessons

A lesson is a JSON file in `src/lessons/`, named by its id, listed in
`src/lessons.ts` with its number and branch. Its shape is Didactics' (parts
of blocks: `text`, `key_ideas`, `diagram`, `interactive_diagram`, `quiz`),
with a `summary` of five to ten points and `footnotes` keyed by the `[^id]`
marks in the text. `[[deep time]]` links to the site's encyclopedia. The
content test holds every lesson to its figures' option checks, so a wrong
figure id or photo id fails `npm test`, not the reader.

New prose goes on `tools/review-queue.json` (lesson, date, what changed) for
the Gemini copy edit; `npm run review-queue` at the root lists what waits.

## Figures

One file per lesson under `src/figures/`, exporting `figure(goals, build)`
factories (live, with a task the lesson can set) or plain factories for
stills, all gathered in `src/figures/index.ts` under the ids the lessons
use. Colours come from `COL` in `kit.ts` and always mean the same thing.
Maps are Didactics' `maps` module over the reliefs in `public/maps/`; the
moving continents are `paleomap.ts` over the PALEOMAP model, fetched the
first time a figure needs it (`onPlateModel`), so the page stays light.

## Photos and maps

Every photo carries its author, licence and source, shown under it and on
the Credits page; only public domain, CC0, CC BY and CC BY-SA are accepted.
A pick in `tools/photo-picks.json` names a Commons file (`title`) or a file
elsewhere with its licence page (`url`, `page`, `source`, `author`,
`license`). Photo ids are kept for good: saves remember a photo by its id.
Photos, maps and the plate model are not inlined into the page; the site's
service worker keeps each as it is read, and Settings saves them all.
