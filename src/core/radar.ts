// What a weather radar sees. It sends out a pulse of microwaves and times the
// echo. Raindrops are far smaller than the waves (10 cm), and each one sends
// back an echo that grows with the sixth power of its diameter, so the echo
// from a patch of air is the sum of D⁶ over its drops: the reflectivity Z, in
// mm⁶ a cubic metre, told in decibels (dBZ). Ice sends back about a fifth of
// what the same weight of water would (its dielectric factor is 0.18 against
// water's 0.93).

/** Echo from ice, against the same drops of water. */
export const ICE_ECHO = 0.176 / 0.93;

/** Reflectivity in dBZ. */
export const dbz = (z: number) => 10 * Math.log10(z);

export interface Echo {
  /** Drops in each cubic metre. */
  perM3: number;
  dbz: number;
}

/** The echo from `grams` of water in a cubic metre of air, all in drops `mm` across. */
export function sameWaterEcho(mm: number, grams: number, ice = false): Echo {
  const dropGrams = 1e-3 * (Math.PI / 6) * mm ** 3;
  const perM3 = grams / dropGrams;
  return { perM3, dbz: dbz(perM3 * mm ** 6 * (ice ? ICE_ECHO : 1)) };
}

/** The echo of rain falling at this rate, from the Marshall-Palmer rule Z = 200 R^1.6. */
export function rainDbz(mmPerHour: number): number {
  return mmPerHour <= 0 ? -Infinity : dbz(200 * mmPerHour ** 1.6);
}

/** What a forecaster reads into an echo this strong. */
export function radarWords(d: number): string {
  if (d < 5) return 'too faint to show: the screen stays empty';
  if (d < 20) return 'drizzle or light snow';
  if (d < 30) return 'light rain';
  if (d < 40) return 'moderate rain';
  if (d < 50) return 'heavy rain';
  if (d < 60) return 'a downpour: a thunderstorm’s core';
  return 'hail';
}

/**
 * Echo by height in steady rain from a layer cloud, `rainDbz` at the ground.
 * Snow above the freezing level echoes a little less than the rain it becomes,
 * and less again higher up, where the flakes are smaller. Just under the
 * freezing level the flakes are melting: as big as snowflakes but coated in
 * water, so they echo like huge raindrops, about 9 dB (eight times) above the
 * rain. Once melted they shrink into drops and fall five times faster, spread
 * thinner, and the echo drops back: the bright band.
 */
export function stratiformDbz(km: number, freezeKm: number, rain: number, topKm = 7): number {
  if (km > topKm) return -Infinity;
  const snow = rain - 4 - 3 * Math.max(0, km - Math.max(freezeKm, 0));
  if (freezeKm <= 0.15 || km >= freezeKm) return snow;
  const below = freezeKm - km;
  const band = 9 * Math.exp(-(((below - 0.2) / 0.18) ** 2));
  return rain + band;
}
