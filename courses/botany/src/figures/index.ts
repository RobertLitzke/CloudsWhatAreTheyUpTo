// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) are drawn from a lesson's JSON alone.

import { charts } from 'didactics/charts';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { checkFigure } from './check';
import { COL } from './kit';
import { photoFigure } from './photo';
import { bellJarFigure, logStill, tubFigure } from './willow';
import { lightFigure, mintFigure } from './air';
import { autumnFigure, engelmannFigure, leafFigure } from './green';

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  photo: photoFigure,
  check: checkFigure,
  // Lesson 1
  tub: tubFigure,
  log: logStill,
  belljar: bellJarFigure,
  // Lesson 2
  mint: mintFigure,
  light: lightFigure,
  // Lesson 3
  engelmann: engelmannFigure,
  leaf: leafFigure,
  autumn: autumnFigure,
};
