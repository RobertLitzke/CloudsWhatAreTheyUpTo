// @vitest-environment happy-dom
// Lesson 7, The winter fat budget: the budget against Thomas, Dorais and
// Bergeron's numbers, the fat figure's goal, and the lesson's live charts.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { FIGURES } from '../src/figures';
import { BUDGET, dateOf, fungusRate, torporCost, winter } from '../src/figures/winter';
import { WRITTEN } from '../src/lessons';
import { click, context, guess, setSlider } from './helpers';

/** A live chart's options from this lesson's own block with that id. */
const own = (id: string) => {
  const b = WRITTEN.find((l) => l.id === 'winter')!.parts.flatMap((p) => p.blocks).find((x) => isDiagram(x) && x.id === id);
  return b && isDiagram(b) ? b.options : undefined;
};

describe('lesson 7: the winter fat budget', () => {
  it('matches the published budget', () => {
    expect(torporCost(5)).toBeCloseTo(1.6, 5);
    expect(BUDGET.arousal / torporCost(5)).toBeCloseTo(67.5, 0);
    expect(torporCost(0)).toBeGreaterThan(torporCost(3));
    expect(torporCost(12)).toBeGreaterThan(torporCost(5));
    expect(fungusRate(2)).toBe(0);
    expect(fungusRate(14)).toBeGreaterThan(fungusRate(7));
    expect(fungusRate(21)).toBe(0);
  });

  it('a healthy bat lasts the winter, with most fat spent on wakings', () => {
    const w = winter(7, 14, false);
    expect(w.diedOn).toBeNull();
    expect(w.wakings).toBe(13);
    expect(w.wakingShare).toBeGreaterThan(0.75);
    const left = w.days[w.days.length - 1].fat;
    expect(left).toBeGreaterThan(150);
    expect(left).toBeLessThan(600);
    expect(winter(5, 7, false).diedOn).not.toBeNull();
  });

  it('with white-nose the bat runs out in February at 7 °C, sooner when warmer, later when colder', () => {
    const d7 = winter(7, 14, true).diedOn!;
    expect(dateOf(d7)).toMatch(/February/);
    expect(winter(11, 14, true).diedOn!).toBeLessThan(d7);
    const cold = winter(3, 14, true);
    expect(cold.diedOn).toBeNull();
    // At worst the bat wakes every three and a half days.
    const sick = winter(13, 14, true);
    expect(sick.days[sick.days.length - 1].interval).toBeLessThan(4);
  });

  it('dates count from 15 October', () => {
    expect(dateOf(0)).toBe('15 October');
    expect(dateOf(109)).toBe('1 February');
  });

  it('the fat figure is done once a bat with white-nose runs out', async () => {
    const f = FIGURES['fat-budget'](context(), 'starve');
    guess(f.node, 'In February');
    click(f.node, 'White-nose');
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the fat figure is not done for a healthy bat', async () => {
    const f = FIGURES['fat-budget'](context(), 'starve');
    guess(f.node, 'It lasts until spring');
    setSlider(f.node, 1, 3);
    let done = false;
    void f.done!.then(() => (done = true));
    await new Promise((r) => setTimeout(r, 10));
    expect(done).toBe(false);
  });

  it('the scale guess and the spread timeline build from the lesson', async () => {
    const s = FIGURES['scale-guess'](context(), 'guess', own('scale-guess'));
    guess(s.node, '108 mg of fat');
    await expect(s.done).resolves.toBeUndefined();
    const tl = FIGURES['timeline-live'](context(), 'end', own('timeline-live'));
    expect(tl.node.textContent).toBeTruthy();
    expect(FIGURES['torpor-still'](context()).node).toBeTruthy();
  });
});
