// Every figure a lesson can use, by the id core/lessons.ts names it with.

import type { FigureId } from '../../core/lessons';
import { checkFigure } from './check';
import { kelvinDiagram, whiteBalanceFigure } from './colour';
import { apertureFigure, coneFigure } from './focus';
import type { FigureFactory } from './kit';
import { isoFigure, photonsDiagram, stopsFigure } from './light';
import { shakeDiagram, shutterFigure, silkWaterFigure } from './motion';
import { photoDiagram } from './photo';
import { angleDiagram, closeUpFigure, longEndDiagram, zoomFigure } from './zoom';

export const FIGURES: Record<FigureId, FigureFactory> = {
  cone: coneFigure,
  aperture: apertureFigure,
  closeUp: closeUpFigure,
  shutter: shutterFigure,
  shake: shakeDiagram,
  silkWater: silkWaterFigure,
  stops: stopsFigure,
  iso: isoFigure,
  photons: photonsDiagram,
  zoom: zoomFigure,
  angle: angleDiagram,
  longEnd: longEndDiagram,
  kelvin: kelvinDiagram,
  whiteBalance: whiteBalanceFigure,
  photo: photoDiagram,
  check: checkFigure,
};
