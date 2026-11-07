// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate), the maps (map, map-live) and the live charts (hotspots, compare,
// timeline-live, scale-guess, groups, id-key, id-drill, clue-board, loop,
// regroup) are drawn from a lesson's JSON alone. Each lesson's own figures are
// in src/figures/<lesson id>.ts, which exports them as `figures`, every id
// starting with the lesson's id (floods-hydrograph).

import { charts } from 'didactics/charts';
import { liveCharts } from 'didactics/live-charts';
import { maps } from 'didactics/maps';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { photoById } from '../photos';
import { checkFigure } from './check';
import { COL } from './kit';
import { photoFigure } from './photo';
import { figures as watershed } from './watershed';
import { figures as floods } from './floods';
import { figures as baseflow } from './baseflow';
import { figures as sediment } from './sediment';
import { figures as meanders } from './meanders';
import { figures as lake } from './lake';
import { figures as waves } from './waves';
import { figures as tides } from './tides';
import { figures as inequality } from './inequality';
import { figures as olympia } from './olympia';
import { figures as narrows } from './narrows';
import { figures as estuary } from './estuary';
import { figures as hoodcanal } from './hoodcanal';
import { figures as beach } from './beach';
import { figures as cedar } from './cedar';
import { figures as lowering } from './lowering';
import { figures as duwamish } from './duwamish';
import { figures as celilo } from './celilo';
import { figures as vanport } from './vanport';
import { figures as bar } from './bar';
import { figures as tables } from './tables';
import { figures as gauge } from './gauge';

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  ...maps({ palette: COL, asset }),
  ...liveCharts({ palette: COL, asset, photos: { find: photoById, src: (p) => asset(p.file) } }),
  photo: photoFigure,
  check: checkFigure,
  ...watershed,
  ...floods,
  ...baseflow,
  ...sediment,
  ...meanders,
  ...lake,
  ...waves,
  ...tides,
  ...inequality,
  ...olympia,
  ...narrows,
  ...estuary,
  ...hoodcanal,
  ...beach,
  ...cedar,
  ...lowering,
  ...duwamish,
  ...celilo,
  ...vanport,
  ...bar,
  ...tables,
  ...gauge,
};
