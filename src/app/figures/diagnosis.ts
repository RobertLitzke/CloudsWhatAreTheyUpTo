// Lesson 8, reading your soil: from a symptom, through questions that each
// lean on a test from an earlier lesson, to a likely cause and what to do
// first. The trail of questions is drawn above, one stop per answer.

import { el, svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { START, STEPS, SYMPTOMS, type Ask, type Finding } from '../../core/diagnosis';
import { lesson } from '../../core/lessons';
import { COL, figure, frame } from './kit';

export const detectiveFigure = figure(['solve'], (_ctx, t) => {
  const W = 400;
  const H = 90;
  const f = frame(W, H, 4);
  const trail = svg('g');
  f.svg.append(svg('rect', { x: 0, y: 0, width: W, height: H, fill: COL.paper }), trail);
  const body = el('div.detective');
  f.controls.append(body);
  const path: string[] = [];

  const drawTrail = (done: boolean) => {
    const n = Math.max(1, path.length);
    const step = Math.min(90, 340 / n);
    const shapes: SVGElement[] = [];
    path.forEach((id, i) => {
      const x = 30 + i * step;
      if (i) shapes.push(svg('line', { x1: x - step + 9, y1: 40, x2: x - 9, y2: 40, stroke: COL.soft, 'stroke-width': 2 }));
      const last = i === path.length - 1;
      shapes.push(svg('circle', { cx: x, cy: 40, r: 8, fill: last && done ? COL.good : last ? COL.sand : COL.leafPale, stroke: COL.ink }));
      const s = STEPS[id];
      const test = s?.kind === 'ask' ? s.test?.name : undefined;
      if (test) shapes.push(small(x, 64, test.replace(/^(The|A) /, ''), { anchor: 'middle', soft: true }));
    });
    if (!path.length) shapes.push(label(200, 45, 'Pick what you see in the bed', { anchor: 'middle', soft: true }));
    redraw(trail, ...shapes);
  };

  const lessonLink = (id: string) => {
    const l = lesson(id);
    return l ? el('a', { href: `#/lesson/${l.id}` }, `lesson ${l.n}, “${l.title}”`) : '';
  };

  const show = (id: string) => {
    path.push(id);
    const s = STEPS[id];
    if (s.kind === 'finding') return finding(s);
    ask(s);
  };

  const ask = (s: Ask) => {
    drawTrail(false);
    f.readout.textContent = s.question;
    body.replaceChildren(
      s.test ? el('p.fig-hint', {}, `${s.test.name}, from `, lessonLink(s.test.lesson), ', answers this.') : '',
      el('div.chips', {}, s.answers.map((a) => el('button.chip', { type: 'button', onclick: () => show(a.next) }, a.say))),
    );
  };

  const finding = (s: Finding) => {
    drawTrail(true);
    f.readout.textContent = `Likely: ${s.cause.toLowerCase()}. ${s.why}`;
    body.replaceChildren(
      el('p.key-title', {}, 'What to do first'),
      el('ol.steps', {}, s.fix.map((x) => el('li', {}, x))),
      el('p.fig-hint', {}, 'More in ', lessonLink(s.lesson), '.'),
      el('button.btn.btn-small.btn-ghost', { type: 'button', onclick: start }, 'Another symptom'),
    );
    if (t.goal === 'solve') t.done();
  };

  function start() {
    path.length = 0;
    drawTrail(false);
    f.readout.textContent = 'What is wrong in the bed?';
    body.replaceChildren(el('div.chips', {}, START.map((id) => el('button.chip', { type: 'button', onclick: () => show(id) }, SYMPTOMS[id]))));
  }
  start();
  return f.node;
});
