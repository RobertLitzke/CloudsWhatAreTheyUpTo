// Panning: swinging the camera with a moving bird while the shutter is open.
// What smears is whatever moves across the sensor: the background by as much
// as the camera turned, the bird by the difference between its speed and the
// camera's. Matched, the bird is sharp and the trees behind it are streaks,
// the picture that says "fast" better than a frozen one does.
//
// Drawn, not photographed: the trees are vertical strokes, so their streaks
// read at once, and the bird is a flat shape in the course's ink.

import { el } from 'didactics/dom';
import { makeRng } from 'didactics/rng';
import { shutterLabel } from '../../core/camera';
import { figure, frame, shutterSlider, slider } from './kit';

const W = 760;
const H = 300;
/** How far the bird crosses the frame in a second, in canvas pixels (a swallow at 30 m, 600 mm). */
const BIRD = 900;
const COPIES = 24;

function drawTrees(): HTMLCanvasElement | null {
  const c = document.createElement('canvas');
  c.width = W * 3;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#cfe0ea');
  sky.addColorStop(1, '#eef3f2');
  g.fillStyle = sky;
  g.fillRect(0, 0, c.width, H);
  const rng = makeRng(7);
  for (let i = 0; i < 150; i++) {
    const x = rng() * c.width;
    const w = 4 + rng() * 16;
    g.fillStyle = ['#2f4f43', '#476b52', '#5f4a3a', '#3d5f4c'][Math.floor(rng() * 4)];
    g.fillRect(x, H * (0.1 + rng() * 0.3), w, H);
  }
  g.fillStyle = '#c9b68e';
  g.fillRect(0, H * 0.86, c.width, H * 0.14);
  return c;
}

function drawBird(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = '#1d2430';
  g.beginPath();
  g.ellipse(x, y, 26, 9, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(x - 6, y - 4);
  g.quadraticCurveTo(x - 20, y - 40, x - 46, y - 46);
  g.quadraticCurveTo(x - 18, y - 22, x + 8, y - 2);
  g.fill();
  g.beginPath();
  g.moveTo(x + 24, y - 3);
  g.lineTo(x + 36, y + 1);
  g.lineTo(x + 24, y + 4);
  g.fill();
  g.beginPath();
  g.moveTo(x - 24, y);
  g.lineTo(x - 44, y - 8);
  g.lineTo(x - 40, y + 6);
  g.fill();
}

export const panFigure = figure(['pan'], (_ctx, t) => {
  const canvas = el('canvas.shot', { width: W, height: H, role: 'img', 'aria-label': 'A bird flying past a line of trees' }) as HTMLCanvasElement;
  const caption = el('p.shot-settings');
  const f = frame({ drawing: el('figure.photo.shot-figure', {}, canvas, caption), lines: 3 });
  f.node.classList.add('shot-body');
  const trees = drawTrees();
  const g = canvas.getContext?.('2d') ?? null;

  let shutter = 1 / 1000;
  let pan = 0; // the camera's swing, as a share of the bird's speed

  const paint = () => {
    const travel = BIRD * shutter; // the bird's path while the shutter is open, px
    const bg = pan * travel; // how far the trees slide across the sensor
    const bird = Math.abs(1 - pan) * travel; // how far the bird does
    caption.textContent = `600 mm · ${shutterLabel(shutter)} s · ${pan === 0 ? 'camera still' : `panning at ${Math.round(pan * 100)}% of the bird's speed`}`;
    if (g && trees) {
      g.globalAlpha = 1;
      g.clearRect(0, 0, W, H);
      const steps = bg > 1 ? COPIES : 1;
      for (let i = 0; i < steps; i++) {
        g.globalAlpha = 1 / (i + 1); // running average: each copy weighs the same
        g.drawImage(trees, -W + (steps > 1 ? (i / (steps - 1) - 0.5) * bg : 0), 0);
      }
      const bsteps = bird > 1 ? COPIES : 1;
      const layer = document.createElement('canvas');
      layer.width = W;
      layer.height = H;
      const lg = layer.getContext('2d')!;
      drawBird(lg, W / 2, H * 0.45);
      // The smeared bird is the average of its copies, transparent around them
      // (source-over at 1/(i+1) on a clear canvas is a running average).
      const sum = document.createElement('canvas');
      sum.width = W;
      sum.height = H;
      const sg = sum.getContext('2d')!;
      for (let i = 0; i < bsteps; i++) {
        sg.globalAlpha = 1 / (i + 1);
        sg.drawImage(layer, bsteps > 1 ? (i / (bsteps - 1) - 0.5) * bird : 0, 0);
      }
      g.globalAlpha = 1;
      g.drawImage(sum, 0, 0);
    }
    f.readout.textContent = `The bird smears ${bird.toFixed(0)} pixels and the trees ${bg.toFixed(0)}. ` +
      (bird < 3 && bg > 30 ? 'A sharp bird on streaked trees: that is a pan.'
        : bird < 3 ? 'Frozen, bird and trees alike.'
          : pan > 0.05 ? 'The camera is swinging, but not with the bird.' : 'The bird smears across sharp trees.');
    if (t.goal === 'pan' && bird < 4 && bg > 30) t.done();
  };

  f.controls.append(
    shutterSlider(shutter, (v) => { shutter = v; paint(); }).node,
    slider('Pan', { min: 0, max: 1.4, step: 0.05, value: 0, show: (v) => (v === 0 ? 'still' : `${Math.round(v * 100)}% of the bird`), onInput: (v) => { pan = v; paint(); }, color: 'time' }).node,
  );
  paint();
  return f.node;
});
