// The engines the figures run on, checked against results published elsewhere.
import { describe, expect, it } from 'vitest';
import { FIRST, LAST, safeRate, starts } from '../src/engine/history';
import { aca, federalTax, irmaa, marginalRate, taxableSocialSecurity } from '../src/engine/tax';
import { runHousehold } from '../src/engine/household';
import { yearsToEnough } from '../src/figures/savings-rate';

describe('market history', () => {
  it('runs from 1871 to 2022', () => {
    expect(FIRST).toBe(1871);
    expect(LAST).toBe(2022);
  });

  it('puts the worst 30-year start in the 1960s, near 3.6 to 3.8 percent', () => {
    const rates = starts(30).map((y) => [y, safeRate(y, 30, 0.6)] as const);
    const worst = rates.reduce((a, b) => (b[1] < a[1] ? b : a));
    expect(worst[0]).toBeGreaterThanOrEqual(1965);
    expect(worst[0]).toBeLessThanOrEqual(1969);
    expect(worst[1]).toBeGreaterThan(0.035);
    expect(worst[1]).toBeLessThan(0.039);
  });
});

describe('savings rate', () => {
  it('matches the 2012 table (5 percent real, 4 percent withdrawals)', () => {
    expect(yearsToEnough(0.5, 0.05, 0.04)).toBeCloseTo(16.6, 0);
    expect(yearsToEnough(0.2, 0.05, 0.04)).toBeCloseTo(36.7, 0);
    expect(yearsToEnough(0.75, 0.05, 0.04)).toBeCloseTo(7.1, 0);
  });
});

describe('federal tax, 2026', () => {
  it('lets a couple take $120,000 of long-term gains with no federal tax', () => {
    expect(federalTax({ gains: 120_000 }, { status: 'joint' }).total).toBe(0);
  });

  it('taxes ordinary income by the brackets', () => {
    // $100,000 of wages, single: taxable 83,900.
    const r = federalTax({ wages: 100_000 }, { status: 'single' });
    expect(r.taxable).toBe(83_900);
    expect(r.ordinaryTax).toBeCloseTo(1240 + 0.12 * 38_000 + 0.22 * 33_500, 0);
  });

  it('charges 27 percent on a conversion that pushes gains out of the 0 percent band', () => {
    const r = marginalRate({ pretax: 80_000, gains: 60_000 }, 'pretax', { status: 'joint' }, 1000);
    expect(r).toBeCloseTo(0.27, 2);
  });

  it('taxes at most 85 percent of Social Security', () => {
    expect(taxableSocialSecurity(0, 40_000, 'joint')).toBe(0);
    expect(taxableSocialSecurity(500_000, 40_000, 'joint')).toBeCloseTo(34_000, 0);
  });

  it('has an ACA cliff just above 400 percent of the poverty line', () => {
    expect(aca(84_600, 2, 15_600).credit).toBeGreaterThan(5000);
    expect(aca(84_700, 2, 15_600).credit).toBe(0);
    expect(aca(25_000, 2, 15_600).zone).toBe('medicaid');
  });

  it('puts IRMAA tiers on MAGI', () => {
    expect(irmaa(200_000, 'joint').tier).toBe(0);
    expect(irmaa(230_000, 'joint').tier).toBe(1);
  });
});

describe('the household model', () => {
  it('pays less lifetime tax filling low brackets than spending pre-tax money last', () => {
    const h = { status: 'joint' as const, people: 2, age: 60, until: 95, spending: 80_000, accounts: { taxable: 600_000, basis: 400_000, pretax: 1_200_000, rothOpen: 200_000, rothGrowth: 0 }, ss: 50_000, claimAge: 67, benchmark: 15_600, returns: 0.04 };
    const textbook = runHousehold(h, { kind: 'textbook' });
    const fill = runHousehold(h, { kind: 'fill', top: 100_800 });
    expect(fill.lifetimeTax).toBeLessThan(textbook.lifetimeTax);
    expect(textbook.shortAt).toBe(-1);
  });
});
