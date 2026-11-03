// Every figure a lesson can use, by the id core/lessons.ts names it with.

import type { FigureId } from '../../core/lessons';
import { afAreaFigure, trackingFigure } from './autofocus';
import { challengeDiagram } from './challenge';
import { checkFigure } from './check';
import { kelvinDiagram, polariserFigure, sunFigure, whiteBalanceFigure } from './colour';
import { apertureFigure, coneFigure } from './focus';
import type { FigureFactory } from './kit';
import { isoFigure, photonsDiagram, stopsFigure } from './light';
import { compressionFigure, cropFigure } from './lens';
import { meterFigure, modesFigure } from './meter';
import { diffractionFigure, hyperfocalFigure } from './sharpness';
import { shakeDiagram, shutterFigure, silkWaterFigure } from './motion';
import { duskFigure, poolingFigure } from './noise';
import { panFigure } from './pan';
import { photoDiagram } from './photo';
import { recipeFigure } from './recipe';
import { lightFigure, stepAsideFigure } from './seeing';
import { angleDiagram, closeUpFigure, longEndDiagram, zoomFigure } from './zoom';

export const FIGURES: Record<FigureId, FigureFactory> = {
  cone: coneFigure,
  aperture: apertureFigure,
  closeUp: closeUpFigure,
  diffraction: diffractionFigure,
  hyperfocal: hyperfocalFigure,
  afArea: afAreaFigure,
  tracking: trackingFigure,
  shutter: shutterFigure,
  shake: shakeDiagram,
  silkWater: silkWaterFigure,
  pan: panFigure,
  stops: stopsFigure,
  iso: isoFigure,
  photons: photonsDiagram,
  meter: meterFigure,
  modes: modesFigure,
  pooling: poolingFigure,
  dusk: duskFigure,
  zoom: zoomFigure,
  angle: angleDiagram,
  longEnd: longEndDiagram,
  compression: compressionFigure,
  crop: cropFigure,
  stepAside: stepAsideFigure,
  lightAngle: lightFigure,
  kelvin: kelvinDiagram,
  whiteBalance: whiteBalanceFigure,
  sun: sunFigure,
  polariser: polariserFigure,
  recipe: recipeFigure,
  photo: photoDiagram,
  challenge: challengeDiagram,
  check: checkFigure,
};
