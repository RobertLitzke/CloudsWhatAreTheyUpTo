// The radio slip (Didactics' slip.ts), tuned to Walla Walla: what is heard
// goes into the save, and a reply that switches the radio off turns the
// setting off.

import { createSlip } from 'didactics/slip';
import { SNUBS, STATIONS } from '../core/talk';
import { updateSave } from './store';

export { radioIcon } from 'didactics/slip';

export const { play: playTalk, clear: clearRadio } = createSlip({
  stations: STATIONS,
  snubs: SNUBS,
  signOff: 'Seventy-three. Signing off.',
  onHeard: (id, picks) => updateSave((s) => ({ ...s, heard: { ...s.heard, [id]: picks } })),
  onOff: () => updateSave((s) => ({ ...s, talk: false })),
});
