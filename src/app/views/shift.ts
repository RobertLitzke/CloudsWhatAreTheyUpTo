// A training shift: the view from the tower above, the radio below, and one
// step at a time between them. Each kind of step in core/shifts.ts has a
// player here. A player gets the stage (scene and radio card) and calls done()
// when the step is finished; the score of the photo call is carried to the log.

import { parcelAt, cloudBase } from '../../core/air';
import { compose, feet, floorInfo, genus, type Body, type Floor, type GenusId, type Prefix } from '../../core/clouds';
import { dealFloorCalls } from '../../core/photo-call';
import { makeRng } from '../../core/rng';
import { finishShift, type SaveData } from '../../core/save';
import { shiftById, type Line, type Shift, type Step } from '../../core/shifts';
import { el, svg } from '../dom';
import { photoFigure, PHOTOS } from '../photos';
import type { View } from '../router';
import { drawCloud, placeCloud, SKY_SPOTS } from '../scene/drawn';
import { FLOOR_BANDS, makeScene, W, type Scene } from '../scene/landscape';
import { getSave, updateSave } from '../store';
import { freshSeed } from '../ui';

interface Stage {
  scene: Scene;
  /** Swap the view from the tower above the radio. */
  setScene: (s: Scene) => void;
  /** Show something other than a scene there, such as a photo. */
  showPicture: (node: Element) => void;
  /** The radio card's body, cleared for each step. */
  body: HTMLElement;
  save: SaveData;
  score: { right: number; of: number };
}

const WHO: Record<Line['who'], string> = { juniper: 'Juniper · District', you: 'You · Anvil Peak' };

function height(m: number, units: SaveData['units']): string {
  return units === 'metric' ? `${Math.round(m).toLocaleString()} m` : `${feet(m).toLocaleString()} ft`;
}

/** Play radio lines one by one into `into`; resolve when the last is acknowledged. */
function talk(into: HTMLElement, lines: readonly Line[], lastLabel = 'Copy'): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const show = () => {
      const line = lines[i];
      const last = i === lines.length - 1;
      const btn = el('button.btn', { type: 'button' }, last ? lastLabel : 'Copy') as HTMLButtonElement;
      btn.addEventListener('click', () => {
        i++;
        if (i < lines.length) show();
        else {
          btn.remove();
          resolve();
        }
      });
      into.replaceChildren(
        el('div.radio-line', { className: `radio-line ${line.who}` }, el('p.who', {}, WHO[line.who]), el('p.said', {}, line.text)),
        el('div.actions', {}, el('span.count', {}, `${i + 1} / ${lines.length}`), btn),
      );
      btn.focus({ preventScroll: true });
    };
    if (lines.length === 0) resolve();
    else show();
  });
}

function bandsOverlay(stage: Stage, labels: boolean, onPick?: (f: Floor) => void): SVGElement {
  const g = svg('g', { class: 'bands' });
  for (const id of ['high', 'middle', 'low'] as const) {
    const b = FLOOR_BANDS[id];
    const info = floorInfo(id);
    const rect = svg('rect', { x: 0, y: b.top, width: W, height: b.bottom - b.top, class: `band band-${id}` });
    if (onPick) rect.addEventListener('click', () => onPick(id));
    g.append(rect);
    if (labels) {
      const t = svg('text', { x: 8, y: b.top + 14, class: 'band-label' });
      const range = id === 'low' ? `below ${height(info.toM, stage.save.units)}` : id === 'high' ? `above ${height(info.fromM, stage.save.units)}` : `${height(info.fromM, stage.save.units)} – ${height(info.toM, stage.save.units)}`;
      t.textContent = `${info.name.toUpperCase()} · ${range}`;
      g.append(t);
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// Step players.

async function playRadio(stage: Stage, step: Extract<Step, { kind: 'radio' }>): Promise<void> {
  await talk(stage.body, step.lines);
}

async function playParcel(stage: Stage, step: Extract<Step, { kind: 'parcel' }>): Promise<void> {
  const scene = makeScene({ time: 'day', seed: 21, sun: [0.62, 0.3] });
  stage.setScene(scene);
  const p = scene.palette;
  const top = 3000;
  const ground = 236;
  const yOf = (m: number) => ground - (m / top) * 196;
  const x = 280;
  const base = cloudBase(step.tempC, step.dewC);

  const column = svg('line', { x1: x, y1: ground, x2: x, y2: yOf(top), class: 'parcel-column' });
  const bubble = svg('circle', { cx: x, cy: ground - 8, r: 9, class: 'parcel-bubble' });
  const baseLine = svg('g', { class: 'parcel-base', visibility: 'hidden' });
  const baseLabel = svg('text', { x: x - 64, y: yOf(base) - 4, class: 'band-label' });
  baseLabel.textContent = `CLOUD BASE · ${height(base, stage.save.units)}`;
  baseLine.append(svg('line', { x1: x - 70, y1: yOf(base), x2: x + 70, y2: yOf(base) }), baseLabel);
  const puff = placeCloud('cumulus', p, x, yOf(base), 0.7, 4);
  puff.setAttribute('visibility', 'hidden');
  scene.sky.append(column, baseLine, puff, bubble);

  await talk(stage.body, step.lines, 'Got it');

  const readout = el('div.readout');
  const slider = el('input.lift', { type: 'range', min: 0, max: top, step: 25, value: 0, 'aria-label': 'Height of the air' }) as HTMLInputElement;
  const hint = el('p.task', {}, 'Drag to lift the air. Stop when it turns to cloud.');
  stage.body.replaceChildren(hint, readout, slider);

  let reached = false;
  await new Promise<void>((resolve) => {
    const paint = () => {
      const h = Number(slider.value);
      const parcel = parcelAt(h, step.tempC, step.dewC);
      bubble.setAttribute('cy', String(yOf(h) - 8));
      bubble.classList.toggle('wet', parcel.cloud);
      readout.replaceChildren(
        el('div', {}, el('span', {}, 'Height'), el('b', {}, height(h, stage.save.units))),
        el('div', {}, el('span', {}, 'Air'), el('b', {}, `${parcel.tempC.toFixed(1)} °C`)),
        el('div', {}, el('span', {}, 'Dew point'), el('b', {}, `${parcel.dewC.toFixed(1)} °C`)),
      );
      if (parcel.cloud && !reached) {
        reached = true;
        baseLine.setAttribute('visibility', 'visible');
        puff.setAttribute('visibility', 'visible');
        bubble.setAttribute('visibility', 'hidden');
        slider.disabled = true;
        resolve();
      }
    };
    slider.addEventListener('input', paint);
    paint();
  });
  await talk(stage.body, step.after);
}

async function playFloors(stage: Stage, step: Extract<Step, { kind: 'floors' }>): Promise<void> {
  const scene = makeScene({ time: 'day', seed: 21, sun: [0.62, 0.3] });
  stage.setScene(scene);
  const p = scene.palette;
  scene.sky.append(bandsOverlay(stage, true));
  // One example per floor, faint, so the bands are not empty.
  const examples: [GenusId, number][] = [['cirrus', 120], ['altocumulus', 250], ['cumulus', 160]];
  for (const [id, x] of examples) {
    const spot = SKY_SPOTS[id];
    const c = placeCloud(id, p, x, spot.y, spot.scale * 0.8, 2);
    c.classList.add('ghost');
    scene.sky.append(c);
  }
  await talk(stage.body, step.lines);
}

const FLOOR_BUTTONS: readonly { id: Floor; label: string }[] = [
  { id: 'high', label: 'High' },
  { id: 'middle', label: 'Middle' },
  { id: 'low', label: 'Low' },
  { id: 'tower', label: 'All three' },
];

function miniCloud(id: GenusId, stage: Stage): SVGElement {
  const g = drawCloud(id, stage.scene.palette, 2);
  const tall = id === 'cumulonimbus';
  return svg('svg', { viewBox: tall ? '-80 -150 160 185' : '-90 -40 180 70', class: 'mini' }, g);
}

async function playSort(stage: Stage, step: Extract<Step, { kind: 'sort' }>): Promise<void> {
  const scene = makeScene({ time: 'day', seed: 21, sun: [0.62, 0.3] });
  stage.setScene(scene);
  const p = scene.palette;
  await talk(stage.body, step.lines, 'Ready');

  const left = new Set(step.clouds);
  let picked: GenusId | null = null;
  const xs = [90, 170, 90, 200, 320];
  const feedback = el('p.task', {}, 'Tap a cloud, then its floor.');
  const cards = new Map<GenusId, HTMLButtonElement>();
  const tray = el('div.tray');
  step.clouds.forEach((id) => {
    const b = el('button.cloud-card', { type: 'button', 'aria-label': genus(id).name }, miniCloud(id, stage), el('span', {}, genus(id).name)) as HTMLButtonElement;
    b.addEventListener('click', () => {
      picked = id;
      cards.forEach((c, k) => c.classList.toggle('on', k === id));
      feedback.textContent = `${genus(id).name}: which floor?`;
    });
    cards.set(id, b);
    tray.append(b);
  });

  await new Promise<void>((resolve) => {
    const choose = (floor: Floor) => {
      if (!picked) {
        feedback.textContent = 'Pick a cloud first.';
        return;
      }
      const g = genus(picked);
      if (g.floor === floor) {
        const i = step.clouds.indexOf(picked);
        const spot = SKY_SPOTS[picked];
        scene.sky.append(placeCloud(picked, p, xs[i % xs.length], spot.y, spot.scale * 0.8, i + 3));
        cards.get(picked)!.remove();
        left.delete(picked);
        feedback.textContent = `Right: ${g.name} lives on the ${floor === 'tower' ? 'low floor and climbs through all three' : `${floor} floor`}.`;
        picked = null;
        if (left.size === 0) resolve();
      } else {
        const card = cards.get(picked)!;
        card.classList.remove('wrong');
        void card.offsetWidth;
        card.classList.add('wrong');
        feedback.textContent = sortHint(picked);
      }
    };
    scene.sky.append(bandsOverlay(stage, true, choose));
    stage.body.replaceChildren(
      feedback,
      tray,
      el('div.floor-buttons', {}, FLOOR_BUTTONS.map((f) => el('button.btn.btn-ghost', { type: 'button', onclick: () => choose(f.id) }, f.label))),
    );
  });
  await talk(stage.body, [{ who: 'juniper', text: 'Nicely done. That’s the whole building, top to bottom.' }]);
}

function sortHint(id: GenusId): string {
  switch (genus(id).floor) {
    case 'high': return 'Not quite. Those thin, silky streaks are ice, and ice lives up high.';
    case 'middle': return 'Not quite. The pieces are small and shaded, but not as tiny as the high ones.';
    case 'low': return 'Not quite. Crisp, solid edges mean water droplets, close to the ground.';
    case 'tower': return 'Not quite. Look how tall it is: it starts low and punches through everything.';
  }
}

async function playNames(stage: Stage, step: Extract<Step, { kind: 'names' }>): Promise<void> {
  const scene = makeScene({ time: 'day', seed: 21, sun: [0.62, 0.3] });
  stage.setScene(scene);
  const p = scene.palette;
  scene.sky.append(bandsOverlay(stage, false));
  await talk(stage.body, step.lines, 'Let’s try');

  const xs = [110, 250, 190];
  for (const [i, target] of step.targets.entries()) {
    await new Promise<void>((resolve) => {
      let prefix: Prefix | null = null;
      let body: Body | null = null;
      const preview = el('p.name-preview', {}, '…');
      const feedback = el('p.task');
      const go = el('button.btn', { type: 'button', disabled: true }, 'Call it in') as HTMLButtonElement;
      const chips = <T extends string>(options: readonly [T, string][], set: (v: T) => void) => {
        const buttons = options.map(([v, label]) =>
          el('button.chip', {
            type: 'button',
            onclick: () => {
              set(v);
              buttons.forEach((b, k) => b.classList.toggle('on', options[k][0] === v));
              paint();
            },
          }, label),
        );
        return el('div.chips', {}, buttons);
      };
      const paint = () => {
        preview.textContent = prefix && body ? genus(compose(prefix, body)).name : `${prefix ? (prefix === 'none' ? '' : `${prefix}-`) : '…'}${body ? body : '…'}`;
        go.disabled = !(prefix && body);
      };
      go.addEventListener('click', () => {
        if (!prefix || !body) return;
        const said = genus(compose(prefix, body));
        if (prefix === target.prefix && body === target.body) {
          const spot = SKY_SPOTS[said.id];
          scene.sky.append(placeCloud(said.id, p, xs[i], spot.y, spot.scale * 0.8, 6 + i));
          resolve();
        } else {
          const floorWord = said.floor === 'tower' ? 'every floor' : `the ${said.floor} floor`;
          const shapeWord = body === 'cumulus' ? 'heaps' : 'a layer';
          feedback.textContent = `${said.name} would be ${shapeWord} on ${floorWord}. Read the clue again.`;
        }
      });
      stage.body.replaceChildren(
        el('p.clue', {}, el('span', {}, `Name ${i + 1} of ${step.targets.length}`), target.clue),
        chips([['cirro', 'cirro-  high'], ['alto', 'alto-  middle'], ['none', 'no prefix  low']] as const, (v) => (prefix = v)),
        chips([['cumulus', 'cumulus  heap'], ['stratus', 'stratus  layer']] as const, (v) => (body = v)),
        el('div.actions', {}, preview, go),
        feedback,
      );
    });
  }
  await talk(stage.body, step.after);
}

async function playPhotoCall(stage: Stage, step: Extract<Step, { kind: 'photo-call' }>): Promise<void> {
  await talk(stage.body, step.lines, 'Send them over');
  const calls = dealFloorCalls(step.pool, PHOTOS, step.count, makeRng(freshSeed()));
  let right = 0;
  for (const [i, call] of calls.entries()) {
    const g = genus(call.genus);
    // The photo replaces the view from the tower; a drawing stands in for any
    // genus the library has no photo of yet, and says so.
    let picture: HTMLElement;
    if (call.photo) picture = photoFigure(call.photo, 'A cloud to identify');
    else {
      const scene = makeScene({ time: 'day', seed: 30 + i, tower: false, sun: [0.15, 0.25] });
      const spot = SKY_SPOTS[g.id];
      scene.sky.append(placeCloud(g.id, scene.palette, W / 2, spot.y, spot.scale, i + 1));
      picture = el('figure.photo.sketch', {}, scene.root, el('figcaption', {}, el('p.credit', {}, 'A sketch: no photo of this cloud has been fetched yet.')));
    }
    stage.showPicture(picture);

    const ok = await new Promise<boolean>((resolve) => {
      const buttons = FLOOR_BUTTONS.map((f) => {
        const b = el('button.btn.btn-ghost', { type: 'button' }, f.label) as HTMLButtonElement;
        b.addEventListener('click', () => {
          const good = f.id === call.answer;
          buttons.forEach((x, k) => {
            x.disabled = true;
            if (FLOOR_BUTTONS[k].id === call.answer) x.classList.add('right');
          });
          if (!good) b.classList.add('wrong');
          const where = call.answer === 'tower' ? 'all three floors' : `the ${call.answer} floor`;
          stage.body.append(
            el('div.verdict', { className: `verdict ${good ? 'good' : 'bad'}` },
              el('p.said', {}, `${good ? 'Copy that.' : 'Negative.'} That’s ${g.name}, on ${where}. ${g.look}`),
            ),
            el('div.actions', {}, el('span.count', {}, `${i + 1} / ${calls.length}`),
              el('button.btn', { type: 'button', onclick: () => resolve(good) }, i === calls.length - 1 ? 'Finish' : 'Next photo')),
          );
        });
        return b;
      });
      stage.body.replaceChildren(
        el('p.task', {}, `Photo ${i + 1} of ${calls.length}: which floor?`),
        el('div.floor-buttons', {}, buttons),
      );
    });
    if (ok) right++;
  }
  stage.score.right = right;
  stage.score.of = calls.length;
}

async function playLog(stage: Stage, step: Extract<Step, { kind: 'log' }>, shift: Shift): Promise<void> {
  // Back to the tower as the sun goes down: the shift is over.
  const scene = makeScene({ time: 'dusk', seed: 11, sun: [0.36, 0.72], align: 'xMinYMax' });
  scene.sky.append(placeCloud('cumulus', scene.palette, 260, 172, 0.6, 9));
  stage.setScene(scene);
  const name = el('input.sign', { type: 'text', maxLength: 40, placeholder: 'Your name', value: stage.save.name, 'aria-label': 'Your name' }) as HTMLInputElement;
  const sign = el('button.btn', { type: 'button' }, 'Sign the log') as HTMLButtonElement;
  stage.body.replaceChildren(
    el('div.logbook', {},
      el('p.eyebrow', {}, `Shift ${shift.n} log · Anvil Peak`),
      el('h2', {}, shift.title),
      stage.score.of ? el('p.score', {}, `Radio check: ${stage.score.right} of ${stage.score.of} called right`) : null,
      el('ul', {}, step.learned.map((l) => el('li', {}, l))),
      el('p.next', {}, step.next),
      el('label', {}, 'Signed, ', name),
    ),
    el('div.actions', {}, sign),
  );
  await new Promise<void>((resolve) => sign.addEventListener('click', () => resolve()));
  updateSave((s) => ({ ...finishShift(s, shift.id, stage.score.right, stage.score.of, shift.journal, new Date()), name: name.value.trim() || s.name }));
}

// ---------------------------------------------------------------------------

export const shiftView: View = (root, ctx) => {
  const shift = shiftById(ctx.params.id);
  if (!shift) {
    ctx.replace('/home');
    return;
  }
  let alive = true;
  const first = makeScene({ time: 'dawn', seed: 11, sun: [0.75, 0.7] });
  const sceneBox = el('div.shift-scene', {}, first.root);
  const body = el('div.radio-body');
  const dots = shift.steps.map(() => el('i'));
  const stage: Stage = {
    scene: first,
    setScene: (s) => {
      stage.scene = s;
      sceneBox.replaceChildren(s.root);
    },
    showPicture: (node) => sceneBox.replaceChildren(node),
    body,
    save: getSave(),
    score: { right: 0, of: 0 },
  };
  root.append(
    el('div.shift', {},
      el('div.shift-head', {},
        el('a.back', { href: '#/home', 'aria-label': 'Back to the lookout' }, '‹'),
        el('div', {}, el('p.eyebrow', {}, `Shift ${shift.n}`), el('h1', {}, shift.title)),
        el('div.dots', {}, dots),
      ),
      sceneBox,
      el('section.radio', {}, el('div.radio-icon', { 'aria-hidden': 'true' }, radioIcon()), body),
    ),
  );

  void (async () => {
    for (const [i, step] of shift.steps.entries()) {
      if (!alive) return;
      dots.forEach((d, k) => d.classList.toggle('on', k <= i));
      switch (step.kind) {
        case 'radio': await playRadio(stage, step); break;
        case 'parcel': await playParcel(stage, step); break;
        case 'floors': await playFloors(stage, step); break;
        case 'sort': await playSort(stage, step); break;
        case 'names': await playNames(stage, step); break;
        case 'photo-call': await playPhotoCall(stage, step); break;
        case 'log': await playLog(stage, step, shift); break;
      }
    }
    if (alive) ctx.navigate('/home');
  })();
  return () => {
    alive = false;
  };
};

function radioIcon(): SVGElement {
  return svg('svg', { viewBox: '0 0 24 24' },
    svg('rect', { x: 6, y: 7, width: 12, height: 15, rx: 2 }),
    svg('line', { x1: 9, y1: 7, x2: 7, y2: 1 }),
    svg('rect', { x: 8.5, y: 9.5, width: 7, height: 4, rx: 0.5, class: 'screen' }),
    svg('circle', { cx: 12, cy: 18, r: 1.8, class: 'screen' }),
  );
}
