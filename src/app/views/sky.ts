// The sky lab: a live slice of weather to play with. Set the sun, the damp,
// the wind and how cold the air is aloft, tap the sky to warm a bubble of air,
// and watch what the air does; lay the air's temperature, humidity or rising
// and sinking over it to see why. The weather is core/sky-sim.ts; the drawing
// is app/sky/board.ts; this file holds the controls and the clock.

import { el } from 'didactics/dom';
import type { View } from 'didactics/router';
import { RANGES, SCENARIOS, SkySim, type Controls } from '../../core/sky-sim';
import { Board, type Overlay } from '../sky/board';

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
  wind: '<svg viewBox="0 0 20 20"><path d="M2.5 8h10a2.5 2.5 0 1 0-2.5-2.5M2.5 12.5h12.5a2.5 2.5 0 1 1-2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  aloft: '<svg viewBox="0 0 20 20"><path d="M10 2v10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="14.5" r="3" fill="currentColor"/><path d="M13 4.5h3M13 7.5h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
};

const OVERLAYS: readonly { value: Overlay; label: string }[] = [
  { value: 'none', label: 'Sky' },
  { value: 'temp', label: 'Temp' },
  { value: 'humidity', label: 'Humidity' },
  { value: 'lift', label: 'Lift' },
];

function icon(svgText: string): HTMLElement {
  const s = el('span.sky-icon');
  s.innerHTML = svgText;
  return s;
}

const fmtTemp = (c: number) => `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c)} °C`;
const fmtWind = (v: number) => (v === 0 ? 'calm' : `${v > 0 ? '→' : '←'} ${Math.abs(v)} m/s`);

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

  // ---- Controls: a − and + on each, stopping at the ends ------------------

  function stepper(key: keyof Controls, label: string, ic: string, show: (v: number) => string, meter: boolean): HTMLElement {
    const r = RANGES[key];
    const value = el('span.sky-value');
    const fill = el('i');
    const down = el('button.sky-step', { type: 'button', 'aria-label': `Less ${label.toLowerCase()}` }, '−');
    const up = el('button.sky-step', { type: 'button', 'aria-label': `More ${label.toLowerCase()}` }, '+');
    const paint = () => {
      const v = controls[key];
      value.textContent = show(v);
      fill.style.width = `${((v - r.min) / (r.max - r.min)) * 100}%`;
      (down as HTMLButtonElement).disabled = v <= r.min;
      (up as HTMLButtonElement).disabled = v >= r.max;
    };
    const nudge = (d: number) => () => {
      const v = Math.min(r.max, Math.max(r.min, Math.round((controls[key] + d * r.step) / r.step) * r.step));
      controls = { ...controls, [key]: v };
      sim.set({ [key]: v });
      paint();
    };
    down.onclick = nudge(-1);
    up.onclick = nudge(1);
    paint();
    return el(
      'div.sky-ctl',
      {},
      down,
      el('div.sky-ctl-mid', {}, el('span.sky-ctl-top', {}, icon(ic), el('span.sky-label', {}, label), value), meter ? el('span.sky-meter', {}, fill) : null),
      up,
    );
  }

  const chips = el(
    'div.sky-chips',
    {},
    stepper('sun', 'Sun', ICON.sun, (v) => `${v * 10}%`, true),
    stepper('humidity', 'Damp', ICON.damp, (v) => `${v}%`, true),
    stepper('windMs', 'Wind', ICON.wind, fmtWind, false),
    stepper('aloftC', '5 km up', ICON.aloft, fmtTemp, false),
  );

  const overlayRow = el(
    'div.sky-overlays',
    { role: 'group', 'aria-label': 'Show' },
    OVERLAYS.map((o) =>
      el(
        'button',
        {
          type: 'button',
          class: o.value === 'none' ? 'on' : '',
          onclick: (e: Event) => {
            board.overlay = o.value;
            overlayRow.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget));
          },
        },
        o.label,
      ),
    ),
  );

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
    overlayRow,
    chips,
    el('p.sky-hint', {}, 'Tap the sky to warm a bubble of air.'),
  );
  root.append(page);
  paintTransport();

  const fit = () => {
    const w = frame.clientWidth;
    board.resize(w, Math.round(Math.min(w * 1.2, window.innerHeight * 0.58)));
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
