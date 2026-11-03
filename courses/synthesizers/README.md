# PatchMatch

A synth ear-training puzzle. A target patch loops a riff; your own patch starts
a few knob settings away; turn knobs until they match in as few moves as you
can, then commit to see the puzzle's goal (the number of moves a good ear should
need) and what was off.

There are nine stages, from waveforms to pedals and the order they are plugged
in, each with a lesson, practice and rounds. Besides rounds there is an arcade
mode (puzzles back to back against a draining meter) and free play.

The game design and the phased plan are in [DESIGN.md](DESIGN.md), including
what is built so far.

## Run

```bash
npm install
```

```bash
npm run dev
```

Opens on http://localhost:5400. Two more pages exist on the dev server only:

- http://localhost:5400/audition.html plays every riff, for checking the
  transcriptions by ear.
- http://localhost:5400/audit.html measures how different each step of each
  knob sounds, for tuning the step tables.

On the dev server an orange strip appears across the top if anything on a page
is wider than the screen, naming the element. The page clips sideways overflow
instead of scrolling, so this is how a layout slip on one device shows up.

| Command | What it does |
|---|---|
| `npm test` | Vitest: generator properties, golden keys, scoring, envelope, riffs, recording, storage, arcade rules |
| `npm run build` | Typecheck, then build `dist/` |
| `npm run build:pd` | The same, shipping the 16 public-domain riffs only |
| `npm run preview` | Serve `dist/` on http://localhost:5401 |
| `npm run golden` | Re-record `test/golden-keys.json` after an intended generator change |
| `npm run icons` | Regenerate the PNG icons from `public/icons/icon.svg` |

## The build

`dist/index.html` is the whole app: JavaScript, CSS and the font are inlined, so
the file also runs straight from disk. Beside it sit the three things that
cannot be inlined: `sw.js`, `manifest.webmanifest` and `icons/`. There is no
backend; progress and saved keys live in the browser's `localStorage`, with
export and import on the Settings page.

`dist/` is committed, so the deployable build is in the repo: copy its
contents to any static host. Rebuild and commit it after changing the app.
Serve `index.html` and `sw.js` with `Cache-Control: no-cache` so installed
copies see updates.

`Dockerfile` builds that and serves it from nginx.

## Layout

```
src/core/    pure TypeScript, no DOM or Web Audio; everything here is unit-tested
  params.ts    the parameter table every other part reads
  active.ts    which knobs can be heard in a given sound (decides what is scored)
  loop.ts      turning key presses into a recorded loop
  gen/         generators by key version; v1.ts holds step tables, bias, goal weights
  riffs/       notation parser and the riff list (popular.ts, folk.ts)
  arcade.ts    the arcade run: the level ramp, the signal meter, the points
  key.ts score.ts round.ts campaign.ts envelope.ts storage.ts rng.ts
src/audio/   voice.ts (one synth voice from native nodes, with its drive and echo
             pedals), engine.ts (clock, A/B, live keys, metronome), offline.ts
             (render a loop to samples)
src/app/     dom.ts, router.ts, components/ (knob, panel, scope, keys, flow, ...),
             views/, styles/
tools/       icons.mjs, audition/ and audit/ (the two dev-only pages)
test/        includes golden-keys.json
```

## Keys and the generator

A round key such as `14N-K7QX2M` (version, stage 1 to 9, tier, seed) fully
determines its twelve puzzles. `test/golden.test.ts` pins a set of keys to the puzzles they
produce.

Generator v1 is **not frozen yet**: until a key has been shared with anyone, its
tables may change, followed by `npm run golden`. After that, any change to what
a key produces goes in a new `gen/v2.ts` under a new version character, and v1
stays in the bundle.
