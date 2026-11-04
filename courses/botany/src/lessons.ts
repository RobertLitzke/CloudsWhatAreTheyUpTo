// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan.

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type PlantLesson = Lesson & TreeLesson;

const written = import.meta.glob<PlantLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<PlantLesson> = {}): PlantLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const TRUNK_COMING: PlantLesson[] = [
];

const BRANCH_COMING: PlantLesson[] = [
  coming('traps', 301, 'Snap traps and sticky leaves', 'How a Venus flytrap counts and closes, and why bog plants eat insects', { branch: 'odd', needs: ['cells', 'peas', 'bending'] }),
  coming('steal', 302, 'Plants that steal', 'Dodder, mistletoe and plants that tap other plants', { branch: 'odd', needs: ['phloem', 'pale'] }),
  coming('giant', 303, 'The heaviest living thing', 'Giant sequoias, aspen clones and how big a plant can get', { branch: 'odd', needs: ['spiral', 'rings'] }),
  coming('heat', 304, 'Flowers that make heat', 'Skunk cabbage and titan arum, which burn sugar to warm their flowers', { branch: 'odd', needs: ['air'] }),
];

/** The branches: naming plants, crops, and odd plants. */
export const BRANCHES: TreeBranch[] = [
  { id: 'keys', title: 'Naming and keying plants', promise: 'Names, keys, families and deadly look-alikes', from: 'orchid', color: 'var(--violet)', prefix: 'K' },
  { id: 'crops', title: 'Crops and breeding', promise: 'Mendel, maize, Palouse wheat and Wenatchee apples', from: 'orchid', color: 'var(--sun-deep)', prefix: 'C' },
  { id: 'odd', title: 'Odd plants', promise: 'Flytraps, thieves, giants and flowers that make heat', from: 'bending', color: 'var(--rose)', prefix: 'O' },
];

const all = [...Object.values(written), ...TRUNK_COMING, ...BRANCH_COMING].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "T2"). */
export const LESSONS: readonly PlantLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly PlantLesson[] = LESSONS.filter((l) => !l.coming);
