// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) are drawn from a lesson's JSON alone.

import { charts } from 'didactics/charts';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { beatsFigure } from './beats';
import { checkFigure } from './check';
import { clipFigure } from './clip';
import { echoFigure } from './echo';
import { harmonicsFigure } from './harmonics';
import { COL } from './kit';
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
};
