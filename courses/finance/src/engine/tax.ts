// The federal income tax on one household's year, the parts of it the course
// takes apart (ordinary brackets, the gains stacked on top, the 3.8 percent
// surtax, how much Social Security is taxable), and the other income-tested
// costs that behave like tax: the ACA premium credit and Medicare's IRMAA.
//
// Every number comes from the rules file for the year (src/engine/rules.ts).
// Amounts are a year's dollars; a figure that runs for decades treats the
// thresholds as rising with prices, which they do, and works in real dollars.

import { RULES, type Rules } from './rules';

export type Status = 'single' | 'joint';

/** A year's income by kind. Every field is dollars in the year, 0 if absent. */
export interface Income {
  /** Wages and self-employment income. */
  wages?: number;
  /** Interest, non-qualified dividends and short-term gains: taxed like wages. */
  interest?: number;
  /** Withdrawals from pre-tax accounts and Roth conversions: ordinary income. */
  pretax?: number;
  /** Qualified dividends and long-term capital gains. */
  gains?: number;
  /** Social Security benefits received (gross). */
  ss?: number;
}

export interface Who {
  status: Status;
  /** How many people on the return are 65 or older (0, 1 or 2). */
  over65?: number;
}

export interface TaxResult {
  /** Gross income on the return, with only the taxable part of Social Security. */
  agi: number;
  taxableSS: number;
  deduction: number;
  /** Taxable income, all kinds. */
  taxable: number;
  /** The ordinary part of taxable income (gains come off the top). */
  ordinaryTaxable: number;
  /** The gains part of taxable income. */
  gainsTaxable: number;
  ordinaryTax: number;
  /** Gains taxed at 0, 15 and 20 percent. */
  gainsAt: [number, number, number];
  gainsTax: number;
  niit: number;
  total: number;
  /** The rate of the ordinary bracket the last ordinary dollar fell in. */
  bracket: number;
}

const v = (n: number | undefined) => Math.max(0, n ?? 0);

/** Tax on ordinary taxable income by the brackets. */
export function bracketTax(taxable: number, status: Status, rules: Rules = RULES): number {
  const b = rules.federal.brackets[status];
  let tax = 0;
  for (let i = 0; i < b.length; i++) {
    const lo = b[i][0];
    const hi = i + 1 < b.length ? b[i + 1][0] : Infinity;
    if (taxable <= lo) break;
    tax += (Math.min(taxable, hi) - lo) * b[i][1];
  }
  return tax;
}

/** The ordinary bracket a taxable income falls in. */
export function bracketAt(taxable: number, status: Status, rules: Rules = RULES): number {
  const b = rules.federal.brackets[status];
  let rate = b[0][1];
  for (const [lo, r] of b) if (taxable > lo) rate = r;
  return rate;
}

/**
 * How much of a year's Social Security is taxable: none while "provisional income"
 * (other income plus half the benefits) is under the base, then up to 50 percent,
 * then up to 85 percent above the second threshold.
 */
export function taxableSocialSecurity(other: number, ss: number, status: Status, rules: Rules = RULES): number {
  if (ss <= 0) return 0;
  const { base, adjusted } = rules.federal.socialSecurityTaxation;
  const provisional = other + ss / 2;
  const b = base[status];
  const a = adjusted[status];
  if (provisional <= b) return 0;
  if (provisional <= a) return Math.min(ss / 2, (provisional - b) / 2);
  return Math.min(0.85 * ss, 0.85 * (provisional - a) + Math.min(ss / 2, (a - b) / 2));
}

/** The standard deduction, with the extra amounts for people 65 or older (and the senior deduction while it lasts). */
export function deduction(who: Who, agi: number, rules: Rules = RULES): number {
  const f = rules.federal;
  const n = Math.min(who.over65 ?? 0, who.status === 'joint' ? 2 : 1);
  let d = f.standardDeduction[who.status] + n * f.extra65[who.status];
  if (n > 0) {
    const s = f.seniorDeduction;
    const each = Math.max(0, s.amount - s.phaseRate * Math.max(0, agi - s.phaseStart[who.status]));
    d += n * each;
  }
  return d;
}

/** The whole federal income tax for a year. */
export function federalTax(income: Income, who: Who, rules: Rules = RULES): TaxResult {
  const status = who.status;
  const f = rules.federal;
  const wages = v(income.wages);
  const interest = v(income.interest);
  const pretax = v(income.pretax);
  const gains = v(income.gains);
  const ss = v(income.ss);
  const other = wages + interest + pretax + gains;
  const taxableSS = taxableSocialSecurity(other, ss, status, rules);
  const agi = other + taxableSS;
  const ded = deduction(who, agi, rules);
  const taxable = Math.max(0, agi - ded);
  // The deduction comes off ordinary income first; gains sit on top.
  const ordinaryTaxable = Math.max(0, taxable - gains);
  const gainsTaxable = taxable - ordinaryTaxable;
  const ordinaryTax = bracketTax(ordinaryTaxable, status, rules);
  const zeroTop = f.gains.zeroTop[status];
  const fifteenTop = f.gains.fifteenTop[status];
  const at0 = Math.max(0, Math.min(gainsTaxable, zeroTop - ordinaryTaxable));
  const at15 = Math.max(0, Math.min(gainsTaxable - at0, fifteenTop - Math.max(ordinaryTaxable, zeroTop)));
  const at20 = gainsTaxable - at0 - at15;
  const gainsTax = 0.15 * at15 + 0.2 * at20;
  const investment = interest + gains;
  const niit = f.niit.rate * Math.max(0, Math.min(investment, agi - f.niit.threshold[status]));
  return {
    agi, taxableSS, deduction: ded, taxable, ordinaryTaxable, gainsTaxable, ordinaryTax,
    gainsAt: [at0, at15, at20], gainsTax, niit,
    total: ordinaryTax + gainsTax + niit,
    bracket: bracketAt(ordinaryTaxable, status, rules),
  };
}

/** The extra federal tax on the next `step` dollars of one kind of income, as a rate. */
export function marginalRate(income: Income, kind: keyof Income, who: Who, step = 100, rules: Rules = RULES): number {
  const now = federalTax(income, who, rules).total;
  const more = federalTax({ ...income, [kind]: v(income[kind]) + step }, who, rules).total;
  return (more - now) / step;
}

// ---- costs that behave like tax --------------------------------------------------------------

/** The household's income as a multiple of the poverty line (1.5 = 150 percent). */
export const povertyMultiple = (magi: number, people: number, rules: Rules = RULES): number =>
  magi / rules.aca.povertyLine[String(Math.min(4, Math.max(1, people))) as '1' | '2' | '3' | '4'];

/** The share of income the ACA expects a household to pay towards the benchmark plan, or null above the cliff or below the floor. */
export function expectedShare(multiple: number, rules: Rules = RULES): number | null {
  const a = rules.aca;
  if (multiple > a.cliff || multiple < 1) return null;
  const t = a.applicable;
  for (let i = 0; i + 1 < t.length; i++) {
    const [x0, p0] = t[i];
    const [x1, p1] = t[i + 1];
    if (multiple <= x1) return p0 + ((multiple - x0) / (x1 - x0)) * (p1 - p0);
  }
  return t[t.length - 1][1];
}

export interface AcaResult {
  multiple: number;
  /** The premium tax credit for the year. */
  credit: number;
  /** What the household pays for the benchmark plan after the credit. */
  net: number;
  /** 'medicaid' below the expansion line, 'cliff' above 400 percent, else 'credit'. */
  zone: 'medicaid' | 'credit' | 'cliff';
}

/** The ACA premium credit on a benchmark plan costing `benchmark` a year, for a household of `people` with this MAGI. */
export function aca(magi: number, people: number, benchmark: number, rules: Rules = RULES): AcaResult {
  const multiple = povertyMultiple(magi, people, rules);
  if (multiple < rules.aca.medicaidBelow) return { multiple, credit: benchmark, net: 0, zone: 'medicaid' };
  const share = expectedShare(multiple, rules);
  if (share == null) return { multiple, credit: 0, net: benchmark, zone: 'cliff' };
  const pay = Math.min(benchmark, share * magi);
  return { multiple, credit: benchmark - pay, net: pay, zone: 'credit' };
}

/** Medicare's income surcharge (Parts B and D) for one person for a year, from the MAGI of two years before. */
export function irmaa(magi: number, status: Status, rules: Rules = RULES): { tier: number; yearly: number } {
  const rows = rules.medicare.irmaa[status];
  let tier = 0;
  let monthly = 0;
  rows.forEach(([above, b, d], i) => {
    if (magi > above) {
      tier = i + 1;
      monthly = b + d;
    }
  });
  return { tier, yearly: monthly * 12 };
}

// ---- other countries and states, for the branches -------------------------------------------

/** Washington's tax on a year's long-term gains (stocks and bonds; real estate is exempt). */
export function washingtonGains(gains: number, rules: Rules = RULES): number {
  const w = rules.washington.capitalGains;
  const over = Math.max(0, gains - w.deduction);
  return w.rate * over + (w.topRate - w.rate) * Math.max(0, over - w.topAbove);
}

/** Portugal's progressive income tax on taxable income in euros (before the municipal and solidarity surcharges). */
export function portugalTax(taxable: number, rules: Rules = RULES): number {
  const b = rules.portugal.brackets;
  let tax = 0;
  for (let i = 0; i < b.length; i++) {
    const lo = b[i][0];
    const hi = i + 1 < b.length ? b[i + 1][0] : Infinity;
    if (taxable <= lo) break;
    tax += (Math.min(taxable, hi) - lo) * b[i][1];
  }
  return tax;
}

/** The solidarity surcharge on Portuguese taxable income above 80,000 and 250,000 euros. */
export function portugalSolidarity(taxable: number, rules: Rules = RULES): number {
  const s = rules.portugal.solidarity;
  let out = 0;
  s.forEach(([lo, r], i) => {
    const hi = i + 1 < s.length ? s[i + 1][0] : Infinity;
    out += Math.max(0, Math.min(taxable, hi) - lo) * r;
  });
  return out;
}

/**
 * Portugal's tax on a year's pension income in euros for one person or a married
 * couple filing jointly (the couple's taxable income is split in two, taxed, and doubled).
 * Each pensioner takes the specific deduction.
 */
export function portugalPensionTax(pension: number, joint: boolean, rules: Rules = RULES): number {
  const people = joint ? 2 : 1;
  const taxable = Math.max(0, pension - people * rules.portugal.pensionDeduction);
  const each = taxable / people;
  return people * (portugalTax(each, rules) + portugalSolidarity(each, rules));
}


/** Washington's estate tax, for deaths from July 2026, on an estate after debts and deductions. */
export function washingtonEstate(estate: number, rules: Rules = RULES): number {
  const e = rules.washington.estate;
  const taxable = Math.max(0, estate - e.exclusion);
  let tax = 0;
  e.brackets.forEach(([lo, rate], i) => {
    const hi = i + 1 < e.brackets.length ? e.brackets[i + 1][0] : Infinity;
    tax += rate * Math.max(0, Math.min(taxable, hi) - lo);
  });
  return tax;
}

/** The alternative minimum tax owed on top of the regular tax, for a household whose income is all ordinary, plus an ISO spread (an AMT-only addition). */
export function amt(ordinary: number, isoSpread: number, status: Status, rules: Rules = RULES): { regular: number; tentative: number; amt: number } {
  const a = rules.federal.amt;
  const regular = federalTax({ wages: ordinary }, { status }, rules).total;
  const amti = ordinary + isoSpread;
  const exemption = Math.max(0, a.exemption[status] - a.phaseRate * Math.max(0, amti - a.phaseStart[status]));
  const base = Math.max(0, amti - exemption);
  const tentative = 0.26 * Math.min(base, a.rate28Above) + 0.28 * Math.max(0, base - a.rate28Above);
  return { regular, tentative, amt: Math.max(0, tentative - regular) };
}
