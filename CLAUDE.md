# Notes for Claude sessions

- Before planning a course or writing or revising a lesson, read
  [docs/lesson-guide.md](docs/lesson-guide.md): audience, lesson shape, prose
  rules, figures, photos, and the per-lesson pipeline (student read-through,
  Gemini queue, fact check, photos).
- Every lesson's status is in [docs/status.md](docs/status.md), made by
  `npm run status`. When you finish a step for a lesson, record it (review
  queue or `tools/lesson-status.json`), run `npm run status`, and commit the
  regenerated `docs/status.md` and `docs/status.html` with your change.
- Layout, commands and how the site fits together: [README.md](README.md).
  The lesson format and figure library: Didactics' README.
- Pushing straight to `main` is fine; it deploys the site.
