// The one sound the native Web Audio nodes cannot make: a plucked string
// (branch lesson O3). Karplus and Strong's string is a delay line one period
// long, filled with a burst of noise and fed back through a gentle low-pass,
// so the burst goes round and round, settling into a tone that darkens and
// dies away. A DelayNode in a feedback loop cannot be shorter than 128
// samples, too long for any note above about 350 Hz, so the loop runs here,
// one sample at a time, in an AudioWorklet.
//
// The processor's source is a string turned into a module, so the one-file
// build needs no extra file. A context can only use it once the module has
// loaded; `loadWorklets` starts that, and `workletsReady` says whether it has.

const PLUCK_SOURCE = `
class Pluck extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'frequency', defaultValue: 220, minValue: 10, maxValue: 8000, automationRate: 'a-rate' },
      { name: 'detune', defaultValue: 0, automationRate: 'a-rate' },
      { name: 'strike', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'a-rate' },
      { name: 'hardness', defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'damping', defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'sustain', defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }
  constructor() {
    super();
    this.size = 8192;
    this.buf = new Float32Array(this.size);
    this.w = 0;
    this.last = 0;
    this.struck = 0;
    this.seed = 12345;
    this.alive = true;
    this.port.onmessage = (e) => { if (e.data === 'stop') this.alive = false; };
  }
  noise() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 2147483648 - 1;
  }
  process(_inputs, outputs, p) {
    if (!this.alive) return false;
    const out = outputs[0][0];
    if (!out) return true;
    const at = (a, i) => (a.length > 1 ? a[i] : a[0]);
    // How much of the top the loop's filter takes each time round, and how
    // much of the level survives: damping darkens, sustain lengthens.
    const b = 0.05 + 0.6 * p.damping[0];
    const lose = 0.97 + 0.0299 * Math.sqrt(p.sustain[0]);
    const hard = p.hardness[0];
    for (let i = 0; i < out.length; i++) {
      const hz = at(p.frequency, i) * Math.pow(2, at(p.detune, i) / 1200);
      // The filter delays the loop by about b / (1 - b) samples; take it off.
      const period = Math.min(this.size - 2, Math.max(2, sampleRate / hz - b / (1 - b)));
      const s = at(p.strike, i);
      if (s > 0.5 && this.struck < 0.5) {
        // A fresh burst of noise, softened by a low-pass for a soft pluck.
        const n = Math.ceil(period);
        const k = 0.1 + 0.9 * hard;
        let lp = 0;
        let power = 0;
        const burst = new Float32Array(n);
        for (let j = 0; j < n; j++) {
          lp += k * (this.noise() - lp);
          burst[j] = lp;
          power += lp * lp;
        }
        // The same strength of pluck, whatever its colour: a soft pluck is darker, not quieter.
        const scale = (0.55 + 0.25 * hard) / Math.sqrt(power / n + 1e-9);
        let mean = 0;
        for (let j = 0; j < n; j++) mean += burst[j] / n;
        for (let j = 0; j < n; j++) this.buf[(this.w - n + j + this.size) % this.size] = (burst[j] - mean) * scale;
      }
      this.struck = s;
      // Read one period back, between samples.
      const r = this.w - period;
      const i0 = Math.floor(r);
      const f = r - i0;
      const a0 = this.buf[(i0 + this.size) % this.size];
      const a1 = this.buf[(i0 + 1 + this.size) % this.size];
      const y = a0 + (a1 - a0) * f;
      this.last = (1 - b) * y + b * this.last;
      this.buf[this.w] = this.last * lose;
      this.w = (this.w + 1) % this.size;
      out[i] = y;
    }
    return true;
  }
}
registerProcessor('pluck', Pluck);

// Sample-rate reduction: hold each sample for 'hold' samples, with no filter
// first, so everything above the new rate's half folds back down (aliasing).
class Crush extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'hold', defaultValue: 1, minValue: 1, maxValue: 64, automationRate: 'k-rate' }];
  }
  constructor() {
    super();
    this.count = 0;
    this.held = 0;
    this.alive = true;
    this.port.onmessage = (e) => { if (e.data === 'stop') this.alive = false; };
  }
  process(inputs, outputs, p) {
    if (!this.alive) return false;
    const input = inputs[0][0];
    const out = outputs[0][0];
    if (!out) return true;
    const hold = p.hold[0];
    for (let i = 0; i < out.length; i++) {
      const x = input ? input[i] : 0;
      if (hold <= 1) {
        out[i] = x;
        continue;
      }
      this.count += 1;
      if (this.count >= hold) {
        this.count -= hold;
        this.held = x;
      }
      out[i] = this.held;
    }
    return true;
  }
}
registerProcessor('crush', Crush);
`;

const loaded = new WeakMap<BaseAudioContext, Promise<void>>();
const ready = new WeakSet<BaseAudioContext>();

/** Load the worklets into a context. Safe to call more than once. */
export function loadWorklets(ctx: BaseAudioContext): Promise<void> {
  let p = loaded.get(ctx);
  if (!p) {
    const url = URL.createObjectURL(new Blob([PLUCK_SOURCE], { type: 'application/javascript' }));
    p = (ctx.audioWorklet?.addModule(url) ?? Promise.reject(new Error('no AudioWorklet')))
      .then(() => {
        ready.add(ctx);
      })
      .catch(() => {
        // Without worklets the pluck engine is silent; everything else works.
      })
      .finally(() => URL.revokeObjectURL(url));
    loaded.set(ctx, p);
  }
  return p;
}

export function workletsReady(ctx: BaseAudioContext): boolean {
  return ready.has(ctx);
}
