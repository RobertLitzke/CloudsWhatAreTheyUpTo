// The stages: one module at a time. Each has a lesson, practice puzzles on the
// new module alone, and rounds to play as often as you like.

import { lessonHref, stageBest, STAGES, stageOpen, UNLOCK_AT } from '../../core/campaign';
import { mintKey } from '../../core/gen';
import { formatKey, TIER_NAMES, type Tier } from '../../core/key';
import { CATEGORIES, PARAMS, type Category, type ParamId } from '../../core/params';
import type { ParamStat } from '../../core/storage';
import { el } from '../dom';
import type { View } from 'didactics/router';
import { getSave } from '../store';
import { diffSpan, page, randomUnit } from '../ui';

const TIERS: Tier[] = ['E', 'N', 'H'];

function earTable(): HTMLElement {
  const stats = getSave().stats;
  const byCategory = new Map<Category, ParamStat>();
  for (const [id, s] of Object.entries(stats) as [ParamId, ParamStat][]) {
    const c = PARAMS[id].category;
    const sum = byCategory.get(c) ?? { puzzles: 0, needed: 0, spent: 0, left: 0 };
    byCategory.set(c, { puzzles: sum.puzzles + s.puzzles, needed: sum.needed + s.needed, spent: sum.spent + s.spent, left: sum.left + s.left });
  }
  if (byCategory.size === 0) {
    return el('p.note', {}, 'After a few rounds this shows which kind of difference costs you the most moves.');
  }
  const rows = (Object.keys(CATEGORIES) as Category[])
    .filter((c) => byCategory.has(c))
    .map((c) => {
      const s = byCategory.get(c)!;
      // Moves beyond the direct route, plus what was still wrong at commit.
      const extra = Math.max(0, s.spent - (s.needed - s.left));
      const each = s.puzzles > 0 ? (extra / s.puzzles).toFixed(1) : '–';
      return el(
        'tr',
        {},
        el('td', {}, CATEGORIES[c][0].toUpperCase() + CATEGORIES[c].slice(1)),
        el('td.num', {}, String(s.puzzles)),
        el('td.num', {}, each),
        el('td.num', {}, String(s.left)),
      );
    });
  return el(
    'table.list',
    {},
    el('thead', {}, el('tr', {}, el('th', {}, 'Kind of difference'), el('th.num', {}, 'Met'), el('th.num', {}, 'Extra moves each'), el('th.num', {}, 'Left wrong'))),
    el('tbody', {}, rows),
  );
}

export const learnView: View = (root) => {
  const save = getSave();

  const cards = STAGES.map((stage) => {
    const open = stageOpen(save, stage.n);
    const head = el(
      'div.stage-head',
      {},
      el('span.stage-n', {}, String(stage.n)),
      el('div', {}, el('h3', {}, stage.title), el('p.note', {}, `${stage.unlocks}. ${stage.teaches}.`)),
      !stage.playable ? el('span.caps', {}, 'Later') : !open ? el('span.caps', {}, 'Locked') : null,
    );
    if (!stage.playable) return el('div.card.locked', {}, head);
    if (!open) {
      return el(
        'div.card.locked.stack',
        {},
        head,
        el('p.note', {}, `Opens when a Normal or Hard round at stage ${stage.n - 1} finishes no more than ${UNLOCK_AT} over its goal.`),
      );
    }

    const bests = TIERS.map((tier) => {
      const best = stageBest(save, stage.n, tier);
      return el(
        'a.btn.btn-small.round-btn',
        { href: `#/ear/round/${formatKey(mintKey(stage.n, tier, randomUnit))}` },
        TIER_NAMES[tier],
        best ? el('span.best', {}, 'best ', diffSpan(best.diff)) : null,
      );
    });

    return el(
      'div.card.stack',
      {},
      head,
      stage.lesson
        ? el(
            'div.row',
            {},
            el(`a.btn${save.lessons.includes(stage.n) ? '' : '.btn-primary'}`, { href: lessonHref(stage.n) }, save.lessons.includes(stage.n) ? 'Lesson again' : 'Start the lesson'),
            el('a.btn', { href: `#/ear/practice/${stage.n}` }, 'Practice'),
          )
        : null,
      el('div.row', {}, el('span.caps', {}, 'Play a round'), bests),
    );
  });

  root.replaceChildren(
    page(
      el(
        'div',
        {},
        el('h1', {}, 'Learn the synth'),
        el(
          'p.muted.lead',
          {},
          'Each stage adds one module. Read the short lesson, try a few practice puzzles on the new knobs, then play rounds. Knobs from later stages stay dark until you get there.',
        ),
      ),
      el('div.stack', {}, cards),
      el('section', {}, el('h2', {}, 'Your ear'), earTable()),
    ),
  );
};
