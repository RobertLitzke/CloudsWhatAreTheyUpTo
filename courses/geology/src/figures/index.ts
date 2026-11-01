// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) and the map are drawn from a lesson's JSON alone.

import { charts } from 'didactics/charts';
import type { FigureFactory } from 'didactics/figure';
import { maps } from 'didactics/maps';
import { asset } from '../asset';
import { burialFigure, rootsFigure, squeezeFigure } from './barrow';
import { columnsFigure, furnaceFigure } from './basalt';
import { checkFigure } from './check';
import { COL } from './kit';
import { photoFigure } from './photo';
import { duneFigure, sortFigure } from './dunes';
import { correlateFigure, veesFigure } from './smith';
import { cycleStill, unconformityFigure } from './siccar';
import { bowenFigure, conditionsFigure, igneousStill } from './families';
import { coolingFigure, decayFigure } from './age';
import { fitFigure, gondwanaStill, openingFigure } from './drift';
import { ridgeFigure } from './stripes';
import { platesMap, slabFigure } from './quakes';
import { driftMapFigure, plumeFigure } from './hotspot';
import { knickFigure, raceFigure } from './rivers';
import { glacierFigure } from './ice';
import { iceSheetsFigure, rhoneMapFigure } from './iceage';
import { cyclesFigure, orbitFigure, recordFigure } from './pacemaker';
import { kettleStill, reboundFigure, sunFigure } from './kettles';
import { orderFigure, settleFigure, toothStill } from './steno';
import { countFigure, impactFigure, mixFigure, oceanFigure } from './moon';
import { cellsFigure, fossilFigure } from './fossils';
import { drillFigure, earthStill, epicentreFigure, innerFigure, layersFigure, mohoFigure, plumbFigure, raysFigure, wavesStill } from './deep';

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  ...maps({ palette: COL, asset }),
  photo: photoFigure,
  check: checkFigure,
  // Lesson 1
  tooth: toothStill,
  settle: settleFigure,
  order: orderFigure,
  // Lesson 2
  sorting: sortFigure,
  dune: duneFigure,
  // Lesson 3
  correlate: correlateFigure,
  vees: veesFigure,
  // Lesson 4
  furnace: furnaceFigure,
  columns: columnsFigure,
  // Lesson 5
  burial: burialFigure,
  squeeze: squeezeFigure,
  roots: rootsFigure,
  // Lesson 6
  conditions: conditionsFigure,
  'igneous-grid': igneousStill,
  bowen: bowenFigure,
  // Lesson 7
  unconformity: unconformityFigure,
  cycle: cycleStill,
  // Lesson 8
  cooling: coolingFigure,
  decay: decayFigure,
  // Lesson 9
  fit: fitFigure,
  gondwana: gondwanaStill,
  // Lesson 10
  ridge: ridgeFigure,
  opening: openingFigure,
  // Lesson 11
  plates: platesMap,
  slab: slabFigure,
  // Lesson 12
  plume: plumeFigure,
  'island-drift': driftMapFigure,
  // Lesson 13
  race: raceFigure,
  knick: knickFigure,
  // Lesson 14
  glacier: glacierFigure,
  'rhone-ice': rhoneMapFigure,
  // Lesson 15
  orbit: orbitFigure,
  record: recordFigure,
  cycles: cyclesFigure,
  // Lesson 16
  sun: sunFigure,
  rebound: reboundFigure,
  'ice-sheets': iceSheetsFigure,
  kettle: kettleStill,
  // P, the Moon
  impact: impactFigure,
  'crater-count': countFigure,
  'magma-ocean': oceanFigure,
  'moon-mix': mixFigure,
  // L, fossils
  fossilize: fossilFigure,
  cells: cellsFigure,
  // D, deep Earth
  plumb: plumbFigure,
  layers: layersFigure,
  epicentre: epicentreFigure,
  waves: wavesStill,
  moho: mohoFigure,
  rays: raysFigure,
  'inner-core': innerFigure,
  earth: earthStill,
  drill: drillFigure,
};
