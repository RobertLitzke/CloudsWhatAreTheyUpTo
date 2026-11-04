// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) are drawn from a lesson's JSON alone.

import { charts } from 'didactics/charts';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { beatsFigure } from './beats';
import { checkFigure } from './check';
import { clipFigure } from './clip';
import { cycleFigure } from './cycle';
import { curveFigure } from './curve';
import { drawbarsFigure } from './drawbars';
import { echoFigure } from './echo';
import { enginesFigure } from './engines';
import { harmonicsFigure } from './harmonics';
import { COL } from './kit';
import { rollFigure } from './roll';
import { seqFigure } from './seq';
import { shFigure } from './sh';
import { slideFigure } from './slide';
import { tableFigure } from './table';
import { sidebandsFigure } from './sidebands';
import { soundFigure } from './sound';
import { synthFigure } from './synth';
import { vowelFigure } from './vowel';

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  check: checkFigure,
  // The live synth, in every lesson.
  synth: synthFigure,
  // The sound a lesson is after, to listen to before there is anything to turn.
  sound: soundFigure,
  // Lesson 1
  harmonics: harmonicsFigure,
  // Lesson 2
  vowel: vowelFigure,
  // Lesson 5
  beats: beatsFigure,
  // Lesson 6
  sidebands: sidebandsFigure,
  // Lesson 7
  clip: clipFigure,
  // Lesson 8
  echo: echoFigure,
  // Lesson 13
  sh: shFigure,
  // Lesson 14
  cycle: cycleFigure,
  // Lesson 16
  curve: curveFigure,
  // Lesson 17
  slide: slideFigure,
  // Lesson 19
  roll: rollFigure,
  // Lesson 20
  seq: seqFigure,
  // Lesson 22
  engines: enginesFigure,
  // Branch lesson O1
  table: tableFigure,
  // Branch lesson O2
  drawbars: drawbarsFigure,
};
