// Progress and settings, in localStorage, as Didactics' courseStore makes them
// from the course's settings (didactics/progress for the fields and their
// repair). Inches and feet by default, as on most seed packets in the US; metric is a setting away. Dirt tells no story, so the save has no radio.

import { courseStore } from 'didactics/app';

export const { store, empty } = courseStore('dirt', { key: 'dirt.save', units: 'imperial', radio: false });
