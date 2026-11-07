// @vitest-environment happy-dom
// Branch P1, Bats and people: the bridge colony model, its figure's goal, and
// the lesson's live charts (the bat bomb in order, the "I found a bat" key).
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { FIGURES } from '../src/figures';
import { bridgeNight, peakNight, SEASON_DAYS, seasonDate } from '../src/figures/people';
import { WRITTEN } from '../src/lessons';
import { click, context, guess, setSlider } from './helpers';

/** A live chart's options from this lesson's own block with that id. */
const own = (id: string) => {
  const b = WRITTEN.find((l) => l.id === 'people')!.parts.flatMap((p) => p.blocks).find((x) => isDiagram(x) && x.id === id);
  return b && isDiagram(b) ? b.options : undefined;
};

describe('P1: bats and people', () => {
  it('the bridge colony peaks in August at a few tonnes a night', () => {
    const peak = peakNight(750_000);
    expect(seasonDate(peak)).toMatch(/August/);
    const night = bridgeNight(750_000, peak);
    expect(night.bats).toBeGreaterThan(1_200_000);
    expect(night.bats).toBeLessThan(1_600_000);
    expect(night.kg / 1000).toBeGreaterThan(7);
    expect(night.kg / 1000).toBeLessThan(10);
    // A nursing mother eats more than a young bat or a mother in August.
    expect(bridgeNight(1, 130).kg).toBeGreaterThan(0.008);
    expect(bridgeNight(750_000, SEASON_DAYS).bats).toBeLessThan(150_000);
    expect(seasonDate(0)).toBe('1 March');
  });

  it('the bridge figure is done once the season passes its peak', async () => {
    const f = FIGURES['bridge-insects'](context(), 'peak');
    guess(f.node, 'August, once the young fly');
    setSlider(f.node, 0, 200);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the bat bomb goes in order', async () => {
    const o = own('timeline-live')!;
    const f = FIGURES['timeline-live'](context(), 'order', o);
    const events = [...(o.events as { at: number; label: string }[])].sort((a, b) => a.at - b.at);
    for (const e of events) click(f.node, e.label);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the found-a-bat key reaches each case', async () => {
    const f = FIGURES['id-key'](context(), 'keyed', own('id-key'));
    const paths = [
      ['Yes, or I can\'t be sure'],
      ['No, nobody was near it', 'Flying around inside the house'],
      ['No, nobody was near it', 'On the ground or a wall outside'],
      ['No, nobody was near it', 'A colony in the attic or walls', 'Late spring or summer'],
    ];
    for (const p of paths) {
      for (const step of p) click(f.node, step);
      const next = [...f.node.querySelectorAll('button')].find((b) => /next|again|start/i.test(b.textContent ?? ''));
      next?.dispatchEvent(new Event('click'));
    }
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the exclusion still draws', () => {
    expect(FIGURES.exclusion(context()).node).toBeTruthy();
  });
});
