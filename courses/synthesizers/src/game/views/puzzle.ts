// One puzzle: listen, flip between the target and your own patch, turn knobs,
// commit. Then the reveal: the goal, what was off, and three-way listening.
//
// The strip, the transport and the note under them are one block (the rail).
// Upright it sits above the panel. On a phone held sideways it stands to the
// left of it, so that the whole panel fits the height of the screen.

import { getEngine, peekEngine } from '../../audio/engine';
import type { Puzzle } from '../../core/gen';
import { fullName, PARAMS, resolve, valueAt, type ParamId, type Patch } from '../../core/params';
import type { Riff } from '../../core/riffs';
import { describeError, diagnosis, resultName, scorePuzzle, scoredParams, type PuzzleScore } from '../../core/score';
import { createAb } from '../components/ab';
import { createPanel } from '../components/panel';
import { createScope } from '../components/scope';
import { el } from '../dom';
import { getSave } from '../store';
import { immersive, tick } from '../ui';

export interface PuzzleOutcome {
  score: PuzzleScore;
  final: Patch;
  movesBy: Partial<Record<ParamId, number>>;
}

export interface PuzzleViewOptions {
  puzzle: Puzzle;
  riff: Riff;
  /** "4/12". */
  position: string;
  /** "Stage 1 · Normal", or "Practice". */
  context: string;
  nextLabel: string;
  onCommit: (outcome: PuzzleOutcome) => void;
  onNext: () => void;
}

const VOICE = { target: 0, mine: 1, start: 2 } as const;
/** A second tap on the commit button, which has just become the next button, is ignored for this long. */
const NEXT_GUARD_MS = 700;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function mountPuzzle(root: HTMLElement, opts: PuzzleViewOptions): () => void {
  const { puzzle, riff } = opts;
  const steps = puzzle.rules.steps;
  let mine: Patch = { ...puzzle.start };
  let moves = 0;
  const movesBy: Partial<Record<ParamId, number>> = {};
  let done = false;
  let committedAt = 0;

  const sounds = () => [resolve(puzzle.target, steps), resolve(mine, steps), resolve(puzzle.start, steps)];

  // --- the display strip ----------------------------------------------------
  const moveCount = el('b', {}, '0');
  const goalCell = el('div.oled-cell.goal', { hidden: true }, el('label', {}, 'Goal'), el('b', {}, ''));
  const verdict = el('div.oled-verdict', { hidden: true });
  const oled = el(
    'header.oled',
    {},
    el('div.oled-main', {}, el('span.oled-title', {}, riff.title), el('span.oled-sub', {}, `${riff.artist} · ${opts.context}`)),
    el('div.oled-cell', {}, el('label', {}, 'Puzzle'), el('b', {}, opts.position)),
    el('div.oled-cell', {}, el('label', {}, 'Moves'), moveCount),
    goalCell,
    verdict,
  );

  // --- transport ------------------------------------------------------------
  const playBtn = el('button.btn.play', { type: 'button', 'aria-label': 'Play' }, '▶');
  const ab = createAb(
    [
      { label: 'Target', cls: 'target' },
      { label: 'Mine', cls: 'mine' },
      { label: 'Start', cls: 'start', hidden: true },
    ],
    VOICE.target,
    (voice) => peekEngine()?.select(voice),
  );
  const commitBtn = el('button.btn.btn-commit', { type: 'button' }, 'Commit');
  const hint = el('span.hint.hide-narrow', {}, el('kbd', {}, 'Space'), ' flips target and mine');
  const transport = el('div.transport', {}, playBtn, ab.el, hint, el('span.spacer'), commitBtn);

  const paintPlay = () => {
    const playing = peekEngine()?.playing === true;
    playBtn.textContent = playing ? '■' : '▶';
    playBtn.setAttribute('aria-label', playing ? 'Stop' : 'Play');
    playBtn.classList.toggle('btn-primary', !playing);
  };

  const listen = (voice: number) => {
    ab.show(voice);
    peekEngine()?.select(voice);
  };

  // --- audio ----------------------------------------------------------------
  const scope = createScope();
  const arm = () => {
    const engine = getEngine();
    engine.onState = paintPlay;
    engine.setVolume(getSave().volume);
    engine.setRiff(riff);
    engine.setVoices(done ? sounds() : sounds().slice(0, 2), ab.on);
    return engine;
  };
  playBtn.addEventListener('click', () => {
    const engine = peekEngine();
    if (engine?.playing) engine.stop();
    else {
      arm().start();
      if (done) scope.start(getEngine().analyser);
    }
    paintPlay();
  });
  // Once sound is running, the next puzzle starts by itself.
  const existing = peekEngine();
  if (existing && existing.ctx.state === 'running') arm().start();

  // --- the panel ------------------------------------------------------------
  const status = el(
    'p.note.rail-note',
    { role: 'status' },
    existing ? 'Every click of a knob is a move. Listening is free.' : 'Press play to hear the riff. Every click of a knob is a move; listening is free.',
  );
  const panel = createPanel({
    rules: puzzle.rules,
    patch: mine,
    enabled: puzzle.unlocked,
    stage: puzzle.key.stage,
    continuous: false,
    onMove: (id, pos) => {
      if (done) return;
      const clamped = Math.min(steps[id].length - 1, Math.max(0, Math.round(pos)));
      if (clamped === mine[id]) return;
      mine = { ...mine, [id]: clamped };
      moves++;
      movesBy[id] = (movesBy[id] ?? 0) + 1;
      moveCount.textContent = String(moves);
      panel.update(mine);
      tick();
      peekEngine()?.setSound(VOICE.mine, resolve(mine, steps));
      // Turning a knob while hearing the target would change nothing audible.
      if (ab.on !== VOICE.mine) listen(VOICE.mine);
    },
  });

  // --- the reveal -----------------------------------------------------------
  const result = el('section.result.stack', { hidden: true });

  const commit = () => {
    if (done) return;
    done = true;
    committedAt = performance.now();
    const score = scorePuzzle(puzzle, mine, moves);
    panel.setDisabled(true);
    panel.setGhosts(puzzle.target, scoredParams(puzzle));
    // The same button now moves on, so the reveal needs no scrolling to get past.
    commitBtn.textContent = opts.nextLabel;
    commitBtn.classList.replace('btn-commit', 'btn-primary');
    hint.hidden = true;
    status.textContent = 'Orange rings mark the target. The breakdown is below.';
    ab.buttons[VOICE.mine].textContent = 'Yours';
    ab.buttons[VOICE.start].hidden = false;
    goalCell.hidden = false;
    goalCell.querySelector('b')!.textContent = String(score.goal);
    moveCount.textContent = String(score.total);

    // Add the starting patch as a third voice. This restarts the loop.
    const engine = peekEngine();
    if (engine) {
      engine.setVoices(sounds(), ab.on);
      if (engine.playing) scope.start(engine.analyser);
    }

    const fmt = (id: ParamId, pos: number) => PARAMS[id].format(valueAt(id, steps[id], pos));
    const scored = scoredParams(puzzle);
    const touched = (Object.keys(movesBy) as ParamId[]).filter((id) => !puzzle.diffs.includes(id));
    const rows = [...puzzle.diffs, ...touched].map((id) => {
      const off = score.remaining[id];
      const outcome = !scored.includes(id)
        ? el('span.muted', {}, 'not scored: silent in the target')
        : off == null
          ? el('span.under', {}, 'matched')
          : el('span.over', {}, describeError(id, off));
      return el(
        'div.off',
        {},
        el('div.off-name', {}, fullName(id), puzzle.diffs.includes(id) ? null : el('span.muted', {}, ' started right')),
        el('div.off-verdict', {}, outcome),
        el(
          'div.off-vals.num',
          {},
          el('span.muted', {}, `${fmt(id, puzzle.start[id])} → `),
          el('span', { style: 'color: var(--orange)' }, fmt(id, puzzle.target[id])),
          el('span.muted', {}, ' · yours '),
          el('span', { style: 'color: var(--cyan)' }, fmt(id, mine[id])),
        ),
        el('div.off-moves.num.muted', {}, plural(movesBy[id] ?? 0, 'move')),
      );
    });

    const tone = score.diff < 0 ? '.under' : score.diff > 0 ? '.over' : '';
    const line = score.penalty
      ? `${plural(score.total, 'move')} (${score.moves} turned + ${score.penalty} penalty) · goal ${score.goal}`
      : `${plural(score.total, 'move')} · goal ${score.goal}`;
    verdict.replaceChildren(el(`span${tone}`, {}, resultName(score.diff)));
    verdict.hidden = false;

    const parts: (HTMLElement | null)[] = [
      el('div.verdict', {}, el(`span.name${tone}`, {}, resultName(score.diff)), el('span.line', {}, line)),
      el('p', {}, diagnosis(puzzle, movesBy)),
      score.penalty
        ? el('p.note', {}, 'A knob left wrong costs two moves for each step it is off, so fixing it is always cheaper than leaving it.')
        : null,
      el(
        'div.offs',
        {},
        el('div.off.off-head', {}, el('div', {}, 'Knob'), el('div', {}, 'Result'), el('div', {}, 'Start → target · yours'), el('div', {}, 'Moves')),
        rows,
      ),
      scope.el,
      el(
        'div.row',
        {},
        el('button.btn.btn-primary', { type: 'button', onclick: opts.onNext }, opts.nextLabel),
        el('span.hint', {}, 'Compare Target, Yours and Start above.'),
      ),
    ];
    result.replaceChildren(...parts.filter((part): part is HTMLElement => part != null));
    result.hidden = false;
    opts.onCommit({ score, final: mine, movesBy });
  };
  commitBtn.addEventListener('click', () => {
    if (!done) commit();
    else if (performance.now() - committedAt > NEXT_GUARD_MS) opts.onNext();
  });

  paintPlay();
  const leave = immersive();
  root.replaceChildren(
    el('div.deck', {}, el('div.rail', {}, el('a.rail-exit', { href: '#/ear' }, '‹ PatchMatch'), oled, transport, status), panel.el),
    result,
  );

  return () => {
    leave();
    ab.destroy();
    scope.stop();
    const engine = peekEngine();
    if (engine) engine.onState = null;
  };
}
