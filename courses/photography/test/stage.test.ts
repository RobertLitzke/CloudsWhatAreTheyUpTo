// The stage the depth-of-field figure is built from: where its planes land
// and how soft each one is, as the P950 would really make them.
import { describe, expect, it } from 'vitest';
import { P950, diffraction, fromEquivalent } from '../src/core/camera';
import { PERCHED, place, standFor } from '../src/core/stage';

const at = (eq: number, n = 8, behind?: number) => {
  const focal = fromEquivalent(P950, eq);
  const stand = standFor(PERCHED, focal);
  const placed = place(PERCHED, { focal, n, stand, focusAt: stand, behind });
  const get = (id: string) => placed.find((p) => p.plane.id === id)!;
  return { stand, placed, get };
};

describe('the stage', () => {
  it('keeps the bird the same share of the frame at every zoom', () => {
    for (const eq of [200, 600, 2000]) {
      const bird = at(eq).get('bird');
      // The bird is subjectTall of the plane's height; the frame is sensor h/w frame widths tall.
      const share = ((bird.top - bird.bottom) * (PERCHED.subjectTall / 0.6)) / (P950.sensor.h / P950.sensor.w);
      expect(share).toBeCloseTo(PERCHED.framing, 2);
    }
  });

  it('steps back as the lens gets longer', () => {
    expect(at(2000).stand).toBeGreaterThan(at(200).stand * 9);
  });

  it('draws planes farthest first', () => {
    const d = at(1000).placed.map((p) => p.distance);
    expect([...d].sort((a, b) => b - a)).toEqual(d);
  });

  it('leaves only diffraction on the plane it is focused on', () => {
    expect(at(1000).get('bird').blur).toBeCloseTo(diffraction(8) / P950.sensor.w, 6);
  });

  it('blurs the bushes more at a longer lens, a wider aperture and a farther background', () => {
    const base = at(1000, 8, 8).get('bushes').blur;
    expect(at(2000, 8, 8).get('bushes').blur).toBeGreaterThan(base);
    expect(at(1000, 6.3, 8).get('bushes').blur).toBeGreaterThan(base);
    expect(at(1000, 8, 30).get('bushes').blur).toBeGreaterThan(base);
  });

  it('makes the background look bigger behind the bird at a longer lens (compression)', () => {
    const ratio = (eq: number) => {
      const s = at(eq);
      const w = (id: string) => s.get(id).right - s.get(id).left;
      return w('trees') / w('bird');
    };
    expect(ratio(2000)).toBeGreaterThan(ratio(200) * 3);
  });

  it('spans a real range: bushes nearly sharp at 200 mm and melted at 2000 mm', () => {
    expect(at(200, 8, 1).get('bushes').blur).toBeLessThan(0.004);
    expect(at(2000, 6.5, 40).get('bushes').blur).toBeGreaterThan(0.02);
  });
});
