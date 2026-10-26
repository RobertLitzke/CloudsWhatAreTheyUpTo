// Every figure a lesson can use, by the id core/lessons.ts names it with.

import type { FigureId } from '../../core/lessons';
import { checkFigure } from './check';
import type { FigureFactory } from './kit';
import { handfulDiagram, jarFigure, sizesDiagram, triangleFigure } from './made-of';

export const FIGURES: Record<FigureId, FigureFactory> = {
  handful: handfulDiagram,
  sizes: sizesDiagram,
  jar: jarFigure,
  triangle: triangleFigure,
  check: checkFigure,
};
