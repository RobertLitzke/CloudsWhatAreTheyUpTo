// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) and the map are drawn from a lesson's JSON alone.

import { charts } from 'didactics/charts';
import type { FigureFactory } from 'didactics/figure';
import { maps } from 'didactics/maps';
import { asset } from '../asset';
import { burialFigure, squeezeFigure } from './barrow';
import { columnsFigure, furnaceFigure } from './basalt';
import { checkFigure } from './check';
import { COL } from './kit';
import { photoFigure } from './photo';
import { duneFigure, sortFigure } from './dunes';
import { correlateFigure, veesFigure } from './smith';
import { orderFigure, settleFigure, toothStill } from './steno';

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  ...maps({ palette: COL, asset }),
  photo: photoFigure,
  check: checkFigure,
  // Lesson 1
  tooth: toothStill,
  settle: settleFigure,
  order: orderFigure,
  // Lesson 2
  sorting: sortFigure,
  dune: duneFigure,
  // Lesson 3
  correlate: correlateFigure,
  vees: veesFigure,
  // Lesson 4
  furnace: furnaceFigure,
  columns: columnsFigure,
  // Lesson 5
  burial: burialFigure,
  squeeze: squeezeFigure,
};
