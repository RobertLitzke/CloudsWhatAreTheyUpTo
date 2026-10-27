// The app's mark: an aperture of six blades, drawn on a 100-unit square. It is
// here rather than in the icon script because the header draws it too, inline,
// so that it shows when the app is offline. tools/icons.mjs imports the same
// path data to make the PNG icons, so the two can never drift apart.

/** The six blades and the hole they leave, as SVG paths on a 100-unit square. */
export const BLADES = blades();

function blades(): string {
  const cx = 50;
  const cy = 50;
  const r = 38;
  const hole = 15;
  const out: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const b = a + Math.PI / 3;
    const p = (ang: number, rad: number) => `${(cx + Math.cos(ang) * rad).toFixed(2)} ${(cy + Math.sin(ang) * rad).toFixed(2)}`;
    // Each blade is the wedge between two spokes, cut short of the middle, so
    // the six of them leave a hexagonal hole: an aperture, half closed.
    out.push(
      `<path d="M${p(a, hole)} L${p(a, r)} A${r} ${r} 0 0 1 ${p(b, r)} Z" fill="${i % 2 ? '#2b3340' : '#1d2430'}"/>`,
    );
  }
  out.push(`<circle cx="${cx}" cy="${cy}" r="${hole}" fill="#e8a33d"/>`);
  return out.join('');
}
