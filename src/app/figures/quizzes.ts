// Figures that work on whole clouds rather than the air inside them: filing
// drawn clouds onto their floors, building names from their roots, and the
// tests that end a lesson (the check on photos, and forecasting from a sky).

import type { Forecast, Profile } from '../../core/shifts';
import { compose, floorInfo, genus, type Body, type Floor, type GenusId, type Prefix } from '../../core/clouds';
import { dealFloorCalls } from '../../core/photo-call';
import { dealNameCalls } from '../../core/radio-check';
import { makeRng, shuffle } from '../../core/rng';
import { el, svg } from '../dom';
import { photoFigure, PHOTOS } from '../photos';
import { addToSky, drawCloud, placeCloud, SKY_SPOTS } from '../scene/drawn';
import { FLOOR_BANDS, makeScene, W as SW, type Palette } from '../scene/landscape';
import { freshSeed } from '../ui';
import { line, note } from './draw';
import { COL, height, quiz, textBox, type FigureContext } from './kit';

function bands(ctx: FigureContext, onPick?: (f: Floor) => void): SVGElement {
  const g = svg('g', { class: 'bands' });
  for (const id of ['high', 'middle', 'low'] as const) {
    const b = FLOOR_BANDS[id];
    const info = floorInfo(id);
    const rect = svg('rect', { x: 0, y: b.top, width: SW, height: b.bottom - b.top, class: `band band-${id}` });
    if (onPick) rect.addEventListener('click', () => onPick(id));
    const range = id === 'low' ? `below ${height(info.toM, ctx.save.units)}` : id === 'high' ? `above ${height(info.fromM, ctx.save.units)}` : `${height(info.fromM, ctx.save.units)} – ${height(info.toM, ctx.save.units)}`;
    const text = svg('text', { x: 8, y: b.top + 14, class: 'band-label' });
    text.textContent = `${info.name.toUpperCase()} · ${range}`;
    g.append(rect, text);
  }
  return g;
}

function mini(id: GenusId, p: Palette): SVGElement {
  const tall = id === 'cumulonimbus';
  return svg('svg', { viewBox: tall ? '-80 -150 160 185' : '-90 -40 180 70', class: 'mini' }, drawCloud(id, p, 2));
}

const FLOOR_BUTTONS: readonly { id: Floor; label: string }[] = [
  { id: 'high', label: 'High' },
  { id: 'middle', label: 'Middle' },
  { id: 'low', label: 'Low' },
  { id: 'tower', label: 'All three' },
];

function hint(id: GenusId): string {
  switch (genus(id).floor) {
    case 'high': return 'Not quite. Thin, silky streaks are ice, and ice lives up high.';
    case 'middle': return 'Not quite. The pieces are small and shaded, but not as tiny as the high ones.';
    case 'low': return 'Not quite. Crisp, solid edges mean water droplets, close to the ground.';
    case 'tower': return 'Not quite. Look how tall it is: it starts low and punches through everything.';
  }
}

// ---- File clouds onto their floors ------------------------------------------

export const sortFigure = quiz((ctx, t, options) => {
  const clouds = (options?.clouds as GenusId[]) ?? ['cirrus', 'altocumulus', 'stratus', 'cumulus', 'cumulonimbus'];
  const scene = makeScene({ time: 'day', seed: 21, sun: [0.62, 0.3] });
  const p = scene.palette;
  const left = new Set(clouds);
  let picked: GenusId | null = null;
  const xs = [90, 170, 90, 200, 320, 260, 140];
  const feedback = el('p.fig-readout', {}, 'Tap a cloud, then the floor it lives on.');
  const cards = new Map<GenusId, HTMLButtonElement>();
  const tray = el('div.tray');
  for (const id of clouds) {
    const b = el('button.cloud-card', { type: 'button', 'aria-label': genus(id).name }, mini(id, p), el('span', {}, genus(id).name)) as HTMLButtonElement;
    b.addEventListener('click', () => {
      picked = id;
      cards.forEach((c, k) => c.classList.toggle('on', k === id));
      feedback.textContent = `${genus(id).name}: which floor?`;
    });
    cards.set(id, b);
    tray.append(b);
  }
  const choose = (floor: Floor) => {
    if (!picked) {
      feedback.textContent = 'Pick a cloud first.';
      return;
    }
    const g = genus(picked);
    if (g.floor === floor) {
      const i = clouds.indexOf(picked);
      const spot = SKY_SPOTS[picked];
      addToSky(scene.sky, placeCloud(picked, p, xs[i % xs.length], spot.y, spot.scale * 0.8, i + 3));
      cards.get(picked)!.remove();
      left.delete(picked);
      feedback.textContent = `Right: ${g.name} lives ${floor === 'tower' ? 'on the low floor and climbs through all three' : `on the ${floor} floor`}.`;
      picked = null;
      if (left.size === 0) t.done();
    } else {
      const card = cards.get(picked)!;
      card.classList.remove('wrong');
      void card.offsetWidth;
      card.classList.add('wrong');
      feedback.textContent = hint(picked);
    }
  };
  scene.sky.append(bands(ctx, choose));
  const node = el('div.fig-body', {},
    el('div.fig-scene', {}, scene.root),
    textBox(feedback, 2),
    tray,
    el('div.floor-buttons', {}, FLOOR_BUTTONS.map((f) => el('button.btn.btn-ghost', { type: 'button', onclick: () => choose(f.id) }, f.label))),
  );
  return node;
});

// ---- Build a name -----------------------------------------------------------

export const namesFigure = quiz((_ctx, t, options) => {
  const targets = (options?.targets as { clue: string; prefix: Prefix; body: Body }[]) ?? [];
  const scene = makeScene({ time: 'day', seed: 21, sun: [0.62, 0.3] });
  const p = scene.palette;
  const body = el('div');
  const xs = [110, 250, 190, 320];
  let i = 0;
  const show = () => {
    if (i >= targets.length) {
      body.replaceChildren(el('p.fig-readout', {}, 'All called in correctly.'));
      t.done();
      return;
    }
    const target = targets[i];
    let prefix: Prefix | null = null;
    let shape: Body | null = null;
    const preview = el('p.name-preview', {}, '…');
    const feedback = el('p.fig-readout');
    const go = el('button.btn', { type: 'button', disabled: true }, 'Call it in') as HTMLButtonElement;
    // The two halves of a name side by side: a height on the left, a texture
    // on the right, one picked from each.
    const column = <T extends string>(title: string, opts: readonly [T, string, string][], set: (v: T) => void) => {
      const buttons = opts.map(([v, root, means]) => el('button.chip', {
        type: 'button',
        onclick: () => {
          set(v);
          buttons.forEach((b, k) => b.classList.toggle('on', opts[k][0] === v));
          paint();
        },
      }, el('b', {}, root), el('small', {}, means)));
      return el('div.name-col', {}, el('p.name-col-title', {}, title), buttons);
    };
    const paint = () => {
      preview.textContent = prefix && shape ? genus(compose(prefix, shape)).name : `${prefix ? (prefix === 'none' ? '' : `${prefix}-`) : '…'}${shape ?? '…'}`;
      go.disabled = !(prefix && shape);
    };
    go.addEventListener('click', () => {
      if (!prefix || !shape) return;
      const said = genus(compose(prefix, shape));
      if (prefix === target.prefix && shape === target.body) {
        const spot = SKY_SPOTS[said.id];
        addToSky(scene.sky, placeCloud(said.id, p, xs[i % xs.length], spot.y, spot.scale * 0.8, 6 + i));
        i++;
        show();
      } else {
        const where = said.floor === 'tower' ? 'every floor' : `the ${said.floor} floor`;
        feedback.textContent = `${said.name} would be ${shape === 'cumulus' ? 'heaps' : 'a layer'} on ${where}. Read the clue again.`;
      }
    });
    body.replaceChildren(
      el('p.clue', {}, el('span', {}, `Name ${i + 1} of ${targets.length}`), target.clue),
      el('div.name-builder', {},
        column('Height', [['cirro', 'cirro-', 'high'], ['alto', 'alto-', 'middle'], ['none', 'no prefix', 'low']] as const, (v) => (prefix = v)),
        el('span.name-plus', { 'aria-hidden': 'true' }, '+'),
        column('Texture', [['cumulus', 'cumulus', 'heap'], ['stratus', 'stratus', 'layer']] as const, (v) => (shape = v)),
      ),
      el('div.actions', {}, preview, go),
      feedback,
    );
  };
  show();
  return el('div.fig-body', {}, el('div.fig-scene', {}, scene.root), body);
});

// ---- The radio check --------------------------------------------------------

function picture(id: GenusId, photo: (typeof PHOTOS)[number] | null, i: number, mirrored: boolean): HTMLElement {
  if (photo) return photoFigure(photo, 'A cloud to identify', mirrored);
  const scene = makeScene({ time: 'day', seed: 30 + i, town: false, sun: [0.15, 0.25] });
  const spot = SKY_SPOTS[id];
  addToSky(scene.sky, placeCloud(id, scene.palette, SW / 2, spot.y, spot.scale, i + 1));
  return el('figure.photo.sketch', {}, scene.root, el('figcaption', {}, el('p.credit', {}, 'A sketch: no photo of this cloud has been fetched yet.')));
}

/**
 * options.mode is 'floor' (call in the floor), 'name' (call in the genus) or
 * 'spot' (say whether it is options.target or not, for a lesson that has met
 * only one cloud; options.decoys are the others shown, as many as the target);
 * options.pool is the genera dealt; options.known the genera the player has
 * met (look-alike answers are drawn from these); options.count how many.
 */
export const radioCheckFigure = quiz((ctx, t, options) => {
  const mode = (options?.mode as string) ?? 'name';
  const target = options?.target as GenusId | undefined;
  const pool = mode === 'spot' ? (options?.decoys as GenusId[]).flatMap((d) => [target!, d]) : (options?.pool as GenusId[]);
  const known = (options?.known as GenusId[]) ?? pool;
  const count = (options?.count as number) ?? 8;
  const size = Math.min(4, Math.max(2, known.length));
  const rng = makeRng(freshSeed());
  const pic = el('div.fig-scene');
  const body = el('div');
  const node = el('div.fig-body.radio-check', {}, pic, body);
  const calls = mode === 'floor'
    ? dealFloorCalls(pool, PHOTOS, count, rng).map((c) => ({ genus: c.genus, photo: c.photo, mirrored: c.mirrored, options: FLOOR_BUTTONS.map((b) => b.id as string) }))
    : mode === 'spot'
    ? dealFloorCalls(pool, PHOTOS, count, rng).map((c) => ({ genus: c.genus, photo: c.photo, mirrored: c.mirrored, options: [target!, 'other'] }))
    : dealNameCalls(pool, known, PHOTOS, count, size, rng).map((c) => ({ genus: c.genus, photo: c.photo, mirrored: c.mirrored, options: c.options as string[] }));
  let right = 0;
  let i = 0;
  const next = () => {
    if (i >= calls.length) {
      body.replaceChildren(el('p.fig-readout', {}, `${ctx.save.talk ? 'Radio check' : 'Check'} done: ${right} of ${calls.length} right.`));
      ctx.score(right, calls.length);
      t.done();
      return;
    }
    const call = calls[i];
    const g = genus(call.genus);
    const answer = mode === 'floor' ? g.floor : mode === 'spot' && g.id !== target ? 'other' : g.id;
    pic.replaceChildren(picture(call.genus, call.photo, i, call.mirrored));
    const labelOf = (o: string) => (mode === 'floor' ? FLOOR_BUTTONS.find((b) => b.id === o)!.label : o === 'other' ? 'Something else' : genus(o as GenusId).name);
    const buttons = call.options.map((o) => {
      const b = el('button.btn.btn-ghost', { type: 'button' }, labelOf(o)) as HTMLButtonElement;
      b.addEventListener('click', () => {
        const good = o === answer;
        if (good) right++;
        buttons.forEach((x, k) => {
          x.disabled = true;
          if (call.options[k] === answer) x.classList.add('right');
        });
        if (!good) b.classList.add('wrong');
        const where = g.floor === 'tower' ? 'all three floors' : `the ${g.floor} floor`;
        body.append(
          el('div.verdict', { className: `verdict ${good ? 'good' : 'bad'}` }, el('p', {}, `${good ? 'Copy that.' : 'Negative.'} That’s ${g.name}, on ${where}. ${g.look}`)),
          el('div.actions', {}, el('span.count', {}, `${i + 1} / ${calls.length}`), el('button.btn', { type: 'button', onclick: () => { i++; next(); } }, i === calls.length - 1 ? 'Finish' : 'Next')),
        );
      });
      return b;
    });
    body.replaceChildren(
      el('p.task', {}, `Photo ${i + 1} of ${calls.length}: ${mode === 'floor' ? 'which floor?' : mode === 'spot' ? `${genus(target!).name.toLowerCase()} or not?` : 'what is it?'}`),
      el('div.floor-buttons', {}, buttons),
    );
  };
  next();
  return node;
});

// ---- Forecasting from the sky -----------------------------------------------


/** A slice up through the air: height, the freezing level, temperatures, and the cloud. */
function profileDrawing(p: Profile): SVGSVGElement {
  const W = 400;
  const H = 170;
  const top = p.topKm ?? Math.max(6, Math.ceil(Math.max(p.freezeKm, ...p.clouds.map((c) => c.topKm)) + 1));
  const ground = 150;
  const yOf = (km: number) => ground - (km / top) * (ground - 12);
  const tempAt = (km: number) => (p.freezeKm - km) * 6.5;
  const deg = (c: number) => `${c < -0.5 ? '−' : ''}${Math.abs(Math.round(c))} °C`;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' }) as SVGSVGElement;
  const parts: SVGElement[] = [
    svg('rect', { x: 0, y: 0, width: W, height: ground, fill: COL.air }),
    svg('rect', { x: 0, y: 0, width: W, height: yOf(p.freezeKm), fill: COL.subzero, opacity: 0.6 }),
    svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: COL.ground }),
  ];
  for (let km = top > 8 ? 2 : 1; km <= top; km += top > 8 ? 2 : 1) {
    parts.push(line(34, yOf(km), 40, yOf(km), COL.ink, 1), note(30, yOf(km) + 3.5, `${km} km`, { soft: true, anchor: 'end' }));
  }
  parts.push(
    line(40, yOf(p.freezeKm), W, yOf(p.freezeKm), COL.ice, 1.5, { 'stroke-dasharray': '5 4' }),
    note(W - 6, yOf(p.freezeKm) - 5, `0 °C at ${p.freezeKm} km: colder above`, { bold: true, anchor: 'end', fill: COL.ice }),
  );
  p.clouds.forEach((c, i) => {
    const x0 = 120 + i * 40;
    const y0 = yOf(c.topKm);
    const y1 = yOf(c.baseKm);
    parts.push(
      svg('rect', { x: x0, y: y0, width: 150, height: Math.max(4, y1 - y0), rx: 8, fill: '#ffffff', stroke: COL.cloudShade }),
      note(x0 + 75, (y0 + y1) / 2 + 4, c.name, { bold: true, anchor: 'middle' }),
      ...(y1 - y0 < 24
        ? [note(x0 - 6, (y0 + y1) / 2 + 4, `${deg(tempAt(c.baseKm))} to ${deg(tempAt(c.topKm))}`, { bold: true, anchor: 'end', fill: tempAt(c.topKm) < 0 ? COL.ice : COL.warmInk })]
        : [
          note(x0 - 6, y0 + 9, `top ${deg(tempAt(c.topKm))}`, { anchor: 'end', fill: tempAt(c.topKm) < 0 ? COL.ice : COL.warmInk }),
          note(x0 - 6, y1, `base ${deg(tempAt(c.baseKm))}`, { anchor: 'end', fill: tempAt(c.baseKm) < 0 ? COL.ice : COL.warmInk }),
        ]),
    );
  });
  parts.push(note(W / 2, ground + 14, p.ground ?? `ground: ${deg(tempAt(0))}`, { anchor: 'middle', fill: '#fff' }));
  s.append(...parts);
  return s;
}

export const forecastFigure = quiz((ctx, t, options) => {
  // Questions from town come last, in order, after the rest shuffled.
  const all = (options?.items as Forecast[]) ?? [];
  const items = [...shuffle(all.filter((q) => !q.id), makeRng(freshSeed())), ...all.filter((q) => q.id)];
  const body = el('div');
  const node = el('div.fig-body', {}, body);
  let right = 0;
  let i = 0;
  const next = () => {
    if (i >= items.length) {
      body.replaceChildren(el('p.fig-readout', {}, `Forecasts done: ${right} of ${items.length} right.`));
      ctx.score(right, items.length);
      t.done();
      return;
    }
    const q = items[i];
    const strip = el('div.sky-strip', {}, q.sky.map((s, k) => {
      const scene = makeScene({ time: 'day', seed: 40 + k, town: false, sun: [0.2, 0.3] });
      const spot = SKY_SPOTS[s.genus];
      addToSky(scene.sky, placeCloud(s.genus, scene.palette, SW / 2, spot.y, spot.scale, k + 2));
      return el('figure', {}, scene.root, el('figcaption', {}, s.when));
    }));
    const readings = q.instruments ? el('ul.readings', {}, ...q.instruments.map((r) => el('li', {}, r))) : null;
    const asker = q.id ? ctx.local?.(q.id) : undefined;
    // A question from town comes on one typed slip, with who asked it, the
    // answers and the reply; otherwise it is all plain.
    const card = asker ? el('div.asker', {}, el('p', {}, asker), el('p', {}, q.question)) : null;
    const buttons = q.options.map((o, k) => {
      const b = el(card ? 'button.slip-reply' : 'button.btn.btn-ghost.wide', { type: 'button' }, o) as HTMLButtonElement;
      b.addEventListener('click', () => {
        const good = k === q.answer;
        if (good) right++;
        buttons.forEach((x, j) => {
          x.disabled = true;
          if (j === q.answer) x.classList.add('right');
        });
        if (!good) b.classList.add('wrong');
        (card ?? body).append(el('div.verdict', { className: `verdict ${good ? 'good' : 'bad'}` }, el('p', {}, q.why)));
        body.append(
          el('div.actions', {}, el('span.count', {}, `${i + 1} / ${items.length}`), el('button.btn', { type: 'button', onclick: () => { i++; next(); } }, i === items.length - 1 ? 'Finish' : 'Next')),
        );
      });
      return b;
    });
    if (card) card.append(el('div.slip-replies', {}, buttons));
    body.replaceChildren(q.profile ? profileDrawing(q.profile) : strip, readings ?? '', ...(card ? [card] : [el('p.task', {}, q.question), el('div.answer-list', {}, buttons)]));
  };
  next();
  return node;
});
