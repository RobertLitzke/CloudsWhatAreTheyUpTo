// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { CHANNELS, bestNoon, below, clock, currentTable, dayTurns, edgeAt, fastestFall, lowestLowDay, meanLowerLow, noonHeights, slackWindow, SATURDAY, tideFt, turns, twelfths } from '../src/figures/tables';
import { click, context, guess, setSlider } from './helpers';

/** Build a figure and resolve when its task is done. */
async function reach(id: string, goal: string, act: (node: HTMLElement) => void | Promise<void>) {
  const ctx = context('imperial');
  let done = false;
  const handle = FIGURES[id](ctx, goal);
  void handle.done?.then(() => (done = true));
  document.body.append(handle.node);
  await act(handle.node);
  await new Promise((r) => setTimeout(r, 0));
  return { done: () => done, node: handle.node };
}

describe('F1 tide model', () => {
  it('sets zero at the average lower low', () => {
    expect(Math.abs(meanLowerLow(365))).toBeLessThan(0.1);
  });

  it('gives a Seattle-like mixed tide with minus tides', () => {
    const sat = dayTurns(SATURDAY);
    expect(sat.map((x) => x.kind).join('')).toBe('HLHL');
    expect(clock(sat[1].hour)).toBe('11:22');
    expect(sat[1].ft).toBeCloseTo(-2.1, 1);
    expect(sat[0].ft).toBeCloseTo(13.0, 1);
    const all = [0, 1, 2, 3, 4, 5, 6].flatMap((d) => dayTurns(d).map((x) => x.ft));
    expect(Math.max(...all)).toBeLessThan(14.5);
    expect(Math.min(...all)).toBeGreaterThan(-3.5);
  });

  it('puts the best noon on Saturday, not on the day of the lowest low', () => {
    expect(bestNoon()).toBe(3);
    expect(lowestLowDay()).toBe(1);
    const n = noonHeights();
    expect(n[3]).toBeCloseTo(-1.8, 1);
    expect(n[2]).toBeGreaterThan(n[3] + 0.4);
    expect(n[4]).toBeGreaterThan(n[3] + 0.4);
    expect(below(3, 0).length).toBe(1);
  });

  it('the rule of twelfths matches the text and the curve within half a foot', () => {
    const tl = turns(24 * 3 - 8, 24 * 3 + 32).map((x) => ({ ...x, hour: x.hour - 72 }));
    const i = tl.findIndex((x) => clock(x.hour) === '04:09');
    const [a, b] = [tl[i], tl[i + 1]];
    const sixth = (b.hour - a.hour) / 6;
    expect(twelfths(a, b, a.hour + 3 * sixth)).toBeCloseTo((a.ft + b.ft) / 2, 5);
    expect(twelfths(a, b, a.hour + 3 * sixth)).toBeCloseTo(5.5, 0);
    expect(twelfths(a, b, a.hour + 5 * sixth)).toBeCloseTo(-0.85, 1);
    for (let h = 0; h < 24; h += 0.25) {
      const k = tl.findIndex((x) => x.hour > h);
      expect(Math.abs(twelfths(tl[k - 1], tl[k], h) - tideFt(72 + h))).toBeLessThan(0.5);
    }
    expect(clock(fastestFall().hour)).toMatch(/^07:/);
  });

  it('a minus tide on the terrace uncovers far more than the same fall on the upper beach', () => {
    expect(edgeAt(6) - edgeAt(10)).toBeLessThan(12);
    expect(edgeAt(-2) - edgeAt(2)).toBeGreaterThan(60);
  });

  it('slack in the pass lags high water and is short; in the inlet it is long', () => {
    const [pass, inlet] = CHANNELS;
    const highs = dayTurns(SATURDAY).filter((x) => x.kind === 'H');
    const slacks = currentTable(pass, SATURDAY).filter((e) => e.kind === 'slack');
    for (const hw of highs) {
      const next = slacks.find((s) => s.hour > hw.hour)!;
      expect(next.hour - hw.hour).toBeGreaterThan(1);
      expect(next.hour - hw.hour).toBeLessThan(1.6);
    }
    const peak = Math.max(...currentTable(pass, SATURDAY).map((e) => Math.abs(e.kn)));
    expect(peak).toBeGreaterThan(6.5);
    expect(peak).toBeLessThan(8);
    const [a, b] = slackWindow(pass, SATURDAY, 12.6);
    expect((b - a) * 60).toBeLessThan(60);
    const [c, d] = slackWindow(inlet, SATURDAY, 11.9);
    expect(d - c).toBeGreaterThan(1.5);
  });
});

describe('F1 figures reach their goals', () => {
  it('beach: guess, then a minus tide', async () => {
    const r = await reach('tables-beach', 'minus', (n) => { guess(n, 'Several times as much'); setSlider(n, 0, -2.5); });
    expect(r.done()).toBe(true);
  });

  it('twelfths: the fastest fall', async () => {
    const r = await reach('tables-twelfths', 'fastest', (n) => { setSlider(n, 0, 7.8); });
    expect(r.done()).toBe(true);
  });

  it('current: a slack in each channel', async () => {
    const r = await reach('tables-current', 'slack', (n) => {
      guess(n, 'Under an hour');
      const s = slackWindow(CHANNELS[0], SATURDAY, 12.6);
      setSlider(n, 0, Math.round(((s[0] + s[1]) / 2) * 20) / 20);
      click(n, 'A wide inlet (model)');
      const t = slackWindow(CHANNELS[1], SATURDAY, 11.9);
      setSlider(n, 0, Math.round(((t[0] + t[1]) / 2) * 20) / 20);
    });
    expect(r.done()).toBe(true);
  });

  it('week: guess, then step to Saturday and others', async () => {
    const r = await reach('tables-week', 'week', (n) => { guess(n, 'Sat'); setSlider(n, 0, 4); setSlider(n, 0, 5); });
    expect(r.done()).toBe(true);
  });
});
