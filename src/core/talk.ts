// The radio. The lessons themselves are a plain workbook; the story lives only
// here, in ham radio talks with the old hand at Walla Walla, a few counties
// over. It is the summer of 1931, and you are the new weather man in Harrow,
// a wheat town with an airfield in eastern Washington. Locals bring you their
// weather questions; Walla Walla helps you learn to answer them. Training
// done, the story skips ahead to 1946, when cloud seeding arrives.
//
// A talk is a few turns. In each turn Walla Walla says something and you pick
// one of up to three replies; a reply can draw a line back, and then the talk
// goes on to the next turn whichever you picked, so the branches always rejoin.
// A reply marked `right` is the answer to a question: a wrong one is ribbed and
// explained, never scored. Talks can be switched off in Settings, and then
// none of this is shown at all.
//
// The words live in data/radio, one file per lesson plus the opening talk.

import type { FigureId } from './shifts';
import intro from '../data/radio/intro.json';
import textures from '../data/radio/textures.json';
import lowSky from '../data/radio/low-sky.json';
import middleSky from '../data/radio/middle-sky.json';
import iceRealm from '../data/radio/ice-realm.json';
import giants from '../data/radio/giants.json';

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

/** When a talk comes on: as the lesson opens, after a figure's task is done, or as the final check opens. */
export type Cue = 'start' | 'check' | { after: FigureId };

export interface Talk {
  id: string;
  cue: Cue;
  /** The transcript's dateline. */
  when: string;
  turns: Turn[];
}

export interface Radio {
  talks: Talk[];
  /** Who in town asked each forecast question in the final check, by the question's id. */
  locals: Record<string, string>;
}

/** What the player says when a turn offers no choice. */
export const ACK = 'Roger. Over.';

export const INTRO: Talk = intro as Talk;

const BY_SHIFT: Record<string, Radio> = {
  textures: textures as Radio,
  'low-sky': lowSky as Radio,
  'middle-sky': middleSky as Radio,
  'ice-realm': iceRealm as Radio,
  giants: giants as Radio,
};

export function radioFor(shiftId: string): Radio {
  return BY_SHIFT[shiftId] ?? { talks: [], locals: {} };
}

export function allTalks(): Talk[] {
  return [INTRO, ...Object.values(BY_SHIFT).flatMap((r) => r.talks)];
}

export function cueKey(cue: Cue): string {
  return typeof cue === 'string' ? cue : `after:${cue.after}`;
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
