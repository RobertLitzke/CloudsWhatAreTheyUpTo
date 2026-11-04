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
import { kindsStill, tracerFigure, tradeFigure } from './pale';
import { phyllotaxisFigure, rootFigure } from './spiral';
import { darwinFigure, gravityFigure } from './bending';
import { dwarfsFigure, lodgingFigure } from './foolish';
import { canopyFigure, lettuceFigure, photoperiodFigure } from './cupboard';
import { crossdateFigure, growFigure, trunkStill } from './rings';
import { cycleFigure, dryFigure } from './rhynie';
import { beeFigure, partsStill, raceFigure } from './orchid';
import { bankFigure, dropFigure, hedgeFigure } from './seeds';
import { costFigure, escapeFigure } from './menu';
import { lotusFigure, twoStill } from './abominable';

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
  // Lesson 11
  kinds: kindsStill,
  trade: tradeFigure,
  tracer: tracerFigure,
  // Lesson 12
  root: rootFigure,
  phyllotaxis: phyllotaxisFigure,
  // Lesson 13
  darwin: darwinFigure,
  gravity: gravityFigure,
  // Lesson 14
  dwarfs: dwarfsFigure,
  lodging: lodgingFigure,
  // Lesson 15
  photoperiod: photoperiodFigure,
  lettuce: lettuceFigure,
  canopy: canopyFigure,
  // Lesson 16
  trunk: trunkStill,
  grow: growFigure,
  crossdate: crossdateFigure,
  // Lesson 17
  dry: dryFigure,
  cycle: cycleFigure,
  // Lesson 18
  parts: partsStill,
  bee: beeFigure,
  race: raceFigure,
  // Lesson 19
  drop: dropFigure,
  bank: bankFigure,
  hedge: hedgeFigure,
  // Lesson 20
  cost: costFigure,
  escape: escapeFigure,
  // Lesson 21
  lotus: lotusFigure,
  two: twoStill,
};
