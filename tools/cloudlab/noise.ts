// Value noise and fractal sums of it, for the canvas renderer.

const N = 256;
const table = new Float32Array(N * N);
{
  let s = 1234567;
  for (let i = 0; i < table.length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    table[i] = s / 4294967296;
  }
}

const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Smooth value noise in 0..1, period 256. */
export function noise2(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = smooth(x - xi);
  const fy = smooth(y - yi);
  const x0 = xi & 255, x1 = (xi + 1) & 255, y0 = (yi & 255) * N, y1 = ((yi + 1) & 255) * N;
  const a = table[y0 + x0], b = table[y0 + x1], c = table[y1 + x0], d = table[y1 + x1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Fractal sum of `oct` octaves, 0..1. */
export function fbm(x: number, y: number, oct = 4): number {
  let sum = 0, amp = 0.5, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * noise2(x, y);
    norm += amp;
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 9.7;
    amp *= 0.5;
  }
  return sum / norm;
}

/** Billowy fractal sum: rounded bumps, as on a cauliflower, 0..1. */
export function billow(x: number, y: number, oct = 4): number {
  let sum = 0, amp = 0.5, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * (1 - Math.abs(noise2(x, y) * 2 - 1));
    norm += amp;
    x = x * 2.1 + 5.3;
    y = y * 2.1 + 11.9;
    amp *= 0.5;
  }
  return sum / norm;
}
