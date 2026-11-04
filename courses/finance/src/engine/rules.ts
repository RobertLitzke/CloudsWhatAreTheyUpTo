// The tax year the course's figures use. A new year: add src/data/rules-<year>.json
// in the same shape, point RULES at it, and run the tests; the lessons that quote
// a number which changed are listed by test/rules.test.ts.

import rules2026 from '../data/rules-2026.json';

export type Rules = typeof rules2026;

export const RULES: Rules = rules2026;

/** The year every lesson names under its title ("Tax rules: 2026"). */
export const RULES_YEAR = RULES.year;
