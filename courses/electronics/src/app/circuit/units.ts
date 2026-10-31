// Electrical quantities for readouts, in the units an engineer would write
// them: 4.7 kΩ, 23 mA, 1.2 W.

const PREFIXES: [number, string][] = [
  [1e6, 'M'],
  [1e3, 'k'],
  [1, ''],
  [1e-3, 'm'],
  [1e-6, 'µ'],
  [1e-9, 'n'],
];

/** A value with an SI prefix and two or three significant figures, such as "4.7 kΩ" or "230 mA". */
export function si(value: number, unit: string): string {
  if (value === 0 || !Number.isFinite(value)) return `0 ${unit}`;
  const mag = Math.abs(value);
  const [scale, prefix] = PREFIXES.find(([s]) => mag >= s * 0.9995) ?? PREFIXES[PREFIXES.length - 1];
  const n = value / scale;
  const digits = Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2;
  return `${Number(n.toFixed(digits))} ${prefix}${unit}`;
}

export const volts = (v: number) => si(v, 'V');
export const amps = (a: number) => si(a, 'A');
export const ohms = (r: number) => si(r, 'Ω');
export const watts = (w: number) => si(w, 'W');
