// @vitest-environment happy-dom
// Every figure the lessons name builds, and each one with a task can reach it.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { emptyProgress } from 'didactics/progress';
import { FIGURES } from '../src/figures';
import { NEPTUNE_AT } from '../src/figures/neptune';
import { WRITTEN } from '../src/lessons';

const context = () => ({ save: emptyProgress('metric'), closed: new AbortController().signal, score: () => {} });

function setSlider(node: HTMLElement, n: number, value: number): void {
  const input = node.querySelectorAll('input[type=range]')[n] as HTMLInputElement;
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

const click = (node: HTMLElement, text: string) => {
  const b = [...node.querySelectorAll('button')].find((x) => x.textContent?.trim() === text);
  if (!b) throw new Error(`no button "${text}"`);
  b.dispatchEvent(new Event('click'));
};

const guess = (node: HTMLElement, choice: string) => {
  click(node, choice);
  click(node, 'Lock it in');
};

describe('figures', () => {
  it('all build', () => {
    for (const l of WRITTEN) for (const p of l.parts) for (const b of p.blocks) {
      if (!isDiagram(b)) continue;
      const handle = FIGURES[b.id](context(), b.goal, b.options);
      expect(handle.node, `${l.id}: ${b.id}`).toBeInstanceOf(HTMLElement);
    }
  });

  it('lesson 1: the Earth’s size, the flat Earth, the half Moon', async () => {
    const sh = FIGURES.shadow(context(), 'matched');
    setSlider(sh.node, 0, 40000);
    await expect(sh.done).resolves.toBeUndefined();
    const flat = FIGURES.flat(context(), 'ruled-out');
    guess(flat.node, 'Yes, at the right height');
    setSlider(flat.node, 0, 6350);
    setSlider(flat.node, 1, 4600);
    await expect(flat.done).resolves.toBeUndefined();
    const moon = FIGURES['half-moon'](context(), 'true-angle');
    guess(moon.node, 'About twenty times farther, near 400');
    setSlider(moon.node, 0, 89.85);
    await expect(moon.done).resolves.toBeUndefined();
  });

  it('lesson 2: Mars runs backwards, and an ellipse is fast near the Sun', async () => {
    const r = FIGURES.retrograde(context(), 'backwards');
    guess(r.node, 'Narrower');
    for (let d = 0; d <= 720; d += 10) setSlider(r.node, 0, d);
    await expect(r.done).resolves.toBeUndefined();
    const e = FIGURES.ellipse(context(), 'fast-near');
    guess(e.node, 'Nearest the Sun');
    setSlider(e.node, 0, 0.6);
    await expect(e.done).resolves.toBeUndefined();
  });

  it('lesson 3: Newton’s cannon orbits, and only the inverse square closes', async () => {
    const c = FIGURES.cannon(context(), 'circle');
    guess(c.node, 'It leaves for good');
    setSlider(c.node, 0, 7.65);
    await expect(c.done).resolves.toBeUndefined();
    const law = FIGURES.law(context(), 'closed');
    setSlider(law.node, 0, 2.5);
    setSlider(law.node, 0, 2);
    await expect(law.done).resolves.toBeUndefined();
  });

  it('lesson 4: Neptune is found', async () => {
    const u = FIGURES.uranus(context(), 'found');
    guess(u.node, 'Behind Uranus, pulling it back');
    setSlider(u.node, 0, Math.round(((NEPTUNE_AT % 360) + 360) % 360));
    for (let m = 5; m <= 40 && !u.node.textContent?.includes('That fits'); m += 0.5) setSlider(u.node, 1, m);
    await expect(u.done).resolves.toBeUndefined();
  });

  it('lesson 5: 61 Cygni’s parallax', async () => {
    const p = FIGURES.parallax(context(), 'bessel');
    guess(p.node, 'It halves');
    setSlider(p.node, 0, 11.4);
    await expect(p.done).resolves.toBeUndefined();
  });

  it('lesson 6: cool gas makes dark lines, and five elements explain the Sun', async () => {
    const b = FIGURES.bench(context(), 'dark-lines');
    guess(b.node, 'A dark gap');
    await expect(b.done).resolves.toBeUndefined();
    const s = FIGURES['sun-lines'](context(), 'all-matched');
    for (const e of ['Hydrogen', 'Sodium', 'Magnesium', 'Iron', 'Calcium']) click(s.node, e);
    await expect(s.done).resolves.toBeUndefined();
  });

  it('lesson 7: glow goes red and blue, never green', async () => {
    const g = FIGURES.glow(context(), 'no-green');
    guess(g.node, 'White');
    setSlider(g.node, 0, Math.log10(3000));
    setSlider(g.node, 0, Math.log10(15000));
    await expect(g.done).resolves.toBeUndefined();
  });

  it('lesson 8: hydrogen peaks near 10,000 K', async () => {
    const l = FIGURES.lines(context(), 'peak');
    guess(l.node, 'The Sun is too cool to show its hydrogen');
    setSlider(l.node, 0, Math.log10(9800));
    await expect(l.done).resolves.toBeUndefined();
  });

  it('lesson 9: Betelgeuse is a supergiant', async () => {
    const h = FIGURES.hr(context(), 'betelgeuse');
    guess(h.node, 'Hundreds of times wider than the Sun');
    setSlider(h.node, 0, Math.log10(3600));
    setSlider(h.node, 1, 2.9);
    await expect(h.done).resolves.toBeUndefined();
  });

  it('lesson 10: fusion lasts long enough, and the Sun keeps itself steady', async () => {
    const f = FIGURES.fuel(context(), 'fusion');
    guess(f.node, 'About twice the age of the Earth');
    setSlider(f.node, 0, -3.14);
    await expect(f.done).resolves.toBeUndefined();
    const th = FIGURES.thermostat(context(), 'steady');
    setSlider(th.node, 0, 0.1);
    click(th.node, 'The star can swell');
    await expect(th.done).resolves.toBeUndefined();
  });
});
