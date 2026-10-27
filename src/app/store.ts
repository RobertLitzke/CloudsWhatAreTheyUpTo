// Progress and settings, in localStorage (lesson-kit's store). All shaping and
// repair of the data is core/save.ts.

import { createStore } from 'lesson-kit/store';
import { emptySave, migrate } from '../core/save';

export const store = createStore({ key: 'outofauto.save', empty: emptySave, migrate });

export const { get: getSave, set: setSave, update: updateSave } = store;
