// @vitest-environment happy-dom
// Every figure the lessons name builds, and the ones with a task can reach it.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';
import { click, context, guess, setSlider } from './helpers';

describe('figures', () => {
  it('all build', () => {
    for (const l of WRITTEN) for (const p of l.parts) for (const b of p.blocks) {
      if (!isDiagram(b)) continue;
      const handle = FIGURES[b.id](context(), b.goal, b.options);
      expect(handle.node, `${l.id}: ${b.id}`).toBeInstanceOf(HTMLElement);
    }
  });

  it('lesson 1: the income cancels, and the savings rate moves the date', async () => {
    const inc = FIGURES.income(context(), 'income');
    setSlider(inc.node, 0, 200_000);
    await expect(inc.done).resolves.toBeUndefined();
    expect(inc.node.textContent).toContain('only the share saved changes the date');
    const yrs = FIGURES.years(context(), 'sooner');
    guess(yrs.node, 'About four years');
    setSlider(yrs.node, 1, 0.06);
    await expect(yrs.done).resolves.toBeUndefined();
    expect(yrs.node.textContent).toMatch(/from 50% to 60% saves 3\.\d/);
  });

  it('lessons 2 to 6: guesses, then the tasks', async () => {
    const cyc = FIGURES.cycling(context(), 'cycle');
    guess(cyc.node, 'A handful, all close together');
    setSlider(cyc.node, 0, 0.05);
    setSlider(cyc.node, 1, 0.8);
    await expect(cyc.done).resolves.toBeUndefined();

    const ord = FIGURES.order(context(), 'order');
    guess(ord.node, 'Ends with about three times the start');
    click(ord.node, 'Backwards');
    expect(ord.node.textContent).toMatch(/ends with 3\.\d times/);
    click(ord.node, 'Shuffled');
    click(ord.node, 'Shuffled');
    await expect(ord.done).resolves.toBeUndefined();

    const win = FIGURES.window(context(), 'window');
    setSlider(win.node, 0, 10);
    await expect(win.done).resolves.toBeUndefined();
    expect(win.node.textContent).toContain('0.88');

    const hor = FIGURES.horizon(context(), 'horizon');
    guess(hor.node, 'About 3.3 percent');
    setSlider(hor.node, 0, 50);
    await expect(hor.done).resolves.toBeUndefined();
    expect(hor.node.textContent).toContain('1966, could spend 3.29%');

    const cape = FIGURES.cape(context(), 'cape');
    setSlider(cape.node, 0, 36);
    await expect(cape.done).resolves.toBeUndefined();

    const rules = FIGURES.rules(context(), 'rules');
    guess(rules.node, 'About $15,000');
    expect(rules.node.textContent).toContain('lowest $15k');
    for (const r of ['Guardrails', 'VPW', 'Floor']) click(rules.node, r);
    await expect(rules.done).resolves.toBeUndefined();

    const gl = FIGURES.glide(context(), 'glide');
    guess(gl.node, 'About half');
    expect(gl.node.textContent).toContain('63 of 123');
    setSlider(gl.node, 0, 0.3);
    setSlider(gl.node, 1, 0.7);
    expect(gl.node.textContent).toContain('3.66%');
    setSlider(gl.node, 0, 0.7);
    setSlider(gl.node, 1, 0.3);
    await expect(gl.done).resolves.toBeUndefined();
  });

  it('lessons 7 to 14: guesses, then the tasks', { timeout: 30_000 }, async () => {
    const st = FIGURES.stack(context(), 'stack');
    guess(st.node, 'Nothing');
    expect(st.node.textContent).toContain('Federal tax $0');
    setSlider(st.node, 0, 60_000);
    setSlider(st.node, 1, 60_000);
    expect(st.node.textContent).toContain('$2,840');
    await expect(st.done).resolves.toBeUndefined();

    const mg = FIGURES.marginal(context(), 'marginal');
    setSlider(mg.node, 1, 60_000);
    setSlider(mg.node, 0, 100_000);
    expect(mg.node.textContent).toContain('$270');
    await expect(mg.done).resolves.toBeUndefined();

    const bk = FIGURES.buckets(context(), 'buckets');
    guess(bk.node, 'Pre-tax, by about an eighth');
    setSlider(bk.node, 1, 0.22);
    expect(bk.node.textContent).toContain('Equal rates, equal results');
    setSlider(bk.node, 1, 0);
    await expect(bk.done).resolves.toBeUndefined();

    const br = FIGURES.bridge(context(), 'bridge');
    guess(br.node, 'Five');
    setSlider(br.node, 2, 300_000);
    setSlider(br.node, 2, 0);
    await expect(br.done).resolves.toBeUndefined();

    const fl = FIGURES.fill(context(), 'fill');
    guess(fl.node, 'About $9,000');
    expect(fl.node.textContent).toContain('$8,975');
    setSlider(fl.node, 1, 0);
    setSlider(fl.node, 1, 100_000);
    await expect(fl.done).resolves.toBeUndefined();

    const ac = FIGURES.aca(context(), 'aca');
    guess(ac.node, 'It rises by about $16,000');
    setSlider(ac.node, 0, 90_000);
    setSlider(ac.node, 0, 60_000);
    await expect(ac.done).resolves.toBeUndefined();

    const wd = FIGURES.withdraw(context(), 'withdraw');
    guess(wd.node, 'Pre-tax accounts first');
    for (const c of ['Pre-tax first', 'Fill 12%', 'Fill 22%']) click(wd.node, c);
    await expect(wd.done).resolves.toBeUndefined();

    const tp = FIGURES.torpedo(context(), 'torpedo');
    await expect(tp.done).resolves.toBeUndefined();

    const fo = FIGURES.formula(context(), 'formula');
    guess(fo.node, 'About a quarter lower');
    expect(fo.node.textContent).toContain('23% less');
    setSlider(fo.node, 1, 35);
    setSlider(fo.node, 1, 12);
    await expect(fo.done).resolves.toBeUndefined();

    const cl = FIGURES.claim(context(), 'claim');
    setSlider(cl.node, 1, 62);
    setSlider(cl.node, 1, 70);
    expect(cl.node.textContent).toContain('past about 80');
    await expect(cl.done).resolves.toBeUndefined();

    const cap = FIGURES.capstone(context(), 'capstone');
    setSlider(cap.node, 1, 70_000);
    await expect(cap.done).resolves.toBeUndefined();
  });
  it('branch P: Portugal against the US', async () => {
    const pt = FIGURES['pt-tax'](context(), 'pt-tax');
    guess(pt.node, 'About three times as much');
    expect(pt.node.textContent).toMatch(/Portugal takes \$8,5\d\d and the US \$2,840/);
    setSlider(pt.node, 0, 150_000);
    await expect(pt.done).resolves.toBeUndefined();

    const two = FIGURES['two-countries'](context(), 'two-countries');
    setSlider(two.node, 1, 100_000);
    await expect(two.done).resolves.toBeUndefined();
  });
  it('branch W: Washington gains and estate', async () => {
    const g = FIGURES['wa-gains'](context(), 'wa-gains');
    guess(g.node, 'About $8,500');
    expect(g.node.textContent).toContain('$8,540');
    setSlider(g.node, 0, 100_000);
    await expect(g.done).resolves.toBeUndefined();

    const e = FIGURES['wa-estate'](context(), 'wa-estate');
    guess(e.node, 'About $390,000');
    click(e.node, 'Trust at first death');
    expect(e.node.textContent).toContain('$390,000 less');
    await expect(e.done).resolves.toBeUndefined();
  });
  it('branch T: location and heirs', async () => {
    const l = FIGURES.location(context(), 'location');
    guess(l.node, 'About $250,000');
    click(l.node, '12% bracket');
    await expect(l.done).resolves.toBeUndefined();

    const h = FIGURES.heirs(context(), 'heirs');
    click(h.node, '12%');
    expect(h.node.textContent).toContain('$880k');
    await expect(h.done).resolves.toBeUndefined();
  });
  it('branch E: the withholding gap and the AMT', async () => {
    const r = FIGURES['rsu-gap'](context(), 'rsu-gap');
    expect(r.node.textContent).toContain('$18,830 is still owed');
    setSlider(r.node, 0, 60_000);
    setSlider(r.node, 1, 20_000);
    await expect(r.done).resolves.toBeUndefined();

    const a = FIGURES.amt(context(), 'amt');
    guess(a.node, 'About $18,000');
    setSlider(a.node, 1, 20_000);
    await expect(a.done).resolves.toBeUndefined();
  });
});
