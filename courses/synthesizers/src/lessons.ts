// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan. The first nine are
// PatchMatch's nine stages, one module of the synth each (STAGE_LESSONS in
// core/campaign.ts ties a stage to its lesson).

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type SynthLesson = Lesson & TreeLesson;

const written = import.meta.glob<SynthLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<SynthLesson> = {}): SynthLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const TRUNK_COMING: SynthLesson[] = [
  coming('noise', 10, 'The drum machine with no drums', 'Noise, filtered noise and a snare built from nothing; how the TR-808 faked a kit'),
  coming('organ', 11, 'Organs by telephone', 'Additive synthesis: the Telharmonium, Hammond drawbars and building a sound from sines'),
  coming('twelve', 12, 'Why twelve notes?', 'Octaves, fifths and the comma that never closes; equal temperament'),
  coming('chords', 13, 'Why some notes clash', 'Consonance as shared harmonics and beating: Helmholtz’s roughness'),
  coming('pluck', 14, 'A string from a delay line', 'Physical modelling: Karplus and Strong’s plucked string, and what a string really does'),
  coming('samples', 15, 'Wagon wheels and aliasing', 'Sampling, Nyquist and why a digital synth needs a filter at both ends'),
  coming('vocoder', 16, 'The talking synth', 'Homer Dudley’s vocoder: the voice’s filter laid over another sound'),
  coming('rooms', 17, 'Sabine’s lecture hall', 'Reverb: how a room answers, and the plates and springs that fake one'),
];

const BRANCH_COMING: SynthLesson[] = [
  coming('aether', 101, 'Playing the air', 'The theremin and the ondes Martenot: the first electronic instruments', { branch: 'history', needs: ['vibrato'] }),
  coming('coasts', 102, 'East coast, west coast', 'Moog’s keyboard and Buchla’s touch plates: two ideas of what a synth is for', { branch: 'history', needs: ['tape'] }),
  coming('bach', 103, 'Switched-On Bach', 'Wendy Carlos, the Minimoog and the synth leaving the studio', { branch: 'history', needs: ['coasts'] }),
  coming('dx7', 104, 'The DX7 everywhere', 'FM goes to market in 1983, and the sound of the decade', { branch: 'history', needs: ['bells'] }),
  coming('radiophonic', 201, 'The Doctor Who theme', 'Delia Derbyshire and the BBC Radiophonic Workshop: tape, oscillators and a razor blade', { branch: 'music', needs: ['tape'] }),
  coming('autobahn', 202, 'Autobahn', 'Kraftwerk and the drum machine: music made entirely of circuits', { branch: 'music', needs: ['noise'] }),
  coming('acid', 203, 'The bass line nobody wanted', 'The TB-303, a resonant filter swept by hand, and acid house', { branch: 'music', needs: ['vowels', 'tape'] }),
  coming('scales', 301, 'Modes on one keyboard', 'Scales and modes: the same white keys from a different starting note', { branch: 'theory', needs: ['twelve'] }),
  coming('sequencer', 302, 'Sixteen steps', 'Rhythm, the step sequencer and the arpeggiator', { branch: 'theory', needs: ['twelve'] }),
];

/** The branches: synth history, synths in music, and music theory. */
export const BRANCHES: TreeBranch[] = [
  { id: 'history', title: 'Synth history', promise: 'Theremins, Moog and Buchla, Switched-On Bach and the DX7', from: 'vibrato', color: 'var(--violet)', prefix: 'H' },
  { id: 'music', title: 'Synths in music', promise: 'Doctor Who, Kraftwerk and acid house', from: 'tape', color: 'var(--rose)', prefix: 'M' },
  { id: 'theory', title: 'Music theory', promise: 'Scales, modes, rhythm and sequencers', from: 'twelve', color: 'var(--leaf)', prefix: 'T' },
];

const all = [...Object.values(written), ...TRUNK_COMING, ...BRANCH_COMING].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "H2"). */
export const LESSONS: readonly SynthLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly SynthLesson[] = LESSONS.filter((l) => !l.coming);
