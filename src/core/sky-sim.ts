// The sky lab's weather: a side-on slice of air, a few kilometres high and a
// few tens wide, over a landscape. Nothing in it is told to make a cloud. The
// ground warms the air above it and the lake and fields wet it; warm air is
// lighter than the air around it, so it rises; rising air cools, and once it
// is cooled to its dew point the extra water condenses into cloud, which
// gives back its heat and keeps the cloud rising. Cloud water that collects
// long enough turns to rain, which falls, and dries back into the air below
// if that air is dry. Wind carries all of it, and the ground turns it upward.
//
// The physics, for the curious: a two-dimensional Boussinesq atmosphere in
// vorticity and streamfunction form (the flow can't pile up, so a column of
// numbers per cell is enough), potential temperature so dry air keeps its
// value as it rises, saturation adjustment for cloud, and Kessler's warm rain
// (autoconversion, collection, evaporation). Ice is left out: anything above
// the freezing line is still drawn as cloud, it just doesn't snow.

import { makeRng } from 'lesson-kit/rng';

const G = 9.81;
const CP = 1004;
const RD = 287;
const RV = 461.5;
const LV = 2.5e6;

export type Ground = 'field' | 'lake' | 'forest' | 'rock';

export interface Controls {
  /** How strongly the sun heats the ground, 0 to 3. */
  sun: number;
  /** How damp the air and ground are, 0 to 3. */
  moisture: number;
  /** Wind from the west (+) or east (-), -2 to 2. */
  wind: number;
  /** 0 stable, 1 average, 2 unstable. */
  stability: number;
}

export interface Scenario {
  id: string;
  name: string;
  widthKm: number;
  topKm: number;
  /** Ground height in metres and its kind, across the slice from the west edge. The edges must be flat. */
  ground: (xKm: number) => { h: number; kind: Ground };
  start: Controls;
  /** Hour of day the run begins. */
  startHour: number;
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'ridge',
    name: 'Lake and ridge',
    widthKm: 40,
    topKm: 12,
    ground: (x) => {
      const ridge = 1500 * Math.exp(-(((x - 24) / 6) ** 2));
      const foot = 160 * Math.exp(-(((x - 33) / 3) ** 2));
      const h = ridge + foot;
      if (x > 4 && x < 13) return { h: 0, kind: 'lake' };
      if (h > 900) return { h, kind: 'rock' };
      if (h > 250) return { h, kind: 'forest' };
      return { h, kind: 'field' };
    },
    start: { sun: 2, moisture: 2, wind: 0, stability: 1 },
    startHour: 9.5,
  },
];

export const LEVELS = {
  sun: 3,
  moisture: 3,
  wind: 2,
  stability: 2,
} as const;

/** Wind speed in m/s for each wind notch. */
const WIND = 5;
/** Potential temperature gain per km for stable, average, unstable air. */
const THETA_RATE = [6, 3.6, 2.2];
/** Relative humidity at the ground for each moisture notch. */
const GROUND_RH = [0.3, 0.5, 0.68, 0.82];
const TROPOPAUSE_M = 10000;
/** Sensible heat the sun puts into each kind of ground at noon, at full sun, W/m². */
const HEAT: Record<Ground, number> = { field: 380, rock: 420, forest: 280, lake: 30 };
/** Evaporation from each kind of ground at noon, as latent heat W/m², at moisture 3. */
const WET: Record<Ground, number> = { field: 90, rock: 20, forest: 140, lake: 260 };

export function qsat(tK: number, pPa: number): number {
  const es = 611.2 * Math.exp((17.67 * (tK - 273.15)) / (tK - 29.65));
  return (0.622 * es) / Math.max(pPa - es, 1);
}

export interface SkyOptions {
  /** Cells across and up. */
  nx?: number;
  nz?: number;
  /** Seconds per step. */
  dt?: number;
  seed?: number;
}

export class SkySim {
  readonly nx: number;
  readonly nz: number;
  readonly dx: number;
  readonly dz: number;
  readonly dt: number;
  readonly scenario: Scenario;
  controls: Controls;
  /** Condensing cloud warms the air; turn off to see what storms are without it. */
  latentHeat = true;
  /** Seconds since the run began. */
  t = 0;

  /** Base state by level. */
  readonly th0: Float64Array;
  readonly qv0: Float64Array;
  readonly pi0: Float64Array;
  readonly p0: Float64Array;
  readonly rho0: Float64Array;

  /** Fields by cell, index i + j * nx, j = 0 at the bottom. */
  th: Float32Array; // potential temperature minus the base state, K
  qv: Float32Array; // water vapour, kg/kg
  qc: Float32Array; // cloud water, kg/kg
  qr: Float32Array; // rain water, kg/kg
  eta: Float32Array; // vorticity, 1/s
  psi: Float32Array; // streamfunction, m²/s
  u: Float32Array;
  w: Float32Array;

  /** Lowest air cell in each column, and the ground under it. */
  readonly floor: Int32Array;
  readonly heightM: Float64Array;
  readonly kind: Ground[];
  /** Rain that has reached the ground in each column, mm. */
  readonly rain: Float64Array;
  /** Each column's lasting share of the sun, so thermals start in different places. */
  private readonly patch: Float64Array;
  private scratch: Float32Array;
  private depX: Float32Array;
  private depY: Float32Array;
  private rng: () => number;

  constructor(scenario: Scenario, controls: Controls = scenario.start, opts: SkyOptions = {}) {
    this.scenario = scenario;
    this.controls = { ...controls };
    this.nx = opts.nx ?? 128;
    this.nz = opts.nz ?? 48;
    this.dt = opts.dt ?? 5;
    this.dx = (scenario.widthKm * 1000) / this.nx;
    this.dz = (scenario.topKm * 1000) / this.nz;
    const n = this.nx * this.nz;
    this.th = new Float32Array(n);
    this.qv = new Float32Array(n);
    this.qc = new Float32Array(n);
    this.qr = new Float32Array(n);
    this.eta = new Float32Array(n);
    this.psi = new Float32Array(n);
    this.u = new Float32Array(n);
    this.w = new Float32Array(n);
    this.scratch = new Float32Array(n);
    this.depX = new Float32Array(n);
    this.depY = new Float32Array(n);
    this.th0 = new Float64Array(this.nz);
    this.qv0 = new Float64Array(this.nz);
    this.pi0 = new Float64Array(this.nz);
    this.p0 = new Float64Array(this.nz);
    this.rho0 = new Float64Array(this.nz);
    this.floor = new Int32Array(this.nx);
    this.heightM = new Float64Array(this.nx);
    this.kind = [];
    this.rain = new Float64Array(this.nx);
    this.patch = new Float64Array(this.nx);
    this.rng = makeRng(opts.seed ?? 7);

    for (let i = 0; i < this.nx; i++) {
      const g = scenario.ground(((i + 0.5) * this.dx) / 1000);
      this.heightM[i] = g.h;
      this.kind.push(g.kind);
      this.floor[i] = Math.min(this.nz - 4, Math.max(0, Math.round(g.h / this.dz)));
    }
    // Smooth random patches of better and worse heating, a few km across.
    let a = 0;
    for (let i = 0; i < this.nx; i++) {
      a = 0.7 * a + 0.3 * (this.rng() * 2 - 1);
      this.patch[i] = Math.max(0.3, 1 + 1.6 * a);
    }
    this.setBase(true);
    for (let j = 0; j < this.nz; j++) {
      for (let i = 0; i < this.nx; i++) {
        const k = i + j * this.nx;
        this.qv[k] = this.qv0[j];
        if (j < 6) this.th[k] = (this.rng() - 0.5) * 0.2;
      }
    }
    this.addWind(this.windMs());
    this.solvePsi(60);
    this.winds();
  }

  zOf(j: number): number {
    return (j + 0.5) * this.dz;
  }

  hour(): number {
    return (this.scenario.startHour + this.t / 3600) % 24;
  }

  /** The base state from the controls. On a change, keep what has happened and move the background under it. */
  setBase(first = false): void {
    const { stability, moisture } = this.controls;
    const rate = THETA_RATE[stability] / 1000;
    const old = Float64Array.from(this.qv0);
    let pi = 1;
    const thS = 298;
    for (let j = 0; j < this.nz; j++) {
      const z = this.zOf(j);
      const th = z < TROPOPAUSE_M ? thS + rate * z : thS + rate * TROPOPAUSE_M + 0.016 * (z - TROPOPAUSE_M);
      // Exner function, stepped up from the ground.
      if (j === 0) pi = 1 - (G * z) / (CP * th);
      else pi -= (G * this.dz) / (CP * th);
      this.th0[j] = th;
      this.pi0[j] = pi;
      this.p0[j] = 1e5 * Math.pow(pi, CP / RD);
      this.rho0[j] = this.p0[j] / (RD * th * pi);
      const rh = Math.max(0.05, GROUND_RH[moisture] * (1 - (0.75 * Math.min(z, TROPOPAUSE_M)) / TROPOPAUSE_M));
      this.qv0[j] = z > TROPOPAUSE_M ? 1e-5 : rh * qsat(th * pi, this.p0[j]);
    }
    if (!first) {
      for (let j = 0; j < this.nz; j++) {
        const d = this.qv0[j] - old[j];
        for (let i = 0; i < this.nx; i++) {
          const k = i + j * this.nx;
          this.qv[k] = Math.max(0, this.qv[k] + d);
        }
      }
    }
  }

  /** Set the controls. Sun and wind act at once; moisture and stability move the background air. */
  set(next: Partial<Controls>): void {
    const before = this.controls;
    this.controls = { ...before, ...next };
    if (this.controls.moisture !== before.moisture || this.controls.stability !== before.stability) this.setBase();
    if (this.controls.wind !== before.wind) this.addWind((this.controls.wind - before.wind) * WIND);
  }

  /** Warm a round bubble of air, as a fire or a sunny field would, centred at (xKm, zKm). */
  bubble(xKm: number, zKm: number, kelvin = 3, radiusKm = 1.6): void {
    for (let j = 0; j < this.nz; j++) {
      for (let i = 0; i < this.nx; i++) {
        if (j < this.floor[i]) continue;
        const dxk = ((i + 0.5) * this.dx) / 1000 - xKm;
        const dzk = this.zOf(j) / 1000 - zKm;
        const r2 = (dxk * dxk) / (radiusKm * radiusKm) + (dzk * dzk) / (0.5 * radiusKm) ** 2;
        if (r2 < 1) {
          const k = i + j * this.nx;
          const f = Math.cos((Math.sqrt(r2) * Math.PI) / 2) ** 2;
          this.th[k] += kelvin * f;
          // A fire's bubble is damp air from the ground: bring it toward the ground's humidity.
          this.qv[k] += f * 0.3 * Math.max(0, this.qv0[this.floor[i]] - this.qv[k]);
        }
      }
    }
  }

  /** The sun's strength now, 0 to 1. */
  sunNow(): number {
    const h = this.hour();
    return Math.max(0, Math.sin((Math.PI * (h - 6)) / 12));
  }

  step(): void {
    this.departures();
    // Advect the whole potential temperature, so air that rises keeps its own.
    this.shiftTheta(1);
    this.advect(this.th, 0);
    this.shiftTheta(-1);
    this.advect(this.qv, 1);
    this.advect(this.qc, 2);
    this.advect(this.qr, 2);
    this.advect(this.eta, 2);
    this.surface();
    this.microphysics();
    this.fall();
    this.buoyancy();
    this.edges();
    this.solvePsi(6);
    this.winds();
    this.t += this.dt;
  }

  private shiftTheta(sign: 1 | -1): void {
    const { nx, nz, th } = this;
    for (let j = 0; j < nz; j++) {
      const d = sign * this.th0[j];
      for (let i = 0; i < nx; i++) th[i + j * nx] += d;
    }
  }

  /** Mean wind, m/s, positive toward the east. */
  windMs(): number {
    return this.controls.wind * WIND;
  }

  /**
   * Add a change of mean wind to the whole streamfunction. ψ is zero half a
   * cell below the lowest centre, as it is in the solve; the top carries the
   * mean wind, and the sides are left open (each copies its neighbour), so
   * air piled up against the ridge isn't forced back to the mean at the edge.
   */
  private addWind(dU: number): void {
    const { nx, nz, floor } = this;
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) if (j >= floor[i]) this.psi[i + j * nx] += dU * (j + 1 - floor[i]) * this.dz;
    }
  }

  /** Line relaxation: each column is a tridiagonal solve, since cells are much flatter than wide. */
  private solvePsi(iters: number): void {
    const { nx, nz, dx, dz, psi, eta, floor } = this;
    const ax = 1 / (dx * dx);
    const az = 1 / (dz * dz);
    const top = this.windMs() * (nz + 1) * dz;
    const cp = new Float64Array(nz);
    const dp = new Float64Array(nz);
    const omega = 1.6;
    for (let it = 0; it < iters; it++) {
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 1 + pass; i < nx - 1; i += 2) {
          const f = floor[i];
          // Solve az ψ[j-1] - 2(ax+az) ψ[j] + az ψ[j+1] = η - ax (ψE + ψW).
          const b = -2 * (ax + az);
          for (let j = f; j < nz; j++) {
            const k = i + j * nx;
            const e = j >= floor[i + 1] ? psi[k + 1] : 0;
            const wv = j >= floor[i - 1] ? psi[k - 1] : 0;
            let r = eta[k] - ax * (e + wv);
            if (j === nz - 1) r -= az * top;
            const lo = j === f ? 0 : az;
            const hi = j === nz - 1 ? 0 : az;
            if (j === f) {
              cp[j] = hi / b;
              dp[j] = r / b;
            } else {
              const m = b - lo * cp[j - 1];
              cp[j] = hi / m;
              dp[j] = (r - lo * dp[j - 1]) / m;
            }
          }
          let next = 0;
          for (let j = nz - 1; j >= f; j--) {
            const v = j === nz - 1 ? dp[j] : dp[j] - cp[j] * next;
            const k = i + j * nx;
            psi[k] += omega * (v - psi[k]);
            next = v;
          }
          for (let j = 0; j < f; j++) psi[i + j * nx] = 0;
        }
      }
      for (let j = 0; j < nz; j++) {
        psi[j * nx] = psi[1 + j * nx];
        psi[nx - 1 + j * nx] = psi[nx - 2 + j * nx];
      }
    }
  }

  private winds(): void {
    const { nx, nz, dx, dz, psi, u, w, floor } = this;
    const top = this.windMs() * (nz + 1) * dz;
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const k = i + j * nx;
        if (j < floor[i]) {
          u[k] = 0;
          w[k] = 0;
          continue;
        }
        const up = j === nz - 1 ? top : psi[k + nx];
        const dn = j === floor[i] ? 0 : psi[k - nx];
        // The ground is half a cell below the first cell's centre.
        u[k] = j === floor[i] ? (up - dn) / (1.5 * dz) : (up - dn) / (2 * dz);
        const e = i === nx - 1 ? psi[k] : j >= floor[i + 1] ? psi[k + 1] : 0;
        const wv = i === 0 ? psi[k] : j >= floor[i - 1] ? psi[k - 1] : 0;
        w[k] = -(e - wv) / (2 * dx);
      }
    }
  }

  /** Bilinear value of a field at a point in cell coordinates, kept inside its four corners. */
  sample(f: Float32Array, x: number, y: number): number {
    const { nx, nz } = this;
    x = Math.min(Math.max(x, 0), nx - 1.001);
    y = Math.min(Math.max(y, 0), nz - 1.001);
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    const k = i + j * nx;
    const a = f[k];
    const b = f[k + 1];
    const c = f[k + nx];
    const d = f[k + nx + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  /**
   * Catmull-Rom value at a point, kept within the four nearest cells so it
   * never makes new highs or lows. Bilinear smears a slow thermal out within
   * minutes; this keeps it a thermal.
   */
  private cubic(f: Float32Array, x: number, y: number): number {
    const { nx, nz } = this;
    const i = Math.floor(x);
    const j = Math.floor(y);
    const tx = x - i;
    const ty = y - j;
    const wx0 = ((-tx + 2) * tx - 1) * tx * 0.5;
    const wx1 = ((3 * tx - 5) * tx * tx + 2) * 0.5;
    const wx2 = ((-3 * tx + 4) * tx + 1) * tx * 0.5;
    const wx3 = (tx - 1) * tx * tx * 0.5;
    const i0 = i > 0 ? i - 1 : 0;
    const i2 = i + 1 < nx ? i + 1 : nx - 1;
    const i3 = i + 2 < nx ? i + 2 : nx - 1;
    let v = 0;
    for (let n = -1; n <= 2; n++) {
      const jj = Math.min(Math.max(j + n, 0), nz - 1) * nx;
      const row = wx0 * f[i0 + jj] + wx1 * f[i + jj] + wx2 * f[i2 + jj] + wx3 * f[i3 + jj];
      const wy = n === -1 ? ((-ty + 2) * ty - 1) * ty * 0.5 : n === 0 ? ((3 * ty - 5) * ty * ty + 2) * 0.5 : n === 1 ? ((-3 * ty + 4) * ty + 1) * ty * 0.5 : (ty - 1) * ty * ty * 0.5;
      v += wy * row;
    }
    const k = i + j * nx;
    const a = f[k];
    const b = f[i2 + j * nx];
    const c = f[k + nx];
    const d = f[i2 + j * nx + nx];
    const lo = Math.min(a, b, c, d);
    const hi = Math.max(a, b, c, d);
    return v < lo ? lo : v > hi ? hi : v;
  }

  /**
   * Semi-Lagrangian advection: each cell takes the value from where its air
   * was a step ago. kind 0 is temperature and 1 vapour (both are
   * extended into the ground from the cell above it so the air near the
   * ground reads sensibly); 2 is anything that is zero in the ground.
   */
  private advect(f: Float32Array, kind: 0 | 1 | 2): void {
    const { nx, nz, floor } = this;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < floor[i]; j++) {
        const k = i + j * nx;
        f[k] = kind === 2 ? 0 : f[i + floor[i] * nx];
      }
    }
    const out = this.scratch;
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const k = i + j * nx;
        if (j < floor[i]) {
          out[k] = f[k];
          continue;
        }
        out[k] = this.cubic(f, this.depX[k], this.depY[k]);
      }
    }
    f.set(out);
  }

  /** Where each cell's air was a step ago, in cell coordinates (midpoint rule). */
  private departures(): void {
    const { nx, nz, dx, dz, dt, u, w, floor } = this;
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const k = i + j * nx;
        if (j < floor[i]) continue;
        let x = i - (u[k] * dt) / dx / 2;
        let y = j - (w[k] * dt) / dz / 2;
        const um = this.sample(u, x, y);
        const wm = this.sample(w, x, y);
        x = i - (um * dt) / dx;
        y = j - (wm * dt) / dz;
        if (y < floor[i] - 0.5) y = floor[i] - 0.5;
        this.depX[k] = Math.min(Math.max(x, 0), nx - 1.001);
        this.depY[k] = Math.min(Math.max(y, 0), nz - 1.001);
      }
    }
  }

  private surface(): void {
    const { nx, dz, dt, controls } = this;
    const sun = this.sunNow();
    const h = this.hour();
    const night = sun === 0 || h < 7 || h > 18;
    for (let i = 1; i < nx - 1; i++) {
      const j = this.floor[i];
      const k = i + j * nx;
      const kind = this.kind[i];
      // Cloud overhead shades the ground.
      let shade = 0;
      for (let jj = j; jj < this.nz; jj++) shade += this.qc[i + jj * nx];
      const lit = Math.exp(-shade * 900);
      let heat = (controls.sun / 3) * HEAT[kind] * sun * lit * this.patch[i];
      if (night) heat -= kind === 'lake' ? 5 : 35;
      const rho = this.rho0[j];
      this.th[k] += ((heat / (rho * CP * dz)) * dt) / this.pi0[j];
      // Turbulent flicker over warm ground, which is what sets thermals off.
      if (heat > 0) this.th[k] += (this.rng() - 0.5) * 0.06 * (heat / 300);
      const wet = (0.25 + controls.moisture / 4) * WET[kind] * (0.25 + 0.75 * sun) + Math.min(this.rain[i], 5) * 8 * sun;
      const t = (this.th0[j] + this.th[k]) * this.pi0[j];
      const room = qsat(t, this.p0[j]) - this.qv[k];
      if (room > 0) this.qv[k] += Math.min(room, ((wet / LV / (rho * dz)) * dt));
      // Mix the bottom two cells so heat doesn't pile up in one sliver.
      const k2 = k + nx;
      const mth = 0.5 * (this.th[k] + this.th[k2]);
      const mqv = 0.5 * (this.qv[k] + this.qv[k2]);
      this.th[k] += 0.1 * (mth - this.th[k]);
      this.th[k2] += 0.1 * (mth - this.th[k2]);
      this.qv[k] += 0.1 * (mqv - this.qv[k]);
      this.qv[k2] += 0.1 * (mqv - this.qv[k2]);
    }
  }

  private microphysics(): void {
    const { nx, nz, dt, th, qv, qc, qr, floor } = this;
    const latent = this.latentHeat ? 1 : 0;
    for (let j = 0; j < nz; j++) {
      const pi = this.pi0[j];
      const p = this.p0[j];
      const th0 = this.th0[j];
      const lcp = LV / (CP * pi);
      for (let i = 0; i < nx; i++) {
        if (j < floor[i]) continue;
        const k = i + j * nx;
        let t = (th0 + th[k]) * pi;
        let qs = qsat(t, p);
        // Cloud forms or dries at once, enough to leave the air just saturated.
        if (qv[k] > qs || qc[k] > 0) {
          let d = (qv[k] - qs) / (1 + (LV * LV * qs) / (CP * RV * t * t));
          if (d < -qc[k]) d = -qc[k];
          qv[k] -= d;
          qc[k] += d;
          th[k] += latent * lcp * d;
          t = (th0 + th[k]) * pi;
          qs = qsat(t, p);
        }
        // Kessler: cloud water over 0.5 g/kg slowly turns to rain; rain sweeps up cloud.
        if (qc[k] > 0) {
          const auto = 1e-3 * Math.max(0, qc[k] - 5e-4);
          const coll = qr[k] > 0 ? 2.2 * qc[k] * Math.pow(qr[k], 0.875) : 0;
          const m = Math.min(qc[k], (auto + coll) * dt);
          qc[k] -= m;
          qr[k] += m;
        }
        // Rain dries into unsaturated air and cools it.
        if (qr[k] > 0 && qv[k] < qs) {
          const ev = Math.min(qr[k], qs - qv[k], 4e-3 * (1 - qv[k] / qs) * Math.sqrt(qr[k] * 1e-3) * dt);
          qr[k] -= ev;
          qv[k] += ev;
          th[k] -= latent * lcp * ev;
        }
      }
    }
  }

  /** Rain falls at its own speed, faster when heavier, and lands. */
  private fall(): void {
    const { nx, nz, dz, dt, qr, floor } = this;
    for (let i = 0; i < nx; i++) {
      const f = floor[i];
      let fromAbove = 0;
      for (let j = nz - 1; j >= f; j--) {
        const k = i + j * nx;
        const v = Math.min(9, 4 + 3000 * qr[k]);
        const frac = Math.min(1, (v * dt) / dz);
        const out = qr[k] * frac;
        qr[k] += fromAbove - out;
        fromAbove = out * (this.rho0[j] / this.rho0[Math.max(j - 1, 0)]);
        if (j === f) this.rain[i] += out * this.rho0[j] * dz; // kg/m² = mm
      }
    }
  }

  private buoyancy(): void {
    const { nx, nz, dx, dt, th, qv, qc, qr, eta, floor } = this;
    const b = this.scratch;
    for (let j = 0; j < nz; j++) {
      const inv = 1 / this.th0[j];
      for (let i = 0; i < nx; i++) {
        const k = i + j * nx;
        b[k] = j < floor[i] ? 0 : G * (th[k] * inv + 0.61 * (qv[k] - this.qv0[j]) - qc[k] - qr[k]);
      }
    }
    const spongeFrom = nz - 8;
    for (let j = 0; j < nz; j++) {
      const damp = j >= spongeFrom ? 1 - (dt / 400) * ((j - spongeFrom + 1) / 8) : 1 - dt / 20000;
      for (let i = 1; i < nx - 1; i++) {
        const k = i + j * nx;
        if (j < floor[i]) {
          eta[k] = 0;
          continue;
        }
        const e = j >= floor[i + 1] ? b[k + 1] : b[k];
        const wv = j >= floor[i - 1] ? b[k - 1] : b[k];
        eta[k] = (eta[k] - ((e - wv) / (2 * dx)) * dt) * damp;
        if (j >= spongeFrom) th[k] *= damp;
      }
    }
    // A little smoothing across, as turbulence would, so no single column runs away.
    const s = this.scratch;
    for (let j = 0; j < nz; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const k = i + j * nx;
        s[k] = 0.25 * eta[k - 1] + 0.5 * eta[k] + 0.25 * eta[k + 1];
      }
      for (let i = 1; i < nx - 1; i++) {
        const k = i + j * nx;
        eta[k] = eta[k] + 0.02 * (s[k] - eta[k]);
      }
    }
  }

  /** The air at the edges eases back to the background, so the wind brings fresh air in. */
  private edges(): void {
    const { nx, nz } = this;
    const width = 5;
    for (let j = 0; j < nz; j++) {
      for (let n = 0; n < width; n++) {
        const r = 0.08 * (1 - n / width);
        for (const i of [n, nx - 1 - n]) {
          const k = i + j * nx;
          this.th[k] -= r * this.th[k];
          this.qv[k] += r * (this.qv0[j] - this.qv[k]);
          this.qc[k] -= r * this.qc[k];
          this.qr[k] -= r * this.qr[k];
          this.eta[k] -= r * this.eta[k];
        }
      }
      this.eta[j * nx] = 0;
      this.eta[nx - 1 + j * nx] = 0;
    }
  }

  /** Air temperature in °C at a cell. */
  tempC(i: number, j: number): number {
    return (this.th0[j] + this.th[i + j * this.nx]) * this.pi0[j] - 273.15;
  }

  /** Height in metres where the background air is at 0 °C. */
  freezingM(): number {
    for (let j = 0; j < this.nz; j++) if (this.th0[j] * this.pi0[j] < 273.15) return this.zOf(j);
    return this.nz * this.dz;
  }

  /** Totals for the gauges and tests. */
  totals(): { cloud: number; rain: number; topM: number; maxW: number } {
    let cloud = 0;
    let topM = 0;
    let maxW = 0;
    for (let j = 0; j < this.nz; j++) {
      for (let i = 0; i < this.nx; i++) {
        const k = i + j * this.nx;
        cloud += this.qc[k] * this.rho0[j] * this.dz * this.dx;
        if (this.qc[k] > 1e-5) topM = Math.max(topM, (j + 1) * this.dz);
        maxW = Math.max(maxW, this.w[k]);
      }
    }
    let rain = 0;
    for (let i = 0; i < this.nx; i++) rain += this.rain[i];
    return { cloud, rain: rain / this.nx, topM, maxW };
  }
}
