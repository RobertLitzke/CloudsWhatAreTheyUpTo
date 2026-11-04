// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) are drawn from a lesson's JSON alone.

import { charts } from 'didactics/charts';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { checkFigure } from './check';
import { COL } from './kit';
import { photoFigure } from './photo';
import { fruitStill, meadowFigure } from './rings';
import { cellsStill, relativesFigure } from './kingdom';
import { digestFigure, forageFigure } from './tips';
import { fallFigure, gillFigure, launchStill } from './spores';
import { cycleStill, matingFigure } from './sexes';
import { makersStill, sortFigure } from './groups';
import { buddingStill, flaskFigure } from './yeast';
import { coalFigure, rotsFigure } from './rot';
import { rootsStill, transferFigure } from './network';
import { dayFigure, layersStill } from './lichens';
import { zoneFigure } from './mould';
import { cycleLightStill, decoyFigure } from './glow';
import { antFigure, trapsStill } from './hunters';
import { mapFigure, pairingStill } from './individual';
import { cluesFigure, scaleStill } from './prototaxites';
import { logFigure, territoriesStill } from './log';

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  photo: photoFigure,
  check: checkFigure,
  // Lesson 1
  meadow: meadowFigure,
  fruit: fruitStill,
  // Lesson 2
  relatives: relativesFigure,
  cells: cellsStill,
  // Lesson 3
  digest: digestFigure,
  forage: forageFigure,
  // Lesson 4
  fall: fallFigure,
  gills: gillFigure,
  launch: launchStill,
  // Lesson 5
  mating: matingFigure,
  cycle: cycleStill,
  // Lesson 6
  makers: makersStill,
  sort: sortFigure,
  // Lesson 7
  flask: flaskFigure,
  budding: buddingStill,
  // Lesson 8
  rots: rotsFigure,
  coal: coalFigure,
  // Lesson 9
  roots: rootsStill,
  transfer: transferFigure,
  // Lesson 10
  layers: layersStill,
  day: dayFigure,
  // Lesson 11
  zone: zoneFigure,
  // Lesson 12
  luciferin: cycleLightStill,
  decoys: decoyFigure,
  // Lesson 13
  traps: trapsStill,
  ant: antFigure,
  // Lesson 14
  pairing: pairingStill,
  genotypes: mapFigure,
  // Lesson 15
  tallest: scaleStill,
  clues: cluesFigure,
  // Lesson 16
  afterlife: logFigure,
  territories: territoriesStill,
};
