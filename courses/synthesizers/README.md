# Synthesizers: how a sound is built

A course on how a synthesizer builds a sound, on a live synth the reader plays
as they read. It grew out of **PatchMatch**, a synth ear-training game
(RobertLitzke/PatchMatch, brought in here with its history), which lives on
inside the course at `#/ear`.

Each lesson opens on a puzzle from the history of sound and works it out on
the synth: the first nine are PatchMatch's nine stages (waveforms, filter,
envelopes, LFO, second oscillator, FM, drive, echo, signal chain), one module
each. The rest of the plan is in `src/lessons.ts` as `coming` lessons.

## Layout

```
src/core/      PatchMatch's pure TypeScript, unit-tested: the parameter table
               (params.ts), generator, keys, scoring, riffs, envelope maths
src/audio/     the synth engine on Web Audio: voice.ts (one voice from native
               nodes), engine.ts (clock, A/B, keys), offline.ts (render to
               samples), claim.ts (one sound at a time on a page), tone.ts
               (a figure's own held tone)
src/game/      PatchMatch's pages and components (knob, panel, scope, pad,
               flow, keys), styled only inside a .pm box (styles/app.css)
src/figures/   the lesson figures: synth.ts is the live synth (knobs, pad,
               panel, scope and a looping riff, with goals by name); the rest
               are drawn SVG figures with a tone of their own
src/lessons/   one JSON file per written lesson
tools/         audit/ and audition/ (PatchMatch's dev-only pages), gallery.ts
               (figures.html), copyedit.json and review-queue.json
test/          PatchMatch's tests, plus the course's content and figure tests
```

Pages beside the lessons: `#/lab` is the Synth lab (PatchMatch's free play:
every knob, a keyboard, recorded loops), and `#/ear` is PatchMatch itself
(rounds, practice, arcade, its settings at `#/ear/settings`). PatchMatch's
progress stays in its own `patchmatch.save`; the course's is `synthesizers.save`.

## Riffs

The site's build ships the public-domain riffs only (`.env.production` sets
`VITE_RIFFS=pd`), so its round keys carry version `A`. `npm run dev` has
every riff. Lesson figures use public-domain riffs only (the content test checks).

## Run

From the repository root, `npm install`, then:

| Command | What it does |
|---|---|
| `npm run dev -w synthesizers` | Dev server on http://localhost:5400; also `/figures.html` (every figure), `/audition.html` (every riff), `/audit.html` (how different each knob step sounds) |
| `npm test -w synthesizers` | Vitest: PatchMatch's generator, keys, scoring, riffs and storage, plus the lessons and figures |
| `npm run build -w synthesizers` | Typecheck, then build `dist/` |
| `npm run golden -w synthesizers` | Re-record `test/golden-keys.json` after an intended generator change |

## Keys and the generator

A round key such as `14N-K7QX2M` (version, stage 1 to 9, tier, seed) fully
determines its twelve puzzles. `test/golden.test.ts` pins a set of keys to the
puzzles they produce. Generator v1 is not frozen yet; see DESIGN.md, which is
PatchMatch's game design and still describes the game.
