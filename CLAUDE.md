# Notes for Claude sessions

## The lesson guide

The lesson guide is a Claude Doc that Rob edits in the app, not a file in
this repository: https://claude.ai/artifact/9Y8iYVPYjPyk315cFAR8CP
(doc id 4521ebe4-f5e7-4269-abbd-73fa40b15b60). Read it with the Claude Docs
tools before planning a course or writing, expanding or reworking any
lesson, and whenever Rob says "use the lesson guide". Read it fresh each
time, since Rob changes it. It is the only copy: don't copy it into the repo
or the project files. A new rule Rob asks for goes into the doc. If you have
no Claude Docs tools, say so rather than writing from memory.

## Keeping the status table current

Every lesson's status is in [docs/status.md](docs/status.md) (also
docs/status.html, and /status.html on the live site), made by
`npm run status` (tools/status.mjs).


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

## Elsewhere

- Layout, commands and how the site fits together: [README.md](README.md).
  The lesson format and figure library: Didactics' README.
- Pushing straight to `main` is fine; it deploys the site.
