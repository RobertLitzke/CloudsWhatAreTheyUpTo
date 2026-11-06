// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) and the live charts (hotspots, compare, timeline-live,
// scale-guess, groups, id-key, id-drill) are drawn from a lesson's JSON alone.

import { charts } from 'didactics/charts';
import { liveCharts } from 'didactics/live-charts';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { photoById } from '../photos';
import { checkFigure } from './check';
import { COL } from './kit';
import { photoFigure } from './photo';
import { fruitStill, meadowFigure } from './rings';
import { cellsStill, relativesFigure } from './kingdom';
import { digestFigure, forageFigure } from './tips';
import { fallFigure, gillFigure, launchStill } from './spores';
import { cycleStill, matingFigure } from './sexes';
import { makersStill } from './groups';
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
import { barkFigure } from './bark';
import { datingFigure } from './lichenometry';
import { canopyFigure } from './canopy';
import { flushFigure } from './flush';
import { pumiceFigure } from './pumice';
import { trufflesFigure } from './truffles';
import { printsStill, sporeSizeFigure } from './sporeprint';
import { barcodeFigure } from './barcode';
import { howManyFigure } from './howmany';

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  ...liveCharts({ palette: COL, asset, photos: { find: photoById, src: (p) => asset(p.file) } }),
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
  // Branch L
  city: barkFigure,
  dating: datingFigure,
  canopy: canopyFigure,
  // Branch N
  flush: flushFigure,
  pumice: pumiceFigure,
  truffles: trufflesFigure,
  prints: printsStill,
  measure: sporeSizeFigure,
  reads: barcodeFigure,
  tally: howManyFigure,
};
