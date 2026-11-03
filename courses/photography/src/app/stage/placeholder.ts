// Stand-in pictures for a stage's planes, drawn here until real ones (made
// sharp from edge to edge, see the stage's README brief) are in
// public/stage/<stage>/. Flat shapes in the course's quiet colours, with
// enough small detail (leaves, needles, bark) that blur shows, and bright
// glints on the leaves so the out-of-focus discs can be seen as discs.

import { makeRng, type Rng } from 'didactics/rng';

/** Pixels across each stand-in, by plane id. Its height follows the plane's proportions. */
const WIDTH: Record<string, number> = { hills: 2048, trees: 2048, bushes: 2048, bird: 2048 };

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
};
