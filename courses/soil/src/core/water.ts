// How a soil holds water and lets it through, from its sand, clay and organic
// matter, by the Saxton and Rawls (2006) equations: the water it holds when
// soaked, when it has drained (field capacity), and when roots can pull no
// more (the wilting point), and how fast water soaks through it when it is
// saturated. A density factor packs the soil down (above 1) or loosens it
// (below 1), as footsteps and crumbs do. Pure TypeScript, no DOM.
//
// Saxton, K. E. and Rawls, W. J. (2006), Soil water characteristic estimates
// by texture and organic matter for hydrologic solutions. Soil Science Society
// of America Journal 70: 1569–1578.

import type { Mix } from './soil';

export interface Hydraulics {
  /** Water held at the wilting point, as a share of the soil's volume (0 to 1). */
  wilt: number;
  /** Water held at field capacity, once a soaking has drained. */
  field: number;
  /** Water held when every pore is full: the pore space. */
  saturated: number;
  /** How fast water moves through the soaked soil, in millimetres an hour. */
  ksat: number;
}

/**
 * `om` is organic matter as a percentage by weight (0 to 8, the range the
 * equations were fitted over); `density` packs the soil (1 as it is, 1.2 well
 * trodden, 0.9 loose and crumbly).
 */
export function hydraulics(mix: Mix, om: number, density = 1): Hydraulics {
  const S = mix.sand / 100;
  const C = mix.clay / 100;
  const OM = Math.max(0, Math.min(8, om));
  const t1500 = -0.024 * S + 0.487 * C + 0.006 * OM + 0.005 * S * OM - 0.013 * C * OM + 0.068 * S * C + 0.031;
  const wilt = t1500 + (0.14 * t1500 - 0.02);
  const t33 = -0.251 * S + 0.195 * C + 0.011 * OM + 0.006 * S * OM - 0.027 * C * OM + 0.452 * S * C + 0.299;
  let field = t33 + (1.283 * t33 * t33 - 0.374 * t33 - 0.015);
  const ts33 = 0.278 * S + 0.034 * C + 0.022 * OM - 0.018 * S * OM - 0.027 * C * OM - 0.584 * S * C + 0.078;
  const s33 = ts33 + (0.636 * ts33 - 0.107);
  let saturated = field + s33 - 0.097 * S + 0.043;
  if (density !== 1) {
    // Packing squeezes the big pores first: the pore space shrinks, and the
    // water held after draining shrinks by a fifth as much.
    const packed = 1 - ((1 - saturated) * 2.65 * density) / 2.65;
    field -= 0.2 * (saturated - packed);
    saturated = packed;
  }
  field = Math.max(wilt + 0.01, field);
  saturated = Math.max(field + 0.005, saturated);
  const lambda = (Math.log(field) - Math.log(wilt)) / (Math.log(1500) - Math.log(33));
  const ksat = 1930 * Math.pow(saturated - field, 3 - lambda);
  return { wilt, field, saturated, ksat };
}

/** Water a plant can use: between field capacity and the wilting point, as a share of volume. */
export const available = (h: Hydraulics): number => h.field - h.wilt;

/** The big pores that drain within a day or two and then hold air. */
export const airAfterDraining = (h: Hydraulics): number => h.saturated - h.field;

/** Millimetres of water a plant can use in a root zone `depthMm` deep. */
export const availableMm = (h: Hydraulics, depthMm: number): number => available(h) * depthMm;

// ---- Rain on a bed -------------------------------------------------------------
//
// Rain soaks in as fast as the soil lets it, and the rest pools on the top or
// runs off. Soil that starts dry takes water faster at first, pulled in by the
// dry pores, and slows towards its saturated rate; the Green and Ampt idea,
// simplified to a rate that falls from three times ksat to ksat as the first
// 20 mm go in.

export interface Storm {
  /** Millimetres of rain fallen so far. */
  rain: number;
  /** Millimetres that have soaked in. */
  soaked: number;
  /** Millimetres pooled on top or run off. */
  pooled: number;
  /** How deep the wetted soil reaches, in millimetres. */
  front: number;
}

/** A storm of `rate` mm an hour for `hours`, on soil that starts at field capacity less half its available water. */
export function storm(h: Hydraulics, rate: number, hours: number, steps = 120): Storm {
  const room = Math.max(0.01, h.saturated - (h.field - available(h) / 2));
  let soaked = 0;
  let pooled = 0;
  const dt = hours / steps;
  for (let i = 0; i < steps; i++) {
    const capacity = h.ksat * (1 + 2 * Math.max(0, 1 - soaked / 20));
    const offered = rate * dt + pooled;
    const inThisStep = Math.min(offered, capacity * dt);
    soaked += inThisStep;
    pooled = offered - inThisStep;
  }
  return { rain: rate * hours, soaked, pooled, front: soaked / room };
}

// ---- Drying out ----------------------------------------------------------------

/**
 * Days after a good soaking until a crop has used all the water it can reach
 * in a root zone `depthMm` deep, drinking `perDay` mm a day (about 5 on a warm
 * summer day, 2 in cool weather).
 */
export const daysOfWater = (h: Hydraulics, depthMm: number, perDay: number): number => availableMm(h, depthMm) / perDay;
