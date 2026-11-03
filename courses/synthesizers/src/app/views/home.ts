import { STAGES, stageOpen, stageReached } from '../../core/campaign';
import { keyProblem, mintKey } from '../../core/gen';
import { formatKey, PUZZLES_PER_ROUND, parseKey, TIER_NAMES, type Tier } from '../../core/key';
import { setSaved } from '../../core/storage';
import { el, svg } from '../dom';
import type { View } from '../router';
import { getSave, updateSave } from '../store';
import { diffSpan, page, randomUnit, segmented } from '../ui';

/** The picture in the hero: the target's wave in orange, yours in cyan. */
function heroArt(): SVGElement {
  // Four periods of 70 across the screen: a saw (target) and a square (yours).
  let saw = 'M20 118';
  let square = 'M20 122';
  for (let i = 0; i < 4; i++) {
    const x = 20 + i * 70;
    saw += ` L${x + 70} 62 L${x + 70} 118`;
    square += ` L${x} 70 L${x + 35} 70 L${x + 35} 122 L${x + 70} 122`;
  }
  const label = (x: number, text: string, cls: string) => {
    const t = svg('text', { x, y: 38, class: cls });
    t.textContent = text;
    return t;
  };
  return svg(
    'svg',
    { viewBox: '0 0 320 170', class: 'hero-art', role: 'img', 'aria-label': 'Two waveforms: the target in orange and yours in cyan' },
    svg('rect', { x: 1, y: 1, width: 318, height: 168, rx: 8, class: 'hero-screen' }),
    svg('line', { x1: 20, y1: 92, x2: 300, y2: 92, class: 'hero-axis' }),
    svg('path', { d: square, class: 'hero-mine' }),
    svg('path', { d: saw, class: 'hero-target' }),
    label(20, 'TARGET', 'hero-label hero-label-target'),
    label(84, 'YOURS', 'hero-label hero-label-mine'),
    svg('circle', { cx: 262, cy: 146, r: 3, class: 'hero-dot' }),
    svg('circle', { cx: 276, cy: 146, r: 3, class: 'hero-dot' }),
    svg('circle', { cx: 290, cy: 146, r: 3, class: 'hero-dot lit' }),
  );
}

export const homeView: View = (root, ctx) => {
  const save = getSave();
  const reached = Math.min(stageReached(save), STAGES.filter((s) => s.playable).length);
  const isNew = save.lessons.length === 0 && save.rounds.length === 0 && !save.resume;
  const openStages = STAGES.filter((s) => s.playable && stageOpen(save, s.n));

  const startRound = (stage: number, tier: Tier) => ctx.navigate(`/round/${formatKey(mintKey(stage, tier, randomUnit))}`);

  // --- hero -----------------------------------------------------------------
  const current = STAGES[reached - 1];
  const nextLesson = STAGES.find((s) => s.lesson && stageOpen(save, s.n) && !save.lessons.includes(s.n));
  const primary = isNew
    ? el('a.btn.btn-primary.btn-big', { href: '#/lesson/1' }, 'Start with lesson 1')
    : nextLesson
      ? el('a.btn.btn-primary.btn-big', { href: `#/lesson/${nextLesson.n}` }, `Next lesson: ${nextLesson.title}`)
      : el('button.btn.btn-primary.btn-big', { type: 'button', onclick: () => startRound(reached, 'N') }, `Play a ${current.title} round`);

  const hero = el(
    'section.hero',
    {},
    el(
      'div.hero-text',
      {},
      el('p.caps', {}, 'Ear training on a small synth'),
      el('h1', {}, 'Hear a sound. Dial it in.'),
      el(
        'p.lead',
        {},
        'PatchMatch plays a riff on a synth. Your copy of the synth is set a few knobs away. Listen to both, work out what is different, and turn the knobs until they match.',
      ),
      el(
        'div.row',
        {},
        primary,
        isNew
          ? el('button.btn.btn-big', { type: 'button', onclick: () => startRound(1, 'E') }, 'Just play')
          : el('a.btn.btn-big', { href: '#/learn' }, 'All stages'),
      ),
      isNew ? el('p.note', {}, 'No synth experience needed. Headphones help.') : null,
    ),
    heroArt(),
  );

  // --- how it works ----------------------------------------------------------
  const steps = el(
    'section.steps',
    {},
    el('div.step', {}, el('span.step-n', {}, '1'), el('h3', {}, 'Listen'), el('p', {}, 'Flip between the target and your own patch as often as you like. Listening never costs anything.')),
    el('div.step', {}, el('span.step-n', {}, '2'), el('h3', {}, 'Diagnose'), el('p', {}, 'Brighter? Slower to start? Wobbling? Each kind of difference lives in one part of the synth.')),
    el('div.step', {}, el('span.step-n', {}, '3'), el('h3', {}, 'Match'), el('p', {}, 'Turn the knobs you think are off. Every click is a move, and fewer moves is a better score.')),
  );

  // --- a quick round ----------------------------------------------------------
  let stage = openStages[openStages.length - 1].n;
  let tier: Tier = 'N';
  const stageSelect = el('select', { 'aria-label': 'Stage' }) as HTMLSelectElement;
  for (const s of openStages) stageSelect.append(el('option', { value: String(s.n), selected: s.n === stage }, `Stage ${s.n}: ${s.title}`));
  stageSelect.addEventListener('change', () => (stage = Number(stageSelect.value)));

  const modes = el(
    'section.modes',
    {},
    el(
      'div.card.stack',
      {},
      el('div', {}, el('span.caps.mode-name', {}, 'Play a round'), el('p.note', {}, 'Twelve puzzles, new every time.')),
      el(
        'div.row',
        {},
        openStages.length > 1 ? stageSelect : null,
        segmented((['E', 'N', 'H'] as const).map((t) => ({ value: t, label: TIER_NAMES[t] })), tier, (v) => (tier = v)),
      ),
      el('button.btn.btn-primary', { type: 'button', onclick: () => startRound(stage, tier) }, 'Start round'),
    ),
    el(
      'a.card.mode',
      { href: '#/learn' },
      el('span.caps.mode-name', {}, 'Learn'),
      el('p.note', {}, 'The synth one module at a time: a short lesson, a few practice puzzles, then rounds.'),
      el('span.mode-go', {}, reached > 1 ? `You are on stage ${reached}, ${current.title}` : 'Starts with waveforms'),
    ),
    el(
      'a.card.mode',
      { href: '#/arcade' },
      el('span.caps.mode-name', {}, 'Arcade'),
      el('p.note', {}, 'Puzzles back to back against a draining signal meter. Nothing to commit: match the patch and the next one starts.'),
      el('span.mode-go', {}, save.arcade.runs > 0 ? `Best run: ${save.arcade.score} points` : 'Start a run'),
    ),
    el(
      'a.card.mode',
      { href: '#/free' },
      el('span.caps.mode-name', {}, 'Free play'),
      el('p.note', {}, 'Every knob, no steps and no score. Loop a riff, play the keys, or record a loop of your own.'),
      el('span.mode-go', {}, 'Open the synth'),
    ),
  );

  // --- rounds played ----------------------------------------------------------
  const list = el('div');
  const roundsSection = el('section', {}, el('h2', {}, 'Your rounds'), list);
  const paintList = () => {
    const rounds = getSave().rounds;
    roundsSection.hidden = rounds.length === 0;
    const ordered = [...rounds.filter((r) => r.saved), ...rounds.filter((r) => !r.saved)].slice(0, 12);
    list.replaceChildren(
      el(
        'table.list',
        {},
        el('thead', {}, el('tr', {}, el('th', {}, ''), el('th', {}, 'Key'), el('th', {}, 'Stage'), el('th.num', {}, 'Best'), el('th.num.hide-narrow', {}, 'Plays'))),
        el(
          'tbody',
          {},
          ordered.map((r) => {
            const parsed = parseKey(r.key);
            return el(
              'tr',
              {},
              el(
                'td',
                {},
                el(
                  'button.btn.btn-small.star',
                  {
                    type: 'button',
                    'aria-label': r.saved ? 'Remove from saved keys' : 'Save this key',
                    onclick: () => {
                      updateSave((s) => setSaved(s, r.key, !r.saved));
                      paintList();
                    },
                  },
                  r.saved ? '★' : '☆',
                ),
              ),
              el('td', {}, el('a.num', { href: `#/round/${r.key}` }, r.key)),
              el('td', {}, parsed ? `${parsed.key.stage} · ${TIER_NAMES[parsed.key.tier]}` : ''),
              el('td.num', {}, diffSpan(r.best)),
              el('td.num.hide-narrow', {}, String(r.plays)),
            );
          }),
        ),
      ),
      el('p.note', {}, 'Best is moves over or under the goal. Tap a key to replay that round; star it to keep it.'),
    );
  };
  paintList();

  // --- a key someone sent you: useful, but not what most visits are for --------
  const keyInput = el('input.key-input', { type: 'text', placeholder: '14N-K7QX2M', 'aria-label': 'Round key', spellcheck: false, autocapitalize: 'characters' }) as HTMLInputElement;
  const keyError = el('p.note.warn', { hidden: true });
  const playKey = () => {
    const parsed = parseKey(keyInput.value);
    const why = parsed ? keyProblem(parsed.key) : 'That is not a round key. A key looks like 14N-K7QX2M.';
    if (!parsed || why) {
      keyError.textContent = why;
      keyError.hidden = false;
      return;
    }
    ctx.navigate(`/round/${formatKey(parsed.key, parsed.puzzle)}`);
  };
  keyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') playKey();
  });
  const keyEntry = el(
    'details.key-entry',
    {},
    el('summary', {}, 'Have a round key?'),
    el(
      'div.stack',
      {},
      el('p.note', {}, 'Every round has a key. Enter one a friend sent you to play the same twelve puzzles they did.'),
      el('div.row', {}, keyInput, el('button.btn', { type: 'button', onclick: playKey }, 'Play')),
      keyError,
    ),
  );

  const resume = save.resume;
  root.replaceChildren(
    page(
      hero,
      resume
        ? el(
            'div.card.row.resume',
            {},
            el('span', {}, `You have a round in progress: ${resume.records.length} of ${PUZZLES_PER_ROUND} puzzles done.`),
            el('a.btn.btn-primary', { href: `#/round/${resume.key}` }, 'Resume'),
          )
        : null,
      isNew ? steps : null,
      modes,
      roundsSection,
      isNew ? null : steps,
      keyEntry,
    ),
  );
};
