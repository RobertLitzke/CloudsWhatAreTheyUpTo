// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) are drawn from a lesson's JSON alone.

import { charts } from 'didactics/charts';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { checkFigure } from './check';
import { COL } from './kit';
import { incomeFigure, yearsFigure } from './savings-rate';
import { cyclingFigure, gridStill } from './four-percent';

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  check: checkFigure,
  // Lesson 1
  income: incomeFigure,
  years: yearsFigure,
  // Lesson 2
  cycling: cyclingFigure,
  'success-grid': gridStill,
};
