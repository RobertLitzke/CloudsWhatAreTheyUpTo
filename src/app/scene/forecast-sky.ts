// The skies of the forecast questions at the end of each lesson: one drawing
// per hour named in the question, in the flat style of the other drawn
// clouds. A bare genus drawing is a patch of cloud on a blue sky under a full
// sun, which is wrong for most of what a forecast question describes: an
// overcast fills the sky and hides the sun, a thickening sheet gets darker and
// lower, fog lies on the fields. So a panel (core/shifts.ts SkyPanel) says
// what the question says, and this draws it.

import { svg } from 'lesson-kit/dom';
import { makeRng, type Rng } from 'lesson-kit/rng';
import type { GenusId } from '../../core/clouds';
import type { SkyPanel } from '../../core/shifts';
import { celCumulus, type Tones } from '../clouds/flat';
import { addToSky, drawCloud, placeCloud, SKY_SPOTS } from './drawn';
import { H, HORIZON, makeScene, W, type Palette } from './landscape';

/** `a` moved a fraction `t` of the way to `b`, both #rrggbb. */
function mix(a: string, b: string, t: number): string {
  const n = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(n(a, i) + (n(b, i) - n(a, i)) * t).toString(16).padStart(2, '0')).join('')}`;
}

const SHEETS: readonly GenusId[] = ['stratus', 'altostratus', 'nimbostratus', 'cirrostratus'];

/** Where the sun is drawn, as fractions of the scene: low in the sky at dawn and dusk. */
function sunAt(time: SkyPanel['time']): [number, number] {
  return time === 'dawn' || time === 'dusk' ? [0.2, 0.6] : [0.2, 0.3];
}

/** How the sun looks through the cloud, unless the panel says. */
function sunLook(s: SkyPanel): NonNullable<SkyPanel['sun']> {
  if (s.sun) return s.sun;
  if (s.fog === 'dense') return 'hidden';
  if (s.fog === 'thin') return 'dim';
  switch (s.genus) {
    case 'altostratus': return 'dim';
    case 'nimbostratus':
    case 'stratus': return 'hidden';
    case 'stratocumulus': return s.cover ? 'hidden' : 'clear';
    default: return 'clear';
  }
}

/** A sheet's look: the base's height in the scene, and its colour, from how thick it is. */
function sheetLook(id: GenusId, p: Palette, thick: number): { base: number; fill: string; opacity: number } {
  switch (id) {
    case 'cirrostratus': return { base: 96, fill: p.cloudLight, opacity: 0.38 };
    case 'altostratus': return { base: 118 + thick * 12, fill: mix(p.cloudMid, p.cloudShade, 0.25 + thick * 0.35), opacity: 0.9 };
    case 'nimbostratus': return { base: 140 + thick * 24, fill: mix(p.cloudShade, p.ink, 0.2 + thick * 0.45), opacity: 1 };
    default: return { base: 168, fill: mix(p.cloudMid, p.cloudShade, 0.55 + thick * 0.3), opacity: 1 };
  }
}

/** A sheet from the top of the picture down to its base, which sags and frays a little. */
function sheet(rng: Rng, base: number, fill: string, opacity: number, ragged: number): SVGElement {
  const pts: string[] = [`0,0`, `${W},0`];
  for (let x = W; x >= 0; x -= 16) pts.push(`${x},${(base + (rng() - 0.5) * ragged).toFixed(1)}`);
  return svg('polygon', { points: pts.join(' '), fill, opacity });
}

/** The whole sky gone grey, and the hills dimmed under it: the light of an overcast day. */
function gloom(p: Palette, amount: number): SVGElement {
  return svg('rect', { x: 0, y: 0, width: W, height: H, fill: mix(p.cloudShade, p.ink, 0.4), opacity: amount, 'pointer-events': 'none' });
}

/** Rain falling from `y0`, across the whole width, to the ground; `fade` stops it short, as virga. */
function streaks(rng: Rng, x0: number, x1: number, y0: number, y1: number, colour: string, gap: number, fade: boolean, id: string): SVGElement {
  const g = svg('g', fade ? { mask: `url(#${id})` } : {});
  for (let x = x0; x <= x1; x += gap) {
    const len = (y1 - y0) * (fade ? 0.6 + rng() * 0.4 : 1);
    g.append(svg('line', { x1: x, y1: y0, x2: x - len * 0.12, y2: y0 + len, stroke: colour, 'stroke-width': fade ? 2.4 : 1.6, opacity: fade ? 0.8 : 0.55 }));
  }
  if (!fade) return g;
  const grad = svg('linearGradient', { id: `${id}-g`, x1: 0, y1: 0, x2: 0, y2: 1 },
    svg('stop', { offset: '0%', 'stop-color': '#fff', 'stop-opacity': 1 }),
    svg('stop', { offset: '100%', 'stop-color': '#fff', 'stop-opacity': 0 }),
  );
  const mask = svg('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H },
    svg('rect', { x: 0, y: y0, width: W, height: y1 - y0, fill: `url(#${id}-g)` }));
  return svg('g', {}, svg('defs', {}, grad, mask), g);
}

/**
 * A deck of lumps over the whole sky, packed in rows that get smaller towards
 * the horizon: each lump a shaded belly, a body and a lit top. Stratocumulus
 * is broad grey lumps on a darker underside with a few chinks of blue;
 * altocumulus smaller white ones with lanes of blue between. Lumps inside
 * `hole` are left out.
 */
function cobbles(rng: Rng, p: Palette, t: Tones, base: number, size: number, under: boolean, hole?: { cx: number; cy: number; rx: number; ry: number }): SVGElement {
  const g = svg('g');
  if (under) {
    g.append(sheet(rng, base, t.cloudShade, 1, 4));
    for (const [cx, cy, rx] of [[70, 40, 12], [250, 22, 10], [330, 92, 8], [150, 120, 6]]) {
      g.append(svg('ellipse', { cx: cx + rng() * 20, cy, rx, ry: rx * 0.45, fill: p.sky[2] }));
    }
  }
  for (let y = 4; y < base - 6; ) {
    const k = 1 - (y / base) * 0.6;
    const rx = size * k;
    const ry = rx * 0.42;
    for (let x = -rx * rng(); x < W + rx; x += rx * (under ? 2.05 : 2.4)) {
      const cx = x + rng() * rx * 0.25;
      if (hole && ((cx - hole.cx) / hole.rx) ** 2 + ((y - hole.cy) / hole.ry) ** 2 < 1) continue;
      g.append(
        svg('ellipse', { cx, cy: y + ry * 0.2, rx, ry, fill: t.cloudShade }),
        svg('ellipse', { cx: cx + rx * 0.06, cy: y - ry * 0.05, rx: rx * 0.94, ry: ry * 0.85, fill: t.cloudMid }),
        svg('ellipse', { cx: cx + rx * 0.14, cy: y - ry * 0.3, rx: rx * 0.62, ry: ry * 0.5, fill: t.cloudLight, opacity: 0.8 }),
      );
    }
    y += ry * (under ? 2.3 : 2.9);
  }
  return g;
}

/** A thunderstorm: tower and anvil, its rain if it is raining. */
function storm(p: Palette, x: number, scale: number, rain: boolean, seed: number): SVGElement {
  const dark: Palette = { ...p, cloudShade: mix(p.cloudShade, p.ink, 0.45), cloudMid: mix(p.cloudMid, p.cloudShade, 0.4) };
  const g = drawCloud('cumulonimbus', dark, seed);
  // The drawing's first part is its rain.
  if (!rain) g.firstElementChild?.remove();
  return svg('g', { transform: `translate(${x} ${SKY_SPOTS.cumulonimbus.y}) scale(${scale})` }, g);
}

/** A forked bolt from a storm's base to the ground. */
function bolt(x: number, y: number): SVGElement {
  const pts = [[x, y], [x - 6, y + 14], [x + 2, y + 16], [x - 8, y + 34], [x - 2, y + 35], [x - 12, HORIZON + 4]];
  return svg('polyline', { points: pts.map((q) => q.join(',')).join(' '), fill: 'none', stroke: '#fff6b0', 'stroke-width': 2.4, 'stroke-linejoin': 'round' });
}

/** A distant ridge, standing up out of the hills, under a stack of lens clouds that stay put over it. */
function lenticular(p: Palette): SVGElement[] {
  const ridge = svg('polygon', { points: `120,${HORIZON + 4} 200,${HORIZON - 34} 236,${HORIZON - 28} 300,${HORIZON + 4}`, fill: p.hills[0] });
  const lens = (cy: number, rx: number, ry: number, fill: string) =>
    svg('path', { d: `M${218 - rx},${cy} Q218,${cy - ry * 2} ${218 + rx},${cy} Q218,${cy + ry * 0.9} ${218 - rx},${cy} Z`, fill });
  const cloud = svg('g', {},
    lens(112, 62, 9, p.cloudShade),
    lens(109, 58, 9, p.cloudMid),
    lens(100, 46, 7, p.cloudLight),
    lens(93, 34, 5, p.cloudMid),
  );
  return [ridge, cloud];
}

/** Two airliner trails: short ones that vanish behind the plane, or long ones spreading into ribbons. */
function contrails(p: Palette, kind: 'short' | 'wide'): SVGElement {
  if (kind === 'short') {
    return svg('g', {},
      svg('line', { x1: 250, y1: 30, x2: 300, y2: 22, stroke: p.cloudLight, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.9 }),
      svg('line', { x1: 140, y1: 62, x2: 176, y2: 50, stroke: p.cloudLight, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.9 }),
    );
  }
  return svg('g', {},
    svg('path', { d: 'M40,70 L380,18 L384,30 L46,86 Z', fill: p.cloudLight, opacity: 0.45 }),
    svg('path', { d: 'M150,100 L400,58 L400,70 L156,114 Z', fill: p.cloudLight, opacity: 0.4 }),
  );
}

/** Fog lying over the fields: thick enough to hide the ridges, or thin with their tops showing. */
function fog(p: Palette, kind: 'dense' | 'thin'): SVGElement {
  const fill = mix(p.cloudMid, p.cloudLight, 0.4);
  const top = kind === 'dense' ? 0 : HORIZON - 4;
  return svg('g', { 'pointer-events': 'none' },
    svg('rect', { x: 0, y: top, width: W, height: H - top, fill, opacity: kind === 'dense' ? 0.86 : 0.7 }),
    svg('rect', { x: 0, y: kind === 'dense' ? 214 : HORIZON + 14, width: W, height: H, fill, opacity: 0.5 }),
  );
}

/** One panel of the strip. `k` is its place in the strip, for the variety of shapes. */
export function forecastSky(s: SkyPanel, k: number): SVGSVGElement {
  const time = s.time ?? 'day';
  const [sx, sy] = sunAt(time);
  const look = sunLook(s);
  // A sun behind cloud is drawn later, over the cloud, as a dim disc; one hidden is not drawn at all.
  const scene = makeScene({ time, seed: 40 + k, town: !!s.town, sun: look === 'hidden' || look === 'dim' ? null : [sx, sy] });
  const p = scene.palette;
  const rng = makeRng(17 + k);
  const sky = scene.sky;
  const thick = s.thick ?? 0;
  const id = s.genus;
  const xAt = (x: number | undefined, d: number) => W / 2 + (x ?? d) * (W / 2 - 60);

  if (id && SHEETS.includes(id)) {
    const l = sheetLook(id, p, thick);
    const base = id === 'stratus' && s.low ? 0 : l.base;
    if (id === 'cirrostratus') {
      // A milky veil with no edge to it, thickest overhead and thinning towards the horizon.
      const gid = `veil${k}-${time}`;
      sky.append(
        svg('defs', {}, svg('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
          svg('stop', { offset: '0%', 'stop-color': l.fill, 'stop-opacity': 0.6 }),
          svg('stop', { offset: '100%', 'stop-color': l.fill, 'stop-opacity': 0.12 }))),
        svg('rect', { x: 0, y: 0, width: W, height: HORIZON, fill: `url(#${gid})` }),
      );
    } else if (base) {
      sky.append(gloom(p, id === 'nimbostratus' ? 0.25 + thick * 0.2 : 0.18));
      sky.append(sheet(rng, base, l.fill, l.opacity, id === 'altostratus' ? 4 : 8));
      // A darker underside towards the base.
      sky.append(sheet(rng, base - 10, mix(l.fill, p.ink, 0.15), id === 'altostratus' ? 0 : 0.35, 6));
      sky.append(svg('rect', { x: 0, y: 0, width: W, height: base - 18, fill: l.fill, opacity: l.opacity }));
    }
    if (id === 'nimbostratus' && s.rain !== false) {
      sky.append(streaks(rng, 0, W + 30, base - 2, HORIZON + 10, mix(l.fill, p.cloudMid, 0.3), 9 - thick * 4, false, `rain${k}`));
    }
    if (s.virga) {
      sky.append(streaks(rng, 130, 330, base - 2, base + 52, mix(l.fill, p.ink, 0.25), 7, true, `virga${k}`));
    }
  }
  if (id === 'stratus' && s.low) {
    // The ceiling over the hilltops: in front of the far hills, behind the near fields.
    const l = sheetLook('stratus', p, thick);
    scene.front.append(svg('g', {},
      svg('path', { d: `M0,0 L${W},0 L${W},203 C300,201 120,205 0,202 Z`, fill: l.fill }),
      svg('path', { d: `M0,190 L${W},190 L${W},203 C300,201 120,205 0,202 Z`, fill: mix(l.fill, p.ink, 0.12) }),
    ));
    // The near swell stays in front.
    scene.front.append(svg('path', { d: `M0,232 C70,214 140,214 200,226 S330,246 ${W},230 L${W},${H} L0,${H} Z`, fill: p.near }));
  }

  if (id === 'stratocumulus') {
    const t: Tones = { cloudShade: mix(p.cloudShade, p.ink, 0.2 + thick * 0.3), cloudMid: mix(p.cloudMid, p.cloudShade, 0.45), cloudLight: p.cloudMid };
    if (s.shape === 'iced') {
      // Frozen out: a silky white sheet of ice where the lumps were, and the sun through it.
      sky.append(sheet(rng, 158, p.cloudLight, 0.55, 3));
      for (let i = 0; i < 16; i++) {
        const y = 20 + i * 9 + rng() * 4;
        sky.append(svg('line', { x1: rng() * 80, y1: y, x2: W - rng() * 80, y2: y - 6, stroke: p.cloudLight, 'stroke-width': 1.2, opacity: 0.6 }));
      }
    } else if (s.cover) {
      sky.append(gloom(p, 0.15), cobbles(rng, p, t, 170, 30, true));
    } else {
      // A patch, raised when its base is high.
      const y = s.virga ? 120 : SKY_SPOTS.stratocumulus.y;
      const patch = svg('g', { transform: `translate(${W / 2} ${y}) scale(1.4)` }, drawCloud('stratocumulus', p, 3 + k));
      if (s.virga) sky.append(streaks(rng, W / 2 - 70, W / 2 + 80, y + 2, y + 42, t.cloudShade, 7, true, `virga${k}`));
      sky.append(patch);
    }
  }

  if (id === 'altocumulus') {
    const t: Tones = { cloudShade: p.cloudShade, cloudMid: p.cloudMid, cloudLight: p.cloudLight };
    if (s.shape === 'lenticular') {
      sky.append(...lenticular(p));
    } else if (s.shape === 'hole') {
      // A cobbled sheet with a round hole punched in it, and ice falling from the middle of the hole.
      const hole = { cx: 230, cy: 66, rx: 74, ry: 26 };
      sky.append(cobbles(rng, p, t, 124, 17, false, hole));
      for (let i = 0; i < 9; i++) {
        const x = hole.cx - 34 + i * 8 + rng() * 3;
        sky.append(svg('path', { d: `M${x},${hole.cy - 6} q-4,26 -14,${40 + rng() * 16}`, fill: 'none', stroke: p.cloudLight, 'stroke-width': 2.4, opacity: 0.75, 'stroke-linecap': 'round' }));
      }
    } else if (s.cover) {
      sky.append(cobbles(rng, p, t, 124, 17, false));
    } else {
      const x = xAt(s.x, 0);
      const g = placeCloud('altocumulus', p, x, SKY_SPOTS.altocumulus.y, 1.1, k + 2);
      if (s.shape === 'castellanus') {
        // Turrets rising out of the line of cells.
        const turrets = svg('g', {});
        for (const dx of [-36, -12, 10, 30]) turrets.append(celCumulus(x + dx * 1.1, SKY_SPOTS.altocumulus.y - 10, 12, 22 + rng() * 10, p, 5 + dx));
        sky.append(turrets);
      }
      sky.append(g);
    }
  }

  if (id === 'cirrus') {
    addToSky(sky, placeCloud('cirrus', p, xAt(s.x, 0), SKY_SPOTS.cirrus.y, SKY_SPOTS.cirrus.scale, k + 2));
  }
  if (id === 'cirrocumulus') {
    addToSky(sky, placeCloud('cirrocumulus', p, xAt(s.x, 0), SKY_SPOTS.cirrocumulus.y, SKY_SPOTS.cirrocumulus.scale, k + 2));
  }

  if (id === 'cumulus') {
    const n = s.count ?? 1;
    const xs = n === 1 ? [xAt(s.x, 0)] : Array.from({ length: n }, (_, i) => 40 + ((W - 80) * (i + 0.5 * rng())) / (n - 0.5));
    xs.forEach((x, i) => {
      if (s.size === 'congestus') sky.append(celCumulus(x, SKY_SPOTS.cumulus.y, 64, 104 + rng() * 14, p, 7 + i));
      else {
        const small = s.size === 'small';
        // Small heaps are flat: wider than tall.
        const g = placeCloud('cumulus', p, x, SKY_SPOTS.cumulus.y - (small ? i % 2 * 8 : 0), small ? 0.7 : 0.9, 3 + i + k);
        if (small) g.setAttribute('transform', `${g.getAttribute('transform')} scale(1 0.7)`);
        sky.append(g);
      }
    });
  }

  if (id === 'cumulonimbus') {
    const x = xAt(s.x, 0);
    const scale = s.far ? 0.62 : 1.2;
    sky.append(storm(p, x, scale, s.rain !== false, k + 2));
    if (s.lightning) sky.append(bolt(x - 6 * scale, SKY_SPOTS.cumulonimbus.y + 4));
    if (s.dust) {
      // Dust kicked up along the road by the gust ahead of the storm.
      const dust = mix(p.hills[1], p.cloudMid, 0.3);
      scene.front.append(svg('g', { opacity: 0.75 },
        ...[0, 1, 2, 3].map((i) => svg('ellipse', { cx: 120 + i * 70 + rng() * 20, cy: 226 - rng() * 6, rx: 34 + rng() * 14, ry: 10 + rng() * 5, fill: dust })),
      ));
    }
  }

  if (s.contrails) sky.append(contrails(p, s.contrails));

  // The sun or moon through the cloud: a dim disc drawn over the sheet, a halo round a sharp one.
  const cx = sx * W;
  const cy = sy * H;
  // A dim disc is seen through the sheet, so it sits up behind it even when the sun is low.
  if (look === 'dim') sky.append(svg('circle', { cx, cy: Math.min(cy, 0.3 * H), r: 15, fill: mix(p.sun, p.cloudMid, 0.35), opacity: 0.8 }));
  if (look === 'halo') {
    sky.append(
      svg('circle', { cx, cy, r: 58, fill: 'none', stroke: mix(p.sun, '#e89a7a', 0.4), 'stroke-width': 1.5, opacity: 0.7 }),
      svg('circle', { cx, cy, r: 61, fill: 'none', stroke: p.cloudLight, 'stroke-width': 3, opacity: 0.6 }),
    );
  }

  if (s.fog) scene.front.append(fog(p, s.fog));
  return scene.root;
}
