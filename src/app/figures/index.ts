// Every figure a shift can use, by the id core/shifts.ts names it with.

import type { FigureId } from '../../core/shifts';
import { freezingFigure, jarFigure, parcelFigure, soundingFigure, thermalsFigure } from './air';
import { billowFigure, flashFigure, mammaFigure, stormFigure, waveFigure } from './giants';
import { frontFigure, haloFigure, prismFigure, streaksFigure } from './ice';
import type { FigureFactory } from './kit';
import { dropsFigure, handFigure, nightFigure, nudgeFigure, shadowFigure, spreadFigure, sunThroughFigure } from './layers';
import { forecastFigure, namesFigure, radioCheckFigure, sortFigure } from './sky';

export const FIGURES: Record<FigureId, FigureFactory> = {
  jar: jarFigure,
  parcel: parcelFigure,
  freezing: freezingFigure,
  thermals: thermalsFigure,
  sounding: soundingFigure,
  nudge: nudgeFigure,
  night: nightFigure,
  spread: spreadFigure,
  drops: dropsFigure,
  sunThrough: sunThroughFigure,
  hand: handFigure,
  shadow: shadowFigure,
  streaks: streaksFigure,
  prism: prismFigure,
  halo: haloFigure,
  front: frontFigure,
  storm: stormFigure,
  flash: flashFigure,
  wave: waveFigure,
  billow: billowFigure,
  mamma: mammaFigure,
  sort: sortFigure,
  names: namesFigure,
  radioCheck: radioCheckFigure,
  forecast: forecastFigure,
};
