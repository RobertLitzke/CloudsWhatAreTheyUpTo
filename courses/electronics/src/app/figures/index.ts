// Every figure a lesson can use, by the id core/lessons.ts names it with.

import type { FigureId } from '../../core/lessons';
import { biasFigure, bridgedEmitterFigure, followerFigure, gainFigure, opampGainFigure } from './amplifiers';
import { couplingFigure, decouplingFigure, kickbackFigure, lowpassFigure, rcChargeFigure, shortedCapFigure } from './capacitors';
import { checkFigure } from './check';
import { deadLedFigure, dryJointFigure, twoViewsFigure, wrongRcFigure } from './dead-circuit';
import { backwardsLedFigure, clipperFigure, diodeIvFigure, ledResistorFigure, rectifierFigure, reverseFigure } from './diodes';
import type { FigureFactory } from './kit';
import { loopFigure } from './loop';
import { badJointFigure, batteryTimeFigure, fuseFigure, heatFigure, longWireFigure, matchingFigure } from './power';
import { bjtSwitchFigure, blinkerFigure, mosfetSwitchFigure, relayFigure, shortedTransistorFigure } from './switches';
import { offsetFigure, sineFigure, stuckBiasFigure } from './signals';
import { dividerFigure, mysteryBoxFigure, potFigure, sagFigure, wrongValueFigure } from './sources';
import { brokenWireFigure, cellsFigure, junctionFigure, parallelBulbsFigure, rankingFigure } from './series-parallel';
import { ivCurveFigure, meterFigure, ohmTargetFigure, seriesBulbsFigure, trueSpeedFigure } from './what-flows';

export const FIGURES: Record<FigureId, FigureFactory> = {
  loop: loopFigure,
  check: checkFigure,
  'series-bulbs': seriesBulbsFigure,
  'true-speed': trueSpeedFigure,
  meter: meterFigure,
  'ohm-target': ohmTargetFigure,
  'iv-curve': ivCurveFigure,
  'parallel-bulbs': parallelBulbsFigure,
  junction: junctionFigure,
  ranking: rankingFigure,
  cells: cellsFigure,
  'broken-wire': brokenWireFigure,
  divider: dividerFigure,
  pot: potFigure,
  sag: sagFigure,
  'mystery-box': mysteryBoxFigure,
  'wrong-value': wrongValueFigure,
  heat: heatFigure,
  'battery-time': batteryTimeFigure,
  'long-wire': longWireFigure,
  fuse: fuseFigure,
  matching: matchingFigure,
  'bad-joint': badJointFigure,
  sine: sineFigure,
  offset: offsetFigure,
  'stuck-bias': stuckBiasFigure,
  'rc-charge': rcChargeFigure,
  coupling: couplingFigure,
  lowpass: lowpassFigure,
  decoupling: decouplingFigure,
  kickback: kickbackFigure,
  'shorted-cap': shortedCapFigure,
  'diode-iv': diodeIvFigure,
  'led-resistor': ledResistorFigure,
  reverse: reverseFigure,
  rectifier: rectifierFigure,
  clipper: clipperFigure,
  'backwards-led': backwardsLedFigure,
  'bjt-switch': bjtSwitchFigure,
  'mosfet-switch': mosfetSwitchFigure,
  relay: relayFigure,
  blinker: blinkerFigure,
  'shorted-transistor': shortedTransistorFigure,
  bias: biasFigure,
  gain: gainFigure,
  follower: followerFigure,
  'opamp-gain': opampGainFigure,
  'bridged-emitter': bridgedEmitterFigure,
  'two-views': twoViewsFigure,
  'dead-led': deadLedFigure,
  'wrong-rc': wrongRcFigure,
  'dry-joint': dryJointFigure,
};
