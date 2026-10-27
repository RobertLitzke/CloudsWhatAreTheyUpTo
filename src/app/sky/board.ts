// Draws the sky lab's slice: a sky that follows the hour, the cloud water as
// flat cel-shaded cloud lit from the sun's side, rain shafts, a few motes of
// air riding the wind, and the ground with its lake, fields, forest and rock.
// Heights are stretched, as in every cross-section: the slice is 64 km wide
// and 12 km tall, drawn about four times taller than true.

import type { Ground, SkySim } from '../../core/sky-sim';

type RGB = [number, number, number];

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/** Sky colours through the day: top, middle and horizon, from the poster. */
const SKY: [number, RGB, RGB, RGB][] = [
  [0, hex('#100b22'), hex('#1e1640'), hex('#2e2354')],
  [5, hex('#100b22'), hex('#1e1640'), hex('#2e2354')],
  [6.5, hex('#2a2050'), hex('#7d3d86'), hex('#f39a78')],
  [9, hex('#3f4596'), hex('#7d78c4'), hex('#f2c1ad')],
  [13, hex('#4357ad'), hex('#8796d6'), hex('#e6d0dc')],
  [16.5, hex('#3f4596'), hex('#9a74bd'), hex('#f5bf9d')],
  [18.8, hex('#2a2050'), hex('#a8448f'), hex('#f6a06b')],
  [20.5, hex('#100b22'), hex('#1e1640'), hex('#2e2354')],
  [24, hex('#100b22'), hex('#1e1640'), hex('#2e2354')],
];

function skyAt(h: number): [RGB, RGB, RGB] {
  for (let n = 1; n < SKY.length; n++) {
    if (h <= SKY[n][0]) {
      const [h0, a0, b0, c0] = SKY[n - 1];
      const [h1, a1, b1, c1] = SKY[n];
      const t = (h - h0) / (h1 - h0);
      return [mix(a0, a1, t), mix(b0, b1, t), mix(c0, c1, t)];
    }
  }
  return [SKY[0][1], SKY[0][2], SKY[0][3]];
}

/** Cloud tones, light to dark: sunlit top, lit side, mid, belly. */
const TONES: RGB[] = [hex('#ffffff'), hex('#e4e2f0'), hex('#aaa6c6'), hex('#5f5a82')];
const TONE_NIGHT: RGB[] = [hex('#8a86b0'), hex('#6c6896'), hex('#4c4874'), hex('#302c52')];
const RAIN = hex('#d870b4');

const SKIN: Record<Ground, RGB> = {
  field: hex('#e2b15e'),
  lake: hex('#6fc3d2'),
  forest: hex('#2f6a68'),
  rock: hex('#8f7fa8'),
};
const EARTH = hex('#3b2c52');
const WET_EARTH = hex('#7a5a3e');

interface Mote {
  x: number;
  z: number;
  px: number;
  pz: number;
  age: number;
}

export class Board {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buf: HTMLCanvasElement;
  private bctx: CanvasRenderingContext2D;
  private img: ImageData | null = null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private od: Float32Array;
  /** Cloud and rain water softened across a cell or two, for drawing. */
  private qc: Float32Array;
  private qr: Float32Array;
  private tmp: Float32Array;
  private motes: Mote[] = [];
  private ripples: { x: number; z: number; t: number }[] = [];
  private groundPx: Float32Array = new Float32Array(0);

  constructor(private sim: SkySim) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sky-board';
    this.ctx = this.canvas.getContext('2d')!;
    this.buf = document.createElement('canvas');
    this.bctx = this.buf.getContext('2d')!;
    this.od = new Float32Array(sim.nx * sim.nz);
    this.qc = new Float32Array(sim.nx * sim.nz);
    this.qr = new Float32Array(sim.nx * sim.nz);
    this.tmp = new Float32Array(sim.nx * sim.nz);
    for (let n = 0; n < 110; n++) this.motes.push(this.spawn());
  }

  setSim(sim: SkySim): void {
    this.sim = sim;
    this.od = new Float32Array(sim.nx * sim.nz);
    this.qc = new Float32Array(sim.nx * sim.nz);
    this.qr = new Float32Array(sim.nx * sim.nz);
    this.tmp = new Float32Array(sim.nx * sim.nz);
    this.motes = this.motes.map(() => this.spawn());
    this.resize(this.w, this.h);
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.height = `${h}px`;
    // The cloud layer is computed at one buffer pixel per CSS pixel and scaled up smoothly.
    this.buf.width = Math.max(1, Math.round(w));
    this.buf.height = Math.max(1, Math.round(h));
    this.img = this.bctx.createImageData(this.buf.width, this.buf.height);
    const sc = this.sim.scenario;
    this.groundPx = new Float32Array(this.buf.width + 1);
    for (let x = 0; x <= this.buf.width; x++) this.groundPx[x] = this.yOf(sc.ground((x / this.buf.width) * sc.widthKm).h / 1000);
  }

  /** Height of the drawn air: sea level sits a band above the bottom, so the ground has some depth. */
  private get plot(): number {
    return this.h - Math.round(this.h * 0.06);
  }

  /** CSS px for a height in km, and the reverse. */
  private yOf(zKm: number): number {
    return this.plot * (1 - zKm / this.sim.scenario.topKm);
  }

  toKm(px: number, py: number): { x: number; z: number } {
    const sc = this.sim.scenario;
    return { x: (px / this.w) * sc.widthKm, z: (1 - py / this.plot) * sc.topKm };
  }

  ripple(xKm: number, zKm: number): void {
    this.ripples.push({ x: xKm, z: zKm, t: 0 });
  }

  private spawn(): Mote {
    const sc = this.sim.scenario;
    const x = Math.random() * sc.widthKm;
    const g = sc.ground(x).h / 1000;
    const z = g + 0.1 + Math.random() ** 1.6 * (sc.topKm * 0.8 - g);
    return { x, z, px: x, pz: z, age: Math.random() * 300 };
  }

  /** Move the motes by `seconds` of simulated wind. */
  drift(seconds: number): void {
    const s = this.sim;
    const sc = s.scenario;
    for (const m of this.motes) {
      m.px = m.x;
      m.pz = m.z;
      const cx = ((m.x * 1000) / s.dx) - 0.5;
      const cz = ((m.z * 1000) / s.dz) - 0.5;
      m.x += (s.sample(s.u, cx, cz) * seconds) / 1000;
      m.z += (s.sample(s.w, cx, cz) * seconds) / 1000;
      m.age += seconds / 60;
      const g = sc.ground(Math.min(Math.max(m.x, 0), sc.widthKm)).h / 1000;
      if (m.x < 0 || m.x > sc.widthKm || m.z < g || m.z > sc.topKm || m.age > 360) Object.assign(m, this.spawn(), { age: 0 });
    }
    for (const r of this.ripples) r.t += seconds;
    this.ripples = this.ripples.filter((r) => r.t < 240);
  }

  /** A 1-2-1 blur, three times across and once up. */
  private soften(from: Float32Array, to: Float32Array): void {
    const { nx, nz } = this.sim;
    const t = this.tmp;
    to.set(from);
    for (let pass = 0; pass < 3; pass++) {
      for (let j = 0; j < nz; j++) {
        const r = j * nx;
        for (let i = 0; i < nx; i++) {
          const a = to[r + (i > 0 ? i - 1 : 0)];
          const c = to[r + (i < nx - 1 ? i + 1 : i)];
          t[r + i] = 0.25 * a + 0.5 * to[r + i] + 0.25 * c;
        }
      }
      to.set(t);
    }
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const k = i + j * nx;
        const a = to[j > 0 ? k - nx : k];
        const c = to[j < nz - 1 ? k + nx : k];
        t[k] = 0.25 * a + 0.5 * to[k] + 0.25 * c;
      }
    }
    to.set(t);
  }

  /** Light reaching each cell from the sun, as cloud water passed through on the way. */
  private shade(sunX: number): void {
    const { nx, nz } = this.sim;
    const { od, qc } = this;
    // Horizontal cells per level toward the sun, from its height in the sky.
    const shift = sunX;
    for (let j = nz - 1; j >= 0; j--) {
      for (let i = 0; i < nx; i++) {
        const k = i + j * nx;
        let above = 0;
        if (j < nz - 1) {
          const x = Math.min(Math.max(i + shift, 0), nx - 1);
          const i0 = Math.floor(x);
          const f = x - i0;
          const i1 = Math.min(i0 + 1, nx - 1);
          above = od[i0 + (j + 1) * nx] * (1 - f) + od[i1 + (j + 1) * nx] * f;
        }
        od[k] = above + qc[k] * 1000;
      }
    }
  }

  draw(time: number): void {
    const { ctx, w, h, sim } = this;
    if (!this.img || w === 0) return;
    const hour = sim.hour();
    const sc = sim.scenario;
    const [top, mid, hor] = skyAt(hour);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, css(top));
    sky.addColorStop(0.55, css(mid));
    sky.addColorStop(1, css(hor));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // The sun (or moon) on its arc: up in the east (right) in the morning.
    const sun = sim.sunNow();
    const dayT = (hour - 6) / 12;
    const sunUp = sun > 0;
    const arcX = sunUp ? w * (0.95 - 0.9 * dayT) : w * (0.95 - 0.9 * (((hour + 12) % 24) - 6) / 12);
    const arcY = h * (0.62 - 0.5 * (sunUp ? sun : Math.max(0, Math.sin((Math.PI * (((hour + 12) % 24) - 6)) / 12))));
    ctx.fillStyle = sunUp ? css(hex('#ffd9a8'), 0.25) : 'rgba(220,214,255,0.12)';
    ctx.beginPath();
    ctx.arc(arcX, arcY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sunUp ? '#ffe2b8' : '#e6e1ff';
    ctx.beginPath();
    ctx.arc(arcX, arcY, 9, 0, Math.PI * 2);
    ctx.fill();

    // A faint board of dots, every second cell.
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    const cw = (w / sim.nx) * 2;
    const ch = (h / sim.nz) * 2;
    for (let y = ch; y < h; y += ch) for (let x = cw / 2; x < w; x += cw) ctx.fillRect(x, y, 1, 1);

    // Motes of air on the wind, each with a tail as long as a minute and a half of its travel.
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.3;
    for (const m of this.motes) {
      const a = Math.min(1, m.age / 20) * 0.32;
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      const cx = (m.x * 1000) / sim.dx - 0.5;
      const cz = (m.z * 1000) / sim.dz - 0.5;
      const x1 = (m.x / sc.widthKm) * w;
      const y1 = this.yOf(m.z);
      const x0 = x1 - ((sim.sample(sim.u, cx, cz) * 90) / 1000 / sc.widthKm) * w;
      const y0 = y1 + ((sim.sample(sim.w, cx, cz) * 90) / 1000 / sc.topKm) * h;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1 + 0.01, y1);
      ctx.stroke();
    }

    // Freezing line.
    const fz = this.yOf(sim.freezingM() / 1000);
    ctx.strokeStyle = 'rgba(190,220,255,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(0, fz);
    ctx.lineTo(w, fz);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(210,228,255,0.6)';
    ctx.font = '600 9px "Nunito Sans", system-ui, sans-serif';
    ctx.fillText('0 °C', 6, fz - 4);

    this.clouds(hour, time);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.buf, 0, 0, w, h);

    this.ground();

    // The hour, and the rain so far.
    ctx.font = '700 13px Oswald, "Nunito Sans", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,240,226,0.95)';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(20,12,40,0.75)';
    ctx.shadowBlur = 4;
    const hh = Math.floor(hour);
    const mm = String(Math.floor((hour % 1) * 60)).padStart(2, '0');
    ctx.fillText(`${hh}:${mm}`, 12, 10);
    const rain = sim.rain.reduce((a, b) => a + b, 0) / sim.nx;
    if (rain >= 0.05) {
      ctx.textAlign = 'right';
      ctx.font = '600 11px "Nunito Sans", system-ui, sans-serif';
      ctx.fillText(`${rain.toFixed(1)} mm rain`, w - 12, 11);
      ctx.textAlign = 'left';
    }
    ctx.textBaseline = 'alphabetic';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    for (const r of this.ripples) {
      const k = r.t / 240;
      ctx.strokeStyle = `rgba(255,214,170,${0.8 * (1 - k)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc((r.x / sc.widthKm) * w, this.yOf(r.z), 6 + 26 * k, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** Cloud and rain into the buffer. */
  private clouds(hour: number, time: number): void {
    const s = this.sim;
    const img = this.img!;
    const data = img.data;
    const bw = img.width;
    const bh = img.height;
    const sun = s.sunNow();
    // Sunlight slants in from the east in the morning and the west later.
    this.soften(s.qc, this.qc);
    this.soften(s.qr, this.qr);
    const elev = Math.max(0.15, sun);
    const toward = hour < 12 ? 1 : -1;
    this.shade(((toward * (1 - elev)) / Math.max(elev, 0.2)) * (s.dz / s.dx) * 1.2);
    const day = Math.min(1, sun * 3);
    const tones = TONES.map((c, n) => mix(TONE_NIGHT[n], c, day));
    const [, , hor] = skyAt(hour);
    // Low sun warms the lit tops.
    const warm = sun > 0 && sun < 0.45 ? (0.45 - sun) / 0.45 : 0;
    tones[0] = mix(tones[0], mix(hor, hex('#ffd2b0'), 0.4), warm * 0.8);
    tones[1] = mix(tones[1], hor, warm * 0.35);
    const slant = -s.windMs() * 0.05;
    const tick = time * 0.012;
    const sx = s.nx / bw;
    const plot = this.plot;
    for (let py = 0; py < bh; py++) {
      const cz = (1 - py / plot) * s.nz - 0.5;
      for (let px = 0; px < bw; px++) {
        const o = (px + py * bw) * 4;
        if (py >= this.groundPx[px]) {
          data[o + 3] = 0;
          continue;
        }
        const cx = px * sx - 0.5;
        const q = s.sample(this.qc, cx, cz) * 1000;
        if (q > 0.015) {
          const depth = s.sample(this.od, cx, cz);
          const light = Math.exp(-depth * 0.75);
          const n = light > 0.72 ? 0 : light > 0.4 ? 1 : light > 0.14 ? 2 : 3;
          const c = tones[n];
          data[o] = c[0];
          data[o + 1] = c[1];
          data[o + 2] = c[2];
          data[o + 3] = q > 0.03 ? 255 : 170;
          continue;
        }
        const r = s.sample(this.qr, cx, cz) * 1000;
        if (r > 0.03) {
          const stripe = (px + py * slant + tick * 60) % 4;
          const on = (stripe < 0 ? stripe + 4 : stripe) < 1.6;
          const a = r > 0.5 ? 0.95 : r > 0.15 ? 0.75 : 0.5;
          data[o] = RAIN[0];
          data[o + 1] = RAIN[1];
          data[o + 2] = RAIN[2];
          data[o + 3] = on ? a * 255 : a * 60;
          continue;
        }
        data[o + 3] = 0;
      }
    }
    this.bctx.putImageData(img, 0, 0);
  }

  private ground(): void {
    const { ctx, w, h, sim } = this;
    const sc = sim.scenario;
    const step = 2;
    const pts: [number, number, Ground][] = [];
    for (let x = 0; x <= w; x += step) {
      const g = sc.ground((x / w) * sc.widthKm);
      pts.push([x, this.yOf(g.h / 1000), g.kind]);
    }
    // Earth, darker where rain has soaked it.
    const earth = ctx.createLinearGradient(0, this.yOf(1.6), 0, h);
    earth.addColorStop(0, css(hex('#5b4278')));
    earth.addColorStop(1, css(EARTH));
    ctx.fillStyle = earth;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Skin by kind, a few px thick, and soaked earth under it.
    for (let n = 0; n < pts.length - 1; n++) {
      const [x, y, kind] = pts[n];
      const [x2, y2] = pts[n + 1];
      const col = Math.min(sim.nx - 1, Math.floor((x / w) * sim.nx));
      const wet = Math.min(1, sim.rain[col] / 6);
      if (kind !== 'lake' && wet > 0.02) {
        ctx.fillStyle = css(WET_EARTH, wet * 0.9);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, y2 + 10);
        ctx.lineTo(x, y + 10);
        ctx.fill();
      }
      const skin = kind === 'field' ? mix(SKIN.field, hex('#9fae4a'), wet * 0.8) : SKIN[kind];
      ctx.strokeStyle = css(skin);
      if (kind === 'lake') {
        ctx.fillStyle = css(hex('#3f8fb0'));
        ctx.fillRect(x, y - 1, x2 - x + 0.5, 7);
        ctx.fillStyle = css(SKIN.lake);
        ctx.fillRect(x, y - 1, x2 - x + 0.5, 2);
        continue;
      }
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(x, y + 1.2);
      ctx.lineTo(x2, y2 + 1.2);
      ctx.stroke();
    }
    // Trees along the forest, rows of wheat stubble on the fields, a glint on the lake.
    for (let n = 0; n < pts.length; n += 3) {
      const [x, y, kind] = pts[n];
      if (kind === 'forest') {
        ctx.fillStyle = css(SKIN.forest);
        const t = 4 + ((n * 7) % 3);
        ctx.beginPath();
        ctx.moveTo(x - 2.6, y + 1);
        ctx.lineTo(x, y - t);
        ctx.lineTo(x + 2.6, y + 1);
        ctx.fill();
      } else if (kind === 'field' && n % 2 === 0) {
        ctx.fillStyle = 'rgba(255,226,160,0.5)';
        ctx.fillRect(x, y - 2, 1, 2);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let n = 0; n < pts.length; n += 9) {
      const [x, y, kind] = pts[n];
      if (kind === 'lake') ctx.fillRect(x, y + 3, 5, 1);
    }
  }
}
