// Every figure a lesson can use, by the id core/lessons.ts names it with.

import type { FigureId } from '../../core/lessons';
import { checkFigure } from './check';
import { settleFigure } from './beds';
import { heapFigure, heatFigure, methodsDiagram, rotDiagram } from './compost';
import { detectiveFigure } from './diagnosis';
import type { FigureFactory } from './kit';
import { teaspoonDiagram, webFigure } from './life';
import { feelFigure, handfulDiagram, jarDiagram, sizesDiagram, surfaceDiagram, triangleFigure } from './made-of';
import { leafDiagram, parkingFigure, phDiagram } from './nutrients';
import { photoDiagram } from './photo';
import { potFigure } from './pots';
import { yearFigure } from './seasons';
import { crumbFigure, slakeDiagram } from './structure';
import { dryingDiagram, poresFigure, rainFigure } from './water';

export const FIGURES: Record<FigureId, FigureFactory> = {
  handful: handfulDiagram,
  surface: surfaceDiagram,
  sizes: sizesDiagram,
  feel: feelFigure,
  jar: jarDiagram,
  triangle: triangleFigure,
  pores: poresFigure,
  rain: rainFigure,
  drying: dryingDiagram,
  teaspoon: teaspoonDiagram,
  web: webFigure,
  heap: heapFigure,
  rot: rotDiagram,
  heat: heatFigure,
  methods: methodsDiagram,
  crumb: crumbFigure,
  slake: slakeDiagram,
  parking: parkingFigure,
  ph: phDiagram,
  leaf: leafDiagram,
  year: yearFigure,
  detective: detectiveFigure,
  settle: settleFigure,
  pot: potFigure,
  photo: photoDiagram,
  check: checkFigure,
};
