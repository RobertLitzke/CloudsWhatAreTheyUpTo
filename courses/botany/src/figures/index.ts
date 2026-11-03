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
import { labelFigure, lollipopFigure } from './oxygen';
import { cellFigure, osmosisFigure } from './cells';
import { columnFigure, pumpStill } from './xylem';
import { stomaFigure, woodwardStill } from './stomata';
import { kranzStill, pathwaysFigure } from './cam';
import { girdleFigure, munchFigure } from './phloem';
import { barrelStill, knopFigure, potsFigure } from './peas';

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
  // Lesson 4
  label: labelFigure,
  lollipop: lollipopFigure,
  // Lesson 5
  osmosis: osmosisFigure,
  cell: cellFigure,
  // Lesson 6
  pump: pumpStill,
  column: columnFigure,
  // Lesson 7
  woodward: woodwardStill,
  stoma: stomaFigure,
  // Lesson 8
  kranz: kranzStill,
  pathways: pathwaysFigure,
  // Lesson 9
  girdle: girdleFigure,
  munch: munchFigure,
  // Lesson 10
  pots: potsFigure,
  barrel: barrelStill,
  knop: knopFigure,
};
