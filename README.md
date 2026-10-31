# Courses

Interactive workbooks, each a course of short illustrated lessons with live
diagrams, a check at the end of each lesson, and flash cards, built on
[Didactics](https://github.com/RobertLitzke/Didactics). The site opens on a
course catalog; each course opens in its own folder, in its own look.

Live at https://robertlitzke.github.io/CloudsWhatAreTheyUpTo/ (the repository
keeps its old name for now).

## Layout

```
catalog/            the site's front page: the course catalog, and the one
                    service worker and manifest for the whole site
courses/<folder>/   one course, everything of its own: lessons, quizzes,
                    figures, simulations, photos, styles, tests, tools
  course.json       what the catalog shows: title, department, summary,
                    icon, where its lessons are, its save's key
tools/build-site.mjs  builds every course into dist/<folder>/, then the catalog
```

The rule: anything that names a course lives in its folder. Anything two
courses need goes into Didactics, as a small module that knows neither.

A course's folder is its address on the site (`/clouds/`) and is a plain
lowercase word or two naming its subject (the catalog's test checks this).

| Folder | Course | Save key |
| --- | --- | --- |
| `courses/clouds` | Clouds: What are they up to? | `clouds.save` |
| `courses/soil` | Dirt: a soil workbook | `dirt.save` |
| `courses/electronics` | Circuitry: a circuits workbook (its solver is the workspace `courses/electronics/packages/circuit-kit`) | `circuitry.save` |
| `courses/photography` | Out of Auto: a field workbook | `outofauto.save` |

Dirt, Circuitry and Out of Auto came in from their own repositories
(RobertLitzke/Dirt, Circuitry, Photography) with their history, by
`git subtree add`.

Each course keeps its own `localStorage` keys (`<id>.save`, `<id>.course`, …),
so progress made before the courses moved here is still found: the site is on
the same origin.

## Run

```bash
npm install                 # once, at the root: one lockfile for every course
npm run dev -w clouds       # one course on its own dev server (its own port)
npm run dev -w catalog      # the catalog, on http://localhost:5410
npm test                    # every course's tests and the catalog's
npm run build               # the whole site into dist/
npm run preview             # serve dist/ on http://localhost:5411
```

In dev the catalog's links lead to course folders that only exist in a
build; use `npm run build && npm run preview` to click through the site.

## How the site fits together

- Every course is a Didactics `defineCourse` app built by `lessonApp` with
  `inSite: true`: its page registers the site's `../sw.js` and links
  `../manifest.webmanifest`, and `catalog: { href: '../' }` puts "All
  courses" at the foot of its menu.
- `tools/build-site.mjs` runs each course's own build and copies its `dist/`
  into the site's `dist/<folder>/`, leaving out the worker and manifest the
  course writes for itself. The catalog builds last, into `dist/`; its
  service worker precaches the catalog and every course's page, icons, poster
  and `photos/`, so the one installed app works offline in every course.
- One installed app: the manifest's `id` is still `clouds-app`, so a phone
  that had Clouds installed keeps the same app, now opening on the catalog.
- The one-file copies (`clouds.html`, `clouds-offline.html`) are still one
  per course, offered in that course's Settings; their "All courses" link goes
  to the live site.

## Adding a course

1. Put it in `courses/<folder>/` with its own `package.json` (a workspace;
   name it after the folder), depending on the same Didactics commit as the
   others.
2. Give it a `course.json` and set `inSite: true` in its `vite.config.ts` and
   `catalog: { href: '../' }` in its `defineCourse` call.
3. `npm install` at the root, then `npm test` and `npm run build`.

## Deploy

Pushes to `main` test, build and deploy the whole site to GitHub Pages
(`.github/workflows/pages.yml`).
