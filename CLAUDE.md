# Notes for Claude sessions

- **The lesson guide is [LESSON-GUIDE.md](LESSON-GUIDE.md).** Read it (after
  pulling `main`; Rob edits it directly) before planning a course or writing,
  expanding or reworking any lesson, and whenever Rob says "use the lesson
  guide". Its short version is at the top. It is the only copy: don't make
  others, and change it here when Rob asks for a new rule.
- Every lesson's status is in [docs/status.md](docs/status.md), made by
  `npm run status`. When you finish a step for a lesson, record it (review
  queue or `tools/lesson-status.json`), run `npm run status`, and commit the
  regenerated `docs/status.md` and `docs/status.html` with your change.
- Layout, commands and how the site fits together: [README.md](README.md).
  The lesson format and figure library: Didactics' README.
- Pushing straight to `main` is fine; it deploys the site.
