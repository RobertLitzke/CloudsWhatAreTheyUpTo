// One household's money year by year, across its four kinds of account, with
// the tax, health premiums and penalties each year's choices cost. Lessons 9,
// 10, 12 and the capstone run it.
//
// Everything is in real dollars, with the year's tax rules held fixed (the
// brackets rise with prices, so in real terms they stand still). Every account
// earns the same real return, so the only differences between strategies are
// the taxes, premiums and penalties they cause.

import { RULES, type Rules } from './rules';
import { aca, federalTax, irmaa, type Status } from './tax';

/** The IRS Uniform Lifetime Table divisor at each age from 72, for required minimum distributions. */
const RMD_DIVISOR: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4,
  82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5,
  92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4,
};
export const rmdDivisor = (age: number): number => RMD_DIVISOR[Math.min(100, Math.round(age))] ?? 27.4;

export interface Accounts {
  /** Brokerage account value and its cost basis. */
  taxable: number;
  basis: number;
  /** Traditional 401(k) and IRA together. */
  pretax: number;
  /** Roth accounts: the part reachable without tax or penalty at any age (contributions, seasoned conversions)... */
  rothOpen: number;
  /** ...and the earnings, reachable tax-free after 59 and a half. */
  rothGrowth: number;
}

export interface Household {
  status: Status;
  /** People covered by health insurance before 65. */
  people: number;
  /** Age of the (older) person in the first year. */
  age: number;
  /** Last age to plan to (inclusive). */
  until: number;
  /** Real spending a year, before tax and health premiums. */
  spending: number;
  accounts: Accounts;
  /** Combined real Social Security a year once claimed, and the claiming age. */
  ss: number;
  claimAge: number;
  /** ACA benchmark premium for the household, a year, before 65. */
  benchmark: number;
  /** Real return on everything, a year, or one per year. */
  returns: number | readonly number[];
  /** Dividends paid by the taxable account, as a share of its value (qualified). */
  yieldTaxable?: number;
  /** The age RMDs start. */
  rmdAge?: number;
}

/**
 * How to choose each year's withdrawals.
 * - textbook: taxable first, then pre-tax, then Roth.
 * - pretax-first: pre-tax first, then taxable, then Roth.
 * - fill: draw or convert pre-tax money each year up to `top` of ordinary taxable income
 *   (for example the top of the 12 percent bracket), spend from it what is needed and convert the rest,
 *   then taxable, then Roth. `stopAt` ends the filling at an age (for example at 75 when RMDs take over).
 * - aca: like fill, but keeps MAGI under `magi` (for example 400 percent of the poverty line) until 65.
 */
export type Strategy =
  | { kind: 'textbook' }
  | { kind: 'pretax-first' }
  | { kind: 'fill'; top: number; stopAt?: number }
  | { kind: 'aca'; magi: number; top: number };

export interface YearRow {
  t: number;
  age: number;
  /** Withdrawn from each account for spending, tax and premiums. */
  fromTaxable: number;
  fromPretax: number;
  fromRoth: number;
  /** Moved from pre-tax to Roth. */
  converted: number;
  rmd: number;
  ss: number;
  gainsRealised: number;
  dividends: number;
  magi: number;
  tax: number;
  /** Net health premium (ACA before 65; IRMAA surcharge after), the part tied to income. */
  health: number;
  penalty: number;
  /** Total balance at the end of the year, and each account. */
  end: Accounts;
  short: boolean;
}

export interface Run {
  rows: YearRow[];
  lifetimeTax: number;
  lifetimeHealth: number;
  lifetimePenalty: number;
  /** Balances at the end, and their worth after tax if the pre-tax part were taxed at `heirRate`. */
  end: Accounts;
  afterTaxEnd: number;
  /** First age the household could not meet its spending, or -1. */
  shortAt: number;
}

const total = (a: Accounts) => a.taxable + a.pretax + a.rothOpen + a.rothGrowth;

/** Run a household through the years under one strategy. */
export function runHousehold(h: Household, strategy: Strategy, rules: Rules = RULES, heirRate = 0.24): Run {
  const a: Accounts = { ...h.accounts };
  const rows: YearRow[] = [];
  const seasoning: number[] = [];
  const yieldT = h.yieldTaxable ?? 0.02;
  const rmdAge = h.rmdAge ?? 75;
  let shortAt = -1;
  let lifetimeTax = 0;
  let lifetimeHealth = 0;
  let lifetimePenalty = 0;
  const years = h.until - h.age + 1;
  // MAGI two years back, for IRMAA.
  const magiHistory: number[] = [];
  for (let t = 0; t < years; t++) {
    const age = h.age + t;
    // Conversions made five years ago become reachable without penalty.
    if (t >= 5) {
      const ripe = seasoning[t - 5] ?? 0;
      a.rothOpen += ripe;
      a.rothGrowth -= ripe;
    }
    const ss = age >= h.claimAge ? h.ss : 0;
    const dividends = a.taxable * yieldT;
    const rmd = age >= rmdAge ? a.pretax / rmdDivisor(age) : 0;
    const over59 = age >= 60;

    // Pre-tax money taken this year by the strategy, before covering any shortfall.
    let planned = rmd;
    const otherOrdinary = 0;
    const fillTo = (top: number) => {
      // Ordinary taxable income of `top` means pre-tax income of top + deduction, less the taxable part of SS.
      let p = 0;
      for (let k = 0; k < 4; k++) {
        const r = federalTax({ pretax: p, gains: dividends, ss }, { status: h.status, over65: age >= 65 ? (h.status === 'joint' ? 2 : 1) : 0 }, rules);
        const room = top - (r.ordinaryTaxable);
        p = Math.max(0, p + room);
      }
      return Math.max(rmd, Math.min(a.pretax, p - otherOrdinary));
    };
    if (strategy.kind === 'fill' && (strategy.stopAt == null || age < strategy.stopAt)) planned = fillTo(strategy.top);
    const acaFill = strategy.kind === 'aca' ? fillTo(strategy.top) : 0;

    // Spend, iterating because tax and premiums depend on what is drawn.
    let need = h.spending;
    let fromTaxable = 0;
    let fromPretax = 0;
    let fromRoth = 0;
    let converted = 0;
    let gainsRealised = 0;
    let tax = 0;
    let health = 0;
    let penalty = 0;
    let magi = 0;
    let short = false;
    // The ACA strategy can overshoot its line (paying the conversion's tax realises gains);
    // if it does, trim the conversion and go again.
    let trim = 0;
    for (let attempt = 0; attempt < 4; attempt++) {
    need = h.spending;
    for (let k = 0; k < 8; k++) {
      const spendNeed = need;
      // Under 65 the ACA strategy keeps MAGI (with the gains realised last time round) under its line.
      if (strategy.kind === 'aca') planned = age < 65 ? Math.max(rmd, Math.min(acaFill, strategy.magi - dividends - ss - gainsRealised - trim)) : acaFill;
      let left = spendNeed - ss - dividends;
      // Pre-tax drawn as planned (and spent first, the excess converted)...
      const plannedPretax = Math.min(a.pretax, planned);
      let pretaxSpent = Math.min(plannedPretax, Math.max(0, left));
      if (!over59 && strategy.kind !== 'pretax-first') pretaxSpent = 0; // under 60, planned pre-tax money is converted, not spent
      // A required withdrawal can't be converted: what isn't spent of it is taken anyway (and saved).
      const rmdLeft = Math.max(0, Math.min(plannedPretax, rmd) - pretaxSpent);
      converted = plannedPretax - pretaxSpent - rmdLeft;
      left -= pretaxSpent;
      // ...then the rest in the strategy's order.
      const taxableBefore = a.taxable;
      const gainShare = taxableBefore > 0 ? Math.max(0, 1 - a.basis / taxableBefore) : 0;
      let tk = 0;
      let pk = 0;
      let rk = 0;
      const takeTaxable = (amt: number) => { const x = Math.min(amt, taxableBefore - tk); tk += x; return amt - x; };
      const takePretax = (amt: number) => { const x = Math.min(amt, a.pretax - plannedPretax - pk); pk += x; return amt - x; };
      const rothReach = over59 ? a.rothOpen + a.rothGrowth : a.rothOpen;
      const takeRoth = (amt: number) => { const x = Math.min(amt, rothReach - rk); rk += x; return amt - x; };
      if (left > 0) {
        if (strategy.kind === 'pretax-first') left = takeRoth(takeTaxable(takePretax(left)));
        else left = takeRoth(takePretax(takeTaxable(left)));
      }
      short = left > 1;
      fromTaxable = tk;
      gainsRealised = tk * gainShare;
      fromPretax = pretaxSpent + pk + rmdLeft;
      fromRoth = rk;
      penalty = over59 ? 0 : (rules.accounts.earlyPenalty * pk);
      const pretaxIncome = fromPretax + converted;
      const over65 = age >= 65 ? (h.status === 'joint' ? 2 : 1) : 0;
      const r = federalTax({ pretax: pretaxIncome, gains: gainsRealised + dividends, ss }, { status: h.status, over65 }, rules);
      tax = r.total;
      magi = r.agi + (ss - r.taxableSS);
      if (age < 65) {
        const ins = aca(magi, h.people, h.benchmark, rules);
        health = ins.net;
      } else {
        const back = magiHistory[t - 2] ?? magi;
        health = irmaa(back, h.status, rules).yearly * (h.status === 'joint' ? 2 : 1);
      }
      need = h.spending + tax + health + penalty;
      if (Math.abs(need - spendNeed) < 1) break;
    }
    if (strategy.kind === 'aca' && age < 65 && magi > strategy.magi && planned > rmd) {
      trim += magi - strategy.magi + 250;
      continue;
    }
    break;
    }
    magiHistory[t] = magi;
    if (short && shortAt < 0) shortAt = age;

    // Move the money.
    if (a.taxable > 0) a.basis -= a.basis * (fromTaxable / a.taxable);
    a.taxable -= fromTaxable;
    a.pretax -= fromPretax + converted;
    const fromOpen = Math.min(a.rothOpen, fromRoth);
    a.rothOpen -= fromOpen;
    a.rothGrowth -= fromRoth - fromOpen;
    a.rothGrowth += converted;
    seasoning[t] = converted;
    // Dividends were spent; anything unspent from SS and dividends goes into taxable.
    const surplus = Math.max(0, ss + dividends + fromTaxable + fromPretax + fromRoth - need);
    a.taxable += surplus;
    a.basis += surplus;
    // Grow.
    const r = typeof h.returns === 'number' ? h.returns : h.returns[t] ?? 0;
    const g = 1 + r;
    a.taxable *= g;
    a.pretax *= g;
    a.rothOpen *= g;
    a.rothGrowth *= g;
    // Growth on the open Roth part is earnings: move it to growth.
    const earned = a.rothOpen - a.rothOpen / g;
    a.rothOpen -= earned;
    a.rothGrowth += earned;
    for (const k of Object.keys(a) as (keyof Accounts)[]) a[k] = Math.max(0, a[k]);
    lifetimeTax += tax;
    lifetimeHealth += health;
    lifetimePenalty += penalty;
    rows.push({ t, age, fromTaxable, fromPretax, fromRoth, converted, rmd, ss, gainsRealised, dividends, magi, tax, health, penalty, end: { ...a }, short });
  }
  const afterTaxEnd = a.taxable - Math.max(0, a.taxable - a.basis) * 0.15 + a.pretax * (1 - heirRate) + a.rothOpen + a.rothGrowth;
  return { rows, lifetimeTax, lifetimeHealth, lifetimePenalty, end: { ...a }, afterTaxEnd, shortAt };
}

export const totalOf = total;
