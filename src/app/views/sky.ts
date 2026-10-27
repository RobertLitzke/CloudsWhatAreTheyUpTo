// The sky lab: a live slice of weather to play with. Set the sun, the damp,
// the wind and how stable the air is, tap the sky to warm a bubble of air, and
// watch what the air does. The weather is core/sky-sim.ts; the drawing is
// app/sky/board.ts; this file holds the controls and the clock.

import { el } from 'lesson-kit/dom';
import type { View } from 'lesson-kit/router';
import { LEVELS, SCENARIOS, SkySim, type Controls } from '../../core/sky-sim';
import { Board } from '../sky/board';

/** Simulated seconds per real second, by speed. */
const SPEEDS = [240, 720] as const;
/** Most time a frame may spend stepping the weather, ms. */
const BUDGET_MS = 9;

const ICON = {
  play: '<svg viewBox="0 0 20 20"><path d="M6 4l10 6-10 6z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 20 20"><path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z" fill="currentColor"/></svg>',
  reset: '<svg viewBox="0 0 20 20"><path d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 2.5v4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sun: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="3.6" fill="currentColor"/><path d="M10 1.8v2.4M10 15.8v2.4M1.8 10h2.4M15.8 10h2.4M4.2 4.2l1.7 1.7M14.1 14.1l1.7 1.7M4.2 15.8l1.7-1.7M14.1 5.9l1.7-1.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  damp: '<svg viewBox="0 0 20 20"><path d="M10 2.5c3 4 5 6.6 5 9a5 5 0 0 1-10 0c0-2.4 2-5 5-9z" fill="currentColor"/></svg>',
  air: '<svg viewBox="0 0 20 20"><path d="M3 15h14M5 11h10M7 7h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};

const STABILITY = ['Stable', 'Average', 'Unstable'];

function icon(svgText: string): HTMLElement {
  const s = el('span.sky-icon');
  s.innerHTML = svgText;
  return s;
}

function pips(level: number, max: number): HTMLElement {
  return el('span.sky-pips', {}, Array.from({ length: max }, (_, n) => el(n < level ? 'i.on' : 'i')));
}

export const skyView: View = (root) => {
  const scenario = SCENARIOS[0];
  let controls: Controls = { ...scenario.start };
  let sim = new SkySim(scenario, controls);
  const board = new Board(sim);
  let speed = 0;
  let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let alive = true;

  const playBtn = el('button.sky-round', { type: 'button', 'aria-label': 'Pause' });
  const speedBtn = el('button.sky-round.sky-speed', { type: 'button', 'aria-label': 'Speed' });
  const resetBtn = el('button.sky-round', { type: 'button', 'aria-label': 'Start the day again' }, icon(ICON.reset));

  const paintTransport = () => {
    playBtn.replaceChildren(icon(playing ? ICON.pause : ICON.play));
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    speedBtn.textContent = speed === 0 ? '1×' : '3×';
  };
  playBtn.onclick = () => {
    playing = !playing;
    paintTransport();
  };
  speedBtn.onclick = () => {
    speed = 1 - speed;
    paintTransport();
  };
  resetBtn.onclick = () => {
    sim = new SkySim(scenario, controls);
    board.setSim(sim);
  };

  // ---- Controls: each chip cycles its notches ----------------------------

  const chips = el('div.sky-chips');
  const paintChips = () => {
    chips.replaceChildren(
      chip('Sun', icon(ICON.sun), pips(controls.sun, LEVELS.sun), () => change({ sun: (controls.sun + 1) % (LEVELS.sun + 1) })),
      chip('Damp', icon(ICON.damp), pips(controls.moisture, LEVELS.moisture), () => change({ moisture: (controls.moisture + 1) % (LEVELS.moisture + 1) })),
      chip('Air', icon(ICON.air), el('span.sky-word', {}, STABILITY[controls.stability]), () => change({ stability: (controls.stability + 1) % (LEVELS.stability + 1) })),
      windChip(),
    );
  };
  const change = (next: Partial<Controls>) => {
    controls = { ...controls, ...next };
    sim.set(next);
    paintChips();
  };
  function chip(label: string, ic: HTMLElement, value: HTMLElement, onTap: () => void): HTMLElement {
    return el('button.sky-chip', { type: 'button', onclick: onTap, 'aria-label': label }, ic, el('span.sky-label', {}, label), value);
  }
  function windChip(): HTMLElement {
    const v = controls.wind;
    const arrows = v === 0 ? 'calm' : (v > 0 ? '→' : '←').repeat(Math.abs(v));
    const step = (d: number) => () => change({ wind: Math.max(-LEVELS.wind, Math.min(LEVELS.wind, controls.wind + d)) });
    return el(
      'div.sky-chip.sky-wind',
      {},
      el('button', { type: 'button', 'aria-label': 'Wind more from the east', onclick: step(-1) }, '‹'),
      el('span.sky-label', {}, 'Wind'),
      el('span.sky-word', {}, arrows),
      el('button', { type: 'button', 'aria-label': 'Wind more from the west', onclick: step(1) }, '›'),
    );
  }

  // ---- The board --------------------------------------------------------

  const frame = el('div.sky-frame', {}, board.canvas);
  board.canvas.addEventListener('pointerdown', (e) => {
    const r = board.canvas.getBoundingClientRect();
    const p = board.toKm(e.clientX - r.left, e.clientY - r.top);
    const ground = scenario.ground(p.x).h / 1000;
    const z = Math.max(p.z, ground + 0.4);
    sim.bubble(p.x, z);
    board.ripple(p.x, z);
  });

  const page = el(
    'div.page.sky',
    {},
    el('div.sky-head', {}, el('h1', {}, scenario.name), el('span.sky-gap'), playBtn, speedBtn, resetBtn),
    frame,
    chips,
    el('p.sky-hint', {}, 'Tap the sky to warm a bubble of air.'),
  );
  root.append(page);
  paintTransport();
  paintChips();

  const fit = () => {
    const w = frame.clientWidth;
    board.resize(w, Math.round(Math.min(w * 1.25, window.innerHeight * 0.64)));
  };
  const ro = new ResizeObserver(fit);
  ro.observe(frame);
  fit();

  let last = performance.now();
  let owed = 0;
  const loop = (now: number) => {
    if (!alive) return;
    const real = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing && !document.hidden) {
      owed += real * SPEEDS[speed];
      const t0 = performance.now();
      let ran = 0;
      while (owed >= sim.dt && performance.now() - t0 < BUDGET_MS) {
        sim.step();
        owed -= sim.dt;
        ran += sim.dt;
      }
      // If the phone can't keep up, the day runs slower rather than stuttering.
      owed = Math.min(owed, sim.dt);
      if (ran) board.drift(ran);
    }
    board.draw(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  return () => {
    alive = false;
    ro.disconnect();
  };
};
