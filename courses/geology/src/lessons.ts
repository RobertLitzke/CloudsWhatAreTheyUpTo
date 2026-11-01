// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan.

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type GeoLesson = Lesson & TreeLesson;

const written = import.meta.glob<GeoLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
const coming = (id: string, n: number, title: string, teaches: string, more: Partial<GeoLesson> = {}): GeoLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, learned: [], next: '', journal: [], ...more });

const TRUNK_COMING: GeoLesson[] = [
  coming('faults', 16, 'Why faults snap', 'Elastic rebound, and why soft ground shakes harder'),
  coming('explode', 17, 'Why some volcanoes explode', 'Thick magma, gas, and Mont Pelée in 1902'),
  coming('barnacles', 18, 'Barnacles above the tide', 'Alaska 1964 and how a megathrust moves the coast'),
];

const BRANCH_COMING: GeoLesson[] = [
  coming('ebey', 101, 'Shells at the top of the bluff', 'Reading the cliff at Ebey’s Landing', { branch: 'whidbey', needs: ['kettles'] }),
  coming('prairie', 102, 'Holes in the prairie', 'Kettles and outwash on central Whidbey', { branch: 'whidbey', needs: ['kettles'] }),
  coming('feeder-bluffs', 103, 'Where the beaches come from', 'Bluffs, landslides and drift cells', { branch: 'whidbey', needs: ['kettles', 'rivers'] }),
  coming('deception', 104, 'Seafloor at Deception Pass', 'Pieces of ocean floor stuck onto the continent', { branch: 'whidbey', needs: ['quakes', 'barrow'] }),
  coming('whidbey-fault', 105, 'A fault under the island', 'How to prove a fault is active with no quake on record', { branch: 'whidbey', needs: ['faults'] }),
  coming('hills', 201, 'Why Seattle’s hills run north–south', 'The Puget lobe and the ground it shaped', { branch: 'seattle', needs: ['kettles'] }),
  coming('drowned', 202, 'Drowned forests in Lake Washington', 'The Seattle fault’s quake about 900 CE', { branch: 'seattle', needs: ['faults'] }),
  coming('slides', 203, 'Why the hills slide', 'Sand on clay, and wet winters', { branch: 'seattle', needs: ['rivers'] }),
  coming('fill', 204, 'The ground people built', 'Regrades, filled tideflats and shaking', { branch: 'seattle', needs: ['faults'] }),
  coming('bretz', 301, 'Bretz’s heresy', 'The channelled scablands and a flood nobody believed', { branch: 'floods', needs: ['dunes', 'rivers'] }),
  coming('ripples', 302, 'Ripples the size of hills', 'Glacial Lake Missoula and its ice dam', { branch: 'floods', needs: ['bretz', 'erratics'] }),
  coming('rhythmites', 303, 'How many floods?', 'Counting floods in the Touchet beds', { branch: 'floods', needs: ['ripples', 'age'] }),
  coming('montana-rocks', 304, 'Montana rocks in Oregon', 'Icebergs on the floodwater', { branch: 'floods', needs: ['ripples', 'erratics'] }),
  coming('orphan', 401, 'The orphan tsunami', 'January 1700, ghost forests and Japanese records', { branch: 'cascadia', needs: ['barnacles'] }),
  coming('osceola', 402, 'Mud under Auburn', 'Rainier’s lahars', { branch: 'cascadia', needs: ['explode'] }),
  coming('blast', 403, 'The sideways blast', 'Mount St Helens, 18 May 1980', { branch: 'cascadia', needs: ['explode'] }),
];

/** The branches: Pacific Northwest geology, read with what the trunk teaches, and three that go further than the trunk (the Moon, fossils, the deep Earth). */
export const BRANCHES: TreeBranch[] = [
  { id: 'whidbey', title: 'Whidbey Island', promise: 'Bluffs, kettles, terranes and a fault', from: 'kettles', color: 'var(--teal)', prefix: 'W' },
  { id: 'seattle', title: 'Seattle', promise: 'Drumlins, a fault under downtown, slides and fill', from: 'faults', color: 'var(--rose)', prefix: 'S' },
  { id: 'floods', title: 'The ice age floods', promise: 'A lake that drained in days, again and again', from: 'kettles', color: 'var(--sun)', prefix: 'F' },
  { id: 'cascadia', title: 'Cascadia', promise: 'The 1700 earthquake and the volcanoes', from: 'barnacles', color: 'var(--sun-deep)', prefix: 'C' },
  { id: 'moon', title: 'The Moon and planets', promise: 'Craters, Apollo’s rocks and where the Moon came from', from: 'age', color: 'var(--moon)', prefix: 'P' },
  { id: 'fossils', title: 'Fossils', promise: 'The chemistry that turns wood and bone to stone', from: 'smith', color: 'var(--fossil)', prefix: 'L' },
  { id: 'deep', title: 'Deep Earth', promise: 'Weighing the planet, earthquake waves and the deepest hole', from: 'quakes', color: 'var(--deep)', prefix: 'D' },
];

const all = [...Object.values(written), ...TRUNK_COMING, ...BRANCH_COMING].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "W2"). */
export const LESSONS: readonly GeoLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly GeoLesson[] = LESSONS.filter((l) => !l.coming);
