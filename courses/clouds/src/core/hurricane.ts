// Hurricanes, as plain numbers: how strong a warm sea can let one grow and
// how wind shear cuts it down, the wind and pressure a ship meets crossing
// one, and how high the sea is pushed up at the shore.

/** Below this, °C, the sea cannot feed a hurricane. */
export const FEED_C = 26;

/**
 * The strongest sustained wind a hurricane can reach, m/s, over a sea at
 * `seaC` with the wind changing by `shearKmh` between the bottom and the top
 * of the storm. A warmer sea feeds it more; shear tilts it and blows the heat
 * of its top away from its centre, and above about 50 km/h tears it apart.
 */
export function hurricaneWind(seaC: number, shearKmh: number): number {
  const warm = seaC < FEED_C ? Math.max(0, 6 + 2 * (seaC - 20)) : 18 + 13 * (seaC - FEED_C);
  return Math.max(0, Math.round(warm * Math.max(0, 1 - shearKmh / 50)));
}

/** The Saffir-Simpson categories, from the sustained wind in m/s. */
export function category(ms: number): string {
  if (ms >= 70) return 'Category 5';
  if (ms >= 58) return 'Category 4';
  if (ms >= 50) return 'Category 3';
  if (ms >= 43) return 'Category 2';
  if (ms >= 33) return 'Category 1';
  if (ms >= 18) return 'a tropical storm';
  return 'a tropical disturbance';
}

// ---- Crossing one ------------------------------------------------------------------

/** The radius of the strongest winds, the eyewall, km; inside the eye it falls calm. */
export const EYEWALL_KM = 30;
export const EYE_KM = 18;

/** The wind, m/s, `km` from the centre of a hurricane whose strongest wind is `top`. */
export function windAt(km: number, top = 60): number {
  const r = Math.abs(km);
  if (r < EYE_KM) return top * 0.1;
  if (r < EYEWALL_KM) return top * (0.1 + 0.9 * (r - EYE_KM) / (EYEWALL_KM - EYE_KM));
  return top * (EYEWALL_KM / r) ** 0.6;
}

/** The pressure, hPa, `km` from the centre of a hurricane `drop` hPa deeper than the 1,010 around it. */
export function pressureAt(km: number, drop = 70): number {
  const r = Math.max(1, Math.abs(km));
  return 1010 - drop * (1 - Math.exp(-((EYEWALL_KM / r) ** 1.2)));
}

// ---- Storm surge --------------------------------------------------------------------

/** How high the sea is piled up at the shore, m, by a wind of `ms` m/s blowing onshore over a shelf `shallow` (true: wide and shallow, like the Gulf) or steep. */
export const surgeM = (ms: number, shallow: boolean) => Math.round(0.0015 * ms * ms * (shallow ? 1.2 : 0.35) * 10) / 10;
