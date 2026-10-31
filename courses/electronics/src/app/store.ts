// Progress and settings, in localStorage (Didactics' store). All shaping and
// repair of the data is core/save.ts.

import { createStore } from 'didactics/store';
import { emptySave, migrate } from '../core/save';

export const store = createStore({ key: 'circuitry.save', empty: emptySave, migrate });

export const { get: getSave, set: setSave, update: updateSave } = store;
