// A stage's lesson, as a walk through its module: a handful of short parts, each
// one idea, one control to try it on, and one small thing to do. The loop plays
// while you turn things, and the scope stays pinned to the top of the screen
// (if it moved from card to card, the card under a finger would jump).
//
// Knobs here move in the same steps as the puzzles, but nothing is counted.
// Each part sets the other knobs where it needs them as it opens (a pulse wave
// before the width knob means anything, a low cutoff before the filter
// envelope does), so every part works whatever was done in the one before.

import { getEngine, peekEngine } from '../../audio/engine';
import { STAGES } from '../../core/campaign';
import { LATEST_RULES } from '../../core/gen';
import { PARAMS, PARAM_IDS, resolve, valueAt, type ParamId, type Patch } from '../../core/params';
import { RIFFS, riffById } from '../../core/riffs';
import type { Knob } from '../components/knob';
import { createPad, type Pad } from '../components/pad';
import { createFlow, type Flow } from '../components/flow';
import { createControl, createPanel } from '../components/panel';
import { createScope } from '../components/scope';
import { el } from '../dom';
import type { View } from '../router';
import { getSave, updateSave } from '../store';
import { page } from '../ui';

interface Part {
  title: string;
  text: string[];
  /** Knob positions set as the part opens, so that what it describes can be heard. */
  enter?: Partial<Patch>;
  /** The controls to try it on. */
  knobs?: ParamId[];
  /** Or two knobs as one square to drag around: across, then up. */
  pad?: [ParamId, ParamId];
  /** Draw the signal chain above the controls. */
  flow?: boolean;
  /** The one thing to do. */
  task: string;
  /** Has it been done? `log` is every setting visited since the part opened, oldest first. */
  done: (now: Patch, log: readonly Patch[]) => boolean;
}

interface Lesson {
  /** One line under the title. */
  intro: string;
  parts: Part[];
  /** Ready-made settings of this stage's knobs, for the last section. */
  examples: { name: string; set: Partial<Patch> }[];
  /** Knobs from earlier stages that the last section also leaves live. */
  also?: ParamId[];
  /** A public-domain riff (so every build has it) that shows the module off. */
  riffId: number;
  /** Where every knob starts, as positions on the step tables. */
  start: Partial<Patch>;
}

/** How many different positions of a knob the log has been through. */
const tried = (log: readonly Patch[], id: ParamId) => new Set(log.map((p) => p[id])).size;
const been = (log: readonly Patch[], id: ParamId, pos: number) => log.some((p) => p[id] === pos);

const LESSONS: Record<number, Lesson> = {
  1: {
    intro: 'Every sound here starts at the oscillator. Its wave shape decides which harmonics are in the sound before anything else touches it.',
    parts: [
      {
        title: 'Four shapes',
        text: [
          'A saw is bright and buzzy. A pulse is hollow, like a clarinet. A triangle is soft and flute-like. A sine is a bare, pure tone.',
        ],
        enter: { wave: 0 },
        knobs: ['wave'],
        task: 'Listen to all four waves.',
        done: (_, log) => tried(log, 'wave') >= 4,
      },
      {
        title: 'What the pictures show',
        text: [
          'The left of the display is the wave itself. The right is its spectrum: one bar for each harmonic, low on the left and high on the right. Bright sounds fill the right-hand side.',
        ],
        enter: { wave: 0 },
        knobs: ['wave'],
        task: 'Find the wave whose spectrum is a single bar.',
        done: (now) => now.wave === 3,
      },
      {
        title: 'Pulse width',
        text: [
          'A pulse flips between high and low. Width is how much of each cycle it spends high. At 50 % it is a square; narrower, the body drains away and a thin, nasal edge is left.',
        ],
        enter: { wave: 1, pw: 0 },
        knobs: ['pw'],
        task: 'Step Width all the way down to 10 %.',
        done: (now) => now.pw === 4,
      },
      {
        title: 'A dark knob',
        text: [
          'Width shapes the pulse and nothing else. On the other three waves it does nothing, so the knob goes dark. A knob that is dark in the target is never part of a puzzle’s answer.',
        ],
        enter: { wave: 1, pw: 2 },
        knobs: ['wave', 'pw'],
        task: 'Pick a wave that turns Width dark.',
        done: (now) => now.wave !== 1,
      },
    ],
    examples: [
      { name: 'Buzzy saw', set: { wave: 0 } },
      { name: 'Hollow square', set: { wave: 1, pw: 0 } },
      { name: 'Thin pulse', set: { wave: 1, pw: 4 } },
      { name: 'Pure sine', set: { wave: 3 } },
    ],
    riffId: 69,
    start: { wave: 0, pw: 0 },
  },
  2: {
    intro: 'The filter is the synth’s tone control. It removes harmonics from the top down, and the pitch of the note does not change.',
    parts: [
      {
        title: 'Cutoff',
        text: [
          'Everything above the cutoff is taken away. High, the sound is bright and open. Low, it is dark and muffled. Watch the right-hand side of the spectrum fall away as you turn it down.',
        ],
        enter: { wave: 0, cutoff: 7, res: 0 },
        knobs: ['cutoff'],
        task: 'Close the filter to 285 Hz or lower.',
        done: (now) => now.cutoff <= 1,
      },
      {
        title: 'Resonance',
        text: [
          'Resonance boosts a narrow band right at the cutoff. A little adds a nasal edge. A lot makes the filter ring, and you hear a whistle exactly where the cutoff sits.',
        ],
        enter: { wave: 0, cutoff: 3, res: 0 },
        knobs: ['res'],
        task: 'Raise Reso to the top and hear it whistle.',
        done: (now) => now.res === 4,
      },
      {
        title: 'Both at once',
        text: [
          'Drag around the square: across is cutoff, up is resonance. With the resonance high, the whistle follows the cutoff and picks out one harmonic after another.',
        ],
        enter: { wave: 0, cutoff: 3, res: 3 },
        pad: ['cutoff', 'res'],
        task: 'Keeping Reso at Q 8 or more, sweep Cutoff through five positions.',
        done: (_, log) => new Set(log.filter((p) => p.res >= 3).map((p) => p.cutoff)).size >= 5,
      },
      {
        title: 'Telling them apart',
        text: [
          'Both knobs change brightness, which is why they get mixed up. Cutoff moves the edge up and down. Resonance leaves the edge where it is and sharpens it. Ask: did the sound get darker, or did it get a peak?',
        ],
        enter: { wave: 0, cutoff: 4, res: 2 },
        knobs: ['cutoff', 'res'],
        task: 'Make it dark and smooth: Cutoff at 500 Hz or lower, Reso at Q 0.7.',
        done: (now) => now.cutoff <= 2 && now.res === 0,
      },
    ],
    examples: [
      { name: 'Open', set: { cutoff: 7, res: 0 } },
      { name: 'Dark', set: { cutoff: 2, res: 0 } },
      { name: 'Nasal', set: { cutoff: 3, res: 2 } },
      { name: 'Whistling', set: { cutoff: 3, res: 4 } },
    ],
    riffId: 69,
    start: { wave: 0, cutoff: 5, res: 0 },
  },
  3: {
    intro: 'The envelope shapes each note over time: how it starts, how it settles, and how it ends.',
    parts: [
      {
        title: 'Attack',
        text: ['Attack is how long a note takes to reach full level. Short, the note starts at once. Long, it swells in, and on quick notes it may never get there.'],
        enter: { attack: 0, decay: 2, sustain: 4, release: 1, envAmt: 0 },
        knobs: ['attack'],
        task: 'Raise Attack to 250 ms or more, so the notes swell in.',
        done: (now) => now.attack >= 3,
      },
      {
        title: 'Decay and sustain',
        text: [
          'After the attack the note falls to the sustain level and holds there while the key is down. Decay is how long that fall takes. Sustain is a level, not a time, and that is the usual thing to mix up.',
          'With sustain at half or more there is little left to fall, and Decay goes dark.',
        ],
        enter: { attack: 0, decay: 2, sustain: 1, release: 1, envAmt: 0 },
        pad: ['decay', 'sustain'],
        task: 'Make a pluck: Sustain at 0 %, Decay at 120 ms or shorter.',
        done: (now) => now.sustain === 0 && now.decay <= 1,
      },
      {
        title: 'Release',
        text: ['Release is how long a note takes to fade once the key comes up. Short, the notes are clipped apart. Long, each one hangs on into the next.'],
        enter: { attack: 0, decay: 2, sustain: 3, release: 0, envAmt: 0 },
        knobs: ['release'],
        task: 'Raise Release to 600 ms or more and hear the notes run together.',
        done: (now) => now.release >= 3,
      },
      {
        title: 'The envelope on the filter',
        text: [
          'Env amt sends the same envelope to the filter. Each note then opens the filter by that many octaves and lets it close again along the decay, so it starts bright and settles darker.',
          'It needs a cutoff low enough to leave room above it, which is how this part has set it.',
        ],
        enter: { cutoff: 2, res: 1, attack: 0, decay: 2, sustain: 1, release: 1, envAmt: 0 },
        knobs: ['envAmt', 'decay'],
        task: 'Open Env amt to 2 octaves or more.',
        done: (now) => now.envAmt >= 2,
      },
    ],
    examples: [
      { name: 'Pluck', set: { attack: 0, decay: 1, sustain: 0, release: 1, envAmt: 0 } },
      { name: 'Swell', set: { attack: 3, decay: 2, sustain: 3, release: 2, envAmt: 0 } },
      { name: 'Organ', set: { attack: 0, decay: 2, sustain: 4, release: 0, envAmt: 0 } },
      { name: 'Filter pluck', set: { attack: 0, decay: 2, sustain: 1, release: 1, envAmt: 3 } },
    ],
    riffId: 72,
    start: { wave: 0, cutoff: 3, res: 1, attack: 0, decay: 2, sustain: 1, release: 1, envAmt: 0 },
  },
  4: {
    intro: 'An LFO is an oscillator too slow to hear as a pitch. Instead of making sound, it turns another knob for you, up and down, over and over.',
    parts: [
      {
        title: 'Depth',
        text: ['Depth is how far the LFO pushes. Here it is pushing the pitch, which is vibrato: a gentle waver at first, a siren at the top.'],
        enter: { lfoDest: 0, lfoRate: 2, lfoDepth: 0 },
        knobs: ['lfoDepth'],
        task: 'Raise Depth to 65 % or more.',
        done: (now) => now.lfoDepth >= 3,
      },
      {
        title: 'Rate',
        text: [
          'Rate is how fast it goes round, counted against the tempo: from one sweep in a bar up to sixteen. It restarts with the loop, so a target’s wobble and yours always line up.',
        ],
        enter: { lfoDest: 0, lfoRate: 2, lfoDepth: 2 },
        knobs: ['lfoRate'],
        task: 'Try the slowest rate and the fastest.',
        done: (_, log) => been(log, 'lfoRate', 0) && been(log, 'lfoRate', 4),
      },
      {
        title: 'Destination',
        text: [
          'Dest is which knob the LFO turns. Pitch gives vibrato. Cutoff gives a wah that sweeps the brightness. Width sweeps the pulse width for a slow shimmer. Level gives tremolo, a pulsing volume.',
        ],
        enter: { wave: 1, pw: 0, cutoff: 4, lfoDest: 0, lfoRate: 2, lfoDepth: 3 },
        knobs: ['lfoDest'],
        task: 'Listen to all four destinations.',
        done: (_, log) => tried(log, 'lfoDest') >= 4,
      },
      {
        title: 'How fast, how far',
        text: ['Drag around the square: across is rate, up is depth. Along the bottom the depth is off, and with nothing to push, Rate and Dest do nothing. They go dark.'],
        enter: { wave: 1, pw: 0, cutoff: 4, lfoDest: 1, lfoRate: 2, lfoDepth: 2 },
        pad: ['lfoRate', 'lfoDepth'],
        task: 'Find a fast, deep wah: rate 1/8 or quicker, depth 65 % or more.',
        done: (now) => now.lfoRate >= 3 && now.lfoDepth >= 3,
      },
    ],
    examples: [
      { name: 'Vibrato', set: { lfoDest: 0, lfoRate: 3, lfoDepth: 1 } },
      { name: 'Wah', set: { lfoDest: 1, lfoRate: 2, lfoDepth: 3 } },
      { name: 'Shimmer', set: { lfoDest: 2, lfoRate: 1, lfoDepth: 3 } },
      { name: 'Tremolo', set: { lfoDest: 3, lfoRate: 4, lfoDepth: 3 } },
    ],
    riffId: 58,
    start: { wave: 1, pw: 0, cutoff: 4, res: 1, sustain: 3, lfoDest: 0, lfoRate: 2, lfoDepth: 2 },
  },
  5: {
    intro: 'A second oscillator plays the same wave alongside the first. Two nearly identical tones are thicker than one.',
    parts: [
      {
        title: 'Level',
        text: ['Level is how much of the second oscillator is mixed in. It is tuned a few cents away from the first, so as it comes up the long notes begin to swell and fade.'],
        enter: { osc2Level: 0, osc2Detune: 2, osc2Interval: 0 },
        knobs: ['osc2Level'],
        task: 'Bring Level up to 55 % or more.',
        done: (now) => now.osc2Level >= 3,
      },
      {
        title: 'Detune',
        text: [
          'Detune pulls the second oscillator slightly off pitch. The two drift in and out of step, and you hear that as a slow swell called beating. More detune beats faster, and so do higher notes.',
        ],
        enter: { osc2Level: 3, osc2Detune: 2, osc2Interval: 0 },
        knobs: ['osc2Detune'],
        task: 'Hear it with no detune at all, and at 40 cents.',
        done: (_, log) => been(log, 'osc2Detune', 0) && been(log, 'osc2Detune', 4),
      },
      {
        title: 'Interval',
        text: ['Interval moves the second oscillator by a whole musical step instead: an octave down for weight, an octave up for brightness, a fifth up for a hollow, organ-like stack.'],
        enter: { osc2Level: 3, osc2Detune: 0, osc2Interval: 0 },
        knobs: ['osc2Interval'],
        task: 'Listen to all four intervals.',
        done: (_, log) => tried(log, 'osc2Interval') >= 4,
      },
      {
        title: 'When the knobs go dark',
        text: [
          'With Level at Off there is only one oscillator, so Detune and Interval go dark. And in unison with no detune the two are the same tone, only louder, so there it is Level that goes dark.',
        ],
        enter: { osc2Level: 3, osc2Detune: 2, osc2Interval: 0 },
        knobs: ['osc2Interval', 'osc2Level', 'osc2Detune'],
        task: 'Turn Level dark without touching it.',
        done: (now) => now.osc2Level > 0 && now.osc2Detune === 0 && now.osc2Interval === 0,
      },
    ],
    examples: [
      { name: 'One oscillator', set: { osc2Level: 0 } },
      { name: 'Shimmer', set: { osc2Level: 3, osc2Detune: 1, osc2Interval: 0 } },
      { name: 'Wide chorus', set: { osc2Level: 4, osc2Detune: 4, osc2Interval: 0 } },
      { name: 'Sub octave', set: { osc2Level: 3, osc2Detune: 0, osc2Interval: 1 } },
      { name: 'Fifths', set: { osc2Level: 3, osc2Detune: 0, osc2Interval: 2 } },
    ],
    riffId: 58,
    start: { wave: 0, cutoff: 5, res: 0, sustain: 4, release: 2, osc2Level: 3, osc2Detune: 2, osc2Interval: 0 },
  },
  6: {
    intro: 'FM is frequency modulation: a hidden oscillator wobbles the pitch of the first, as vibrato does, but hundreds of times a second. That is too fast to hear as a wobble. You hear new harmonics instead.',
    parts: [
      {
        title: 'Amount',
        text: ['Amount is how hard the pitch is pushed. This starts as a pure sine. A little FM adds a glassy edge; a lot makes it bright and clangorous. Watch bars appear in the spectrum where there was one.'],
        enter: { wave: 3, cutoff: 7, fmAmount: 0, fmRatio: 2 },
        knobs: ['fmAmount'],
        task: 'Raise Amount to 2 or more.',
        done: (now) => now.fmAmount >= 3,
      },
      {
        title: 'Ratio',
        text: [
          'Ratio is how fast the hidden oscillator runs compared with the note. ×1 fills in every harmonic, like brass. ×2 gives only the odd ones, hollow like a square. ×3 and ×4 leave gaps, which is the sound of bells and metal. ×½ adds a tone an octave below.',
        ],
        enter: { wave: 3, cutoff: 7, fmAmount: 2, fmRatio: 2 },
        knobs: ['fmRatio'],
        task: 'Listen to all five ratios.',
        done: (_, log) => tried(log, 'fmRatio') >= 5,
      },
      {
        title: 'Bells and brass',
        text: ['Drag around the square: across is ratio, up is amount. Along the bottom the amount is off, the sine is pure again, and Ratio goes dark.'],
        enter: { wave: 3, cutoff: 7, fmAmount: 2, fmRatio: 1 },
        pad: ['fmRatio', 'fmAmount'],
        task: 'Find a bell: ratio ×3 or ×4, amount 2 or more.',
        done: (now) => now.fmRatio >= 3 && now.fmAmount >= 3,
      },
      {
        title: 'FM on a brighter wave',
        text: ['A saw is already full of harmonics, so a touch of FM is lost among them and only a lot of it shows. On a sine or a triangle every step can be heard, which is why targets use the sine again from this stage.'],
        enter: { wave: 0, cutoff: 7, fmAmount: 0, fmRatio: 2 },
        knobs: ['wave', 'fmAmount'],
        task: 'On the saw, raise Amount until you can clearly hear it.',
        done: (now) => now.wave === 0 && now.fmAmount >= 2,
      },
    ],
    examples: [
      { name: 'Pure sine', set: { fmAmount: 0 } },
      { name: 'Glassy', set: { fmAmount: 1, fmRatio: 2 } },
      { name: 'Brassy', set: { fmAmount: 3, fmRatio: 1 } },
      { name: 'Bell', set: { fmAmount: 3, fmRatio: 3 } },
      { name: 'Growl', set: { fmAmount: 4, fmRatio: 0 } },
    ],
    riffId: 72,
    start: { wave: 3, cutoff: 7, res: 0, decay: 3, sustain: 2, release: 2, fmAmount: 2, fmRatio: 2 },
  },
  7: {
    intro: 'From here on the sound leaves the synth and goes through pedals. The first is a drive: it turns the signal up until it no longer fits, and the tops of the wave are squashed flat.',
    parts: [
      {
        title: 'Clipping',
        text: [
          'Squashing a wave flat is called clipping. A flattened wave is a squarer wave, and squarer means more harmonics: a buzz laid over the note. This starts as a pure sine so that every step is plain. Watch the bars appear in the spectrum.',
        ],
        enter: { wave: 3, cutoff: 7, sustain: 4, drive: 0, driveTone: 4 },
        knobs: ['drive'],
        task: 'Raise Drive to 24 dB or more.',
        done: (now) => now.drive >= 3,
      },
      {
        title: 'Sustain for free',
        text: [
          'The pedal turns its output back down, so more drive is not much louder. But the quiet tail of a note is turned up and never reaches the ceiling, so it comes out louder than it went in. Notes hang on longer, and a short pluck turns into a held note.',
        ],
        enter: { wave: 0, cutoff: 3, res: 0, attack: 0, decay: 2, sustain: 0, release: 1, drive: 0, driveTone: 3 },
        knobs: ['drive'],
        task: 'Hear this pluck with Drive at Off, and at 32 dB.',
        done: (_, log) => been(log, 'drive', 0) && been(log, 'drive', 4),
      },
      {
        title: 'Tone',
        text: [
          'Tone is a small filter inside the pedal, after the clipping. Turned down, it takes the fizz off the top. With Drive at Off the pedal is out of the circuit, and Tone goes dark.',
        ],
        enter: { wave: 0, cutoff: 4, res: 0, sustain: 3, decay: 2, drive: 3, driveTone: 4 },
        knobs: ['driveTone'],
        task: 'Turn Tone down to 1.4 kHz or lower.',
        done: (now) => now.driveTone <= 1,
      },
      {
        title: 'Tone or cutoff?',
        text: [
          'Both knobs darken the sound, which is why they get mixed up. Drag around the square: across is the synth’s cutoff, up is the pedal’s tone. Cutoff comes before the clipping, so closing it gives the pedal less to bite on and the grit thins out. Tone comes after, so the grit stays and only its top goes.',
        ],
        enter: { wave: 0, cutoff: 3, res: 0, sustain: 3, decay: 2, drive: 3, driveTone: 3 },
        pad: ['cutoff', 'driveTone'],
        task: 'Make it gritty but dark: Cutoff at 2.8 kHz or higher, Tone at 1.4 kHz or lower.',
        done: (now) => now.cutoff >= 5 && now.driveTone <= 1,
      },
    ],
    examples: [
      { name: 'Clean', set: { drive: 0 } },
      { name: 'Warm', set: { drive: 1, driveTone: 2 } },
      { name: 'Crunch', set: { drive: 2, driveTone: 3 } },
      { name: 'Fuzz', set: { drive: 4, driveTone: 4 } },
      { name: 'Woolly', set: { drive: 4, driveTone: 0 } },
    ],
    also: ['cutoff'],
    riffId: 69,
    start: { wave: 0, cutoff: 4, res: 0, sustain: 3, release: 1, drive: 2, driveTone: 3 },
  },
  8: {
    intro: 'An echo pedal plays back what it has just heard, a moment later. The note itself goes straight through; the copy follows behind it.',
    parts: [
      {
        title: 'Mix',
        text: ['Mix is how loud the copy is against the note. These are short plucks, which leave room after each note for an echo to be heard in.'],
        enter: { attack: 0, decay: 2, sustain: 0, release: 1, echoTime: 1, echoRepeats: 0, echoMix: 0 },
        knobs: ['echoMix'],
        task: 'Bring Mix up to 35 % or more.',
        done: (now) => now.echoMix >= 2,
      },
      {
        title: 'Time',
        text: [
          'Time is the gap before the copy, counted in notes so that it stays in step with the riff. A sixteenth is a quick slap right behind the note. An eighth or a quarter lands on the beat. The dotted eighth falls between the beats and sets up a gallop of its own.',
        ],
        enter: { attack: 0, decay: 2, sustain: 0, release: 1, echoTime: 1, echoRepeats: 0, echoMix: 2 },
        knobs: ['echoTime'],
        task: 'Listen to all four times.',
        done: (_, log) => tried(log, 'echoTime') >= 4,
      },
      {
        title: 'Repeats',
        text: [
          'Repeats sends each copy round to be copied again, a little quieter and a little duller every time. At One there is a single echo. Turned up, a trail of them fades away behind every note.',
        ],
        enter: { attack: 0, decay: 2, sustain: 0, release: 1, echoTime: 1, echoRepeats: 0, echoMix: 2 },
        knobs: ['echoRepeats'],
        task: 'Raise Repeats to the top.',
        done: (now) => now.echoRepeats === 3,
      },
      {
        title: 'Louder or longer?',
        text: [
          'More of either knob is “more echo”, so they are easy to confuse. Drag around the square: across is repeats, up is mix. Mix sets how loud the first echo is. Repeats sets how long the trail takes to die away. Along the bottom the mix is off, and with no echo to time or repeat, the other two knobs go dark.',
          'Echoes show in the gaps between notes. Under long held notes they are buried, and a puzzle then asks only for a big change in Repeats.',
        ],
        enter: { attack: 0, decay: 2, sustain: 0, release: 1, echoTime: 1, echoRepeats: 1, echoMix: 2 },
        pad: ['echoRepeats', 'echoMix'],
        task: 'Find a long, quiet trail: Mix at 15 %, Repeats at 80 %.',
        done: (now) => now.echoMix === 1 && now.echoRepeats === 3,
      },
    ],
    examples: [
      { name: 'Dry', set: { echoMix: 0 } },
      { name: 'Slap', set: { echoTime: 0, echoRepeats: 0, echoMix: 2 } },
      { name: 'Eighths', set: { echoTime: 1, echoRepeats: 1, echoMix: 2 } },
      { name: 'Gallop', set: { echoTime: 2, echoRepeats: 2, echoMix: 2 } },
      { name: 'Wash', set: { echoTime: 3, echoRepeats: 3, echoMix: 3 } },
    ],
    riffId: 72,
    start: { wave: 0, cutoff: 4, res: 1, attack: 0, decay: 2, sustain: 0, release: 1, echoTime: 1, echoRepeats: 1, echoMix: 2 },
  },
  9: {
    intro: 'A note goes through the synth in a line: oscillator, filter, then the pedals. So far the drive has sat between the filter and the echo, where a pedal usually goes. Move it, and the same knobs make a different sound.',
    parts: [
      {
        title: 'Drive, then filter',
        text: [
          'Put the drive first and it clips the raw oscillator, ahead of the filter. The filter then takes the fizz off whatever the clipping made, so the sound is thick but tidy. The oscillator is always at full level there, so the drive no longer follows the envelope, and the extra sustain is gone.',
        ],
        enter: { wave: 0, cutoff: 3, res: 1, attack: 0, decay: 2, sustain: 1, release: 1, drive: 3, driveTone: 4, echoMix: 0, chain: 1 },
        knobs: ['chain'],
        flow: true,
        task: 'Put the drive First.',
        done: (now) => now.chain === 0,
      },
      {
        title: 'Filter, then drive',
        text: [
          'In the middle, the drive clips what the filter and the envelope have already shaped. The clipping puts back harmonics the filter took out, so the cutoff can no longer make the sound truly dark, and a resonant peak turns into a snarl.',
        ],
        enter: { wave: 0, cutoff: 3, res: 3, attack: 0, decay: 2, sustain: 1, release: 1, drive: 3, driveTone: 4, echoMix: 0, chain: 1 },
        knobs: ['chain', 'cutoff'],
        flow: true,
        task: 'Close Cutoff to 285 Hz or lower with the drive First, and again with it in the Middle.',
        done: (_, log) => [0, 1].every((place) => log.some((p) => p.chain === place && p.cutoff <= 1)),
      },
      {
        title: 'Echo, then drive',
        text: [
          'Last, the drive comes after the echo, and the echoes are clipped along with the note. Quiet echoes are pushed up towards the same ceiling as everything else, so they come out nearly as loud as the note and smear into it. Drive before echo gives clean copies of a dirty sound. Echo before drive gives one dirty sound made of all of it.',
        ],
        enter: { wave: 0, cutoff: 3, res: 1, attack: 0, decay: 2, sustain: 0, release: 1, drive: 3, driveTone: 4, echoTime: 2, echoRepeats: 1, echoMix: 2, chain: 1 },
        knobs: ['chain'],
        flow: true,
        task: 'Compare Middle with Last.',
        done: (_, log) => been(log, 'chain', 1) && been(log, 'chain', 2),
      },
      {
        title: 'When the order does not matter',
        text: [
          'With the echo off there is nothing between Middle and Last, so they are the same place and a puzzle accepts either. With the drive off, the pedal is out of the chain and the switch goes dark.',
          'One more: a drive placed First cannot reshape a plain pulse wave. A pulse has only two levels and no tops to flatten.',
        ],
        enter: { wave: 0, cutoff: 3, res: 1, sustain: 1, drive: 3, driveTone: 4, echoMix: 0, chain: 1 },
        knobs: ['drive', 'chain'],
        flow: true,
        task: 'Turn the chain switch dark.',
        done: (now) => now.drive === 0,
      },
    ],
    examples: [
      { name: 'Pedalboard', set: { chain: 1 } },
      { name: 'Driven filter', set: { chain: 0 } },
      { name: 'Smeared echoes', set: { chain: 2, echoMix: 2 } },
    ],
    also: ['cutoff', 'res', 'drive', 'driveTone', 'echoTime', 'echoRepeats', 'echoMix'],
    riffId: 69,
    start: { wave: 0, cutoff: 3, res: 2, attack: 0, decay: 2, sustain: 1, release: 1, drive: 3, driveTone: 4, echoTime: 2, echoRepeats: 1, echoMix: 2, chain: 1 },
  },
};

export const lessonView: View = (root, ctx) => {
  const n = Number(ctx.params.stage);
  const stage = STAGES[n - 1];
  const lesson = LESSONS[n];
  if (!stage || !lesson) {
    root.replaceChildren(page(el('h1', {}, 'No such lesson'), el('p.muted', {}, `There are ${STAGES.length} stages, each with a lesson.`), el('a.btn', { href: '#/learn' }, 'Stages')));
    return;
  }
  if (!getSave().lessons.includes(n)) updateSave((s) => ({ ...s, lessons: [...s.lessons, n] }));

  const rules = LATEST_RULES;
  const { parts } = lesson;
  /** The last section, where every knob of the stage is out at once. */
  const ALL = parts.length;
  const riff = riffById(lesson.riffId) ?? RIFFS[0];

  let patch: Patch = { ...rules.defaults, ...lesson.start };
  let active = -1;
  let log: Patch[] = [];
  const finished = parts.map(() => false);

  const clamp = (id: ParamId, pos: number) => Math.min(rules.steps[id].length - 1, Math.max(0, Math.round(pos)));
  const fmt = (id: ParamId, pos: number) => PARAMS[id].format(valueAt(id, rules.steps[id], pos));

  // --- audio --------------------------------------------------------------------
  const scope = createScope();
  const playButtons: HTMLElement[] = [];
  const paintPlay = () => {
    const playing = peekEngine()?.playing === true;
    playButtons.forEach((b, i) => {
      const here = playing && i === active;
      b.textContent = here ? '■' : '▶';
      b.setAttribute('aria-label', here ? 'Stop' : 'Play');
      b.classList.toggle('btn-primary', !here);
    });
  };
  const start = () => {
    const engine = getEngine();
    if (engine.playing) return;
    engine.onState = paintPlay;
    engine.setVolume(getSave().volume);
    engine.setRiff(riff);
    engine.setVoices([resolve(patch, rules.steps)]);
    engine.start();
    scope.start(engine.analyser);
  };

  // --- every control on the page shows the one patch ------------------------------
  const knobs: { id: ParamId; knob: Knob }[] = [];
  const pads: { x: ParamId; y: ParamId; pad: Pad }[] = [];
  const flows: Flow[] = [];
  const panel = createPanel({
    rules,
    patch,
    enabled: PARAM_IDS.filter((id) => PARAMS[id].stage === n || lesson.also?.includes(id)),
    stage: n,
    continuous: false,
    onMove: (id, pos) => change(ALL, { [id]: pos }),
  });
  const refresh = () => {
    const sound = resolve(patch, rules.steps);
    for (const { id, knob } of knobs) {
      knob.set(patch[id]);
      knob.setState({ inactive: !rules.active(id, sound) });
    }
    for (const { x, y, pad } of pads) pad.set(patch[x], patch[y]);
    for (const flow of flows) flow.set(sound);
    panel.update(patch);
    peekEngine()?.setSound(0, sound);
  };

  // --- the parts ------------------------------------------------------------------
  const cards: HTMLElement[] = [];
  const progress = el('span.note', {}, '');
  const paintProgress = () => {
    const count = finished.filter(Boolean).length;
    progress.textContent = count === parts.length ? `All ${parts.length} parts done.` : `${count} of ${parts.length} parts done.`;
  };

  /** Move to a part, and set the knobs it needs. */
  const open = (i: number) => {
    if (active === i) return;
    active = i;
    if (i < ALL && parts[i].enter) patch = { ...patch, ...parts[i].enter };
    log = [patch];
    cards.forEach((card, c) => card.classList.toggle('active', c === i));
    refresh();
    paintPlay();
  };

  /** A control in part `i` was moved. */
  function change(i: number, next: Partial<Patch>): void {
    open(i);
    const moved = { ...patch };
    for (const [id, pos] of Object.entries(next) as [ParamId, number][]) moved[id] = clamp(id, pos);
    patch = moved;
    log.push(patch);
    refresh();
    // Turning something is a request to hear it.
    start();
    if (i < ALL && !finished[i] && parts[i].done(patch, log)) {
      finished[i] = true;
      cards[i].classList.add('done');
      paintProgress();
    }
  }

  parts.forEach((part, i) => {
    const controls: HTMLElement[] = [];
    if (part.flow) {
      const flow = createFlow();
      flows.push(flow);
      controls.push(flow.el);
    }
    for (const id of part.knobs ?? []) {
      const knob = createControl(id, rules, false, () => patch[id], (pos) => change(i, { [id]: pos }));
      knobs.push({ id, knob });
      controls.push(knob.el);
    }
    if (part.pad) {
      const [x, y] = part.pad;
      const pad = createPad({
        x: { label: PARAMS[x].label, count: rules.steps[x].length, format: (pos) => fmt(x, pos) },
        y: { label: PARAMS[y].label, count: rules.steps[y].length, format: (pos) => fmt(y, pos) },
        onPick: (px, py) => change(i, { [x]: px, [y]: py }),
      });
      pads.push({ x, y, pad });
      controls.push(pad.el);
    }

    const play = el('button.btn.play.btn-primary', { type: 'button', 'aria-label': 'Play' }, '▶');
    play.addEventListener('click', () => {
      const engine = peekEngine();
      if (engine?.playing && active === i) {
        engine.stop();
        return;
      }
      open(i);
      start();
      paintPlay();
    });
    playButtons.push(play);

    const last = i + 1 === parts.length;
    const next = el(
      'button.btn.btn-small.part-next',
      {
        type: 'button',
        onclick: () => {
          open(i + 1);
          cards[i + 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
      },
      last ? 'Next: all of it together' : `Next: ${parts[i + 1].title}`,
    );
    cards.push(
      el(
        'section.card.part',
        {},
        el('div.part-head', {}, el('span.part-n', {}, String(i + 1)), el('h3', {}, part.title), play),
        el('div.prose', {}, part.text.map((t) => el('p', {}, t))),
        el('div.part-controls', {}, controls),
        el('div.part-task', {}, el('span.part-tick', { 'aria-hidden': 'true' }), el('span', {}, part.task), next),
      ),
    );
  });

  // --- all of it together -----------------------------------------------------------
  const allPlay = el('button.btn.play.btn-primary', { type: 'button', 'aria-label': 'Play' }, '▶');
  allPlay.addEventListener('click', () => {
    const engine = peekEngine();
    if (engine?.playing && active === ALL) {
      engine.stop();
      return;
    }
    open(ALL);
    start();
    paintPlay();
  });
  playButtons.push(allPlay);
  const examples = lesson.examples.map((ex) => el('button.btn.btn-small', { type: 'button', onclick: () => change(ALL, ex.set) }, ex.name));
  cards.push(
    el(
      'section.card.part',
      {},
      el('div.part-head', {}, el('span.part-n', {}, '∑'), el('h3', {}, 'All of it together'), allPlay),
      el('p.note', {}, `Every knob this stage adds, on the panel as a puzzle shows it. ${riff.title} loops while you turn them; nothing is scored.`),
      el('div.row', {}, el('span.caps', {}, 'Examples'), examples),
      panel.el,
    ),
  );

  const nextStage = STAGES[n];
  root.replaceChildren(
    page(
      el('div', {}, el('p.caps', {}, `Stage ${stage.n} · Lesson`), el('h1', {}, stage.title), el('p.lead.muted', {}, lesson.intro)),
      el('div.lesson-scope', {}, scope.el),
      el('div.stack', {}, cards),
      el(
        'div.row',
        {},
        el('a.btn.btn-primary', { href: `#/practice/${stage.n}` }, 'Practice by ear'),
        el('a.btn', { href: '#/learn' }, 'All stages'),
        progress,
        nextStage?.lesson ? el('span.note', {}, `Next: stage ${nextStage.n}, ${nextStage.title}.`) : null,
      ),
    ),
  );
  open(0);
  paintProgress();

  return () => {
    scope.stop();
    const engine = peekEngine();
    if (engine) {
      engine.onState = null;
      engine.stop();
    }
  };
};
