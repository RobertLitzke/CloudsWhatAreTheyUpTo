// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) are drawn from a lesson's JSON alone.

import { charts } from 'didactics/charts';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { checkFigure } from './check';
import { clustersFigure, sunLifeStill } from './clusters';
import { glowFigure, starColoursStill } from './colour';
import { cannonFigure, lawFigure, moonDropStill } from './falling';
import { hrFigure, sameColourStill } from './hr';
import { classesStill, linesFigure } from './hydrogen';
import { COL } from './kit';
import { ellipseFigure, retrogradeFigure, squeezeFigure } from './loops';
import { mercuryStill, uranusFigure } from './neptune';
import { aberrationFigure, parallaxFigure } from './parallax';
import { photoFigure } from './photo';
import { flatFigure, halfMoonFigure, shadowFigure } from './shadows';
import { balmerStill, rungsFigure, stringsStill } from './ladder';
import { bestPathFigure, eclipseStill, gpsFigure, ringStill } from './bending';
import { dwarfFigure, twoPerRungStill } from './dead-stars';
import { bellChartStill, spinFigure } from './pulsars';
import { onionFigure, originsFigure } from './star-stuff';
import { sameOrbitStill, squashFigure, tippingStill } from './dark-stars';
import { cepheidFigure, shapleyStill } from './island';
import { ageFigure, expansionFigure } from './running';
import { flickerFigure, s2Figure } from './quasars';
import { afterglowFigure, olbersFigure } from './dark-night';
import { bulletStill, cfaStill, ripplesFigure, rotationFigure } from './missing-mass';
import { historyStill, supernovaFigure } from './speeding';
import { convergeFigure } from './beginning';
import { lightClockFigure, lightConeStill, muonRainFigure } from './muons';
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
  squeeze: squeezeFigure,
  // Lesson 3
  'moon-drop': moonDropStill,
  cannon: cannonFigure,
  law: lawFigure,
  // Lesson 4
  uranus: uranusFigure,
  mercury: mercuryStill,
  // Lesson 5
  parallax: parallaxFigure,
  aberration: aberrationFigure,
  // Lesson 6
  bench: benchFigure,
  'sun-lines': sunLinesFigure,
  // Lesson 7
  glow: glowFigure,
  'star-colours': starColoursStill,
  // Lesson 8
  'balmer-lines': balmerStill,
  rungs: rungsFigure,
  strings: stringsStill,
  // Lesson 9
  lines: linesFigure,
  classes: classesStill,
  // Lesson 10
  hr: hrFigure,
  'same-colour': sameColourStill,
  // Lesson 11
  fuel: fuelFigure,
  thermostat: thermostatFigure,
  // Lesson 12
  clusters: clustersFigure,
  'sun-life': sunLifeStill,
  // Lesson 13
  'light-clock': lightClockFigure,
  'muon-rain': muonRainFigure,
  'light-cone': lightConeStill,
  // Lesson 14
  'best-path': bestPathFigure,
  gps: gpsFigure,
  'eclipse-1919': eclipseStill,
  'einstein-ring': ringStill,
  // Lesson 15
  dwarf: dwarfFigure,
  'two-per-rung': twoPerRungStill,
  // Lesson 16
  'bell-chart': bellChartStill,
  spin: spinFigure,
  // Lesson 17
  onion: onionFigure,
  origins: originsFigure,
  // Lesson 18
  squash: squashFigure,
  'same-orbit': sameOrbitStill,
  'tipping-cones': tippingStill,
  // Lesson 19
  shapley: shapleyStill,
  cepheid: cepheidFigure,
  // Lesson 20
  expansion: expansionFigure,
  age: ageFigure,
  // Lesson 21
  flicker: flickerFigure,
  s2: s2Figure,
  // Lesson 22
  olbers: olbersFigure,
  afterglow: afterglowFigure,
  // Lesson 23
  rotation: rotationFigure,
  bullet: bulletStill,
  cfa: cfaStill,
  ripples: ripplesFigure,
  // Lesson 24
  supernovae: supernovaFigure,
  history: historyStill,
  // Lesson 25
  converge: convergeFigure,
};
