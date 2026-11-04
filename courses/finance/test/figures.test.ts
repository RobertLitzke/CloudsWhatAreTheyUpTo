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
});
