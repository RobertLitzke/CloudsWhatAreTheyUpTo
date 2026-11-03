// Which parameters can be heard in a given sound. Two rules, for two jobs.
//
// `isActive` is for the generator. A puzzle only creates a difference on a
// parameter that is active in the TARGET, so every difference can be heard.
// It is deliberately strict (a step of decay at half sustain is a few
// decibels), and part of what a key means: changing it is a new generator
// version, like changing a step table.
//
// `isLive` is for the panel. A knob that no position of could change the sound
// is locked, not merely dimmed, so there is never a dead knob to turn. Every
// parameter is scored regardless: a knob left wrong is wrong whether or not it
// was audible when the player committed.

import { CHAIN, LFO_DEST, MATRIX_IDS, WAVE, cellOf, type ModSource, type ParamId, type Sound } from './params';

/** Is a source of the modulation matrix routed anywhere? */
export function routed(s: Sound, src: ModSource): boolean {
  return MATRIX_IDS.some((id) => s[id] !== 0 && cellOf(id)!.src === src);
}

/** Is envelope 2 heard: by its own amount, or through the matrix? */
const env2Used = (s: Sound) => s.env2Amt > 0 || routed(s, 'Env2');
/** Is the LFO heard: on its own destination, or through the matrix? */
const lfoUsed = (s: Sound) => (s.lfoDepth > 0 && lfoDestEffective(s)) || routed(s, 'Lfo');

/**
 * Nothing above the fundamental: a sine that FM has not touched. The filter
 * has no harmonics to remove from it.
 */
function pure(s: Sound): boolean {
  return s.wave === WAVE.sine && s.fmAmount === 0 && s.noise === 0 && s.env2Amt === 0;
}

/** Does the LFO's destination do anything in this sound? */
export function lfoDestEffective(s: Sound): boolean {
  if (s.lfoDest === LFO_DEST.cutoff) return !pure(s);
  if (s.lfoDest === LFO_DEST.pw) return s.wave === WAVE.pulse;
  return true;
}

/**
 * A wave with only two levels, which a clipper cannot reshape: a pulse of any
 * width, with nothing mixed in. Whatever the drive does to the two levels, two
 * levels come out, so ahead of the filter the pedal only changes the loudness.
 */
export function driveWasted(s: Sound): boolean {
  return s.chain === CHAIN.first && s.wave === WAVE.pulse && s.osc2Level === 0;
}

/**
 * Would turning this knob, to any position, change what is heard? If not it is
 * locked on the panel. Every lock opens by turning a knob that is never locked
 * (wave, attack, sustain, release, FM amount, oscillator 2 level, drive, echo
 * mix), so a lock can never trap the player: oscillator 2's level is always
 * live for that reason, though in tune it only changes loudness.
 */
export function isLive(id: ParamId, s: Sound): boolean {
  switch (id) {
    case 'wave':
    case 'attack':
    case 'sustain':
    case 'release':
    case 'fmAmount':
    case 'osc2Level':
    case 'drive':
    case 'echoMix':
      return true;
    case 'driveTone':
    case 'chain':
      // A pedal that is switched off has no tone, and it does not matter where it sits.
      return s.drive > 0;
    case 'echoTime':
    case 'echoRepeats':
      return s.echoMix > 0;
    case 'pw':
      return s.wave === WAVE.pulse;
    case 'cutoff':
    case 'res':
    case 'envAmt':
      return !pure(s);
    case 'decay':
      // At full sustain there is no fall to time.
      return s.sustain < 1;
    case 'lfoDepth':
      return lfoDestEffective(s);
    case 'lfoDest':
      // Choosing a destination that does nothing is still a choice, so it stays
      // live while the depth is up, or it could not be chosen away again.
      return s.lfoDepth > 0;
    case 'lfoRate':
      return lfoUsed(s);
    case 'osc2Detune':
    case 'osc2Interval':
      return s.osc2Level > 0;
    case 'fmRatio':
      return s.fmAmount > 0;
    case 'noise':
    case 'legato':
    case 'glide':
    case 'oscLevel':
    case 'env2Amt':
      return true;
    case 'env2Fall':
    case 'env2Rise':
    case 'env2Mode':
      return env2Used(s);
    case 'env2Dest':
      return s.env2Amt > 0;
    case 'filterMode':
      return !pure(s);
    case 'lfoShape':
      return lfoUsed(s);
    default:
      // A matrix cell: a route can always be made.
      return true;
  }
}

/**
 * Two positions of one knob that cannot be told apart in this sound, so a
 * puzzle accepts either. With no echo, a drive just behind the filter and a
 * drive at the very end of the chain are the same place.
 */
export function soundsAlike(id: ParamId, a: number, b: number, s: Sound): boolean {
  if (a === b) return true;
  return id === 'chain' && s.echoMix === 0 && a !== CHAIN.first && b !== CHAIN.first;
}

export function isActive(id: ParamId, s: Sound): boolean {
  switch (id) {
    case 'wave':
    case 'attack':
    case 'sustain':
    case 'fmAmount':
      return true;
    case 'pw':
      return s.wave === WAVE.pulse;
    case 'cutoff':
      return !pure(s);
    case 'res':
      // A resonant peak up at the top of the range sits above almost everything.
      return !pure(s) && s.cutoff < 8000;
    case 'envAmt':
      // With full sustain and an instant attack the envelope is flat, and an
      // envelope amount is then indistinguishable from a higher cutoff. Near
      // the top of the cutoff range there is no room left to open.
      return !pure(s) && s.cutoff <= 3000 && (s.sustain < 1 || s.attack >= 0.08);
    case 'decay':
      // The decay is the fall from full level to the sustain level. With the
      // sustain at half or more that fall is a few decibels and its length
      // cannot be told, unless the filter is following it.
      return s.sustain <= 0.25 || (s.sustain <= 0.5 && s.envAmt >= 2 && !pure(s) && s.cutoff <= 3000);
    case 'release':
      // Nothing is left to release if the note has already died away.
      return s.sustain >= 0.25 || s.decay >= 0.7;
    case 'lfoDepth':
      return lfoDestEffective(s);
    case 'lfoRate':
    case 'lfoDest':
      return s.lfoDepth > 0 && lfoDestEffective(s);
    case 'osc2Level':
      // In unison and in tune, the second oscillator only makes the first
      // louder, and loudness is not what a puzzle should turn on.
      return s.osc2Detune > 0 || s.osc2Interval !== 0;
    case 'osc2Detune':
    case 'osc2Interval':
      return s.osc2Level > 0;
    case 'fmRatio':
      return s.fmAmount > 0;
    case 'drive':
      return !driveWasted(s);
    case 'driveTone':
    case 'chain':
      return s.drive > 0;
    case 'echoMix':
      return true;
    case 'echoTime':
    case 'echoRepeats':
      return s.echoMix > 0;
    // The course's knobs: no generator version draws them yet.
    case 'noise':
    case 'legato':
    case 'glide':
    case 'oscLevel':
    case 'env2Amt':
      return true;
    case 'env2Fall':
    case 'env2Rise':
    case 'env2Mode':
      return env2Used(s);
    case 'env2Dest':
      return s.env2Amt > 0;
    case 'filterMode':
      return !pure(s);
    case 'lfoShape':
      return lfoUsed(s);
    default:
      // A matrix cell: a route can always be made.
      return true;
  }
}
