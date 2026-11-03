// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) are drawn from a lesson's JSON alone.

import { charts } from 'didactics/charts';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { checkFigure } from './check';
import { COL } from './kit';
import { photoFigure } from './photo';
import { erwinFigure, samplerFigure } from './kinds';
import { barnacleStill, poolFigure } from './seastar';
import { chainFigure, islandsStill } from './otters';
import { guardsFigure, tradeFigure } from './acacia';
import { pyramidFigure, standingFigure } from './pyramid';
import { tubeFigure, warblerStill } from './gause';
import { droughtFigure, heritFigure } from './finches';
import { cycleFigure, fishingFigure } from './lynx';
import { delayFigure, islandFigure } from './reindeer';
import { bathtubFigure, brakeFigure, darwinFigure, recaptureFigure } from './elephants';

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  photo: photoFigure,
  check: checkFigure,
  // Lesson 1
  erwin: erwinFigure,
  sampler: samplerFigure,
  // Lesson 2
  darwin: darwinFigure,
  bathtub: bathtubFigure,
  brake: brakeFigure,
  recapture: recaptureFigure,
  // Lesson 3
  island: islandFigure,
  delay: delayFigure,
  // Lesson 4
  cycle: cycleFigure,
  fishing: fishingFigure,
  // Lesson 5
  drought: droughtFigure,
  herit: heritFigure,
  // Lesson 6
  tube: tubeFigure,
  warblers: warblerStill,
  // Lesson 7
  pool: poolFigure,
  barnacles: barnacleStill,
  // Lesson 8
  islands: islandsStill,
  chain: chainFigure,
  // Lesson 9
  guards: guardsFigure,
  trade: tradeFigure,
  // Lesson 10
  pyramid: pyramidFigure,
  standing: standingFigure,
};
