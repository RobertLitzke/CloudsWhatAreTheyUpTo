import { describe, expect, it } from 'vitest';
import { driveWasted, isActive, isLive, lfoDestEffective, soundsAlike } from '../src/core/active';
import { DEFAULTS, STEPS } from '../src/core/gen/v1';
import { PARAM_IDS, resolve, type Patch } from '../src/core/params';

const sound = (over: Partial<Patch>) => resolve({ ...DEFAULTS, ...over }, STEPS);

describe('which knobs can be heard', () => {
  it('pulse width only on a pulse', () => {
    expect(isActive('pw', sound({ wave: 1 }))).toBe(true);
    expect(isActive('pw', sound({ wave: 0 }))).toBe(false);
  });

  it('the filter has nothing to do on a sine, until FM gives the sine harmonics', () => {
    const sine = sound({ wave: 3, cutoff: 3 });
    expect(isActive('cutoff', sine)).toBe(false);
    expect(isActive('res', sine)).toBe(false);
    const fmSine = sound({ wave: 3, cutoff: 3, fmAmount: 2 });
    expect(isActive('cutoff', fmSine)).toBe(true);
    expect(isActive('res', fmSine)).toBe(true);
    expect(lfoDestEffective(sound({ wave: 3, lfoDest: 1 }))).toBe(false);
    expect(lfoDestEffective(sound({ wave: 3, lfoDest: 1, fmAmount: 1 }))).toBe(true);
  });

  it('the second oscillator: detune and interval need some level', () => {
    expect(isActive('osc2Detune', sound({ osc2Level: 0 }))).toBe(false);
    expect(isActive('osc2Interval', sound({ osc2Level: 0 }))).toBe(false);
    expect(isActive('osc2Detune', sound({ osc2Level: 2 }))).toBe(true);
    expect(isActive('osc2Interval', sound({ osc2Level: 2 }))).toBe(true);
  });

  it('the second oscillator: in unison and in tune, level is only loudness', () => {
    expect(isActive('osc2Level', sound({ osc2Detune: 0, osc2Interval: 0 }))).toBe(false);
    expect(isActive('osc2Level', sound({ osc2Detune: 1, osc2Interval: 0 }))).toBe(true);
    expect(isActive('osc2Level', sound({ osc2Detune: 0, osc2Interval: 2 }))).toBe(true);
  });

  it('FM: the ratio needs some amount; the amount always counts', () => {
    expect(isActive('fmAmount', sound({}))).toBe(true);
    expect(isActive('fmRatio', sound({ fmAmount: 0 }))).toBe(false);
    expect(isActive('fmRatio', sound({ fmAmount: 1 }))).toBe(true);
  });

  it('a patch at its defaults leaves both extensions silent, and both pedals off', () => {
    const s = sound({});
    expect(s.osc2Level).toBe(0);
    expect(s.fmAmount).toBe(0);
    expect(s.drive).toBe(0);
    expect(s.echoMix).toBe(0);
  });

  it('the pedals: tone and place need the drive on; time and repeats need some echo', () => {
    expect(isActive('driveTone', sound({ drive: 0 }))).toBe(false);
    expect(isActive('chain', sound({ drive: 0 }))).toBe(false);
    expect(isActive('driveTone', sound({ drive: 2 }))).toBe(true);
    expect(isActive('chain', sound({ drive: 2 }))).toBe(true);
    expect(isActive('echoTime', sound({ echoMix: 0 }))).toBe(false);
    expect(isActive('echoRepeats', sound({ echoMix: 0 }))).toBe(false);
    expect(isActive('echoTime', sound({ echoMix: 1 }))).toBe(true);
    expect(isActive('echoRepeats', sound({ echoMix: 1 }))).toBe(true);
    expect(isActive('drive', sound({}))).toBe(true);
    expect(isActive('echoMix', sound({}))).toBe(true);
  });

  it('a drive ahead of the filter cannot reshape a bare pulse', () => {
    const wasted = sound({ chain: 0, wave: 1, drive: 2 });
    expect(driveWasted(wasted)).toBe(true);
    expect(isActive('drive', wasted)).toBe(false);
    // A second oscillator, another wave or another place gives it something to bite on.
    expect(driveWasted(sound({ chain: 0, wave: 1, osc2Level: 2 }))).toBe(false);
    expect(driveWasted(sound({ chain: 0, wave: 0 }))).toBe(false);
    expect(driveWasted(sound({ chain: 1, wave: 1 }))).toBe(false);
  });

  it('with no echo, a drive behind the filter and a drive at the end are the same place', () => {
    const dry = sound({ drive: 2, echoMix: 0 });
    const wet = sound({ drive: 2, echoMix: 2 });
    expect(soundsAlike('chain', 1, 2, dry)).toBe(true);
    expect(soundsAlike('chain', 1, 2, wet)).toBe(false);
    expect(soundsAlike('chain', 0, 1, dry)).toBe(false);
    expect(soundsAlike('chain', 0, 2, dry)).toBe(false);
    expect(soundsAlike('cutoff', 3, 3, dry)).toBe(true);
    expect(soundsAlike('cutoff', 3, 4, dry)).toBe(false);
  });
});

describe('which knobs are locked on the panel', () => {
  it('locks pulse width off a pulse wave, and frees it on one', () => {
    expect(isLive('pw', sound({ wave: 2 }))).toBe(false);
    expect(isLive('pw', sound({ wave: 1 }))).toBe(true);
  });

  it('locks the filter on a bare sine, until FM gives it something to cut', () => {
    for (const id of ['cutoff', 'res', 'envAmt'] as const) {
      expect(isLive(id, sound({ wave: 3 }))).toBe(false);
      expect(isLive(id, sound({ wave: 3, fmAmount: 2 }))).toBe(true);
    }
  });

  it('locks the LFO rate and destination at zero depth, and the depth where its destination is silent', () => {
    expect(isLive('lfoRate', sound({ lfoDepth: 0 }))).toBe(false);
    expect(isLive('lfoDest', sound({ lfoDepth: 0 }))).toBe(false);
    expect(isLive('lfoRate', sound({ lfoDepth: 2 }))).toBe(true);
    // Aimed at pulse width on a saw: the depth does nothing, but the destination can still be changed.
    const aimedAtNothing = sound({ lfoDepth: 2, lfoDest: 2, wave: 0 });
    expect(isLive('lfoDepth', aimedAtNothing)).toBe(false);
    expect(isLive('lfoRate', aimedAtNothing)).toBe(false);
    expect(isLive('lfoDest', aimedAtNothing)).toBe(true);
  });

  it('locks decay at full sustain, and the extras of oscillator 2 and FM while they are off', () => {
    expect(isLive('decay', sound({ sustain: 4 }))).toBe(false);
    expect(isLive('decay', sound({ sustain: 3 }))).toBe(true);
    expect(isLive('osc2Detune', sound({ osc2Level: 0 }))).toBe(false);
    expect(isLive('osc2Interval', sound({ osc2Level: 0 }))).toBe(false);
    expect(isLive('osc2Detune', sound({ osc2Level: 1 }))).toBe(true);
    expect(isLive('fmRatio', sound({ fmAmount: 0 }))).toBe(false);
    expect(isLive('fmRatio', sound({ fmAmount: 1 }))).toBe(true);
  });

  it('locks a pedal\'s other knobs while it is switched off', () => {
    for (const id of ['driveTone', 'chain'] as const) {
      expect(isLive(id, sound({ drive: 0 }))).toBe(false);
      expect(isLive(id, sound({ drive: 1 }))).toBe(true);
    }
    for (const id of ['echoTime', 'echoRepeats'] as const) {
      expect(isLive(id, sound({ echoMix: 0 }))).toBe(false);
      expect(isLive(id, sound({ echoMix: 1 }))).toBe(true);
    }
  });

  it('never locks the knobs that open the others, so nobody is trapped', () => {
    const always = ['wave', 'attack', 'sustain', 'release', 'fmAmount', 'osc2Level', 'drive', 'echoMix'] as const;
    for (const wave of [0, 1, 2, 3]) {
      for (const lfoDest of [0, 1, 2, 3]) {
        for (const sustain of [0, 4]) {
          const s = sound({ wave, lfoDest, sustain, lfoDepth: 0, osc2Level: 0, fmAmount: 0, drive: 0, echoMix: 0 });
          for (const id of always) expect(isLive(id, s)).toBe(true);
        }
      }
    }
    // Every parameter has a rule: this fails on a new one that was forgotten.
    for (const id of PARAM_IDS) expect(typeof isLive(id, sound({}))).toBe('boolean');
  });
});
