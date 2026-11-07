// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { channelAt, channelLength, fallPerKm, saltReach } from '../src/figures/duwamish';
import { click, context, guess, setSlider } from './helpers';

describe('S3 duwamish', () => {
  it('the waterway replaced about nine miles of meanders with about five', () => {
    // The lower 8 km of valley: about 14 km of old river, 8 km of waterway.
    expect(channelLength('old', 8)).toBeCloseTo(14.4, 1);
    expect(channelLength('now', 8)).toBeCloseTo(8, 1);
    expect(fallPerKm('now')).toBeGreaterThan(fallPerKm('old') * 1.3);
    expect(channelAt('now', 2).bed).toBeLessThan(channelAt('old', 2).bed - 5);
  });

  it('salt reaches farther at low flow, and farther up the waterway than the old river', () => {
    for (const era of ['old', 'now'] as const) expect(saltReach(era, 10)).toBeGreaterThan(saltReach(era, 200));
    expect(saltReach('now', 10)).toBeGreaterThan(saltReach('old', 10) + 3);
    // A big river in the old shallow channel keeps the sea at the mouth.
    expect(saltReach('old', 150)).toBeLessThan(0.5);
    // Today's waterway at low flow: salt to the head of the dredging or beyond.
    expect(saltReach('now', 10)).toBeGreaterThan(8);
  });

  it('the channel figure is done once both channels are seen at a low flow', async () => {
    for (const units of ['metric', 'imperial'] as const) {
      const f = FIGURES['duwamish-channel'](context(units), 'compare');
      guess(f.node, 'Much farther');
      setSlider(f.node, 0, 10);
      click(f.node, 'Today: the waterway');
      await expect(f.done).resolves.toBeUndefined();
    }
  });
});
