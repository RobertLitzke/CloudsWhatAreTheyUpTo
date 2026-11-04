// US market history a year at a time, 1871 to 2022 (src/data/returns.json,
// made by tools/returns.mjs from Shiller's data), and the withdrawal
// simulator most of the course's figures run on.
//
// Everything is in real dollars (today's money): each year's return is
// deflated by that year's inflation, so a spending of 40,000 means the same
// groceries in 1966 as in 1995. That is how Bengen and the Trinity study
// framed it: a withdrawal raised each year with prices.

import data from '../data/returns.json';

export interface MarketYear {
  year: number;
  /** Nominal total returns, January to January. */
  stocks: number;
  bonds: number;
  inflation: number;
  /** Shiller's CAPE in January, or null before 1881. */
  cape: number | null;
}

export const YEARS: readonly MarketYear[] = data as MarketYear[];
export const FIRST = YEARS[0].year;
export const LAST = YEARS[YEARS.length - 1].year;

const byYear = new Map(YEARS.map((y) => [y.year, y]));
export const yearOf = (y: number): MarketYear => {
  const m = byYear.get(y);
  if (!m) throw new Error(`no market data for ${y}`);
  return m;
};

/** A year's real return on a mix with `stocks` (0 to 1) in shares and the rest in bonds, less a yearly fee. */
export function realReturn(y: number, stocks: number, fee = 0): number {
  const m = yearOf(y);
  const nominal = stocks * m.stocks + (1 - stocks) * m.bonds;
  return (1 + nominal) / (1 + m.inflation) - 1 - fee;
}

/** Real return of shares alone, or bonds alone. */
export const realStocks = (y: number) => realReturn(y, 1);
export const realBonds = (y: number) => realReturn(y, 0);

// ---- spending rules -------------------------------------------------------------------------

/**
 * How much to spend each year.
 * - constant: Bengen's rule, `rate` of the starting balance, then the same real amount every year.
 * - percent: a fixed share of whatever the balance is, each year.
 * - guardrails: start at `rate`; if the year's spending is above (rate × (1 + band)) of the
 *   balance, cut it by `cut`; if below (rate × (1 − band)), raise it by `cut` (after Guyton and Klinger, simplified).
 * - vpw: the payment that would empty the balance over the years left at an assumed real return (variable percentage withdrawal).
 * - floor: a percent of the balance, but never below `floor` nor above `ceiling` (fractions of the first year's spending).
 */
export type Rule =
  | { kind: 'constant'; rate: number }
  | { kind: 'percent'; rate: number }
  | { kind: 'guardrails'; rate: number; band: number; cut: number }
  | { kind: 'vpw'; assumed: number }
  | { kind: 'floor'; rate: number; floor: number; ceiling: number };

export interface Plan {
  /** First year of retirement. */
  start: number;
  /** How many years the money has to last. */
  years: number;
  rule: Rule;
  /** Share in shares, 0 to 1, or a share for each year from the start (a glide path). */
  stocks: number | ((t: number) => number);
  /** Yearly fee, such as 0.001 for 0.1 percent. */
  fee?: number;
  /** Other real income in year t (a pension, part-time work), which lowers what is drawn. */
  income?: (t: number) => number;
  /** A one-off or yearly extra cost in year t, such as care in old age. */
  extra?: (t: number) => number;
  /** Returns to use in place of history, one per year from the start (for reordering figures). */
  returns?: readonly number[];
}

export interface Path {
  /** Real balance at the start of each year, and after the last (years + 1 values). */
  balance: number[];
  /** Real spending each year, from the portfolio and other income together. */
  spending: number[];
  /** Year (from 0) the money ran out, or -1. */
  ranOut: number;
}

/** The payment that empties `balance` over `n` years at real return `r`, paid at the start of each year. */
export function pmt(balance: number, n: number, r: number): number {
  if (n <= 0) return balance;
  if (Math.abs(r) < 1e-9) return balance / n;
  return (balance * r) / (1 - (1 + r) ** -n) / (1 + r);
}

/** Run a plan through history (or through `plan.returns`) from a starting balance. */
export function simulate(plan: Plan, start = 1_000_000): Path {
  const fee = plan.fee ?? 0;
  const share = (t: number) => (typeof plan.stocks === 'number' ? plan.stocks : plan.stocks(t));
  const rule = plan.rule;
  const balance = [start];
  const spending: number[] = [];
  let ranOut = -1;
  let b = start;
  const first = rule.kind === 'vpw' ? pmt(start, plan.years, rule.assumed) : start * ('rate' in rule ? rule.rate : 0.04);
  let last = first;
  for (let t = 0; t < plan.years; t++) {
    const other = plan.income?.(t) ?? 0;
    const extra = plan.extra?.(t) ?? 0;
    let want: number;
    switch (rule.kind) {
      case 'constant': want = first; break;
      case 'percent': want = b * rule.rate; break;
      case 'vpw': want = pmt(b, plan.years - t, rule.assumed); break;
      case 'floor': want = Math.min(first * rule.ceiling, Math.max(first * rule.floor, b * rule.rate)); break;
      case 'guardrails': {
        want = last;
        if (t > 0 && b > 0) {
          const now = want / b;
          if (now > rule.rate * (1 + rule.band)) want *= 1 - rule.cut;
          else if (now < rule.rate * (1 - rule.band)) want *= 1 + rule.cut;
        }
        break;
      }
    }
    last = want;
    // Other income covers part of the spending; the rest comes from the portfolio.
    const draw = Math.max(0, want - other) + extra;
    const taken = Math.min(b, draw);
    if (taken < draw - 1e-6 && ranOut < 0) ranOut = t;
    spending.push(Math.min(want, taken + other));
    b -= taken;
    const r = plan.returns ? plan.returns[t] : realReturn(plan.start + t, share(t), fee);
    b = Math.max(0, b * (1 + r));
    balance.push(b);
  }
  return { balance, spending, ranOut };
}

/** Every start year with a full `years` of history after it. */
export const starts = (years: number): number[] => {
  const out: number[] = [];
  for (let y = FIRST; y + years - 1 <= LAST; y++) out.push(y);
  return out;
};

/** The highest constant real withdrawal rate (of the first balance) that lasts `years` from `start`. */
export function safeRate(start: number, years: number, stocks: number | ((t: number) => number), fee = 0): number {
  let lo = 0;
  let hi = 0.2;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const p = simulate({ start, years, stocks, fee, rule: { kind: 'constant', rate: mid } });
    if (p.ranOut < 0) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** For every start with full history: whether a plan lasted, and how it ended. */
export function cycle(plan: Omit<Plan, 'start'>, balance = 1_000_000): { start: number; path: Path }[] {
  return starts(plan.years).map((start) => ({ start, path: simulate({ ...plan, start }, balance) }));
}

/** The real returns of `years` years from `start`, for figures that reorder them. */
export const realSeries = (start: number, years: number, stocks: number): number[] =>
  Array.from({ length: years }, (_, t) => realReturn(start + t, stocks));

/** Average (arithmetic) and compound (geometric) real return of a series. */
export function averages(rs: readonly number[]): { mean: number; compound: number } {
  const mean = rs.reduce((s, r) => s + r, 0) / rs.length;
  const compound = rs.reduce((p, r) => p * (1 + r), 1) ** (1 / rs.length) - 1;
  return { mean, compound };
}
