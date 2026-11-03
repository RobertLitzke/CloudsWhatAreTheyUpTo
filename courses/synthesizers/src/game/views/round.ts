// A round: twelve puzzles from one key, then the results. Also runs a single
// puzzle of a key (`#/ear/round/KEY/07`) and a stage's practice puzzles; neither of
// those is recorded.

import { peekEngine } from '../../audio/engine';
import { PRACTICE_PUZZLES, STAGES, stageOpen, stageReached, UNLOCK_AT } from '../../core/campaign';
import { generatePuzzle, keyProblem, mintKey, type Puzzle } from '../../core/gen';
import { formatKey, PUZZLES_PER_ROUND, parseKey, TIER_NAMES, type RoundKey } from '../../core/key';
import type { ParamId, Patch } from '../../core/params';
import { riffById } from '../../core/riffs';
import { toRecord, totals, type PuzzleRecord } from '../../core/round';
import { formatDiff, resultName, stepsApart, stepsLeft } from '../../core/score';
import { addStats, recordRound, setSaved, type ParamStat } from '../../core/storage';
import { el } from '../dom';
import type { View, ViewContext } from 'didactics/router';
import { getSave, updateSave } from '../store';
import { copyText, diffSpan, page, randomUnit } from '../ui';
import { mountPuzzle, type PuzzleOutcome } from './puzzle';

type Mode = 'round' | 'single' | 'practice';

function puzzleStats(puzzle: Puzzle, final: Patch, movesBy: Partial<Record<ParamId, number>>): Partial<Record<ParamId, ParamStat>> {
  const out: Partial<Record<ParamId, ParamStat>> = {};
  const left = stepsLeft(puzzle, final);
  for (const id of puzzle.unlocked) {
    const differed = puzzle.diffs.includes(id);
    const spent = movesBy[id] ?? 0;
    if (!differed && spent === 0) continue;
    out[id] = {
      puzzles: differed ? 1 : 0,
      needed: differed ? stepsApart(id, puzzle.start[id], puzzle.target[id]) : 0,
      spent,
      left: left[id] ?? 0,
    };
  }
  return out;
}

function problem(root: HTMLElement, title: string, detail: string): void {
  root.replaceChildren(page(el('h1', {}, title), el('p.muted', {}, detail), el('a.btn', { href: '#/ear' }, 'Home')));
}

function run(root: HTMLElement, ctx: ViewContext, key: RoundKey, mode: Mode, onlyPuzzle?: number): () => void {
  const keyText = formatKey(key);
  const stage = STAGES[key.stage - 1];
  const context = mode === 'practice' ? `Practice · ${stage.title}` : `Stage ${key.stage} ${stage.title} · ${TIER_NAMES[key.tier]}`;
  const indexes =
    mode === 'single'
      ? [onlyPuzzle!]
      : Array.from({ length: mode === 'practice' ? PRACTICE_PUZZLES : PUZZLES_PER_ROUND }, (_, i) => i);

  // Pick a round up where it was left.
  let records: PuzzleRecord[] = [];
  if (mode === 'round') {
    const resume = getSave().resume;
    if (resume && resume.key === keyText && resume.records.length < PUZZLES_PER_ROUND) records = resume.records.slice();
  }

  let teardown: (() => void) | null = null;
  const outlet = el('div');
  root.replaceChildren(outlet);

  const summary = () => {
    teardown?.();
    teardown = null;
    peekEngine()?.stop();
    const sum = totals(records);
    const before = stageReached(getSave());
    if (mode === 'round') {
      updateSave((s) => ({ ...recordRound(s, keyText, sum.diff, sum.goal, new Date().toISOString()), resume: null }));
    }
    const save = getSave();
    const entry = save.rounds.find((r) => r.key === keyText);
    const opened = mode === 'round' && stageReached(save) > before ? STAGES[stageReached(save) - 1] : null;

    const rows = records.map((r) => {
      const riff = riffById(r.riffId);
      const total = r.moves + r.penalty;
      return el(
        'tr',
        {},
        el('td.num', {}, String(r.index + 1)),
        el('td.clip', {}, riff ? riff.title : `riff ${r.riffId}`),
        el('td.num', {}, String(r.goal)),
        el('td.num', {}, String(total)),
        el('td.num', {}, diffSpan(total - r.goal)),
      );
    });

    const saveBtn = el('button.btn.btn-small', { type: 'button' });
    const paintSave = () => {
      const saved = getSave().rounds.find((r) => r.key === keyText)?.saved === true;
      saveBtn.textContent = saved ? '★ Saved' : '☆ Save key';
    };
    saveBtn.addEventListener('click', () => {
      const saved = getSave().rounds.find((r) => r.key === keyText)?.saved === true;
      updateSave((s) => setSaved(s, keyText, !saved));
      paintSave();
    });
    paintSave();

    const link = `${location.origin}${location.pathname}#/ear/round/${keyText}`;
    const again = () => ctx.navigate(`/ear/round/${formatKey(mintKey(key.stage, key.tier, randomUnit))}`);
    const tone = sum.diff < 0 ? '.under' : sum.diff > 0 ? '.over' : '';
    const waiting =
      mode === 'round' && !opened && key.stage === stageReached(save) && key.stage < STAGES.length && STAGES[key.stage].playable
        ? key.tier === 'E'
          ? `Stage ${key.stage + 1} opens after a Normal or Hard round here that finishes no more than ${UNLOCK_AT} over.`
          : `Stage ${key.stage + 1} opens when a round here finishes no more than ${UNLOCK_AT} over.`
        : null;

    outlet.replaceChildren(
      page(
        el('p.caps', {}, mode === 'practice' ? 'Practice finished' : 'Round finished'),
        el(
          'div.verdict',
          {},
          el(`span.name${tone}`, {}, resultName(sum.diff)),
          el('span.line', {}, `${sum.total} moves · goal ${sum.goal}`),
        ),
        el('p.note', {}, context),
        opened ? el('p.under', {}, `Stage ${opened.n}, ${opened.title}, is now open.`) : null,
        waiting ? el('p.note', {}, waiting) : null,
        mode === 'round' && entry && entry.plays > 1
          ? el('p.note', {}, 'Best on this key: ', diffSpan(entry.best), `, from ${entry.plays} plays.`)
          : null,
        el(
          'table.list',
          {},
          el('thead', {}, el('tr', {}, el('th.num', {}, '#'), el('th', {}, 'Riff'), el('th.num', {}, 'Goal'), el('th.num', {}, 'Moves'), el('th.num', {}, '±'))),
          el(
            'tbody',
            {},
            rows,
            el('tr.total', {}, el('td'), el('td', {}, 'Total'), el('td.num', {}, String(sum.goal)), el('td.num', {}, String(sum.total)), el('td.num', {}, diffSpan(sum.diff))),
          ),
        ),
        mode === 'practice'
          ? el(
              'div.row',
              {},
              el('a.btn.btn-primary', { href: `#/ear/round/${formatKey(mintKey(key.stage, 'N', randomUnit))}` }, 'Play a round'),
              el('button.btn', { type: 'button', onclick: () => ctx.navigate(`/ear/practice/${key.stage}`) }, 'More practice'),
              el('a.btn', { href: '#/ear/stages' }, 'Stages'),
            )
          : el(
              'div.stack',
              {},
              el(
                'div.row',
                {},
                el('button.btn.btn-primary', { type: 'button', onclick: again }, 'New round'),
                el('button.btn', { type: 'button', onclick: () => ctx.navigate(`/ear/round/${keyText}`) }, 'Replay'),
                el('a.btn', { href: '#/ear/stages' }, 'Stages'),
              ),
              el(
                'div.card.stack',
                {},
                el('div.caps', {}, 'Round key'),
                el('div.keyline', {}, keyText),
                el('p.note', {}, 'The key replays these same twelve puzzles. Share it and someone else can play them too.'),
                el(
                  'div.row',
                  {},
                  el('button.btn.btn-small', { type: 'button', onclick: () => void copyText(keyText, 'Key') }, 'Copy key'),
                  el('button.btn.btn-small', { type: 'button', onclick: () => void copyText(`${keyText} · ${formatDiff(sum.diff)}`, 'Result') }, 'Copy result'),
                  el('button.btn.btn-small', { type: 'button', onclick: () => void copyText(link, 'Link') }, 'Copy link'),
                  saveBtn,
                ),
              ),
            ),
      ),
    );
  };

  const play = (cursor: number) => {
    teardown?.();
    teardown = null;
    if (cursor >= indexes.length) {
      if (mode === 'single') ctx.navigate(`/ear/round/${keyText}`);
      else summary();
      return;
    }
    const index = indexes[cursor];
    // Practice keeps every difference inside the module the stage introduced.
    const made = generatePuzzle(key, index, mode === 'practice' ? key.stage : undefined);
    if (!made.ok) {
      const why =
        made.reason === 'riff'
          ? `Puzzle ${index + 1} uses a riff (number ${made.riffId}) that this copy of PatchMatch does not carry, so the round cannot be played here.`
          : (keyProblem(key) ?? 'This key cannot be played.');
      problem(outlet, 'This round cannot be played here', why);
      return;
    }
    const last = cursor + 1 === indexes.length;
    teardown = mountPuzzle(outlet, {
      puzzle: made.puzzle,
      riff: made.riff,
      position: mode === 'single' ? `${index + 1}` : `${index + 1}/${indexes.length}`,
      context,
      nextLabel: mode === 'single' ? 'Play the whole round' : last ? 'See results' : 'Next puzzle',
      onCommit: ({ score, final, movesBy }: PuzzleOutcome) => {
        records = [...records, toRecord(index, made.puzzle.riffId, score)];
        if (mode !== 'round') return;
        updateSave((s) => ({ ...addStats(s, puzzleStats(made.puzzle, final, movesBy)), resume: { key: keyText, records } }));
      },
      onNext: () => {
        window.scrollTo(0, 0);
        play(cursor + 1);
      },
    });
  };

  play(mode === 'round' ? records.length : 0);

  return () => {
    teardown?.();
    peekEngine()?.stop();
  };
}

export const roundView: View = (root, ctx) => {
  const text = ctx.params.puzzle ? `${ctx.params.key}/${ctx.params.puzzle}` : ctx.params.key;
  const parsed = parseKey(text);
  if (!parsed) return problem(root, 'That is not a round key', 'A key looks like 14N-K7QX2M: version, stage, difficulty, then six characters.');
  const why = keyProblem(parsed.key);
  if (why) return problem(root, 'This round cannot be played here', why);
  if (parsed.puzzle != null) return run(root, ctx, parsed.key, 'single', parsed.puzzle - 1);
  return run(root, ctx, parsed.key, 'round');
};

export const practiceView: View = (root, ctx) => {
  const stage = Number(ctx.params.stage);
  const info = STAGES[stage - 1];
  if (!info || !info.playable) return problem(root, 'No such stage', 'Practice exists for stages that are built.');
  if (!stageOpen(getSave(), stage)) return problem(root, 'Stage locked', `Stage ${stage} is not open yet.`);
  return run(root, ctx, mintKey(stage, 'E', randomUnit), 'practice');
};
