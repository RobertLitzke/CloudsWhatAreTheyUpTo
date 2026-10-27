// The radio. The lessons themselves are a plain workbook; the setting lives
// only here, in ham radio talks with the old hand at Walla Walla, a few
// counties over. It is 1931, and you are the new weather forecaster in Harrow,
// a wheat town in eastern Washington. Each lesson gets two talks: a short
// opening as it starts, and the lines typed around its check, which put the
// check's questions to you as an examination over the air; nothing comes on
// in between. Training done, the story skips ahead to 1946, when cloud seeding
// arrives.
//
// A talk is a few turns. In each turn Walla Walla says something and you pick
// one of up to three replies; a reply can draw a line back, and then the talk
// goes on to the next turn whichever you picked, so the branches always rejoin.
// A reply marked `right` is the answer to a question: a wrong one is ribbed and
// explained, never scored. Talks can be switched off in Settings, and then
// none of this is shown at all.
//
// The words live in data/radio, one file per lesson plus the opening talk. How
// a talk works, and the slip it is typed on, is lesson-kit's radio.ts and slip.ts.

import type { Radio, Stations, Talk } from 'lesson-kit/radio';
import intro from '../data/radio/intro.json';
import fog from '../data/radio/fog.json';
import lowSky from '../data/radio/low-sky.json';
import middleSky from '../data/radio/middle-sky.json';
import iceRealm from '../data/radio/ice-realm.json';
import giants from '../data/radio/giants.json';
import front from '../data/radio/front.json';
import localSky from '../data/radio/local-sky.json';
import seeding from '../data/radio/seeding.json';
import wind from '../data/radio/wind.json';
import coast from '../data/radio/coast.json';
import rivers from '../data/radio/rivers.json';

export const STATIONS: Stations = {
  them: { call: 'W7DQ', place: 'Walla Walla' },
  you: { call: 'W7HAR', place: 'Harrow' },
};

export { ACK, transcript, type Cue, type Radio, type Reply, type Talk, type Turn } from 'lesson-kit/radio';

export const INTRO: Talk = intro as Talk;

const BY_SHIFT: Record<string, Radio> = {
  fog: fog as Radio,
  'low-sky': lowSky as Radio,
  'middle-sky': middleSky as Radio,
  'ice-realm': iceRealm as Radio,
  giants: giants as Radio,
  front: front as Radio,
  'local-sky': localSky as Radio,
  seeding: seeding as Radio,
  wind: wind as Radio,
  coast: coast as Radio,
  rivers: rivers as Radio,
};

export function radioFor(shiftId: string): Radio {
  return BY_SHIFT[shiftId] ?? { talks: [] };
}

export function allTalks(): Talk[] {
  return [INTRO, ...Object.values(BY_SHIFT).flatMap((r) => r.talks)];
}

/** Said when the player shuts a talk off midway. One is picked at random. */
export const SNUBS = [
  'You switched off mid-sentence. In Walla Walla, a pipe is set down very slowly.',
  'Click. Walla Walla is left talking to the static, which at least is a good listener.',
  'You signed off without so much as a “seventy-three.” Walla Walla will bring this up at Christmas.',
  'The set goes dark. Somewhere down south, someone mutters about young people and their manners.',
  'Walla Walla keeps talking for a full minute before noticing nobody is there.',
] as const;
