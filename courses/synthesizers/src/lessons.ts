// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan. The first nine are
// PatchMatch's nine stages, one module of the synth each (STAGE_LESSONS in
// core/campaign.ts ties a stage to its lesson). The plan for the rest (lessons
// 10-23 and the branches) is the doc "Synthesizers: plan for lessons 10 onward".

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type SynthLesson = Lesson & TreeLesson;

const written = import.meta.glob<SynthLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<SynthLesson> = {}): SynthLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const TRUNK_COMING: SynthLesson[] = [
  coming('pressure', 16, 'Leaning on a note', 'Velocity, pressure and the touch strip, and where each one is routed'),
  coming('glide', 17, 'The slide', 'Mono, legato, glide and retrigger: notes that slide into each other'),
  coming('voices', 18, 'Four fingers, one filter', 'Paraphonic and unison voices, voice stealing, and chords from one key'),
  coming('arp', 19, 'One hand, many notes', 'The arpeggiator: modes, octave range, rate, swing and hold'),
  coming('sequencer', 20, 'The bass line nobody played', 'The step sequencer: rests, ties, slide and accent, from Moroder to the TB-303'),
  coming('lanes', 21, 'Knobs that remember', 'Recorded knob moves in a sequence, and controlled randomness'),
  coming('macros', 22, 'Same knob, different job', 'Oscillator engines whose three knobs change meaning: morph, wavefolder and supersaw'),
  coming('blank', 23, 'The blank patch', 'Five sounds built from a blank patch, saved and recalled; what this course leaves out'),
];

const BRANCH_COMING: SynthLesson[] = [
  coming('tables', 101, 'Stepping through tables', 'Wavetables: a stack of waves scanned by an envelope or LFO', { branch: 'engines', needs: ['macros'] }),
  coming('organ', 102, 'Organs by telephone', 'Additive synthesis: the Telharmonium, Hammond drawbars and a sound built from sines', { branch: 'engines', needs: ['macros'] }),
  coming('pluck', 103, 'A string from a delay line', 'Physical models: Karplus and Strong’s plucked string, and struck bars and bells', { branch: 'engines', needs: ['macros'] }),
  coming('vocoder', 104, 'The talking synth', 'Formants, speech engines and Homer Dudley’s vocoder', { branch: 'engines', needs: ['macros'] }),
  coming('samples', 105, 'Wagon wheels and aliasing', 'Sampling, Nyquist and why a recording played faster turns into a chipmunk', { branch: 'engines', needs: ['macros'] }),
  coming('grains', 106, 'Crumbs of sound', 'Granular synthesis: grain size, density and position', { branch: 'engines', needs: ['samples'] }),
  coming('rooms', 201, 'Sabine’s lecture hall', 'Reverb: how a room answers, and the plates and springs that fake one', { branch: 'studio', needs: ['echo'] }),
];

/** The branches: the other kinds of oscillator, and the studio around the synth. */
export const BRANCHES: TreeBranch[] = [
  { id: 'engines', title: 'Other oscillators', promise: 'Wavetables, organs, plucked strings, talking synths, samples and grains', from: 'macros', color: 'var(--violet)', prefix: 'O' },
  { id: 'studio', title: 'Around the synth', promise: 'Reverb, and how a room answers a sound', from: 'echo', color: 'var(--rose)', prefix: 'S' },
];

const all = [...Object.values(written), ...TRUNK_COMING, ...BRANCH_COMING].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "H2"). */
export const LESSONS: readonly SynthLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly SynthLesson[] = LESSONS.filter((l) => !l.coming);
