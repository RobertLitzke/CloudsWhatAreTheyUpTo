// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) are drawn from a lesson's JSON alone.

import { charts } from 'didactics/charts';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { checkFigure } from './check';
import { COL } from './kit';
import { incomeFigure, yearsFigure } from './savings-rate';
import { cyclingFigure, gridStill } from './four-percent';
import { orderFigure, windowFigure } from './sequence';
import { capeFigure, horizonFigure } from './long-retirement';
import { rulesFigure, rulesTableStill } from './flexible-spending';
import { glideFigure } from './allocation';
import { marginalFigure, stackFigure } from './brackets';
import { bucketsFigure, rateOutStill } from './accounts';
import { bridgeFigure } from './early-access';

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  check: checkFigure,
  // Lesson 1
  income: incomeFigure,
  years: yearsFigure,
  // Lesson 2
  cycling: cyclingFigure,
  'success-grid': gridStill,
  // Lesson 3
  order: orderFigure,
  window: windowFigure,
  // Lesson 4
  horizon: horizonFigure,
  cape: capeFigure,
  // Lesson 5
  rules: rulesFigure,
  'rules-table': rulesTableStill,
  // Lesson 6
  glide: glideFigure,
  // Lesson 7
  stack: stackFigure,
  marginal: marginalFigure,
  // Lesson 8
  buckets: bucketsFigure,
  'rate-out': rateOutStill,
  // Lesson 9
  bridge: bridgeFigure,
};
