// Free play: every knob, continuous, with the scope on and no score. What
// loops is chosen in one place: a riff, a loop of your own, or the keyboard,
// which is where you play by hand and record a loop. This is also the test
// bench for the engine and the knob ranges.

import { getEngine, peekEngine, riffLoop, type Engine, type Loop } from '../../audio/engine';
import { LATEST_RULES } from '../../core/gen';
import { loopSeconds, recordLoop, sixteenthSeconds, SIXTEENTHS_PER_BAR, type KeyEvent, type UserLoop } from '../../core/loop';
import { LAST_STAGE, PARAM_IDS, resolve, type Patch } from '../../core/params';
import { RIFFS, riffById, type Riff, type RiffGroup } from '../../core/riffs';
import { deleteLoop, deletePatch, saveLoop, savePatch } from '../../core/storage';
import { createKeys } from '../components/keys';
import { createPanel } from '../components/panel';
import { createScope } from '../components/scope';
import { el } from '../dom';
import type { View } from 'didactics/router';
import { getSave, updateSave } from '../store';
import { immersive, page, segmented, toast } from '../ui';

const GROUP_NAMES: Record<RiffGroup, string> = {
  electronic: 'Electronic',
  pop: 'Pop',
  rock: 'Metal and rock',
  'pearl-jam': 'Pearl Jam',
  'iron-wine': 'Iron & Wine',
  folk: 'Public-domain folk',
};

/**
 * What the loop is: a riff, a loop of your own (saved, or the take just
 * recorded), or nothing yet because the keyboard is being played by hand.
 */
type Source = { kind: 'riff'; riff: Riff } | { kind: 'loop'; loop: UserLoop; saved: boolean } | { kind: 'keys' };

const TAKE = 'take';
const KEYS = 'keys';
const TEMPO_MIN = 40;
const TEMPO_MAX = 240;
const TEMPO_STEP = 5;
const NOTHING: Loop = { notes: [], duration: 1, barSeconds: 1, sixSeconds: 1 / 16 };

// Kept for the session, so leaving and coming back does not lose a sound.
let sessionPatch: Patch | null = null;
let sessionSource: Source | null = null;
let sessionBpm: number | null = null;

export const freeplayView: View = (root) => {
  const rules = LATEST_RULES;
  const fresh = (): Patch => ({ ...rules.defaults, cutoff: 5, sustain: 3 });
  let patch: Patch = sessionPatch ?? fresh();
  let source: Source = sessionSource ?? { kind: 'riff', riff: RIFFS.find((r) => r.sure === 3) ?? RIFFS[0] };
  /** The tempo of whatever is looping, and of the next recording. */
  let bpm = sessionBpm ?? (source.kind === 'riff' ? source.riff.bpm : source.kind === 'loop' ? source.loop.bpm : 120);

  const sound = () => resolve(patch, rules.steps);
  const barSeconds = () => SIXTEENTHS_PER_BAR * sixteenthSeconds(bpm);
  const loopNow = (): Loop =>
    source.kind === 'riff' ? riffLoop(source.riff, bpm) : source.kind === 'loop' ? loopSeconds({ ...source.loop, bpm }) : NOTHING;

  // --- audio -------------------------------------------------------------------
  const scope = createScope();
  let armed = false;
  /** The engine with this page's one voice on it. Call from a user gesture. */
  const arm = (): Engine => {
    const engine = getEngine();
    if (!armed) {
      armed = true;
      engine.onState = paintPlay;
      engine.setVolume(getSave().volume);
      engine.setVoices([sound()]);
      engine.setLoop(loopNow());
      scope.start(engine.analyser);
    }
    return engine;
  };
  /** Hand the engine the loop as it now stands. If it is playing, it starts again from the top. */
  const reload = () => {
    if (armed) peekEngine()?.setLoop(loopNow());
  };

  // --- the display strip ---------------------------------------------------------
  const tempo = el('b', {}, '');
  const bars = (n: number) => `${n} bar${n === 1 ? '' : 's'}`;
  const paintSource = () => {
    tempo.textContent = String(bpm);
  };
  const setTempo = (next: number) => {
    const clamped = Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, next));
    if (clamped === bpm || take) return;
    bpm = clamped;
    sessionBpm = bpm;
    tempo.textContent = String(bpm);
    reload();
  };

  const playBtn = el('button.btn.play.btn-primary', { type: 'button', 'aria-label': 'Play' }, '▶');
  function paintPlay(): void {
    const playing = peekEngine()?.playing === true;
    playBtn.textContent = playing ? '■' : '▶';
    playBtn.setAttribute('aria-label', playing ? 'Stop' : 'Play');
    playBtn.classList.toggle('btn-primary', !playing);
    (playBtn as HTMLButtonElement).disabled = source.kind === 'keys';
  }
  const togglePlay = () => {
    if (take || source.kind === 'keys') return;
    arm().toggle();
  };
  playBtn.addEventListener('click', togglePlay);

  // --- which loop ------------------------------------------------------------------
  const select = el('select', { 'aria-label': 'What loops' }) as HTMLSelectElement;
  const deleteLoopBtn = el('button.btn.btn-small', { type: 'button' }, 'Delete loop');
  const paintSelect = () => {
    const groups: HTMLElement[] = [];
    const loops = getSave().loops;
    const unsaved = source.kind === 'loop' && !source.saved ? source.loop : null;
    const own = el('optgroup', { label: 'Your own' }, el('option', { value: KEYS, selected: source.kind === 'keys' }, 'Keyboard: play and record'));
    if (unsaved) own.append(el('option', { value: TAKE, selected: true }, `${unsaved.name} (not saved)`));
    loops.forEach((l, i) =>
      own.append(el('option', { value: `loop:${i}`, selected: source.kind === 'loop' && source.saved && source.loop.name === l.name }, l.name)),
    );
    groups.push(own);
    for (const group of Object.keys(GROUP_NAMES) as RiffGroup[]) {
      const riffs = RIFFS.filter((r) => r.group === group);
      if (riffs.length === 0) continue;
      const og = el('optgroup', { label: GROUP_NAMES[group] });
      for (const r of riffs) {
        og.append(
          el(
            'option',
            { value: `riff:${r.id}`, selected: source.kind === 'riff' && r.id === source.riff.id },
            `${r.title} · ${r.artist}${r.sure === 1 ? ' (unchecked)' : ''}`,
          ),
        );
      }
      groups.push(og);
    }
    select.replaceChildren(...groups);
    deleteLoopBtn.hidden = !(source.kind === 'loop' && source.saved);
  };

  /** Switch what loops. A riff or a saved loop brings its own tempo. */
  const use = (next: Source, keepTempo = false) => {
    source = next;
    sessionSource = next;
    if (!keepTempo && next.kind !== 'keys') {
      bpm = next.kind === 'riff' ? next.riff.bpm : next.loop.bpm;
      sessionBpm = bpm;
    }
    if (next.kind === 'keys') peekEngine()?.stop();
    paintSource();
    paintSelect();
    paintBench();
    paintPlay();
    reload();
  };
  select.addEventListener('change', () => {
    const [kind, n] = select.value.split(':');
    if (kind === KEYS) use({ kind: 'keys' });
    else if (kind === 'riff') {
      const riff = riffById(Number(n));
      if (riff) use({ kind: 'riff', riff });
    } else if (kind === 'loop') {
      const loop = getSave().loops[Number(n)];
      if (loop) use({ kind: 'loop', loop, saved: true });
    }
  });
  deleteLoopBtn.addEventListener('click', () => {
    if (source.kind !== 'loop' || !source.saved) return;
    const loop = source.loop;
    if (!confirm(`Delete the loop "${loop.name}"?`)) return;
    updateSave((s) => deleteLoop(s, loop.name));
    // What is playing stays, as a take that could be saved again.
    use({ kind: 'loop', loop, saved: false }, true);
  });

  // --- the panel -------------------------------------------------------------------
  const setPatch = (next: Patch) => {
    patch = next;
    sessionPatch = next;
    panel.update(patch);
    if (armed) peekEngine()?.setSound(0, sound());
  };
  const panel = createPanel({
    rules,
    patch,
    enabled: PARAM_IDS,
    stage: LAST_STAGE,
    continuous: true,
    onMove: (id, pos) => setPatch({ ...patch, [id]: pos }),
  });

  // --- the keyboard, and recording from it --------------------------------------------
  let takeBars = 2;
  let take: { start: number; end: number; events: KeyEvent[]; timer: number } | null = null;

  const quantise = el('input', { type: 'checkbox', checked: true }) as HTMLInputElement;
  const recBtn = el('button.btn.btn-commit', { type: 'button' }, '● Record');
  const recStatus = el('p.note', { role: 'status' }, '');
  const idleStatus = () =>
    'Play the keys by touch, or type A S D F… for white keys and W E T… for black (Z and X change octave). Record gives one bar of clicks, then takes what you play and loops it.';
  const loopName = el('input', { type: 'text', placeholder: 'Name this loop', maxLength: 40, 'aria-label': 'Loop name' }) as HTMLInputElement;
  const saveTake = () => {
    if (source.kind !== 'loop') return;
    const name = loopName.value.trim();
    if (!name) {
      loopName.focus();
      return;
    }
    // Kept at the tempo it is playing at now, which may not be the one it was played at.
    const loop: UserLoop = { ...source.loop, name, bpm };
    updateSave((s) => saveLoop(s, loop));
    loopName.value = '';
    use({ kind: 'loop', loop: getSave().loops[0], saved: true });
    toast('Loop saved');
  };
  const saveLoopRow = el('div.row', { hidden: true }, loopName, el('button.btn', { type: 'button', onclick: saveTake }, 'Save loop'));

  const endTake = (keep: boolean) => {
    if (!take) return;
    const done = take;
    take = null;
    clearInterval(done.timer);
    const engine = arm();
    engine.cancelClicks();
    engine.key(null);
    if (!keep) {
      recStatus.textContent = 'Cancelled.';
      paintBench();
      return;
    }
    const notes = recordLoop(done.events, { bpm, bars: takeBars, quantise: quantise.checked });
    if (notes.length === 0) {
      recStatus.textContent = 'Nothing was played in that take. Press Record and play after the count-in.';
      paintBench();
      return;
    }
    recStatus.textContent = `Recorded ${notes.length} note${notes.length === 1 ? '' : 's'}. Record again to replace it, or name it to keep it.`;
    use({ kind: 'loop', loop: { name: 'New take', bpm, bars: takeBars, notes }, saved: false }, true);
    engine.start();
  };

  recBtn.addEventListener('click', () => {
    if (take) {
      endTake(false);
      return;
    }
    const engine = arm();
    engine.stop();
    const beat = 4 * sixteenthSeconds(bpm);
    const bar = barSeconds();
    const first = engine.now + 0.15;
    const start = first + bar;
    const end = start + takeBars * bar;
    for (let b = 0; b < 4 * (1 + takeBars); b++) engine.click(first + b * beat, b % 4 === 0);
    const timer = window.setInterval(() => {
      const now = engine.now;
      if (now >= end + 0.03) endTake(true);
      else if (now < start) recStatus.textContent = `Count-in: ${Math.max(1, Math.ceil((start - now) / beat))}`;
      else recStatus.textContent = `Recording: bar ${Math.min(takeBars, 1 + Math.floor((now - start) / bar))} of ${takeBars}`;
    }, 50);
    take = { start, end, events: [], timer };
    recStatus.textContent = 'Count-in: 4';
    paintBench();
  });

  const keys = createKeys({
    onNote: (midi, vel) => {
      // Nothing can be sounding before the first key has gone down.
      if (midi == null && !armed) return;
      arm().key(midi, barSeconds(), vel);
    },
    onPressure: (p) => {
      if (armed) arm().pressure(p);
    },
    onHeld: (held) => {
      if (armed) arm().hold(held);
    },
    onKey: (midi, down) => {
      if (!take) return;
      // The click was heard a little after the clock said, and the key follows the click.
      const engine = arm();
      take.events.push({ t: engine.now - engine.latency - take.start, midi, down });
    },
  });
  const recorder = el(
    'section.card.stack',
    {},
    el('div', {}, el('span.caps.mode-name', {}, 'Record a loop'), recStatus),
    el(
      'div.row',
      {},
      recBtn,
      segmented(
        [1, 2, 4].map((n) => ({ value: n, label: bars(n) })),
        takeBars,
        (n) => (takeBars = n),
      ),
      el('label.row.check', {}, quantise, el('span', {}, 'Snap to sixteenths')),
      deleteLoopBtn,
    ),
    saveLoopRow,
  );

  /** The keyboard and its recorder are there when the loop is your own, and away when it is a riff. */
  function paintBench(): void {
    const own = source.kind !== 'riff';
    keys.el.hidden = !own;
    keys.setActive(own);
    recorder.hidden = !own;
    recBtn.textContent = take ? '■ Cancel' : '● Record';
    saveLoopRow.hidden = take != null || !(source.kind === 'loop' && !source.saved);
    if (!take && !/^(Recorded|Nothing|Cancelled)/.test(recStatus.textContent ?? '')) recStatus.textContent = idleStatus();
  }

  // --- saved sounds -----------------------------------------------------------------
  const patchSelect = el('select', { 'aria-label': 'Saved sounds' }) as HTMLSelectElement;
  const patchName = el('input', { type: 'text', placeholder: 'Name this sound', maxLength: 40, 'aria-label': 'Sound name' }) as HTMLInputElement;
  const deletePatchBtn = el('button.btn.btn-small', { type: 'button', hidden: true }, 'Delete');
  let chosen = '';
  const paintPatches = () => {
    const patches = getSave().patches;
    patchSelect.replaceChildren(
      el('option', { value: '' }, patches.length === 0 ? 'No saved sounds yet' : 'Saved sounds…'),
      ...patches.map((p) => el('option', { value: p.name, selected: p.name === chosen }, p.name)),
    );
    patchSelect.disabled = patches.length === 0;
    deletePatchBtn.hidden = !patches.some((p) => p.name === chosen);
  };
  patchSelect.addEventListener('change', () => {
    chosen = patchSelect.value;
    const saved = getSave().patches.find((p) => p.name === chosen);
    // Knobs added since it was saved take their defaults.
    if (saved) setPatch({ ...rules.defaults, ...saved.patch });
    paintPatches();
  });
  const saveSound = () => {
    const name = patchName.value.trim() || chosen;
    if (!name) {
      patchName.focus();
      return;
    }
    updateSave((s) => savePatch(s, name, patch));
    chosen = getSave().patches[0].name;
    patchName.value = '';
    paintPatches();
    toast('Sound saved');
  };
  patchName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveSound();
  });
  deletePatchBtn.addEventListener('click', () => {
    if (!confirm(`Delete the sound "${chosen}"?`)) return;
    updateSave((s) => deletePatch(s, chosen));
    chosen = '';
    paintPatches();
  });

  const onSpace = (e: KeyboardEvent) => {
    if (e.key !== ' ' || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    e.preventDefault();
    if (e.target instanceof HTMLButtonElement) e.target.blur();
    togglePlay();
  };
  document.addEventListener('keydown', onSpace);

  paintSource();
  paintSelect();
  paintBench();
  paintPatches();
  paintPlay();

  const leave = immersive();
  root.replaceChildren(
    page(
      el(
        'div.deck',
        {},
        el(
          'div.rail',
          {},
          el('a.rail-exit', { href: '#/ear' }, '‹ PatchMatch'),
          el(
            'div.transport.one-row',
            {},
            playBtn,
            select,
            el(
              'div.tempo',
              { role: 'group', 'aria-label': 'Tempo' },
              el('button', { type: 'button', 'aria-label': 'Slower', onclick: () => setTempo(bpm - TEMPO_STEP) }, '−'),
              el('div', {}, el('label', {}, 'Tempo'), tempo),
              el('button', { type: 'button', 'aria-label': 'Faster', onclick: () => setTempo(bpm + TEMPO_STEP) }, '+'),
            ),
          ),
          scope.el,
        ),
        panel.el,
      ),
      keys.el,
      recorder,
      el(
        'section.card.stack',
        {},
        el('span.caps.mode-name', {}, 'Sounds'),
        el('div.row', {}, patchSelect, deletePatchBtn, el('button.btn.btn-small', { type: 'button', onclick: () => setPatch(fresh()) }, 'Reset knobs')),
        el('div.row', {}, patchName, el('button.btn', { type: 'button', onclick: saveSound }, 'Save sound')),
      ),
      el(
        'p.note',
        {},
        'Drag a knob up or down. On a computer you can also roll the wheel over it, or focus it and use the arrow keys; Space starts and stops the loop. The LFO is tied to the tempo and restarts with the loop. Sounds and loops are kept in this browser and travel with the export in Settings.',
        RIFFS.some((r) => r.sure === 1) ? ' Riffs marked unchecked were written down from memory and have not been checked by ear.' : '',
      ),
    ),
  );
  root.firstElementChild?.classList.add('bench');

  return () => {
    leave();
    document.removeEventListener('keydown', onSpace);
    if (take) clearInterval(take.timer);
    take = null;
    keys.destroy();
    scope.stop();
    const engine = peekEngine();
    if (engine) {
      engine.cancelClicks();
      engine.onState = null;
      engine.stop();
      if (armed) engine.key(null);
    }
  };
};
