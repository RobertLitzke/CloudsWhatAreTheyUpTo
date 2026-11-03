// The sky lab's water: what the air does with its vapour, cloud, ice and rain
// in each cell, every step, and how rain and snow fall through the slice.
//
// Cloud forms or dries at once, enough to leave the air just saturated, and
// condensing gives back its heat (saturation adjustment). Below freezing the
// droplets stay liquid, supercooled, and freeze over hours near 0 °C or
// minutes near −30 °C, as the ice crystals that dust starts grow at the
// droplets' expense (the Bergeron process the seeding lessons teach: air that
// is just full for water is over-full for ice). Below −38 °C every droplet
// freezes by itself, and vapour goes straight to ice. Ice falls slowly, about
// a metre a second, and melts into rain once it is below the freezing line,
// taking its heat of melting from the air there. Warm rain is Kessler's:
// cloud water over a gram per kilogram slowly turns to rain, rain sweeps up
// cloud as it falls, and rain dries into unsaturated air at the rate Klemp
// and Wilhelmson give for a Marshall-Palmer shower.
//
// Everything is a mixing ratio, kg of water per kg of air; latent heat goes
// into potential temperature through the Exner function π, since the air's
// temperature is θ π.

import { CP, LF, LS, LV, RV, qsat } from './air';
import type { SkySim } from './sky-sim';

/** Below this, K, droplets freeze on their own, dust or no dust (−38 °C). */
export const HOMOGENEOUS_K = 235.15;
const FREEZE_K = 273.15;
/** Cloud water over this, kg/kg, turns to rain at AUTO_RATE of the excess per second (Kessler). */
const AUTO_Q = 1e-3;
const AUTO_RATE = 1e-3;
/** Rain sweeps up cloud at COLLECT · qc · qr^0.875 per second (Kessler). */
const COLLECT = 2.2;
/**
 * How long a supercooled cloud takes to turn to ice at −5 °C, s, and how many
 * degrees colder make it tenfold quicker: about 3 hours at −5 °C, 20 minutes
 * at −17 °C, 2 minutes at −29 °C.
 */
const GLACIATE_S = 10800;
const GLACIATE_DECADE_C = 12;
/** Rain carried up into air colder than this, K, freezes over about RAIN_FREEZE_S. */
const RAIN_FREEZE_K = 268.15;
const RAIN_FREEZE_S = 600;
/** Snow a degree above freezing melts over about this long, s; two degrees, half as long. */
const MELT_S = 300;

/** How fast rain falls, m/s, by how much there is, kg/kg: drizzle 4, a downpour 9. */
export const rainSpeed = (qr: number) => Math.min(9, 4 + 3000 * qr);
/** How fast ice and snow fall, m/s: cirrus wisps half a metre a second, heavy snow two. */
export const snowSpeed = (qi: number) => Math.min(2, 0.5 + 500 * qi);

/** Condensation, freezing, melting, rain and evaporation in every cell. */
export function moist(s: SkySim): void {
  const { nx, nz, dt, th, qv, qc, qi, qr, floor } = s;
  const latent = s.latentHeat ? 1 : 0;
  for (let j = 0; j < nz; j++) {
    const pi = s.pi0[j];
    const p = s.p0[j];
    const pHpa = p / 100;
    const rho = s.rho0[j];
    const th0 = s.th0[j];
    // Heating per kg of water condensed, frozen, or deposited, as potential temperature.
    const lv = (latent * LV) / (CP * pi);
    const lf = (latent * LF) / (CP * pi);
    const ls = (latent * LS) / (CP * pi);
    for (let i = 0; i < nx; i++) {
      if (j < floor[i]) continue;
      const k = i + j * nx;
      let t = (th0 + th[k]) * pi;

      // Too cold for liquid: whatever droplets are here freeze at once.
      if (t < HOMOGENEOUS_K && qc[k] > 0) {
        th[k] += lf * qc[k];
        qi[k] += qc[k];
        qc[k] = 0;
        t = (th0 + th[k]) * pi;
      }

      // Cloud forms or dries at once, enough to leave the air just saturated for water.
      if (t >= HOMOGENEOUS_K) {
        const qs = qsat(t, p);
        if (qv[k] > qs || qc[k] > 0) {
          let d = (qv[k] - qs) / (1 + (LV * LV * qs) / (CP * RV * t * t));
          if (d < -qc[k]) d = -qc[k];
          qv[k] -= d;
          qc[k] += d;
          th[k] += lv * d;
          t = (th0 + th[k]) * pi;
        }
      }

      if (t < FREEZE_K) {
        if (qc[k] > 0) {
          // Supercooled cloud glaciates: ice grows at the droplets' expense, faster the colder.
          const tau = GLACIATE_S * Math.pow(10, (t - (FREEZE_K - 5)) / GLACIATE_DECADE_C);
          const f = Math.min(qc[k], (qc[k] * dt) / tau);
          qc[k] -= f;
          qi[k] += f;
          th[k] += lf * f;
          t = (th0 + th[k]) * pi;
        } else if (qi[k] > 0 || t < HOMOGENEOUS_K) {
          // No liquid: vapour deposits onto ice, or ice dries back into unsaturated air.
          const qsi = qsat(t, p, true);
          let d = (qv[k] - qsi) / (1 + (LS * LS * qsi) / (CP * RV * t * t));
          if (d < -qi[k]) d = -qi[k];
          if (d !== 0) {
            qv[k] -= d;
            qi[k] += d;
            th[k] += ls * d;
            t = (th0 + th[k]) * pi;
          }
        }
        if (qr[k] > 0 && t < RAIN_FREEZE_K) {
          const f = Math.min(qr[k], (qr[k] * dt) / RAIN_FREEZE_S);
          qr[k] -= f;
          qi[k] += f;
          th[k] += lf * f;
          t = (th0 + th[k]) * pi;
        }
      } else if (qi[k] > 0) {
        // Snow below the freezing line melts into rain, and chills the air it melts in.
        const m = Math.min(qi[k], (qi[k] * dt * (t - FREEZE_K)) / MELT_S);
        qi[k] -= m;
        qr[k] += m;
        th[k] -= lf * m;
        t = (th0 + th[k]) * pi;
      }

      // Kessler: cloud water over a gram per kilogram slowly turns to rain; rain sweeps up cloud.
      if (qc[k] > 0) {
        const auto = AUTO_RATE * Math.max(0, qc[k] - AUTO_Q);
        const coll = qr[k] > 0 ? COLLECT * qc[k] * Math.pow(qr[k], 0.875) : 0;
        const m = Math.min(qc[k], (auto + coll) * dt);
        qc[k] -= m;
        qr[k] += m;
      }

      // Rain dries into unsaturated air and cools it (Klemp and Wilhelmson 1978).
      if (qr[k] > 0) {
        const qs = qsat(t, p);
        if (qv[k] < qs) {
          const rqr = rho * qr[k];
          const vent = 1.6 + 124.9 * Math.pow(rqr, 0.2046);
          const rate = ((1 - qv[k] / qs) * vent * Math.pow(rqr, 0.525)) / (rho * (5.4e5 + 2.55e6 / (pHpa * qs)));
          const ev = Math.min(qr[k], qs - qv[k], rate * dt);
          qr[k] -= ev;
          qv[k] += ev;
          th[k] -= lv * ev;
        }
      }
    }
  }
}

/** Rain and snow fall at their own speeds, faster when heavier, and land. */
export function fall(s: SkySim): void {
  const { nx, nz, dz, dt, qr, qi, floor } = s;
  for (let i = 0; i < nx; i++) {
    const f = floor[i];
    let rainAbove = 0;
    let snowAbove = 0;
    for (let j = nz - 1; j >= f; j--) {
      const k = i + j * nx;
      const rho = s.rho0[j];
      const rainOut = qr[k] * Math.min(1, (rainSpeed(qr[k]) * dt) / dz);
      const snowOut = qi[k] * Math.min(1, (snowSpeed(qi[k]) * dt) / dz);
      qr[k] += rainAbove - rainOut;
      qi[k] += snowAbove - snowOut;
      if (j === f) {
        // kg/m² of water is a millimetre of it.
        s.rain[i] += (rainOut + snowOut) * rho * dz;
        s.snow[i] += snowOut * rho * dz;
      } else {
        const thicker = rho / s.rho0[j - 1];
        rainAbove = rainOut * thicker;
        snowAbove = snowOut * thicker;
      }
    }
  }
}
