# Writing courses and lessons

How lessons for this site get planned, written, checked and finished. It
collects what Rob has asked for across the courses so far. Read it before
outlining a course or writing a lesson; the course's own README and
`didactics/README.md` (the lesson format, figures, footnotes, encyclopedia)
cover the mechanics.

The status of every lesson is in [status.md](status.md), made by
`npm run status`. Update it when you finish a step (see the end of this
guide).

## Who reads these

Rob and his partner. Write for a smart high schooler or a curious adult.
Sentences can be long and some technical terms are fine, but each real term
is defined once, where it is first needed. Don't talk down ("Try it!", "So
what?", chirpy asides) and don't swing academic ("underwater", not
"subaqueous"). Rob found early Geology drafts "too juvenile, middle school";
the fix was a more adult register, not more jargon.

## Planning a course

1. **Ask what it is for.** Each course has a goal in Rob's words (Synthesizers:
   be comfortable in front of an Arturia MicroFreak; Photography: take the long
   zoom off automatic; Geology: read the rocks, with the Pacific Northwest only
   in branches). The goal decides the scope and what is left out.
2. **Write an outline** as a document Rob can comment on (a Claude Doc or a
   markdown file in `/mnt/project-files/<course>/`). For each lesson: an id,
   a number, a title (often the mystery itself), a `teaches` line, the opening
   puzzle, the main figures, and which earlier lessons it leans on.
3. **Shape it as a tree.** A trunk of general lessons in order, and branches
   that fork off a trunk lesson for local or specialist material. Branches get
   a one-letter prefix and number from one (`P2`, `W3`); the trunk is plain
   numbers. In `src/lessons.ts`, a branch is `{ id, title, promise, from,
   color, prefix }`, a branch lesson has `branch` and `needs`, and its `n` is
   in its own hundred (101, 102 ... for the first branch) so it sorts after
   the trunk. Keep local material (Seattle, Whidbey, eastern Washington) in
   branches unless the course is local by nature.
4. **Get reviews of the outline before writing.** Run a few reviewer
   personas over it as subagents, each writing to a file: someone from the
   field (a botanist, Martin Rees), a teacher, a great explainer (Feynman,
   Sagan, Hawking, E. O. Wilson) and a student. Past sets are in
   `/mnt/project-files/astrophysics/review-2026-11-03/` and
   `/mnt/project-files/botany-ecology-review/`. Summarise what they agree on,
   revise, and treat their templates as ideas: Rob turned down a fixed
   six-part lesson template that one review proposed.
5. **Rob approves the outline.** Then list every unwritten lesson as
   `coming(...)` in `src/lessons.ts` so the home page shows the whole plan,
   and the status table picks them up.
6. **A new course folder**: follow "Adding a course" in the root README
   (course.json, catalog map place, icon, tests). `npx didactics-course new`
   scaffolds one.
7. **Bridges** are short courses joining two courses, drawn on the catalog
   map; they are listed in `catalog/map.json` until written.

## The shape of a lesson

There is no template. Rob's rule (3 Nov): fit the lesson to its material.
Two things are fixed in every lesson:

- **It ends with a quiz** (the last part, a `quiz` block with id `check`, or
  the course's own check figure). Every check answer becomes a review card,
  so write questions that still make sense out of context, with wrong
  choices of similar length and plausibility (the quiz figure marks the
  guess and rings the right answer). "Which explanation is best?" questions
  test understanding better than recall.
- **It has a summary**: 5 to 10 points, each `**Bold lead.** One sentence.`,
  that stand on their own. It shows at the end and on top whenever a
  finished lesson is opened again, so it is what the reader keeps.

Everything else varies:

- About six parts on average, more or fewer as the material needs.
- A named misconception, a back-of-the-envelope estimate or an outdoor
  exercise are good when they fit, never a box to fill in every lesson.
- `key_ideas` boxes are optional; don't repeat the same points in key ideas,
  check and summary.
- Vary the figures from lesson to lesson.

### Opening

Open on something the reader wants explained or wants to do, then follow it.
The courses use a few versions of this:

- **A mystery from the field or from history** (Geology, Astronomy, Botany,
  Ecology): what people couldn't explain, then the path to the answer, told
  with real people, places and dates, the way Neal Stephenson's historical
  fiction tells it. Kelvin's cooling Earth, a willow in a tub, an island of
  starving reindeer.
- **An everyday question** (Clouds): "Will this grey sky actually rain?"
- **A challenge or a target** (Photography: a picture you want to take;
  Synthesizers: **The mystery.** or **The sound.**, with a sound figure to
  hear, and a last part where the reader builds the sound and matches it).

Then explain from the ground up. Build each idea before using it; a student
read-through will find where you assumed something.

### The `teaches` line and the title

The title is often the puzzle ("Why are there no green stars?"). `teaches`
is one plain line of what the lesson covers; it shows in the lesson list and
in the status table, so keep it short and concrete.

## Prose

Rob dislikes the habits of machine-written text. The full list is in the
Gemini brief in `tools/copyedit.mjs`; write without them in the first place:

- No em or en dashes as punctuation (number ranges are fine).
- No "not just X, it's Y", "not only ... but also", "Here's the thing",
  "Let's", "Imagine", "In short", "Ultimately".
- No triplets for rhythm, no rhetorical questions answered by the next
  sentence, no sign-off summaries or one-line aphorisms closing a paragraph,
  no sentences that only announce the next one.
- None of: delve, tapestry, crucial, vital, key (as an adjective),
  fascinating, remarkable, incredible, journey, unlock, harness, robust,
  seamless, landscape (as a metaphor), realm, testament.
- No exclamation marks outside quotations.

British-leaning spelling as each course's `tools/copyedit.json` lists
(metres, colour). Mixing metric and imperial is fine where it reads
naturally. When Rob asks a "why" question about a lesson, answer it in the
thread and then fold the answer into the text.

Course voices:

| Course | Voice and frame |
| --- | --- |
| Clouds | A workbook with no story in the main text. Each lesson opens with a short typewritten radio message from W7DQ (1931, Harrow, eastern Washington) and ends with a radio quiz; nothing mid-lesson, era kept subtle, a Settings toggle turns it off. |
| Geology | Mystery first, then the history of how it was solved. Trunk is general; PNW only in branches. |
| Astronomy | Hawking's plain words and dry wit, no equations, mystery then history. |
| Botany, Ecology | Geology's shape: an old experiment or a real puzzle, then the evidence. |
| Photography | Each lesson opens on a challenge picture; the figures re-expose real photos. |
| Synthesizers | The mystery or the sound first, the live synth in every lesson, the reader matches the sound at the end. Music theory stays out. |
| Encyclopedia | One shared voice, closest to Sagan and Feynman; no Wikipedia-style biography, no heavy maths, spoilers fine. |

## Figures

Every figure has to earn its place (Ciechanowski's explainers are the
model).

- **An interactive figure shows cause and effect**: gravity against an
  updraft, a filter cutting harmonics. A slider that only makes something
  bigger is "useless"; make it a still instead.
- **Add a still wherever the text describes something the reader can't
  see.** Text that says "as the figure shows" must match a real figure.
- **One text box of fixed height per figure** (`frame(w, h, lines)`), so the
  controls don't jump when the readout changes.
- **Guess first** when a figure turns on a single threshold: lock the
  sliders until the reader predicts (`guessFirst`, or `lock`/`choices` in
  the course kit), mark the guess right or wrong, then let them explore.
- In a tap-the-order figure, keep the diagram visible throughout and mark
  each correct pick on it.
- A colour means the same thing in every figure and in the prose (COL
  tokens).
- One figures file per lesson, in lesson order. Test every goal (each
  course's `test/figures.test.ts` walks them) and check the figure in
  `figures.html` at phone width.
- Use the shared pieces before drawing your own: `didactics/charts`
  (timeline, tree, scale, plate stills from JSON), `didactics/maps` (real
  reliefs), `player` time lapses (Rob likes animated timelines), figure flash
  cards for figures that make good review cards.

## Footnotes and the encyclopedia

- Footnotes are `[^id]` markers with a note in the lesson's `footnotes`,
  either `technical` (a term or detail the main line does without) or
  `digression` (a side trip). About four a lesson; for what would trip a
  casual reader or is interesting but off the line.
- Link ideas, people, places and things to the site-wide encyclopedia with
  `[[term]]` or `[[words|@entry-id]]`. Entries live in
  `encyclopedia/<course>.json` (format in the Didactics README); a new entry
  goes on `tools/encyclopedia-review-queue.json`. Each course's encyclopedia
  page is its one-page glossary.

## Photos

- Sources: Wikimedia Commons and NOAA; since 3 Nov also USGS, Flickr
  (Creative Commons licences) and the Seattle Municipal Archives. Never the
  WMO Cloud Atlas (copyrighted). Record the direct URL, author and licence
  for each photo in `src/data/photos.json`.
- Cloud sessions can't fetch from Commons reliably (429s). Don't fetch from
  the cloud: write the picks into the course's `tools/photo-picks.json`, or
  park the photo block in `tools/pending-photos.json` with a `search` hint,
  and the photos are fetched in a Remote Control session on Rob's PC
  (`npm run photos -- <course>`, then `node tools/restore-photos.mjs`).
- A lesson reads without its photos, so parking them doesn't hold anything
  up; the status table lists what is parked.

## The pipeline for each lesson

1. **Draft** the lesson JSON and its figures. Run the course's tests
   (`npm test -w <course>`) and `tsc`.
2. **Student read-through.** Dump the lesson's text and a description of
   each figure to markdown and give it to a Haiku subagent playing a curious
   student of the course's audience, who lists every question or confusion
   and quotes the line that raised it. Revise and repeat with a fresh
   student; one to three rounds is usual. Fix wrong facts it catches too.
3. **Queue the Gemini copy edit.** Add `{ "lesson", "added", "what",
   "notes"? }` to `courses/<course>/tools/review-queue.json` (the course
   needs a `tools/copyedit.json` brief). Put specific fixes for the editor
   in `notes`. Rob runs the queue himself (`npm run review-queue -- --run`
   with his OpenRouter key); never ask for or store the key.
4. **After Gemini runs, check its fact notes** in
   `tools/copyedit-out/<lesson>.md` before committing. It has invented a
   survivor, moved a tsunami coast and shifted the Sun's peak colour; revert
   anything doubtful.
5. **Fact check.** A thorough read of the finished lesson, figure readouts
   and encyclopedia entries by a strong model at high effort: fix clear
   slips, list only real judgement calls for Rob (he can't adjudicate most
   specialist facts), and write a report to
   `/mnt/project-files/<course>/fact-review.md`. Geology's of 3 Nov is the
   example. Re-check a lesson only when it changes.
6. **Photos and images** fetched or drawn (see above).
7. **Done.** Record each step in `tools/lesson-status.json` as you go.

Rob lets threads push straight to `main`; the site deploys from it.

## Keeping the status table current

`npm run status` writes `docs/status.md` and `docs/status.html`; the site
build writes the same page to `/status.html` on the live site. Most of it is
read from the repository: written lessons, `coming(...)` lessons, branches and
codes, the Gemini queues, parked photos, and lessons with no photos in
courses that expect them. A lesson's status is the first step it still waits
for: student read-through, Gemini, fact check, photos.

What it can't see is kept in `tools/lesson-status.json` (its `$comment`
explains each field): fact checks, read-throughs the queue doesn't mention,
stand-in images, lessons planned in an outline but not yet in
`lessons.ts`, and a plainer summary where a `teaches` line is long.

When a thread finishes work on a lesson:

- Wrote or changed prose: add it to the course's review queue.
- Ran a student read-through: if the queue entry said "no student review",
  update it, or set `"student": "done"` for the lesson in
  `tools/lesson-status.json`.
- Fact-checked: set `"facts": "done YYYY-MM-DD (where the report is)"` for
  the lesson or the course.
- Fetched photos: restore the parked blocks; for a stand-in, remove its
  `images` note.
- Planned new lessons: add them as `coming(...)` in `lessons.ts`, or under
  `planned` for an outline that isn't in code yet.

Then run `npm run status` and commit `docs/status.md` and
`docs/status.html` with the change. The script warns about a lesson id in
`tools/lesson-status.json` that no course has.
