// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) are drawn from a lesson's JSON alone.

import { charts } from 'didactics/charts';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { checkFigure } from './check';
import { glowFigure, starColoursStill } from './colour';
import { cannonFigure, lawFigure, moonDropStill } from './falling';
import { hrFigure, sameColourStill } from './hr';
import { classesStill, linesFigure } from './hydrogen';
import { COL } from './kit';
import { ellipseFigure, retrogradeFigure } from './loops';
import { mercuryStill, uranusFigure } from './neptune';
import { parallaxFigure } from './parallax';
import { photoFigure } from './photo';
import { flatFigure, halfMoonFigure, shadowFigure } from './shadows';
import { benchFigure, sunLinesFigure } from './spectra';
import { fuelFigure, thermostatFigure } from './sunshine';

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  photo: photoFigure,
  check: checkFigure,
  // Lesson 1
  shadow: shadowFigure,
  flat: flatFigure,
  'half-moon': halfMoonFigure,
  // Lesson 2
  retrograde: retrogradeFigure,
  ellipse: ellipseFigure,
  // Lesson 3
  'moon-drop': moonDropStill,
  cannon: cannonFigure,
  law: lawFigure,
  // Lesson 4
  uranus: uranusFigure,
  mercury: mercuryStill,
  // Lesson 5
  parallax: parallaxFigure,
  // Lesson 6
  bench: benchFigure,
  'sun-lines': sunLinesFigure,
  // Lesson 7
  glow: glowFigure,
  'star-colours': starColoursStill,
  // Lesson 8
  lines: linesFigure,
  classes: classesStill,
  // Lesson 9
  hr: hrFigure,
  'same-colour': sameColourStill,
  // Lesson 10
  fuel: fuelFigure,
  thermostat: thermostatFigure,
};
