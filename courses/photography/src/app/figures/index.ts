// Every figure a lesson can use, by the id core/lessons.ts names it with.

import type { FigureId } from '../../core/lessons';
import { challengeDiagram } from './challenge';
import { checkFigure } from './check';
import { kelvinDiagram, whiteBalanceFigure } from './colour';
import { apertureFigure, coneFigure } from './focus';
import type { FigureFactory } from './kit';
import { isoFigure, photonsDiagram, stopsFigure } from './light';
import { meterFigure, modesFigure } from './meter';
import { diffractionFigure, hyperfocalFigure } from './sharpness';
import { shakeDiagram, shutterFigure, silkWaterFigure } from './motion';
import { panFigure } from './pan';
import { photoDiagram } from './photo';
import { angleDiagram, closeUpFigure, longEndDiagram, zoomFigure } from './zoom';

export const FIGURES: Record<FigureId, FigureFactory> = {
  cone: coneFigure,
  aperture: apertureFigure,
  closeUp: closeUpFigure,
  diffraction: diffractionFigure,
  hyperfocal: hyperfocalFigure,
  shutter: shutterFigure,
  shake: shakeDiagram,
  silkWater: silkWaterFigure,
  pan: panFigure,
  stops: stopsFigure,
  iso: isoFigure,
  photons: photonsDiagram,
  meter: meterFigure,
  modes: modesFigure,
  zoom: zoomFigure,
  angle: angleDiagram,
  longEnd: longEndDiagram,
  kelvin: kelvinDiagram,
  whiteBalance: whiteBalanceFigure,
  photo: photoDiagram,
  challenge: challengeDiagram,
  check: checkFigure,
};
