// @vitest-environment happy-dom
// The skies over the forecast questions: every panel draws, and an overcast
// hides the sun, as the questions describe it.

import { describe, expect, it } from 'vitest';
import { forecastPicture } from '../src/app/figures/quizzes';
import { forecastSky } from '../src/app/scene/forecast-sky';
import { SHIFTS, type Forecast } from '../src/core/shifts';

const items: Forecast[] = SHIFTS.flatMap((s) => s.parts.flatMap((p) => p.blocks.flatMap((b) =>
  b.kind === 'figure' && b.figure === 'check' ? (b.options!.items as Forecast[]) : []))).filter((q) => q.sky || q.profile);

describe('forecast skies', () => {
  it('draw every question', () => {
    expect(items.length).toBeGreaterThan(30);
    for (const q of items) {
      const node = forecastPicture(q);
      expect(node.matches('svg') || !!node.querySelector('svg'), q.question).toBe(true);
    }
  });

  it('hide the sun behind stratus and nimbostratus, and show it dim through altostratus', () => {
    const sunDiscs = (svg: SVGSVGElement) => svg.querySelectorAll('circle[r="17"]').length;
    expect(sunDiscs(forecastSky({ when: 'noon' }, 0))).toBe(1);
    expect(sunDiscs(forecastSky({ genus: 'nimbostratus', when: 'noon' }, 0))).toBe(0);
    expect(sunDiscs(forecastSky({ genus: 'stratus', when: 'noon' }, 0))).toBe(0);
    expect(forecastSky({ genus: 'altostratus', when: 'noon' }, 0).querySelector('circle[r="15"]')).toBeTruthy();
  });
});
