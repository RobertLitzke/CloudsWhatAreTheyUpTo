// Branch W, Washington: the state's tax on a year's long-term gains beside the
// federal tax on them; and its estate tax on a couple, with and without a
// trust at the first death.

import { svg } from 'didactics/dom';
import { label, line, note, redraw, small } from 'didactics/draw';
import { RULES } from '../engine/rules';
import { federalTax, washingtonEstate, washingtonGains } from '../engine/tax';
import { COL, figure, frame, guessFirst, k, pct, slider, usd } from './kit';
import { pick } from './plot';

const W = 400;
const WA = RULES.washington;

/** Bars with a name and a note on the left, as in the Portugal figures. */
function bars(rows: [string, string, number, string][], max: number, top: number, left = 120): SVGElement[] {
  const X = (v: number) => left + (v / max) * (320 - left);
  const out: SVGElement[] = [];
  rows.forEach(([name, sub, v, c], i) => {
    const y = top + i * 46;
    out.push(small(left - 6, y + 10, name, { anchor: 'end', bold: true }), small(left - 6, y + 22, sub, { anchor: 'end', soft: true }));
    out.push(svg('rect', { x: left, y, width: Math.max(1, X(v) - left), height: 24, rx: 3, fill: c }));
    out.push(label(X(v) + 5, y + 17, usd(v), { bold: true, fill: c }));
  });
  return out;
}

const roundUp = (v: number, step: number) => Math.max(step, Math.ceil(v / step) * step);

export const waGainsFigure = figure(['wa-gains'], (_ctx, t) => {
  const f = frame(W, 176, 3);
  const g = svg('g');
  f.svg.append(g);
  let gains = 400_000;
  const seen = new Set<string>();
  const paint = () => {
    const fed = federalTax({ gains }, { status: 'joint' }).total;
    const wa = washingtonGains(gains);
    const max = roundUp(Math.max(fed, wa), 50_000);
    redraw(g,
      note(10, 16, `Tax on ${usd(gains)} of long-term gains on shares, a couple with no other income`, { bold: true }),
      ...bars([
        ['Federal', '0, 15 and 20% bands', fed, COL.taxable],
        ['Washington', `7% above ${k(WA.capitalGains.deduction)}`, wa, COL.tax],
      ], max, 30),
      line(120, 128, 320, 128, COL.ink, 1),
      small(120, 142, '$0', { anchor: 'middle', soft: true }),
      small(320, 142, k(max), { anchor: 'middle', soft: true }),
      small(10, 166, `Washington: 9.9% on gains above ${k(WA.capitalGains.deduction + WA.capitalGains.topAbove)}. Federal includes the 3.8% investment tax.`, { soft: true }),
    );
    if (!open()) return;
    seen.add(gains <= WA.capitalGains.deduction ? 'under' : 'over');
    f.readout.textContent = gains <= WA.capitalGains.deduction
      ? `Below Washington's deduction of ${usd(WA.capitalGains.deduction)}, the state takes nothing. The federal tax is ${usd(fed)}.`
      : `Washington takes ${usd(wa)}, ${pct(wa / gains, 1)} of the whole gain, because the first ${usd(WA.capitalGains.deduction)} is deducted. The federal tax is ${usd(fed)}.`;
    if (seen.size >= 2) t.done();
  };
  const sG = slider('Long-term gains in the year', 0, 2_000_000, 10_000, gains, k, (v) => { gains = v; paint(); }, 'gains');
  f.controls.append(sG.node);
  const open = guessFirst(t, f, {
    ask: 'A Seattle couple sells shares in 2026 for a long-term gain of $400,000. Roughly how much is Washington’s capital gains tax?',
    options: ['Nothing', 'About $8,500', 'About $28,000'],
    answer: 1,
    sliders: [sG],
    after: () => paint(),
  });
  paint();
  return f.node;
});

/** Washington estate tax on a couple's estate at the two deaths, without and with a trust holding one exclusion's worth at the first. */
export function coupleEstate(estate: number, trust: boolean): { first: number; second: number } {
  const ex = WA.estate.exclusion;
  if (!trust) return { first: 0, second: washingtonEstate(estate) };
  const sheltered = Math.min(ex, estate);
  return { first: washingtonEstate(sheltered), second: washingtonEstate(estate - sheltered) };
}

export const waEstateFigure = figure(['wa-estate'], (_ctx, t) => {
  const f = frame(W, 176, 3);
  const g = svg('g');
  f.svg.append(g);
  let estate = 6_000_000;
  const tried = new Set<boolean>();
  let trust = false;
  const paint = () => {
    const plain = coupleEstate(estate, false);
    const shelter = coupleEstate(estate, true);
    const max = roundUp(Math.max(plain.second, 100_000), 250_000);
    redraw(g,
      note(10, 16, `A couple's ${k(estate)} estate, after both have died`, { bold: true }),
      ...bars([
        ['All to the survivor', 'one exclusion used', plain.second + plain.first, trust ? COL.soft : COL.bad],
        ['Trust at first death', 'both exclusions used', shelter.second + shelter.first, trust ? COL.good : COL.soft],
      ], max, 30, 140),
      line(140, 128, 320, 128, COL.ink, 1),
      small(140, 142, '$0', { anchor: 'middle', soft: true }),
      small(320, 142, k(max), { anchor: 'middle', soft: true }),
      small(10, 166, `Deaths from July 2026: ${k(WA.estate.exclusion)} excluded per person, 10 to 20% above. No growth assumed.`, { soft: true }),
    );
    if (!open()) return;
    tried.add(trust);
    const saved = plain.second - shelter.second - shelter.first;
    f.readout.textContent = trust
      ? `With ${usd(WA.estate.exclusion)} placed in a trust at the first death, the heirs pay ${usd(shelter.first + shelter.second)}, ${usd(saved)} less than leaving everything to the survivor.`
      : `Leaving everything to the survivor wastes the first exclusion: the heirs pay ${usd(plain.second)} at the second death.`;
    if (tried.size >= 2) t.done();
  };
  const chips = pick(['All to the survivor', 'Trust at first death'], 0, (i) => { trust = i === 1; paint(); });
  const sE = slider('The couple’s estate', 1_000_000, 15_000_000, 250_000, estate, k, (v) => { estate = v; paint(); }, 'balance');
  f.controls.append(chips.node, sE.node);
  const open = guessFirst(t, f, {
    ask: 'A Washington couple owns $6 million, house and retirement accounts included. Each leaves everything to the other, and the survivor to their children. Roughly what Washington estate tax do the children pay?',
    options: ['Nothing: $6 million is two exclusions', 'About $390,000', 'About $1.2 million'],
    answer: 1,
    sliders: [sE],
    buttons: chips.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});
