// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan.

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type AstroLesson = Lesson & TreeLesson;

const written = import.meta.glob<AstroLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
const coming = (id: string, n: number, title: string, teaches: string, more: Partial<AstroLesson> = {}): AstroLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], journal: [], ...more });

const TRUNK_COMING: AstroLesson[] = [
  coming('clusters', 11, 'Clusters as clocks', 'How a star’s mass decides its life, and how a cluster tells its age'),
  coming('dead-stars', 12, 'Stars that shouldn’t exist', 'White dwarfs, Chandrasekhar’s limit and Jocelyn Bell’s pulsar'),
  coming('star-stuff', 13, 'Star stuff', 'Where the carbon in us and the gold in a ring were made'),
  coming('light-late', 14, 'Light is late', 'Rømer’s moons of Jupiter and the ether that wasn’t there'),
  coming('muons', 15, 'Muons that live too long', 'Moving clocks run slow'),
  coming('bending', 16, 'The Sun bends starlight', 'Mercury’s orbit, the 1919 eclipse and GPS clocks'),
  coming('dark-stars', 17, 'Dark stars', 'Escape speed, event horizons and the star S2'),
  coming('island', 18, 'Island universes', 'Leavitt’s Cepheids and the distance to Andromeda'),
  coming('running', 19, 'Everything is running away', 'Redshifts, expansion and the age of the universe'),
  coming('dark-night', 20, 'Why is the night sky dark?', 'Olbers’s question and the afterglow of the Big Bang'),
  coming('missing-mass', 21, 'The missing mass', 'Zwicky’s cluster, Rubin’s rotation curves and dark matter'),
  coming('six-numbers', 22, 'Just six numbers', 'Dark energy and the numbers that shape a universe'),
];

const BRANCH_COMING: AstroLesson[] = [
  coming('io', 101, 'Volcanoes predicted three days early', 'Tidal heating of Jupiter’s moon Io', { branch: 'giants', needs: ['falling'] }),
  coming('stripes', 102, 'Stripes and a storm', 'Why Jupiter is banded', { branch: 'giants', needs: ['io'] }),
  coming('rings', 103, 'Rings made of pebbles', 'Maxwell, Keeler and the Roche limit', { branch: 'giants', needs: ['falling', 'spectra'] }),
  coming('glow', 104, 'The planet that glows', 'Jupiter’s inner heat and the snow line', { branch: 'giants', needs: ['sunshine'] }),
  coming('ice-oceans', 105, 'Oceans under ice', 'Europa and Enceladus', { branch: 'giants', needs: ['io'] }),
  coming('venus', 201, 'Venus and the greenhouse', 'Why the planet next door is hotter than an oven', { branch: 'rocky', needs: ['sunshine', 'colour'] }),
  coming('canals', 202, 'Canals on Mars', 'Lowell’s canals and Mariner’s craters', { branch: 'rocky', needs: ['sunshine'] }),
  coming('cooling', 203, 'Why only Earth still has plates', 'Small planets cool first', { branch: 'rocky', needs: ['sunshine'] }),
  coming('wobble', 301, 'A planet that shouldn’t be there', '51 Pegasi b and the wobble method', { branch: 'exoplanets', needs: ['hr', 'spectra'] }),
  coming('dip', 302, 'The dip', 'Transits and the Kepler telescope', { branch: 'exoplanets', needs: ['wobble'] }),
  coming('hot-jupiters', 303, 'Hot Jupiters', 'Giant planets that moved', { branch: 'exoplanets', needs: ['dip'] }),
  coming('goldilocks', 304, 'Goldilocks', 'Habitable zones and TRAPPIST-1', { branch: 'exoplanets', needs: ['dip'] }),
  coming('atmospheres', 305, 'Reading an atmosphere', 'Starlight through a planet’s air', { branch: 'exoplanets', needs: ['dip'] }),
  coming('quasars', 401, 'Brighter than a galaxy', 'Quasars and how flicker limits size', { branch: 'holes', needs: ['dark-stars'] }),
  coming('chirp', 402, 'The chirp', 'Gravitational waves', { branch: 'holes', needs: ['dark-stars'] }),
  coming('hawking', 403, 'Black holes ain’t so black', 'Hawking radiation and the information paradox', { branch: 'holes', needs: ['dark-stars'] }),
  coming('shadow', 404, 'Photographing a shadow', 'The Event Horizon Telescope', { branch: 'holes', needs: ['dark-stars'] }),
  coming('three-minutes', 501, 'The first three minutes', 'Helium from the Big Bang', { branch: 'beginnings', needs: ['dark-night'] }),
  coming('ripples', 502, 'Ripples in the afterglow', 'Spots on the microwave sky and the shape of space', { branch: 'beginnings', needs: ['three-minutes'] }),
  coming('before', 503, 'Before the Big Bang?', 'Inflation and the no-boundary idea', { branch: 'beginnings', needs: ['ripples'] }),
  coming('blue-dot', 601, 'The Pale Blue Dot', 'Earth from six billion kilometres', { branch: 'life', needs: ['star-stuff'] }),
  coming('fermi', 602, 'Where is everybody?', 'Fermi’s question and Drake’s equation', { branch: 'life', needs: ['blue-dot'] }),
  coming('messages', 603, 'Messages in a bottle', 'The Pioneer plaque, the Arecibo message and the Golden Record', { branch: 'life', needs: ['blue-dot'] }),
  coming('life-search', 604, 'Looking for life', 'Viking, biosignatures and icy moons', { branch: 'life', needs: ['blue-dot'] }),
  coming('december', 701, 'Why Seattle’s December is so dark', 'Tilt and day length at 48° N', { branch: 'sky48', needs: ['loops'] }),
  coming('sun-path', 702, 'The Sun over the Olympics', 'The Sun’s path through the year', { branch: 'sky48', needs: ['december'] }),
  coming('tides', 703, 'The Moon and the tides', 'Two tides a day, springs and neaps', { branch: 'sky48', needs: ['falling'] }),
  coming('aurora', 704, 'Aurora over Whidbey', 'The solar wind and the May 2024 storm', { branch: 'sky48', needs: ['december'] }),
  coming('meteors', 705, 'Meteors and comets', 'Where the Perseids come from', { branch: 'sky48', needs: ['december'] }),
  coming('spyglass', 801, 'Galileo’s spyglass', 'Lenses, mirrors and light grasp', { branch: 'scopes', needs: ['spectra'] }),
  coming('windows', 802, 'Why telescopes go to space', 'The atmosphere’s windows', { branch: 'scopes', needs: ['spyglass'] }),
  coming('seeing', 803, 'Why stars twinkle', 'Turbulent air and adaptive optics', { branch: 'scopes', needs: ['spyglass'] }),
];

/** The branches: further than the trunk goes, each read with what the trunk teaches, and one for the sky over Puget Sound. */
export const BRANCHES: TreeBranch[] = [
  { id: 'giants', title: 'Gas giants and their moons', promise: 'Volcanic Io, Jupiter’s stripes, Saturn’s rings', from: 'falling', color: 'var(--sun-deep)', prefix: 'G' },
  { id: 'rocky', title: 'Rocky planets', promise: 'Venus’s greenhouse, Mars’s canals, and why Earth still moves', from: 'sunshine', color: 'var(--ember)', prefix: 'R' },
  { id: 'exoplanets', title: 'Exoplanets', promise: 'Wobbles, dips and the air of other worlds', from: 'hr', color: 'var(--teal)', prefix: 'X' },
  { id: 'holes', title: 'Black holes and gravitational waves', promise: 'Quasars, chirps and Hawking’s glow', from: 'dark-stars', color: 'var(--violet)', prefix: 'B' },
  { id: 'beginnings', title: 'Cosmic beginnings', promise: 'The first three minutes and before', from: 'dark-night', color: 'var(--rose)', prefix: 'C' },
  { id: 'life', title: 'Life and the Pale Blue Dot', promise: 'Is anyone out there, and how would we know?', from: 'star-stuff', color: 'var(--leaf)', prefix: 'L' },
  { id: 'sky48', title: 'The sky at 48° N', promise: 'Dark Decembers, tides and aurora over Puget Sound', from: 'loops', color: 'var(--ice)', prefix: 'N' },
  { id: 'scopes', title: 'Telescopes', promise: 'Lenses, mirrors and why we go to space', from: 'spectra', color: 'var(--sun)', prefix: 'T' },
];

const all = [...Object.values(written), ...TRUNK_COMING, ...BRANCH_COMING].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "G2"). */
export const LESSONS: readonly AstroLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly AstroLesson[] = LESSONS.filter((l) => !l.coming);
