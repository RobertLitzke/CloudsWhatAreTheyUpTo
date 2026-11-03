// Stand-in pictures for a stage's planes, drawn here until real ones (made
// sharp from edge to edge, see the stage's README brief) are in
// public/stage/<stage>/. Flat shapes in the course's quiet colours, with
// enough small detail (leaves, needles, bark) that blur shows, and bright
// glints on the leaves so the out-of-focus discs can be seen as discs.

import { makeRng, type Rng } from 'didactics/rng';

/** Pixels across each stand-in, by plane id. Its height follows the plane's proportions. */
const WIDTH: Record<string, number> = { hills: 2048, trees: 2048, bushes: 2048, bird: 2048, sky: 1024, moon: 1024, ridge: 2048, pine: 1024 };

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
};
