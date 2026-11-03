// Arcade: puzzles back to back as one run. No commit and no goal: a level ends
// itself the moment the patch matches, and the next begins. The signal meter
// drains while a level plays and the run ends when it is empty. The rules and
// their numbers are in core/arcade.ts.

import { getEngine, peekEngine } from '../../audio/engine';
import { arcadeLevel, drain, multiplier, points, refill, SIGNAL_MAX, WASTED_COST } from '../../core/arcade';
import { STAGES, stageReached } from '../../core/campaign';
import { generatePuzzle, MAX_STAGE, mintKey, type Puzzle } from '../../core/gen';
import { resolve, type Patch } from '../../core/params';
import type { Riff } from '../../core/riffs';
import { scoredParams, stepsLeft } from '../../core/score';
import { recordArcade } from '../../core/storage';
import { createAb } from '../components/ab';
import { createPanel, type Panel } from '../components/panel';
import { el } from '../dom';
import type { View } from '../router';
import { getSave, updateSave } from '../store';
import { immersive, page, randomUnit, tick } from '../ui';

const VOICE = { target: 0, mine: 1 } as const;
/** How long a matched level is held on screen before the next one arrives. */
const LOCK_MS = 1100;
const TICK_MS = 100;

const LOCK_CHIME = [523.25, 659.25, 783.99, 1046.5];
const MISS_CHIME = [155.56, 116.54];
const OVER_CHIME = [392, 311.13, 261.63, 196];

/** One run, from level 1 until the signal is gone. Returns its teardown. */
function run(root: HTMLElement, lastStage: number, again: () => void): () => void {
  const engine = getEngine();
  let level = 0;
  let score = 0;
  let streak = 0;
  let cleared = 0;
  let signal = SIGNAL_MAX;
  /** Between a match and the next level, and after the run has ended, the knobs are still. */
  let held = false;
  let over = false;

  let puzzle: Puzzle;
  let riff: Riff;
  let mine: Patch;
  let panel: Panel;
  let wasted = 0;
  /** Seconds this level has been playing. */
  let elapsed = 0;
  let lockTimer = 0;

  // --- the display ----------------------------------------------------------
  const title = el('span.oled-title', {}, '');
  const sub = el('span.oled-sub', {}, '');
  const levelCell = el('b', {}, '1');
  const scoreCell = el('b', {}, '0');
  const streakCell = el('b', {}, '×1');
  const oled = el(
    'header.oled',
    {},
    el('div.oled-main', {}, title, sub),
    el('div.oled-cell', {}, el('label', {}, 'Level'), levelCell),
    el('div.oled-cell', {}, el('label', {}, 'Score'), scoreCell),
    el('div.oled-cell', {}, el('label', {}, 'Streak'), streakCell),
  );
  const fill = el('div.meter-fill');
  const meter = el('div.meter', { role: 'meter', 'aria-label': 'Signal', 'aria-valuemin': '0', 'aria-valuemax': String(SIGNAL_MAX) }, fill);
  const paint = () => {
    levelCell.textContent = String(level);
    scoreCell.textContent = String(score);
    streakCell.textContent = `×${multiplier(streak)}`;
    const left = Math.max(0, signal);
    fill.style.width = `${(100 * left) / SIGNAL_MAX}%`;
    meter.classList.toggle('low', left < 30);
    meter.setAttribute('aria-valuenow', String(Math.round(left)));
  };

  // --- transport ------------------------------------------------------------
  const pauseBtn = el('button.btn.play', { type: 'button', 'aria-label': 'Pause' }, '❚❚');
  const ab = createAb(
    [
      { label: 'Target', cls: 'target' },
      { label: 'Mine', cls: 'mine' },
    ],
    VOICE.target,
    (voice) => engine.select(voice),
  );
  const status = el('p.note.rail-note', { role: 'status' }, '');
  const transport = el('div.transport', {}, pauseBtn, ab.el);
  const idle = 'Match the target and the level locks by itself. A click that gets you no closer costs signal.';
  const paintPlay = () => {
    if (over) return;
    const playing = engine.playing;
    pauseBtn.textContent = playing ? '❚❚' : '▶';
    pauseBtn.setAttribute('aria-label', playing ? 'Pause' : 'Resume');
    pauseBtn.classList.toggle('btn-primary', !playing);
    status.textContent = playing ? idle : 'Paused. The signal holds while nothing is playing.';
    if (!held) panel?.setDisabled(!playing);
  };
  engine.onState = paintPlay;
  pauseBtn.addEventListener('click', () => engine.toggle());

  // --- the panel, and what flashes over it ------------------------------------
  const flash = el('div.arcade-flash', { 'aria-live': 'polite' });
  const slot = el('div.arcade-slot');
  const say = (kind: 'good' | 'bad', big: string, small = '') => {
    flash.className = `arcade-flash ${kind}`;
    flash.replaceChildren(el('b', {}, big), small ? el('span', {}, small) : '');
    // Restart the animation even when the same message comes twice running.
    void flash.offsetWidth;
    flash.classList.add('show');
  };

  const distance = () => Object.values(stepsLeft(puzzle, mine)).reduce((sum, n) => sum + n, 0);

  const next = () => {
    level++;
    const spec = arcadeLevel(level, lastStage);
    const made = generatePuzzle(mintKey(spec.stage, spec.tier, randomUnit), spec.index);
    if (!made.ok) {
      // Every pooled riff is in this copy, so this cannot happen; end the run rather than hang.
      finish();
      return;
    }
    puzzle = made.puzzle;
    riff = made.riff;
    mine = { ...puzzle.start };
    wasted = 0;
    elapsed = 0;
    held = false;
    const steps = puzzle.rules.steps;
    panel = createPanel({
      rules: puzzle.rules,
      patch: mine,
      enabled: puzzle.unlocked,
      stage: puzzle.key.stage,
      continuous: false,
      onMove: (id, pos) => {
        if (held || over || !engine.playing) return;
        const clamped = Math.min(steps[id].length - 1, Math.max(0, Math.round(pos)));
        if (clamped === mine[id]) return;
        const before = distance();
        mine = { ...mine, [id]: clamped };
        panel.update(mine);
        engine.setSound(VOICE.mine, resolve(mine, steps));
        if (ab.on !== VOICE.mine) {
          ab.show(VOICE.mine);
          engine.select(VOICE.mine);
        }
        const after = distance();
        if (after === 0) lock();
        else if (after >= before) miss();
        else tick();
      },
    });
    // Put back without its message: an element that returns to the page plays its animation again.
    flash.className = 'arcade-flash';
    slot.replaceChildren(panel.el, flash);
    title.textContent = riff.title;
    sub.textContent = `${riff.artist} · ${STAGES[puzzle.key.stage - 1].title}`;
    ab.show(VOICE.target);
    engine.setRiff(riff);
    engine.setVoices([resolve(puzzle.target, steps), resolve(mine, steps)], VOICE.target);
    engine.start();
    paint();
    paintPlay();
  };

  const miss = () => {
    wasted++;
    signal -= WASTED_COST;
    engine.chime(MISS_CHIME, 'sawtooth', 0.1);
    tick(40);
    meter.classList.remove('hit');
    void meter.offsetWidth;
    meter.classList.add('hit');
    paint();
    if (signal <= 0) finish();
  };

  const lock = () => {
    held = true;
    const clean = wasted === 0;
    const won = points(puzzle.turns, elapsed, streak);
    score += won;
    streak = clean ? streak + 1 : 0;
    cleared++;
    signal = Math.min(SIGNAL_MAX, signal + refill(puzzle.turns, clean));
    panel.setDisabled(true);
    engine.chime(LOCK_CHIME);
    tick(25);
    say('good', `Locked +${won}`, clean ? (streak > 1 ? `Clean. Streak ×${multiplier(streak)}` : 'Clean') : '');
    paint();
    lockTimer = window.setTimeout(next, LOCK_MS);
  };

  const finish = () => {
    if (over) return;
    over = true;
    held = true;
    clearInterval(clock);
    clearTimeout(lockTimer);
    engine.stop();
    engine.chime(OVER_CHIME);
    signal = 0;
    paint();
    const before = getSave().arcade;
    updateSave((s) => recordArcade(s, score, cleared));
    const best = score > before.score && score > 0;
    panel?.setDisabled(true);
    if (puzzle) panel?.setGhosts(puzzle.target, scoredParams(puzzle));
    transport.hidden = true;
    status.hidden = true;
    deck.classList.add('ended');
    oled.after(
      meter,
      el(
        'div.card.stack.arcade-over',
        {},
        el('div.verdict', {}, el(`span.name${best ? '.under' : ''}`, {}, best ? 'New best' : 'Signal lost'), el('span.line', {}, `${score} points`)),
        el(
          'p.note',
          {},
          `${cleared} level${cleared === 1 ? '' : 's'} cleared.`,
          best || before.score === 0 ? '' : ` Your best is ${before.score}.`,
          ' The orange rings show what this one was.',
        ),
        el('div.row', {}, el('button.btn.btn-primary', { type: 'button', onclick: again }, 'Run again'), el('a.btn', { href: '#/home' }, 'Home')),
      ),
    );
  };

  const clock = window.setInterval(() => {
    if (held || over || !engine.playing) return;
    const dt = TICK_MS / 1000;
    elapsed += dt;
    signal -= drain(level) * dt;
    paint();
    if (signal <= 0) finish();
  }, TICK_MS);

  engine.setVolume(getSave().volume);
  const leave = immersive();
  const deck = el('div.deck.arcade', {}, el('div.rail', {}, el('a.rail-exit', { href: '#/home' }, '‹ PatchMatch'), oled, meter, transport, status), slot);
  root.replaceChildren(deck);
  next();

  return () => {
    over = true;
    clearInterval(clock);
    clearTimeout(lockTimer);
    leave();
    ab.destroy();
    engine.onState = null;
    engine.stop();
  };
}

export const arcadeView: View = (root) => {
  let teardown: (() => void) | null = null;

  const intro = () => {
    const save = getSave();
    const lastStage = Math.min(MAX_STAGE, save.unlockAll ? MAX_STAGE : stageReached(save));
    const { arcade } = save;
    // Called from a tap, which is what lets the engine make sound.
    const start = () => {
      teardown?.();
      teardown = run(root, lastStage, start);
    };
    root.replaceChildren(
      page(
        el(
          'div',
          {},
          el('p.caps', {}, 'Arcade'),
          el('h1', {}, 'One patch after another, until the signal runs out.'),
          el('p.lead.muted', {}, 'The same listening as a round, played as a run. Nothing to commit and no goal to beat: get the patch right and the next one is already playing.'),
          // Above the rules, so that a second run is one tap away on a small screen.
          el('div.row.arcade-start', {}, el('button.btn.btn-primary.btn-big', { type: 'button', onclick: start }, 'Start a run'), el('span.hint', {}, 'Headphones help. Space flips target and mine.')),
        ),
        el(
          'section.steps',
          {},
          el('div.step', {}, el('span.step-n', {}, '1'), el('h3', {}, 'Match to move on'), el('p', {}, 'The moment your patch matches the target, the level locks and the next begins. Levels start with one obvious knob and get harder.')),
          el('div.step', {}, el('span.step-n', {}, '2'), el('h3', {}, 'Mind the signal'), el('p', {}, 'The meter drains while a level plays. A click that brings you no closer drains it more. A match puts some back. Empty, and the run is over.')),
          el('div.step', {}, el('span.step-n', {}, '3'), el('h3', {}, 'Stay clean'), el('p', {}, 'Clear a level without a wasted click and your streak grows. The streak multiplies the points of every level after it, up to four times.')),
        ),
        el(
          'div.card.stack',
          {},
          arcade.runs > 0
            ? el('p', {}, 'Best run: ', el('b.num', {}, String(arcade.score)), ` points, ${arcade.cleared} level${arcade.cleared === 1 ? '' : 's'} cleared. ${arcade.runs} run${arcade.runs === 1 ? '' : 's'} played.`)
            : el('p', {}, 'No runs yet.'),
          el(
            'p.note',
            {},
            lastStage >= MAX_STAGE
              ? 'A run works its way through every module, a new one every two levels.'
              : `A run brings in a new module every two levels, as far as the stage you have opened: stage ${lastStage}, ${STAGES[lastStage - 1].title}.`,
          ),
        ),
      ),
    );
  };
  intro();

  return () => {
    teardown?.();
    peekEngine()?.stop();
  };
};
