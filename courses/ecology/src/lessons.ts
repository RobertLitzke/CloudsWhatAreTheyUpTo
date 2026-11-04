// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan.

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type EcoLesson = Lesson & TreeLesson;

const written = import.meta.glob<EcoLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<EcoLesson> = {}): EcoLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const TRUNK_COMING: EcoLesson[] = [
];

const BRANCH_COMING: EcoLesson[] = [
  coming('eggs', 101, 'Eggs that broke', 'Peregrines, DDT and poisons that build up the food chain', { branch: 'people', needs: ['pyramid'] }),
  coming('arrivals', 102, 'Arrivals', 'Species carried to new places, and the few that take over', { branch: 'people', needs: ['seastar'] }),
  coming('cod', 103, 'The cod that didn’t come back', 'Harvesting a stock, and a fishery that collapsed', { branch: 'people', needs: ['lynx'] }),
  coming('trails', 201, 'Trails that fade', 'How ants find the shortest path with no one in charge', { branch: 'ants', needs: ['acacia'] }),
  coming('kin', 202, 'Why work for someone else’s children?', 'Hamilton’s rule and the sterile workers', { branch: 'ants', needs: ['trails'] }),
  coming('farmers', 203, 'Farmers in the forest', 'Leafcutter ants and their fungus gardens', { branch: 'ants', needs: ['trails'] }),
  coming('stripes', 301, 'Stripes on the rocks', 'Zones of a Salish Sea shore and what sets each edge', { branch: 'tidepools', needs: ['seastar'] }),
  coming('melted', 302, 'The year the sea stars melted', 'Sea star wasting and the urchins that followed', { branch: 'tidepools', needs: ['stripes'] }),
  coming('otters', 303, 'The otters came back', 'Sea otters on the outer coast of Washington', { branch: 'tidepools', needs: ['green'] }),
  coming('under-snow', 401, 'Survivors under the snow', 'What lived through the 1980 blast at Mount St Helens', { branch: 'helens', needs: ['glacier-bay'] }),
  coming('lupine', 402, 'Lupine on the pumice', 'The first plants on the Pumice Plain', { branch: 'helens', needs: ['under-snow'] }),
  coming('spirit-lake', 403, 'Spirit Lake', 'A lake that went dead and came back', { branch: 'helens', needs: ['under-snow', 'curtain'] }),
  coming('no-trees', 501, 'Why no trees?', 'The shrub-steppe of the dry side', { branch: 'dry', needs: ['humboldt'] }),
  coming('cheatgrass', 502, 'Cheatgrass and fire', 'An annual grass that changed a fire cycle', { branch: 'dry', needs: ['fires'] }),
  coming('palouse', 503, 'The prairie under the wheat', 'The Palouse prairie and what is left of it', { branch: 'dry', needs: ['no-trees', 'half'] }),
  coming('salmon-trees', 601, 'Salmon in the trees', 'Ocean nitrogen carried up rivers by salmon', { branch: 'salmon', needs: ['hubbard'] }),
  coming('elwha', 602, 'After the dams came down', 'The Elwha River since 2014', { branch: 'salmon', needs: ['salmon-trees'] }),
  coming('lake-washington', 603, 'The lake Seattle saved', 'Edmondson, sewage and a lake that cleared', { branch: 'salmon', needs: ['curtain'] }),
];

/** The branches: three that carry the trunk's ideas further, and three on the Pacific Northwest. */
export const BRANCHES: TreeBranch[] = [
  { id: 'people', title: 'People in the web', promise: 'Poisons, newcomers and a fishery that collapsed', from: 'pyramid', color: 'var(--rose)', prefix: 'H' },
  { id: 'ants', title: 'Ants and other societies', promise: 'Trails, sterile workers and fungus farms', from: 'acacia', color: 'var(--sun-deep)', prefix: 'N' },
  { id: 'tidepools', title: 'Tide pools of the Salish Sea', promise: 'Zones, a sea star plague and the otters’ return', from: 'seastar', color: 'var(--teal)', prefix: 'T' },
  { id: 'helens', title: 'Mount St Helens', promise: 'Life after the 1980 blast', from: 'glacier-bay', color: 'var(--ember)', prefix: 'M' },
  { id: 'dry', title: 'The dry side', promise: 'Shrub-steppe, cheatgrass and the Palouse', from: 'humboldt', color: 'var(--sun)', prefix: 'S' },
  { id: 'salmon', title: 'Salmon and Lake Washington', promise: 'Ocean nitrogen in the forest, and a lake that cleared', from: 'curtain', color: 'var(--ice)', prefix: 'W' },
];

const all = [...Object.values(written), ...TRUNK_COMING, ...BRANCH_COMING].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "T2"). */
export const LESSONS: readonly EcoLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly EcoLesson[] = LESSONS.filter((l) => !l.coming);
