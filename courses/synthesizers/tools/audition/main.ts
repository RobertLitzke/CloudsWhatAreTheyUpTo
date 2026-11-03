// Riff audition (dev only): step through every riff by ear and mark the ones
// that are wrong. Every riff was written down from memory, so this page is
// where they get checked. Marks are kept in this browser; "Copy notes" gives a
// list to paste back for fixing in src/core/riffs/.

import '../../src/app/styles/app.css';
import { el } from '../../src/app/dom';
import { copyText } from '../../src/app/ui';
import { getEngine, peekEngine } from '../../src/audio/engine';
import { LATEST_RULES } from '../../src/core/gen';
import { resolve } from '../../src/core/params';
import { RIFFS, SOURCES } from '../../src/core/riffs';

type Mark = { verdict: 'ok' | 'wrong' | ''; note: string };
const STORE = 'patchmatch.audition';

const marks: Record<number, Mark> = (() => {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? '{}') as Record<number, Mark>;
  } catch {
    return {};
  }
})();
const persist = () => localStorage.setItem(STORE, JSON.stringify(marks));
const markOf = (id: number): Mark => (marks[id] ??= { verdict: '', note: '' });

// A plain, plucky saw: pitches and rhythm are what is being judged.
const SOUND = resolve({ ...LATEST_RULES.defaults, cutoff: 5, sustain: 2, decay: 2, release: 1 }, LATEST_RULES.steps);
const GRADE = { 1: 'guess', 2: 'roughly', 3: 'confident' } as const;

let playingId = 0;
const playButtons = new Map<number, HTMLElement>();
const paintPlaying = () => {
  const live = peekEngine()?.playing === true;
  for (const [id, b] of playButtons) b.textContent = live && id === playingId ? '■' : '▶';
};

function play(id: number): void {
  const engine = getEngine();
  if (engine.playing && playingId === id) {
    engine.stop();
    return;
  }
  const riff = RIFFS.find((r) => r.id === id)!;
  playingId = id;
  engine.onState = paintPlaying;
  engine.setRiff(riff);
  engine.setVoices([SOUND]);
  engine.start();
  paintPlaying();
}

function row(id: number): HTMLElement {
  const riff = RIFFS.find((r) => r.id === id)!;
  const src = SOURCES.find((s) => s.id === id)!;
  const mark = markOf(id);
  const playBtn = el('button.btn.btn-small', { type: 'button', onclick: () => play(id) }, '▶');
  playButtons.set(id, playBtn);

  const verdicts = (['ok', 'wrong'] as const).map((v) => el('button', { type: 'button' }, v === 'ok' ? 'Right' : 'Wrong'));
  const paint = () => verdicts.forEach((b, i) => b.classList.toggle('on', mark.verdict === (['ok', 'wrong'] as const)[i]));
  verdicts.forEach((b, i) =>
    b.addEventListener('click', () => {
      const v = (['ok', 'wrong'] as const)[i];
      mark.verdict = mark.verdict === v ? '' : v;
      persist();
      paint();
    }),
  );
  paint();

  const note = el('input', { type: 'text', value: mark.note, placeholder: 'what is off', style: 'width: 100%; min-height: 32px' }) as HTMLInputElement;
  note.addEventListener('input', () => {
    mark.note = note.value;
    persist();
  });

  return el(
    'tr',
    {},
    el('td.num', {}, String(id)),
    el('td', {}, playBtn),
    el('td', {}, riff.title, el('div.note', {}, `${riff.artist} · ${riff.bpm} bpm · ${riff.bars} bar${riff.bars === 1 ? '' : 's'}`)),
    el('td', {}, el(`span${riff.sure === 1 ? '.over' : riff.sure === 3 ? '.under' : ''}`, {}, GRADE[riff.sure])),
    el('td', {}, el('div.seg', {}, verdicts)),
    el('td', { style: 'min-width: 180px' }, note, el('div.note.num', { style: 'font-size: 11px; word-break: break-word' }, src.notes)),
  );
}

function notesText(): string {
  return RIFFS.filter((r) => marks[r.id]?.verdict || marks[r.id]?.note)
    .map((r) => `${r.id} ${r.title}: ${marks[r.id].verdict || 'unmarked'}${marks[r.id].note ? ` (${marks[r.id].note})` : ''}`)
    .join('\n');
}

const app = document.getElementById('app')!;
// Least trusted first: those are the ones that need an ear.
const order = [...RIFFS].sort((a, b) => a.sure - b.sure || a.id - b.id);
app.replaceChildren(
  el(
    'div.page',
    { style: 'padding-top: 18px' },
    el('h1', {}, 'Riff audition'),
    el(
      'p.muted',
      {},
      `All ${RIFFS.length} riffs, least certain first. Only riffs graded "roughly" or "confident" are drawn for rounds. Mark each one, add a note where it is wrong, then copy the notes.`,
    ),
    el(
      'div.row',
      {},
      el('button.btn', { type: 'button', onclick: () => void copyText(notesText() || 'No marks yet.', 'Notes') }, 'Copy notes'),
      el('a.btn', { href: './' }, 'Back to the game'),
    ),
    el(
      'table.list',
      {},
      el('thead', {}, el('tr', {}, el('th.num', {}, 'Id'), el('th', {}, ''), el('th', {}, 'Riff'), el('th', {}, 'Grade'), el('th', {}, 'By ear'), el('th', {}, 'Note and notation'))),
      el('tbody', {}, order.map((r) => row(r.id))),
    ),
  ),
);
