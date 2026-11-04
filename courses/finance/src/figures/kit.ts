// The colours that always mean the same thing, in every figure and in the
// text ([[words|key]]), and the figure kit with them filled in.

import { courseKit } from 'didactics/kit';

export * from 'didactics/figure';
export * from './plot';

export const COL = {
  ink: '#23262e',
  soft: '#5d6370',
  paper: '#fcfaf3',
  grid: 'rgba(35, 38, 46, 0.13)',
  /** Shares (stocks), and a portfolio that is mostly shares. */
  stocks: '#2f6f9f',
  /** Bonds. */
  bonds: '#c48a2c',
  /** Prices rising: inflation, and buying power lost to it. */
  inflation: '#b4553a',
  /** The portfolio's balance over time, in today's dollars. */
  balance: '#2f5f57',
  /** What is spent each year. */
  spending: '#8f3b76',
  /** Tax paid, in every figure. */
  tax: '#d0622f',
  /** Pre-tax accounts: traditional 401(k) and IRA. */
  pretax: '#6b4fa0',
  /** Roth accounts. */
  roth: '#2f8a6a',
  /** Health savings accounts. */
  hsa: '#c2557a',
  /** Taxable brokerage accounts. */
  taxable: '#4b5d73',
  /** Wages and other earned income. */
  wages: '#3b7d8c',
  /** Long-term gains and qualified dividends. */
  gains: '#7da13b',
  /** Social Security. */
  ss: '#5a7bb5',
  /** Health premiums and other income-tested costs. */
  health: '#d4a017',
  /** A plan that lasted, a choice that worked. */
  good: '#2f8a4f',
  /** A plan that ran out, a penalty, a cliff. */
  bad: '#b4372f',
  /** Portugal, in the branch's figures. */
  portugal: '#a8442e',
} as const;
export type ColorKey = keyof typeof COL;

/** The slider coloured by a palette key, prose with the palette filled in, and tint for a translucent fill (didactics/kit). */
export const { slider, prose, tint } = courseKit(COL);

const MINUS = '−';

/** Dollars, rounded: $40,000. */
export const usd = (n: number) => `${n < 0 ? MINUS : ''}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;

/** Dollars in thousands for axes and tight readouts: $40k, $1.2M. */
export function k(n: number): string {
  const a = Math.abs(n);
  const s = n < 0 ? MINUS : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}k`;
  return `${s}$${Math.round(a)}`;
}

/** A rate as a percent: 4.0%, or 12% with `d` = 0. */
export const pct = (r: number, d = 1) => `${(r * 100).toFixed(d)}%`;

/** Euros, rounded: €40,000. */
export const eur = (n: number) => `€${Math.round(n).toLocaleString('en-US')}`;
