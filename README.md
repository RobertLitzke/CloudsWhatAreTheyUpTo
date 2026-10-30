# Out of Auto

A photography workbook for someone who owns a long zoom and leaves it on
automatic. Short illustrated lessons, in the manner of Bartosz Ciechanowski's
explainers, on what the camera is deciding for you and how to take each
decision back: light and exposure, what stays sharp, movement, grain, reach,
focus and colour. Written for nature photography with a **Nikon Coolpix
P950**, so every number in a figure is one that camera can really reach.

The figures work on **real photographs**. A figure hands the browser a photo,
its depth map and a set of camera settings, and the photograph is redrawn as
that camera would have taken it: the background comes apart as the aperture
opens, a bird smears as the shutter slows, grain comes up with the ISO, the
frame crops as the lens zooms, and the whole picture tips warm or cold with
the white balance. There is no story and no mentor; footnotes carry the
history, the chemistry and the photographers.

Built on [Didactics](https://github.com/RobertLitzke/Didactics), the lesson
library taken out of
[Clouds](https://github.com/RobertLitzke/CloudsWhatAreTheyUpTo): the lesson
player, figures and their frames and sliders, checks, footnotes, glossary,
reference page, quiz, photo credits, figure gallery, shell and PWA build. It
is a git dependency pinned to a commit in `package.json`; to
take a newer one, run `npm install github:RobertLitzke/Didactics#<sha>`, then
`npm test` and `npm run build`. There is no radio, so the save has none.
Didactics ships TypeScript source, which Node will not run from
`node_modules`, so the photo tools run through `vite-node` (it comes with
Vitest) rather than `node --experimental-strip-types`.

## What is built

- The shell: a vanilla TypeScript PWA on Vite, inlined into one `index.html`,
  with a service worker, an update banner, and progress in `localStorage` with
  save-to-file and load. Nav: Home, Reference, Quiz, Settings (and Credits).
- **The course's text, to download** (`src/course.ts`, Didactics' course
  edits): Settings has a menu of All and each written lesson, and one
  Download button, for a JSON file to revise; Load edited text reads an
  edited one in the real lessons on this device. `npx didactics-course
  import <file>` writes an edited file back into `src/data`.
- **The camera, as numbers** (`src/core/camera.ts`): the P950's sensor, lens,
  apertures, shutter and ISO ranges, and the optics on top of them, depth of
  field, diffraction, exposure, photon noise, shake and motion. Unit-tested,
  with no DOM in sight. `src/core/shot.ts` turns settings plus a scene into
  what the renderer should do.
- **The photograph renderer** (`src/app/photo/film.ts`): depth-sliced blur
  composited back to front, a directional smear for the subject and another
  for your hands, and a pixel pass in linear light for exposure, white balance
  and grain.
- **Fourteen figures** over those two: a ray diagram of a point becoming a
  disc, aperture and focus on a perched bird, a close-up where the sharp band
  is millimetres thick, shutter speed against a bird in flight, shake against
  focal length, a stream drawn into silk, the three dials as one balance,
  photons as a count, ISO on a real photo, the zoom from 24 to 2000 mm, the
  wedge of the world a lens takes in, the widest aperture closing as you zoom,
  the kelvin scale, and white balance on snow.
- **A twelve-lesson outline** (`src/core/lessons.ts`), of which lesson 1,
  "What the camera is deciding for you", is written: a tour of the four
  decisions that uses one figure of every kind. The rest show on the home page
  as coming, with what each will cover.
- The **reference page**: the four decisions, the camera at a glance, the stop
  scale, settings to start from, and a glossary.
- A **quiz** of flash cards with spaced repetition (`src/data/quiz.json`).

## Run

```bash
npm install
npm run dev
```

Opens on http://localhost:5460. http://localhost:5460/figures.html shows every
figure on one page (dev server only, Didactics' gallery); add `?frozen` for the
same picture every load, `?imperial` for distances in feet, or
`?only=<figure id>` for one figure. The page gets `data-ready` once every
photo has been drawn, for screenshots.

| Command | What it does |
|---|---|
| `npm test` | Vitest: the optics and exposure arithmetic, lesson and reference content, every figure built, the save, photo credits |
| `npm run build` | Typecheck, then build `dist/` |
| `npm run preview` | Serve `dist/` on http://localhost:5461 |
| `npm run icons` | Regenerate the PNG icons from `src/app/mark.ts` |
| `npm run photos:find` | List candidate photographs from Commons into a contact sheet to pick from |
| `npm run photos:fetch` | Download the picked photographs, resize them, make depth maps and write their credits |
| `npm run photos:import -- <folder>` | Bring in photographs from a folder on this machine: your own, or a set from elsewhere |

## Photographs

Every photograph carries its author, licence and source, shown under the
picture and on the Credits page. Only public domain, CC0, CC BY and CC BY-SA
are accepted: no NonCommercial and no NoDerivatives, since the figures resize,
crop and re-expose what they are given.

Each photograph also needs two things the file cannot tell us:

- **a depth map**, `photos/<id>-depth.webp`, a small grey picture, white where
  the scene is nearest and black where it is farthest. It is estimated with
  MiDaS, a small neural network, by `tools/photos/depth.ts`, which downloads
  the model (about 65 MB) into `tools/photos/model/` on first use. Depth maps
  need `npm install --no-save onnxruntime-node`; on a machine that cannot
  reach nuget.org, prefix that with `ONNXRUNTIME_NODE_INSTALL_CUDA=skip`.
- **a scene**, written by hand in `src/data/photos.json`: how far away the
  subject was, the nearest and farthest things in the frame, how fast the
  subject was moving, the colour and brightness of the light, and the zoom it
  was taken at. Estimates are fine; they only need the right order of
  magnitude. Without them, a figure cannot say what a setting would have done
  and shows a card saying a photograph is missing.

Two ways in:

1. **From Wikimedia Commons.** `npm run photos:find` searches the categories
   in `tools/photos/config.ts` and writes `tools/photos/candidates/index.html`.
   Open it, tap the photographs that clearly show their subject, copy the JSON
   at the bottom into `tools/photos/picks.json`, and run `npm run photos:fetch`.
   Then fill in each `scene` by hand.
2. **From a folder on this machine**, including your own photographs:
   `npm run photos:import -- <folder>`, where the folder holds a
   `credits.json` saying what each file is of and who took it. The format is
   at the top of `tools/photos/import.ts`. Your own photographs are the best
   ones to learn from, because you know what the camera was set to.

Pick photographs that are sharp and well exposed to start with: the figures
re-expose them, and a picture that was already soft cannot show what an
aperture would have done. Check each depth map before trusting the figure
built on it; a wrong map blurs the bird and not the branch.

### The photographs shipped today

Four of Rob's own bird photographs, shared under CC BY-SA 4.0:

| id | bird | used by |
|---|---|---|
| `perched-bird-01` | tanager on a branch | aperture figure (lesson 1) |
| `perched-bird-02` | yellow-crowned bird in twigs | spare perched bird, for focus through clutter |
| `distant-wildlife-01` | grey heron on a jetty | zoom figure (lesson 1) |
| `low-light-01` | black-crowned night heron, Pixel phone, 1/26 s, ISO 1458 | ISO figure |

Only the night heron still had camera EXIF; the other three had it stripped,
so their scenes are estimates. Each scene's `near` was solved from the depth
map's grey value at the bird, so that `subjectAt` lands on the bird.

Six close-ups of daisies and the insects on them, CC BY 2.0, from the
TensorFlow `flower_photos` archive (originally Flickr), are **placeholders at
500 px** for the close-up figure. Flight, landscape, water, snow and woodland
have no photograph yet and say so on the page.

## Adding a lesson

1. Write `src/data/lessons/<id>.json` (the format is in
   Didactics' README, "A lesson, as JSON") and import it in `src/core/lessons.ts`, in
   place of that lesson's `planned(...)` entry.
2. Put its figures in `src/app/figures/<id>.ts`, add their ids to
   `FIGURE_IDS`, and name them in `src/app/figures/index.ts`.
3. Fill its section in `src/data/reference.json` and add cards to
   `src/data/quiz.json`.
4. `npm test` catches unknown figures, goals no figure meets, and bad answers.

## Layout

```
src/core/     pure TypeScript, no DOM; unit-tested
  camera.ts     the P950, and the optics: depth of field, exposure, noise, blur
  shot.ts       settings + scene -> what the renderer should do
  lessons.ts    the twelve lessons and the figure ids
  photos.ts     subjects, the photo entry shape, scenes and accepted licences
  reference.ts  the reference page's shape
  save.ts       the save, on top of Didactics' progress
src/data/     lessons/*.json, reference.json, quiz.json, glossary.json, photos.json
src/app/      store.ts, asset.ts, picture.ts, mark.ts (the aperture icon)
  photo/        film.ts (the renderer), view.ts (the canvas in a figure)
  figures/      kit.ts (palette and camera sliders), shot.ts (the figure frame),
                focus.ts, motion.ts, light.ts, zoom.ts, colour.ts, check.ts, index.ts
  scene/        field.ts, the drawn valley at the top of each page
  views/        home, lesson, reference, quiz, settings, credits
tools/        photos/ (find, fetch, import, depth), gallery/, icons.mjs
```

## Deploy

Pushes to `main` build and deploy to GitHub Pages
(`.github/workflows/pages.yml`) at
https://robertlitzke.github.io/Photography/. In the repository's settings,
Pages must be set to deploy from GitHub Actions.
