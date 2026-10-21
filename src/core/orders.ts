// The seeding game's orders: the skies Harrow asks for. Some leave all the air
// to the player, who finds a day that would make the sky; the rest give the
// day's air as it is and leave only the seeding run to plan.

import type { Setup, Sky } from './seeding';

export interface Order {
  id: string;
  title: string;
  /** Who asks, and how, with the radio on. */
  asker: string;
  ask: string;
  /** The same ask, plainly, with the radio off. */
  plain: string;
  /** The day's air, when it is given. Whatever is not here is the player's to set. */
  fixed?: Partial<Setup>;
  /** A nudge for someone stuck. */
  hint: string;
  met: (sky: Sky) => boolean;
}

export const ORDERS: readonly Order[] = [
  {
    id: 'picnic',
    title: 'Fair weather cumulus',
    asker: 'Edna Pruitt, Ladies’ Aid',
    ask: 'The harvest picnic is Saturday. I want those little cotton-ball clouds for the photograph, and not one drop on the pies.',
    plain: 'Make small fair-weather cumulus (humilis), with nothing falling.',
    hint: 'Heaps need the sun. Keep them shallow: stable air above stops the bubbles soon after they turn to cloud.',
    met: (s) => s.made === 'cumulus' && s.species === 'humilis' && s.fall === 'none',
  },
  {
    id: 'flock',
    title: 'Altocumulus',
    asker: 'Hap Delaney, pilot',
    ask: 'Fellow from the Spokane paper wants a picture of a flock of sheep up in the middle of the sky. Find me a day for it and I’ll fly him.',
    plain: 'Make altocumulus: puffs or lenses on the middle floor, about 2 to 6 km up.',
    hint: 'The air has to turn to cloud 2 km or more up, so the ground air must be dry: its dew point far below its temperature. Stable air over a ridge makes waves, and a lens on each crest.',
    met: (s) => s.made === 'altocumulus',
  },
  {
    id: 'soaker',
    title: 'Steady rain',
    asker: 'Ole Haugen, farmer',
    ask: 'Not a shower, mind. A whole grey day of it, slow, so it soaks in and doesn’t run off down the coulee. The goat’s indifferent.',
    plain: 'Make nimbostratus, with rain or snow reaching the ground.',
    hint: 'A front lifts a whole sheet of air slowly. Start it low and lift it high, and keep the air stable so it doesn’t boil into towers.',
    met: (s) => s.made === 'nimbostratus' && (s.fall === 'rain' || s.fall === 'snow') && s.reaches,
  },
  {
    id: 'halo',
    title: 'A ring round the sun',
    asker: 'Aunt Fern',
    ask: 'My knee says weather’s coming, and I want the ring round the sun to prove it to Dutch.',
    plain: 'Make cirrostratus, the high ice veil that wears a halo.',
    hint: 'The cloud has to start 5 km or more up, so the ground air must be very dry, and the front must lift it higher still.',
    met: (s) => s.made === 'cirrostratus',
  },
  {
    id: 'newsreel',
    title: 'A thunderhead',
    asker: 'Dutch Kessler, elevator',
    ask: 'The newsreel men want a thunderhead behind the elevator. I want it to rain somewhere else.',
    plain: 'Make a cumulonimbus.',
    hint: 'Warm, damp air at the ground, a hot sun, and air above that cools fast with height, so the bubbles never stop.',
    met: (s) => s.made === 'cumulonimbus',
  },
  {
    id: 'fog',
    title: 'Clear the airfield fog',
    asker: 'Hap Delaney, pilot',
    ask: 'Freezing fog on the field again, and the mail’s due in Spokane by ten. You’ve got the dry ice and the silver iodide. Clear me a hole to take off through.',
    plain: 'The day is given: supercooled fog at −4 °C. Seed it so that it clears.',
    fixed: { groundC: 2, dewC: -4, lapsePerKm: 4, cooling: 'night', strength: 8 },
    hint: 'Silver iodide only starts ice below about −5 °C. And go easy: too much and the crystals stay too small to fall.',
    met: (s) => s.made === 'fog' && s.hole,
  },
  {
    id: 'soak',
    title: 'Rain on Harrow',
    asker: 'Ole Haugen, farmer',
    ask: 'That grey lid’s been sitting over the wheat all day, spitting drizzle. Wring it out, would you?',
    plain: 'The day is given: a supercooled grey layer that only drizzles. Seed it to make it rain on Harrow.',
    fixed: { groundC: 8, dewC: 0, lapsePerKm: 5.5, cooling: 'front', strength: 2600 },
    hint: 'The top is about −14 °C, so either agent works. A pound or two of dry ice per mile is plenty; far more overseeds it.',
    met: (s) => s.seeded && s.fall === 'rain' && s.reaches,
  },
  {
    id: 'tower',
    title: 'Make a heap grow',
    asker: 'Dutch Kessler, elevator',
    ask: 'Those big heaps sit there all afternoon looking like rain and never deliver. Give one a kick.',
    plain: 'The day is given: cumulus with supercooled tops that never rain. Seed one so that it grows and showers.',
    fixed: { groundC: 14, dewC: 6, lapsePerKm: 6.5, cooling: 'sun', strength: 8 },
    hint: 'Freezing the supercooled water in a heap releases heat, and warmer air rises further.',
    met: (s) => s.seeded && s.grew && (s.fall === 'showers' || s.fall === 'thunderstorm') && s.reaches,
  },
  {
    id: 'snowpack',
    title: 'Snow for the Blue Mountains',
    asker: 'W7DQ, Walla Walla',
    ask: 'The orchard men down here want snow on the Blue Mountains, to melt into the Touchet come July. The cloud over the ridge is all supercooled drizzle. See what you can do.',
    plain: 'The day is given: a cap cloud on the ridge, supercooled, only drizzling. Seed it to snow.',
    fixed: { groundC: -2, dewC: -6, lapsePerKm: 5, cooling: 'hills', strength: 1800 },
    hint: 'Its top is about −16 °C. Either agent works; the trick is the dose.',
    met: (s) => s.seeded && s.fall === 'snow' && s.reaches,
  },
];

export function order(id: string): Order | undefined {
  return ORDERS.find((o) => o.id === id);
}
