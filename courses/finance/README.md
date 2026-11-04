# Money That Lasts

Saving, spending and paying less tax, built on [Didactics](https://github.com/RobertLitzke/Didactics).
The outline: https://claude.ai/artifact/DET1mpVWYLfSQDCU9bWzsg

```sh
npm run dev       # http://localhost:5510
npm test          # lessons, figures and the engines
npm run returns   # rebuild src/data/returns.json from tools/data/shiller-monthly.csv
```

- Lessons are JSON in `src/lessons/`; the plan, with lessons still to come, is `src/lessons.ts`.
- Figures are in `src/figures/`, one file per lesson, listed in `src/figures/index.ts`.
- The engines behind the figures are in `src/engine/`:
  - `history.ts`: real returns 1871 to 2022 and withdrawal simulations (Bengen's method, every start year).
  - `tax.ts`: the federal return (brackets, gains stacking, NIIT, Social Security), ACA credits, IRMAA, Washington's gains tax, Portugal's IRS.
  - `household.ts`: one household's accounts year by year under a withdrawal strategy.
- Every rule and limit is in `src/data/rules-2026.json`, with its source; numbers marked `check` still need confirming against irs.gov, ssa.gov or the Portuguese tables. Next year's rules are a new file and a change to `src/engine/rules.ts`; the advice note at the top of each lesson shows the year.
- Return data: Robert Shiller's monthly series as packaged by datasets/s-and-p-500 (ODC-PDDL). Bonds are a 10-year Treasury bought at par and sold a year later.
