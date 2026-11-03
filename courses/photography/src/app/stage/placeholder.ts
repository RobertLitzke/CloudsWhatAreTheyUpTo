// Stand-in pictures for a stage's planes, drawn here until real ones (made
// sharp from edge to edge, see the stage's README brief) are in
// public/stage/<stage>/. Flat shapes in the course's quiet colours, with
// enough small detail (leaves, needles, bark) that blur shows, and bright
// glints on the leaves so the out-of-focus discs can be seen as discs.

import { makeRng, type Rng } from 'didactics/rng';
import { WREN_HEAD as WREN } from '../../core/stage';

/** Pixels across each stand-in, by plane id. Its height follows the plane's proportions. */
const WIDTH: Record<string, number> = { hills: 2048, trees: 2048, bushes: 2048, bird: 2048, sky: 1024, moon: 1024, ridge: 2048, pine: 1024, woods: 1024, bramble: 2048, wren: 2048, twigs: 2048, forest: 2048, meadow: 2048, deer: 2048, grass: 2048 };

/** A stand-in picture for plane `id`, `aspect` (height over width) as the plane is; null without a 2D canvas. */
export function placeholder(id: string, aspect: number): HTMLCanvasElement | null {
  const w = WIDTH[id] ?? 1024;
  const h = Math.round(w * aspect);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) return null;
  const rng = makeRng(id.length * 7919 + 13);
  const draw = DRAW[id];
  if (draw) draw(g, w, h, rng);
  return c;
}

type Painter = (g: CanvasRenderingContext2D, w: number, h: number, rng: Rng) => void;

const DRAW: Record<string, Painter> = {
  hills(g, w, h, rng) {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#a9c4d6');
    sky.addColorStop(0.7, '#dfe8e8');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // A few thin clouds.
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 9; i++) {
      const x = rng() * w;
      const y = h * (0.12 + rng() * 0.3);
      g.beginPath();
      g.ellipse(x, y, w * (0.04 + rng() * 0.06), h * 0.012, 0, 0, Math.PI * 2);
      g.fill();
    }
    // Two rows of rolling hills, the far one paler.
    const ridge = (base: number, amp: number, fill: string) => {
      g.fillStyle = fill;
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) {
        const y = base + Math.sin(x / (w * 0.09) + base) * amp + Math.sin(x / (w * 0.031)) * amp * 0.3;
        g.lineTo(x, y);
      }
      g.lineTo(w, h);
      g.fill();
    };
    ridge(h * 0.64, h * 0.03, '#b7c6c4');
    ridge(h * 0.74, h * 0.035, '#c9b68e');
    // Field stripes on the near hills.
    g.strokeStyle = 'rgba(120,96,60,0.25)';
    g.lineWidth = 2;
    for (let y = h * 0.8; y < h; y += h * 0.025) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + (rng() - 0.5) * 10);
      g.stroke();
    }
  },

  trees(g, w, h, rng) {
    // Pines and poplars standing on the lower half; the sky above is left clear.
    const ground = h * 0.72;
    g.fillStyle = '#5f7f68';
    g.fillRect(0, ground, w, h - ground);
    for (let i = 0; i < 110; i++) {
      const x = rng() * w;
      const tall = h * (0.14 + rng() * 0.2);
      const poplar = rng() < 0.25;
      const shade = ['#2f4f43', '#3d5f4c', '#476b52', '#55785a'][Math.floor(rng() * 4)];
      g.fillStyle = shade;
      g.beginPath();
      if (poplar) g.ellipse(x, ground - tall * 0.5, tall * 0.13, tall * 0.55, 0, 0, Math.PI * 2);
      else {
        g.moveTo(x, ground - tall);
        for (let k = 1; k <= 5; k++) {
          const y = ground - tall + (tall * k) / 5;
          g.lineTo(x + (tall * 0.08 * k) / 1.4, y);
          g.lineTo(x + (tall * 0.03 * k) / 1.4, y);
        }
        for (let k = 5; k >= 1; k--) {
          const y = ground - tall + (tall * k) / 5;
          g.lineTo(x - (tall * 0.03 * k) / 1.4, y);
          g.lineTo(x - (tall * 0.08 * k) / 1.4, y);
        }
      }
      g.fill();
    }
  },

  bushes(g, w, h, rng) {
    // One copy of a row of shrubs, about 4 m of it: leaves a few centimetres
    // long, dense enough to read as texture, an uneven top, and sun glints the
    // blur turns into discs. The plane repeats it, mirrored, so its two side
    // edges always meet their own reflection.
    const topAt = (x: number) => h * (0.2 + 0.1 * (1 + Math.sin((x / w) * Math.PI * 2) * 0.6 + Math.sin((x / w) * Math.PI * 6 + 1) * 0.3));
    g.strokeStyle = '#3b3328';
    g.lineWidth = 5;
    for (let i = 0; i < 40; i++) {
      const x = rng() * w;
      g.beginPath();
      g.moveTo(x, h);
      g.quadraticCurveTo(x + (rng() - 0.5) * 200, h * 0.6, x + (rng() - 0.5) * 300, topAt(x) + h * 0.1);
      g.stroke();
    }
    const greens = ['#2f5a3c', '#3c6b45', '#4c7d4f', '#5e8d58', '#6f9a5e', '#264a33', '#7da564'];
    for (let i = 0; i < 16000; i++) {
      const x = rng() * w;
      const top = topAt(x);
      const y = top + rng() ** 0.8 * (h - top);
      g.fillStyle = greens[Math.floor(rng() * greens.length)];
      g.beginPath();
      g.ellipse(x, y, 10 + rng() * 12, 5 + rng() * 5, rng() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 180; i++) {
      const x = rng() * w;
      const top = topAt(x);
      const y = top + rng() * (h - top) * 0.6;
      g.fillStyle = rng() < 0.7 ? '#fffdf2' : '#fff1bf';
      g.beginPath();
      g.arc(x, y, 3 + rng() * 4, 0, Math.PI * 2);
      g.fill();
    }
  },

  bird(g, _w, h) {
    // A bluebird side-on on a bare branch that runs off both edges. The bird
    // is a quarter of the picture's height and stands in its middle.
    const s = h / 600; // drawn in a 1200 × 600 space
    g.save();
    g.scale(s, s);
    // The branch: a long, slightly bent limb with bark marks and a side twig.
    g.lineCap = 'round';
    g.strokeStyle = '#6e5642';
    g.lineWidth = 24;
    g.beginPath();
    g.moveTo(-20, 392);
    g.bezierCurveTo(300, 360, 700, 350, 1220, 386);
    g.stroke();
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(820, 362);
    g.quadraticCurveTo(900, 300, 990, 270);
    g.stroke();
    g.strokeStyle = '#4c3b2d';
    g.lineWidth = 2;
    for (let x = 10; x < 1200; x += 23) {
      g.beginPath();
      g.moveTo(x, 372 + Math.sin(x) * 3);
      g.lineTo(x + 12, 382 + Math.cos(x) * 4);
      g.stroke();
    }
    g.fillStyle = '#9fae9a';
    for (let x = 60; x < 1200; x += 170) {
      g.beginPath();
      g.ellipse(x, 368, 14, 6, 0, 0, Math.PI * 2);
      g.fill();
    }
    // The bird: tail, body, breast, head, wing, eye, beak, feet.
    g.fillStyle = '#2f5d9e';
    g.beginPath();
    g.moveTo(640, 322);
    g.lineTo(700, 400);
    g.lineTo(676, 404);
    g.lineTo(622, 336);
    g.fill();
    g.fillStyle = '#3d6fb6';
    g.beginPath();
    g.ellipse(600, 300, 62, 50, -0.35, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#d98a4e';
    g.beginPath();
    g.ellipse(578, 312, 42, 40, -0.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#efe3d0';
    g.beginPath();
    g.ellipse(596, 340, 30, 16, -0.3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3d6fb6';
    g.beginPath();
    g.arc(560, 250, 33, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2a4f8c';
    g.beginPath();
    g.ellipse(624, 292, 46, 26, -0.45, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#7fa6dc';
    g.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.moveTo(600 + k * 12, 282 + k * 2);
      g.lineTo(650 + k * 8, 300 + k * 4);
      g.stroke();
    }
    g.fillStyle = '#16181c';
    g.beginPath();
    g.arc(548, 244, 5.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(546.5, 242.5, 1.6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2b2b2b';
    g.beginPath();
    g.moveTo(528, 246);
    g.lineTo(508, 252);
    g.lineTo(528, 256);
    g.fill();
    g.strokeStyle = '#2b2b2b';
    g.lineWidth = 3;
    for (const x of [586, 606]) {
      g.beginPath();
      g.moveTo(x, 344);
      g.lineTo(x - 4, 372);
      g.stroke();
    }
    g.restore();
  },

  sky(g, w, h) {
    // Dusk: deep blue overhead to peach at the horizon, which is a little
    // under halfway up the picture (the plane reaches below the ridge).
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#26335e');
    sky.addColorStop(0.35, '#5a5f8f');
    sky.addColorStop(0.52, '#c58ea0');
    sky.addColorStop(0.58, '#f0bd98');
    sky.addColorStop(1, '#f6d3ad');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
  },

  moon(g, w, h, rng) {
    // The full moon: a pale disc, the dark seas where they are, small craters.
    const r = Math.min(w, h) * 0.495;
    const cx = w / 2;
    const cy = h / 2;
    g.save();
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#f3ecd9';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(150,146,140,0.4)';
    g.filter = `blur(${Math.round(r * 0.04)}px)`;
    for (const [x, y, rx, ry] of [[-0.25, -0.35, 0.28, 0.2], [0.1, -0.15, 0.22, 0.17], [0.32, -0.3, 0.14, 0.12], [-0.42, 0.05, 0.2, 0.3], [0.05, 0.18, 0.16, 0.12], [0.35, 0.05, 0.1, 0.16], [-0.12, 0.32, 0.12, 0.08]]) {
      g.beginPath();
      g.ellipse(cx + x * r, cy + y * r, rx * r, ry * r, rng(), 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 40; i++) {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * r;
      const cr = r * (0.008 + rng() * 0.03);
      g.strokeStyle = 'rgba(120,114,104,0.22)';
      g.lineWidth = Math.max(1, cr * 0.3);
      g.beginPath();
      g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, cr, 0, Math.PI * 2);
      g.stroke();
    }
    g.filter = 'none';
    // Tycho, bright and rayed, low in the southern highlands.
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(cx - 0.05 * r, cy + 0.6 * r, r * 0.035, 0, Math.PI * 2);
    g.fill();
    g.restore();
  },

  ridge(g, w, h, rng) {
    // A bare grassy ridge, its crest along the top edge with a gentle swell,
    // the slope below in dusk shade. One copy covers 80 m; the plane repeats it.
    const crest = (x: number) => h * (0.02 + 0.03 * (1 - Math.cos((x / w) * Math.PI * 2)));
    g.fillStyle = '#3b3a42';
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) g.lineTo(x, crest(x));
    g.lineTo(w, h);
    g.fill();
    g.strokeStyle = 'rgba(160,140,120,0.35)';
    g.lineWidth = 2;
    for (let i = 0; i < 900; i++) {
      const x = rng() * w;
      const y = crest(x) + 2;
      g.beginPath();
      g.moveTo(x, y + 6);
      g.lineTo(x + (rng() - 0.5) * 6, y - 4 - rng() * 10);
      g.stroke();
    }
  },

  pine(g, w, h, rng) {
    // A lone ponderosa pine, dark against the dusk: a straight trunk with
    // clumps of needles on short branches, an open, rounded crown.
    const cx = w / 2;
    g.fillStyle = '#4a3328';
    g.beginPath();
    g.moveTo(cx - w * 0.035, h);
    g.lineTo(cx - w * 0.012, h * 0.05);
    g.lineTo(cx + w * 0.012, h * 0.05);
    g.lineTo(cx + w * 0.035, h);
    g.fill();
    g.strokeStyle = '#3a2a22';
    for (let k = 0; k < 16; k++) {
      const y = h * (0.1 + 0.045 * k);
      const side = k % 2 ? 1 : -1;
      const reach = w * (0.18 + 0.22 * Math.sin((k / 16) * Math.PI)) * (0.7 + rng() * 0.5);
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(cx, y + h * 0.02);
      g.quadraticCurveTo(cx + side * reach * 0.5, y, cx + side * reach, y - h * 0.015);
      g.stroke();
      for (let c = 0; c < 4; c++) {
        const t = 0.4 + c * 0.2;
        g.fillStyle = ['#1f2a26', '#26332c', '#2c3a31'][Math.floor(rng() * 3)];
        g.beginPath();
        g.ellipse(cx + side * reach * t, y - h * 0.01 - rng() * h * 0.01, w * (0.07 + rng() * 0.05), h * (0.018 + rng() * 0.01), (rng() - 0.5) * 0.4, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.fillStyle = '#1f2a26';
    g.beginPath();
    g.ellipse(cx, h * 0.07, w * 0.08, h * 0.05, 0, 0, Math.PI * 2);
    g.fill();
  },

  woods(g, w, h, rng) {
    // Dim conifer woods: dark green shade with trunks fading into it.
    const shade = g.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, '#46584a');
    shade.addColorStop(0.5, '#2c3b31');
    shade.addColorStop(1, '#25301f');
    g.fillStyle = shade;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = rng() * w;
      g.fillStyle = `rgba(${60 + rng() * 30},${50 + rng() * 20},${40},${0.4 + rng() * 0.4})`;
      g.fillRect(x, 0, w * (0.006 + rng() * 0.02), h);
    }
    // A few sunlit patches, which the blur turns into soft discs.
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(190,205,140,${0.25 + rng() * 0.3})`;
      g.beginPath();
      g.arc(rng() * w, rng() * h * 0.7, w * (0.004 + rng() * 0.01), 0, Math.PI * 2);
      g.fill();
    }
  },

  bramble(g, w, h, rng) {
    // One metre of bramble and fern: arching canes and leaves, dense below,
    // ragged on top, clear above (one copy; the plane repeats it).
    const top = (x: number) => h * (0.08 + 0.12 * (1 + Math.sin((x / w) * Math.PI * 4)) / 2);
    g.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      const x = rng() * w;
      g.strokeStyle = ['#5b3b3b', '#6b4a3c', '#4d3a2f'][Math.floor(rng() * 3)];
      g.lineWidth = 4 + rng() * 4;
      g.beginPath();
      g.moveTo(x, h);
      g.quadraticCurveTo(x + (rng() - 0.5) * w * 0.4, top(x) - h * 0.1, x + (rng() - 0.5) * w * 0.5, top(x) + h * rng() * 0.4);
      g.stroke();
    }
    const greens = ['#2f5232', '#3e6a3c', '#4f7c45', '#5f8a4a', '#28432a'];
    for (let i = 0; i < 9000; i++) {
      const x = rng() * w;
      const t = top(x);
      const y = t + rng() ** 0.7 * (h - t);
      g.fillStyle = greens[Math.floor(rng() * greens.length)];
      g.beginPath();
      g.ellipse(x, y, 8 + rng() * 14, 5 + rng() * 7, rng() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  },

  wren(g, w, h) {
    // A small brown wren, tail cocked, on a bramble cane running off both
    // edges. Drawn in metres: the picture is 0.4 × 0.2 m, its middle on the axis.
    const X = (m: number) => ((m + 0.2) / 0.4) * w;
    const Y = (m: number) => ((0.1 - m) / 0.2) * h;
    const R = (m: number) => (m / 0.4) * w;
    g.lineCap = 'round';
    g.strokeStyle = '#6b4a3c';
    g.lineWidth = R(0.008);
    g.beginPath();
    g.moveTo(X(-0.2), Y(-0.045));
    g.bezierCurveTo(X(-0.05), Y(-0.03), X(0.05), Y(-0.028), X(0.2), Y(-0.05));
    g.stroke();
    g.fillStyle = '#3a2a24';
    for (let k = -0.18; k < 0.2; k += 0.025) {
      g.beginPath();
      g.moveTo(X(k), Y(-0.035));
      g.lineTo(X(k + 0.004), Y(-0.025));
      g.lineTo(X(k + 0.008), Y(-0.035));
      g.fill();
    }
    // Tail, body, head, eye, bill, barring, legs.
    g.fillStyle = '#6e4e36';
    g.beginPath();
    g.moveTo(X(0.03), Y(0.0));
    g.lineTo(X(0.06), Y(0.045));
    g.lineTo(X(0.045), Y(0.05));
    g.lineTo(X(0.018), Y(0.008));
    g.fill();
    g.fillStyle = '#7c5a3e';
    g.beginPath();
    g.ellipse(X(0.0), Y(0.0), R(0.035), R(0.022), -0.15, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#8a6646';
    g.beginPath();
    g.arc(X(WREN.x), Y(WREN.y), R(0.016), 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#c9ad8a';
    g.beginPath();
    g.ellipse(X(-0.012), Y(-0.008), R(0.02), R(0.012), -0.2, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#3e2a1e';
    g.lineWidth = R(0.0015);
    for (let k = 0; k < 6; k++) {
      g.beginPath();
      g.moveTo(X(0.032 + k * 0.004), Y(0.012 + k * 0.006));
      g.lineTo(X(0.04 + k * 0.004), Y(0.008 + k * 0.006));
      g.stroke();
      g.beginPath();
      g.moveTo(X(0.0 + k * 0.006), Y(0.012));
      g.lineTo(X(0.004 + k * 0.006), Y(0.004));
      g.stroke();
    }
    g.strokeStyle = '#efe0c4';
    g.lineWidth = R(0.002);
    g.beginPath();
    g.moveTo(X(WREN.x - 0.004), Y(WREN.y + 0.008));
    g.lineTo(X(WREN.x + 0.014), Y(WREN.y + 0.006));
    g.stroke();
    g.fillStyle = '#111111';
    g.beginPath();
    g.arc(X(WREN.x - 0.006), Y(WREN.y + 0.002), R(0.003), 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3b2f28';
    g.beginPath();
    g.moveTo(X(WREN.x - 0.014), Y(WREN.y + 0.002));
    g.lineTo(X(WREN.x - 0.03), Y(WREN.y - 0.002));
    g.lineTo(X(WREN.x - 0.014), Y(WREN.y - 0.004));
    g.fill();
    g.strokeStyle = '#8d6b52';
    g.lineWidth = R(0.002);
    for (const x of [-0.006, 0.006]) {
      g.beginPath();
      g.moveTo(X(x), Y(-0.018));
      g.lineTo(X(x - 0.002), Y(-0.031));
      g.stroke();
    }
  },

  twigs(g, w, h, rng) {
    // Bare canes with thorns and a few leaves, close to the camera, crossing
    // the frame on the diagonal. Drawn in metres: 0.6 × 0.45 m, from x −0.3
    // and y −0.25. One crosses just below and right of the frame's middle,
    // so a big focus area catches it; none crosses the wren's head.
    const X = (m: number) => ((m + 0.3) / 0.6) * w;
    const Y = (m: number) => ((0.2 - m) / 0.45) * h;
    const R = (m: number) => (m / 0.6) * w;
    const cane = (pts: [number, number][], width: number) => {
      g.strokeStyle = '#7a4f45';
      g.lineWidth = R(width);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(X(pts[0][0]), Y(pts[0][1]));
      g.bezierCurveTo(X(pts[1][0]), Y(pts[1][1]), X(pts[2][0]), Y(pts[2][1]), X(pts[3][0]), Y(pts[3][1]));
      g.stroke();
      // Thorns and leaves along it.
      for (let i = 1; i < 14; i++) {
        const t = i / 14;
        const u = 1 - t;
        const px = u ** 3 * pts[0][0] + 3 * u * u * t * pts[1][0] + 3 * u * t * t * pts[2][0] + t ** 3 * pts[3][0];
        const py = u ** 3 * pts[0][1] + 3 * u * u * t * pts[1][1] + 3 * u * t * t * pts[2][1] + t ** 3 * pts[3][1];
        g.fillStyle = '#e8d6b0';
        g.beginPath();
        g.arc(X(px), Y(py), R(0.0018), 0, Math.PI * 2);
        g.fill();
        if (rng() < 0.22) {
          g.fillStyle = ['#557a3d', '#6f8f45', '#8a6d3a'][Math.floor(rng() * 3)];
          g.beginPath();
          g.ellipse(X(px + 0.012), Y(py + 0.01), R(0.02), R(0.01), -0.6 + rng(), 0, Math.PI * 2);
          g.fill();
        }
      }
    };
    cane([[-0.3, -0.25], [-0.2, -0.1], [-0.14, 0.05], [-0.08, 0.2]], 0.006);
    cane([[-0.12, -0.18], [-0.02, -0.03], [0.05, 0.04], [0.3, 0.09]], 0.005);
    cane([[0.3, -0.2], [0.22, -0.16], [0.18, -0.2], [0.1, -0.25]], 0.004);
  },

  forest(g, w, h, rng) {
    // The dark edge of a conifer forest: deep shade, trunks, and a ragged
    // right-hand edge of spires where it meets the open meadow. Ground at the bottom.
    const edge = w;
    g.fillStyle = '#1c2a22';
    g.beginPath();
    g.moveTo(0, h);
    g.lineTo(0, h * 0.25);
    for (let x = 0; x <= edge; x += w * 0.012) g.lineTo(x, h * (0.12 + 0.18 * rng()));
    g.lineTo(edge, h);
    g.fill();
    for (let i = 0; i < 160; i++) {
      const x = rng() * edge;
      g.fillStyle = `rgba(${50 + rng() * 30},${40 + rng() * 20},${30},${0.3 + rng() * 0.4})`;
      g.fillRect(x, h * (0.4 + rng() * 0.3), w * 0.0025, h);
    }
    for (let i = 0; i < 260; i++) {
      const x = rng() * edge;
      const y = h * (0.15 + rng() * 0.6);
      g.fillStyle = ['#22362a', '#2a4232', '#18241d'][Math.floor(rng() * 3)];
      g.beginPath();
      g.moveTo(x, y - h * 0.08);
      g.lineTo(x + w * 0.008, y);
      g.lineTo(x - w * 0.008, y);
      g.fill();
    }
  },

  meadow(g, w, h, rng) {
    // Twenty metres of dry meadow, seen edge-on: golden grass, darker toward
    // the bottom of the picture, which is nearer.
    const ground = g.createLinearGradient(0, 0, 0, h);
    ground.addColorStop(0, '#d9bf7f');
    ground.addColorStop(1, '#a88a4c');
    g.fillStyle = ground;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,92,48,0.35)';
    g.lineWidth = 2;
    for (let i = 0; i < 3000; i++) {
      const x = rng() * w;
      const y = rng() * h;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rng() - 0.5) * 6, y - 4 - rng() * 8);
      g.stroke();
    }
  },

  deer(g, w, h) {
    // A mule deer side-on, facing left and looking at the camera: body, neck,
    // big ears, legs to the hooves. Drawn in metres: 2.4 × 1.8 m, middle on the axis.
    const X = (m: number) => ((m + 1.2) / 2.4) * w;
    const Y = (m: number) => ((0.75 - m) / 1.8) * h;
    const R = (m: number) => (m / 2.4) * w;
    g.fillStyle = '#8a6e52';
    g.beginPath();
    g.ellipse(X(0.1), Y(0.0), R(0.62), R(0.27), 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(X(-0.38), Y(0.12));
    g.lineTo(X(-0.55), Y(0.52));
    g.lineTo(X(-0.36), Y(0.56));
    g.lineTo(X(-0.2), Y(0.16));
    g.fill();
    g.beginPath();
    g.ellipse(X(-0.5), Y(0.58), R(0.12), R(0.09), 0.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#7a5f46';
    for (const [x, r] of [[-0.62, -0.5], [-0.38, 0.5]] as const) {
      g.beginPath();
      g.ellipse(X(x), Y(0.72), R(0.1), R(0.045), r, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#efe6d6';
    g.beginPath();
    g.ellipse(X(0.68), Y(0.02), R(0.1), R(0.14), 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(X(-0.52), Y(0.52), R(0.05), R(0.03), 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1b1b1b';
    g.beginPath();
    g.arc(X(-0.6), Y(0.56), R(0.018), 0, Math.PI * 2);
    g.arc(X(-0.47), Y(0.6), R(0.014), 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#6e563f';
    g.lineCap = 'round';
    g.lineWidth = R(0.06);
    for (const x of [-0.3, -0.18, 0.38, 0.52]) {
      g.beginPath();
      g.moveTo(X(x), Y(-0.15));
      g.lineTo(X(x + 0.02), Y(-0.98));
      g.stroke();
    }
  },

  grass(g, w, h, rng) {
    // Two metres of tall dry grass rising from the bottom edge, with seed heads.
    for (let i = 0; i < 700; i++) {
      const x = rng() * w;
      const tall = h * (0.4 + rng() * 0.6);
      g.strokeStyle = ['#c9a96a', '#b8955a', '#d8bd84', '#a3854f'][Math.floor(rng() * 4)];
      g.lineWidth = 2 + rng() * 3;
      g.beginPath();
      g.moveTo(x, h);
      const tx = x + (rng() - 0.5) * w * 0.05;
      g.quadraticCurveTo(x, h - tall * 0.6, tx, h - tall);
      g.stroke();
      if (rng() < 0.35) {
        g.fillStyle = '#e2cb93';
        g.beginPath();
        g.ellipse(tx, h - tall, 4, 14, 0.2, 0, Math.PI * 2);
        g.fill();
      }
    }
  },
};
