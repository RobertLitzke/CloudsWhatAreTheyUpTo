// Social Security retirement benefits, simplified: the average of the 35
// highest years of (indexed) earnings, the benefit formula with its bend
// points, and the change for claiming before or after full retirement age.
// Everything is in today's dollars; real benefits are level once claimed,
// since they rise with prices.

import { RULES, type Rules } from './rules';

/** Average indexed monthly earnings from `years` years at `earnings` a year (today's dollars), over 35 years. */
export function aime(earnings: number, years: number, rules: Rules = RULES): number {
  const capped = Math.min(earnings, rules.socialSecurity.taxableMax);
  return (capped * Math.min(35, years)) / 35 / 12;
}

/** The monthly benefit at full retirement age (the primary insurance amount) for an AIME. */
export function pia(a: number, rules: Rules = RULES): number {
  const [b1, b2] = rules.socialSecurity.bendPoints;
  const [f1, f2, f3] = rules.socialSecurity.factors;
  return f1 * Math.min(a, b1) + f2 * Math.max(0, Math.min(a, b2) - b1) + f3 * Math.max(0, a - b2);
}

/** The share of the full benefit paid when claiming at `age` (whole or fractional years), for a full retirement age of 67. */
export function claimFactor(age: number, rules: Rules = RULES): number {
  const fra = rules.socialSecurity.fullRetirementAge;
  const months = Math.round((age - fra) * 12);
  if (months >= 0) return 1 + Math.min(months, (70 - fra) * 12) * (0.08 / 12);
  const early = -months;
  return 1 - Math.min(36, early) * (5 / 9 / 100) - Math.max(0, early - 36) * (5 / 12 / 100);
}

/** Total benefits received from claiming at `claim` until death at `death`, at a monthly full benefit of `full`. */
export function lifetime(full: number, claim: number, death: number): number {
  return Math.max(0, death - claim) * 12 * full * claimFactor(claim);
}
