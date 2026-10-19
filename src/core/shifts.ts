// The tutorial series, as shifts at the lookout. Each shift is a list of steps;
// app/views/shift.ts knows how to play each kind. The words live here, beside
// the facts in clouds.ts, so the whole script can be read in one place.
//
// The story: you have taken a summer job as the cloud watcher on Anvil Peak, a
// lookout in the Thunderhead National Forest. Juniper, the district weather
// officer, talks you through the job over the radio. Once training is done the
// district's cloud-seeding programme opens up, and you start making clouds as
// well as reading them.

import type { GenusId, Prefix, Body } from './clouds';

export type Speaker = 'juniper' | 'you';

export interface Line {
  who: Speaker;
  text: string;
}

export type Step =
  /** Lines over the radio; tap to go on. */
  | { kind: 'radio'; lines: Line[] }
  /** Lift a parcel of air until it turns to cloud. */
  | { kind: 'parcel'; tempC: number; dewC: number; lines: Line[]; after: Line[] }
  /** The three floors of the sky, drawn over the view from the tower. */
  | { kind: 'floors'; lines: Line[] }
  /** File drawn clouds onto their floors. */
  | { kind: 'sort'; clouds: GenusId[]; lines: Line[] }
  /** Build names from their roots. */
  | { kind: 'names'; targets: { clue: string; prefix: Prefix; body: Body }[]; lines: Line[]; after: Line[] }
  /** Call in the floor of each photo. */
  | { kind: 'photo-call'; pool: GenusId[]; count: number; lines: Line[] }
  /** The end of the shift: what was learned, signed into the logbook. */
  | { kind: 'log'; learned: string[]; next: string };

export interface Shift {
  id: string;
  n: number;
  title: string;
  /** One line for the shift board. */
  teaches: string;
  steps: Step[];
  /** Journal entries this shift unlocks. */
  journal: string[];
}

export const SHIFTS: readonly Shift[] = [
  {
    id: 'floors',
    n: 1,
    title: 'The three floors of the sky',
    teaches: 'What a cloud is, the three heights, and the words the names are built from',
    journal: ['what-is-a-cloud', 'floors', 'roots'],
    steps: [
      {
        kind: 'radio',
        lines: [
          { who: 'juniper', text: 'Anvil Peak, this is District. You made it up the trail, then. Welcome to the Thunderhead.' },
          { who: 'juniper', text: 'I’m Juniper. I run weather for the district, which mostly means I sit in a trailer and wish I had your view.' },
          { who: 'juniper', text: 'The fire lookouts watch for smoke. You watch everything above the smoke. Every hour you log what’s in the sky and call me with what it’s up to.' },
          { who: 'juniper', text: 'First thing, before any names: what a cloud actually is.' },
        ],
      },
      {
        kind: 'parcel',
        tempC: 24,
        dewC: 12,
        lines: [
          { who: 'juniper', text: 'Air always holds some water as vapour, which you can’t see. The dew point is how cold the air has to get before that vapour turns back into water.' },
          { who: 'juniper', text: 'When air rises it spreads out and cools, about ten degrees Celsius for every kilometre. Its dew point drops too, but slowly.' },
          { who: 'juniper', text: 'Down at your trailhead it’s 24 degrees with a dew point of 12. Push that bubble of air up and watch the two numbers.' },
        ],
        after: [
          { who: 'juniper', text: 'There. Where the air cools to its dew point, the vapour condenses onto specks of dust, smoke and salt, and you get a cloud.' },
          { who: 'juniper', text: 'That height is the cloud base. Every 125 metres or so of base is one degree between the temperature and the dew point at the ground. Dry day, high base. Muggy day, low base.' },
          { who: 'juniper', text: 'So every cloud you see is a record of air going up. How it went up, and how far, is what makes one cloud different from another.' },
        ],
      },
      {
        kind: 'floors',
        lines: [
          { who: 'juniper', text: 'We file clouds by height. Think of the sky as a building with three floors.' },
          { who: 'juniper', text: 'The low floor runs from the ground up to about 2,000 metres. Low clouds are made of water droplets, so their edges look sharp and solid.' },
          { who: 'juniper', text: 'The middle floor is roughly 2,000 to 7,000 metres. Droplets, many of them colder than freezing but still liquid, plus some ice.' },
          { who: 'juniper', text: 'The high floor is above 5,000 metres or so, where it’s always below freezing. High clouds are pure ice, which is why they look thin, wispy and silky.' },
          { who: 'juniper', text: 'The floors overlap a little, and one kind of cloud ignores them completely: the thunderstorm tower, which can fill all three.' },
        ],
      },
      {
        kind: 'sort',
        clouds: ['cirrus', 'altocumulus', 'stratus', 'cumulus', 'cumulonimbus'],
        lines: [
          { who: 'juniper', text: 'Here’s some sky for you. Tap a cloud, then tap the floor it belongs on. The tall one goes in the tower.' },
        ],
      },
      {
        kind: 'names',
        targets: [
          { clue: 'A thin, even veil on the high floor', prefix: 'cirro', body: 'stratus' },
          { clue: 'Rounded heaps in rows on the middle floor', prefix: 'alto', body: 'cumulus' },
          { clue: 'A flat grey layer on the low floor', prefix: 'none', body: 'stratus' },
        ],
        lines: [
          { who: 'juniper', text: 'Now the names. They sound like a spell book, but they’re built from five Latin words.' },
          { who: 'juniper', text: 'Cumulus means a heap. Stratus means a layer. Cirrus means a curl of hair. Nimbus means a rain cloud. Alto means high, except we use it for the middle floor. Don’t ask me why.' },
          { who: 'juniper', text: 'Put a height in front of a shape and you’ve got a name. Cirro- for high, alto- for middle, nothing at all for low. Try it.' },
        ],
        after: [
          { who: 'juniper', text: 'That’s six of the ten. The other four bend the rules: cirrus is just the curls, nimbostratus is a rain layer, stratocumulus is a lumpy layer, and cumulonimbus is a heap that rains. You’ll meet them all.' },
        ],
      },
      {
        kind: 'photo-call',
        pool: ['cirrus', 'cirrostratus', 'altocumulus', 'altostratus', 'stratus', 'stratocumulus', 'cumulus', 'cumulonimbus'],
        count: 8,
        lines: [
          { who: 'juniper', text: 'Last thing today. The other lookouts have been sending me photos. I’ll read them out to you; you tell me which floor each cloud is on.' },
          { who: 'juniper', text: 'Look at the edges. Crisp and solid means droplets, so low. Soft, wispy or silky means ice, so high. In between, check the size of the pieces.' },
        ],
      },
      {
        kind: 'log',
        learned: [
          'A cloud is rising air that has cooled to its dew point.',
          'The cloud base sits about 125 metres up for each degree between temperature and dew point.',
          'Low clouds are droplets with crisp edges; high clouds are ice and look silky.',
          'Names are built from heap, layer, curl, rain, and a height: cirro- high, alto- middle.',
        ],
        next: 'Tomorrow, the heaps: how cumulus grows on a summer afternoon, and when to start worrying about it.',
      },
    ],
  },
];

export function shiftById(id: string): Shift | undefined {
  return SHIFTS.find((s) => s.id === id);
}

/** Journal entries and what they say. Shifts unlock them by id. */
export const JOURNAL: Record<string, { title: string; text: string }> = {
  'what-is-a-cloud': {
    title: 'What a cloud is',
    text: 'Rising air cools about 10 °C per kilometre until it reaches its dew point. Then its vapour condenses on dust, smoke and salt into droplets or ice. The cloud base is about 125 m up for each degree between the ground temperature and dew point.',
  },
  floors: {
    title: 'The three floors',
    text: 'Low: ground to about 2,000 m, water droplets, crisp edges. Middle: about 2,000 to 7,000 m, droplets and some ice. High: above about 5,000 m, ice crystals, silky and thin. Thunderstorm towers fill all three.',
  },
  roots: {
    title: 'Name roots',
    text: 'Cumulus, a heap. Stratus, a layer. Cirrus, a curl of hair. Nimbus, a rain cloud. Cirro- puts a cloud on the high floor and alto- on the middle one; low clouds take no prefix.',
  },
};
