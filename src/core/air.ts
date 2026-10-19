// A rising parcel of air, simplified to the two rates a watcher needs.
//
// Unsaturated air cools at the dry rate, about 9.8 °C per kilometre. Its dew
// point falls too, but only by about 1.8 °C per kilometre, so the two close in
// at about 8 °C per kilometre and meet at the cloud base: roughly 125 metres
// for every degree the air started above its dew point. Above that the air is
// saturated, and condensing water warms it, so it cools at about 6 °C per
// kilometre instead.

export const DRY_RATE = 9.8 / 1000;
export const DEW_RATE = 1.8 / 1000;
export const MOIST_RATE = 6 / 1000;

/** Height in metres at which air from the ground turns to cloud. */
export function cloudBase(tempC: number, dewC: number): number {
  return Math.max(0, (tempC - dewC) / (DRY_RATE - DEW_RATE));
}

export interface Parcel {
  heightM: number;
  tempC: number;
  dewC: number;
  /** At or above the cloud base: the parcel is cloud. */
  cloud: boolean;
}

/** The parcel that left the ground at tempC and dewC, lifted to heightM. */
export function parcelAt(heightM: number, tempC: number, dewC: number): Parcel {
  const base = cloudBase(tempC, dewC);
  if (heightM < base) {
    return { heightM, tempC: tempC - DRY_RATE * heightM, dewC: dewC - DEW_RATE * heightM, cloud: false };
  }
  const atBase = tempC - DRY_RATE * base;
  const t = atBase - MOIST_RATE * (heightM - base);
  return { heightM, tempC: t, dewC: t, cloud: true };
}
