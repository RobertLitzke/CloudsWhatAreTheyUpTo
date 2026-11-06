# Astronomy: how we found out

A course of short illustrated lessons on how people standing on one planet
worked out the size of the Earth, the pull that holds the Moon, the distance
to the stars and what the stars are made of. Each lesson opens on a puzzle
someone actually faced, then follows how it was solved, with live figures to
push. Ten lessons are written; the rest of the plan (relativity, galaxies,
exoplanets, the gas giants and more) shows on the home tree as coming. Live at
https://robertlitzke.github.io/Courses/astronomy/.

Astronomy is one course of several in this repository (see the README at its
root) and is built on [Didactics](https://github.com/RobertLitzke/Didactics):
its `src/main.ts` is one `defineCourse` call, so the lesson page, the home
tree, the review deck, Settings and the service worker are the library's.
What is the course's own is here: the lessons, the figures, the photos and
the star catalogue behind the Hertzsprung-Russell diagram.

## Layout

```
course.json          what the catalog shows, and where the lessons are
src/
  main.ts            the defineCourse call: title, lessons, figures, photos, settings
  lessons.ts         the lesson list read from src/lessons/*.json, the branches,
                     and every lesson still to come (coming(), with its place in the tree)
  lessons/<id>.json  one lesson: parts of text, figure and quiz blocks, summary, footnotes
  figures/           one file per lesson's figures (figure(goals, build) from ./kit),
                     kit.ts (the palette COL and courseKit), photo.ts and check.ts
  photos.ts          the photo library (src/data/photos.json) and the photo figure
  data/photos.json   every photo's credit; stars.json, the nearby stars for the HR diagram
  styles/tokens.css  the course's colours and type over Didactics' kit.css
public/
  photos/            the photos, 1024 px wide WebP
  icons/             the app icon in every size
tools/
  icons.mjs          the icon drawing (written out by the root's tools/lib/icons.mjs)
  stars.mjs          writes src/data/stars.json from the HYG catalogue
  photo-picks.json   the photos picked, by id; pending-photos.json, photo blocks parked
                     until their photo is fetched; copyedit.json, the copy-edit brief;
                     review-queue.json, lessons waiting for their copy edit
  gallery.ts         figures.html, every figure on one page (dev server only)
test/                content (every lesson's shape, figure options, footnotes, links),
                     figures (every figure builds, tasks can be met), cards (the flash cards)
```

## Run

```bash
npm install            # at the repository's root
npm run dev -w astronomy
```

Opens on http://localhost:5480. http://localhost:5480/figures.html shows every
figure on one page (dev server only); add `?frozen` for the same picture every
load, or `?only=<figure id>` for one figure (the course is metric throughout).

| Command | What it does |
|---|---|
| `npm test -w astronomy` | Vitest: content, figures, cards |
| `npm run build -w astronomy` | Typecheck, then build `dist/` |
| `npm run preview -w astronomy` | Serve `dist/` on http://localhost:5481 |
| `npm run icons -w astronomy` | Regenerate the icons from the drawing in `tools/icons.mjs` |
| `npm run stars -w astronomy` | Rebuild `src/data/stars.json` from the HYG star catalogue |
| `npm run photos -- astronomy` | At the root: fetch the photos in `tools/photo-picks.json` and write their credits |
| `npm run restore-photos -- astronomy` | At the root: put parked photo blocks back once their photo is fetched (`--list` to see what waits) |
| `npm run copyedit -- astronomy <lesson> --write` | At the root: the Gemini copy edit of a lesson (`--queue` for every lesson waiting) |

## Lessons

A lesson is a JSON file in `src/lessons/`, named by its id, listed in
`src/lessons.ts` with its number and branch. Its shape is Didactics' (parts
of blocks: `text`, `key_ideas`, `diagram`, `interactive_diagram`, `quiz`),
with a `summary` of five to ten points and `footnotes` keyed by the `[^id]`
marks in the text. `[[parallax]]` links to the site's encyclopedia. A lesson
not written yet is a `coming()` line in `src/lessons.ts`, so the whole plan
shows on the home tree and a tap on it says what it will answer. The content
test holds every lesson to its figures' option checks, so a wrong figure id
or photo id fails `npm test`, not the reader.

New prose goes on `tools/review-queue.json` (lesson, date, what changed) for
the Gemini copy edit; `npm run review-queue` at the root lists what waits.

## Figures

One file per lesson under `src/figures/`, exporting `figure(goals, build)`
factories (live, with a task the lesson can set) or plain factories for
stills, all gathered in `src/figures/index.ts` under the ids the lessons
use. Colours come from `COL` in `kit.ts` and always mean the same thing.
The Hertzsprung-Russell diagram draws every star within 20 parsecs from
`src/data/stars.json` (HYG v3.8, CC BY-SA 4.0), compacted by
`tools/stars.mjs`.

## Photos

Every photo carries its author, licence and source, shown under it and on
the Credits page; only public domain, CC0, CC BY and CC BY-SA are accepted.
A pick in `tools/photo-picks.json` names a Commons file (`title`) or a file
elsewhere with its licence page (`url`, `page`, `source`, `author`,
`license`). Photo ids are kept for good: saves remember a photo by its id.
Photos are not inlined into the page; the site's service worker keeps each
as it is read, and Settings saves them all.
