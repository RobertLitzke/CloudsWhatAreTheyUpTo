// Every figure a lesson can use, by the id core/lessons.ts names it with.

import type { FigureId } from '../../core/lessons';
import { checkFigure } from './check';
import { heapFigure, rotFigure } from './compost';
import { detectiveFigure } from './diagnosis';
import type { FigureFactory } from './kit';
import { teaspoonDiagram, webFigure } from './life';
import { feelFigure, handfulDiagram, jarFigure, sizesDiagram, surfaceFigure, triangleFigure } from './made-of';
import { leafFigure, parkingFigure, phFigure } from './nutrients';
import { yearFigure } from './seasons';
import { crumbFigure, slakeFigure } from './structure';
import { dryingFigure, poresFigure, rainFigure } from './water';

export const FIGURES: Record<FigureId, FigureFactory> = {
  handful: handfulDiagram,
  surface: surfaceFigure,
  sizes: sizesDiagram,
  feel: feelFigure,
  jar: jarFigure,
  triangle: triangleFigure,
  pores: poresFigure,
  rain: rainFigure,
  drying: dryingFigure,
  teaspoon: teaspoonDiagram,
  web: webFigure,
  heap: heapFigure,
  rot: rotFigure,
  crumb: crumbFigure,
  slake: slakeFigure,
  parking: parkingFigure,
  ph: phFigure,
  leaf: leafFigure,
  year: yearFigure,
  detective: detectiveFigure,
  check: checkFigure,
};
