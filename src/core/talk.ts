// The radio. The lessons themselves are a plain workbook; the setting lives
// only here, in ham radio talks with the old hand at Walla Walla, a few
// counties over. It is 1931, and you are the new weather forecaster in Harrow,
// a wheat town in eastern Washington. Each lesson gets two talks: a short
// opening as it starts, and a quiz once its check is done; nothing comes on in
// between. Training done, the story skips ahead to 1946, when cloud seeding
// arrives.
//
// A talk is a few turns. In each turn Walla Walla says something and you pick
// one of up to three replies; a reply can draw a line back, and then the talk
// goes on to the next turn whichever you picked, so the branches always rejoin.
// A reply marked `right` is the answer to a question: a wrong one is ribbed and
// explained, never scored. Talks can be switched off in Settings, and then
// none of this is shown at all.
//
// The words live in data/radio, one file per lesson plus the opening talk.

import intro from '../data/radio/intro.json';
import fog from '../data/radio/fog.json';
import lowSky from '../data/radio/low-sky.json';
import middleSky from '../data/radio/middle-sky.json';
import iceRealm from '../data/radio/ice-realm.json';
import giants from '../data/radio/giants.json';
import front from '../data/radio/front.json';
import localSky from '../data/radio/local-sky.json';
import seeding from '../data/radio/seeding.json';

export const STATIONS = {
  them: { call: 'W7DQ', place: 'Walla Walla' },
  you: { call: 'W7HAR', place: 'Harrow' },
} as const;

export interface Reply {
  say: string;
  /** Walla Walla's answer to this reply, before the next turn. */
  back?: string;
  /** This reply is the right answer to the turn's question. */
  right?: boolean;
  /** Picking this reply switches the radio off (the opening talk offers it). */
  off?: boolean;
}

export interface Turn {
  them: string;
  /** Up to three. With none, the player just acknowledges. */
  replies?: Reply[];
}

/** When a talk comes on: as the lesson opens, or once its check is done. */
export type Cue = 'start' | 'check';

export interface Talk {
  id: string;
  cue: Cue;
  /** The transcript's dateline. */
  when: string;
  turns: Turn[];
}

export interface Radio {
  talks: Talk[];
}

/** What the player says when a turn offers no choice. */
export const ACK = 'Roger. Over.';

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
};

export function radioFor(shiftId: string): Radio {
  return BY_SHIFT[shiftId] ?? { talks: [] };
}

export function allTalks(): Talk[] {
  return [INTRO, ...Object.values(BY_SHIFT).flatMap((r) => r.talks)];
}

/** Lines said, in order, given the reply picked at each turn. */
export function transcript(talk: Talk, picks: readonly number[]): { who: 'them' | 'you'; text: string }[] {
  const out: { who: 'them' | 'you'; text: string }[] = [];
  talk.turns.forEach((turn, i) => {
    out.push({ who: 'them', text: turn.them });
    const reply = turn.replies?.[picks[i] ?? 0];
    out.push({ who: 'you', text: reply?.say ?? ACK });
    if (reply?.back) out.push({ who: 'them', text: reply.back });
  });
  return out;
}

/** Said when the player shuts a talk off midway. One is picked at random. */
export const SNUBS = [
  'You switched off mid-sentence. In Walla Walla, a pipe is set down very slowly.',
  'Click. Walla Walla is left talking to the static, which at least is a good listener.',
  'You signed off without so much as a “seventy-three.” Walla Walla will bring this up at Christmas.',
  'The set goes dark. Somewhere down south, someone mutters about young people and their manners.',
  'Walla Walla keeps talking for a full minute before noticing nobody is there.',
] as const;
