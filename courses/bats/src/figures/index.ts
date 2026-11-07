// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) and the live charts (hotspots, compare, timeline-live,
// scale-guess, groups, id-key, id-drill, clue-board, loop, regroup, map-live)
// are drawn from a lesson's JSON alone. Each lesson's own figures are in
// src/figures/<lesson id>.ts, which exports them as FIGS.

import { charts } from 'didactics/charts';
import { liveCharts } from 'didactics/live-charts';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { photoById } from '../photos';
import { checkFigure } from './check';
import { COL } from './kit';
import { photoFigure } from './photo';
import { FIGS as dark } from './dark';
import { FIGS as hand } from './hand';
import { FIGS as ultrasound } from './ultrasound';
import { FIGS as buzz } from './buzz';
import { FIGS as crowds } from './crowds';
import { FIGS as moths } from './moths';
import { FIGS as winter } from './winter';
import { FIGS as lives } from './lives';
import { FIGS as diets } from './diets';
import { FIGS as home } from './home';
import { FIGS as heterodyne } from './heterodyne';
import { FIGS as sonograms } from './sonograms';
import { FIGS as greenLake } from './green-lake';
import { FIGS as washington } from './washington';
import { FIGS as people } from './people';

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  ...liveCharts({ palette: COL, asset, photos: { find: photoById, src: (p) => asset(p.file) } }),
  photo: photoFigure,
  check: checkFigure,
  ...dark,
  ...hand,
  ...ultrasound,
  ...buzz,
  ...crowds,
  ...moths,
  ...winter,
  ...lives,
  ...diets,
  ...home,
  ...heterodyne,
  ...sonograms,
  ...greenLake,
  ...washington,
  ...people,
};
