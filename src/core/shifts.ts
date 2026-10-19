// The tutorial series, as shifts at the lookout. Each shift is a short
// illustrated article in the manner of an interactive explainer: paragraphs,
// a word from Juniper over the radio now and then, and live figures to play
// with. A shift comes in parts; the next part opens once the figures in this
// one have had their small task done. The last part is a check, and the shift
// ends with the log.
//
// The story: you have taken a summer job as the cloud watcher on Anvil Peak, a
// lookout in the Thunderhead National Forest. Juniper, the district weather
// officer, trains you over the radio. Once training is done the district's
// cloud-seeding programme opens up, and you start making clouds as well as
// reading them.
//
// Shift 1's words are in data/shifts/textures.json; the rest are below.
//
// Text takes a little markup (see app/figures/kit.ts prose): **bold**,
// *italic*, and [[words|colour]] to tie a word to the same colour in a figure.

import type { Body, GenusId, Prefix } from './clouds';
import textures from '../data/shifts/textures.json';

export const FIGURE_IDS = [
  'jar', 'parcel', 'freezing', 'thermals', 'sounding', 'nudge', 'night', 'spread', 'drops', 'sunThrough', 'hand', 'shadow',
  'streaks', 'prism', 'halo', 'front', 'storm', 'flash', 'wave', 'billow', 'mamma', 'sort', 'names', 'radioCheck', 'forecast',
] as const;
export type FigureId = (typeof FIGURE_IDS)[number];

export type Speaker = 'juniper' | 'you';

export type Block =
  /** A paragraph of the article. */
  | { kind: 'text'; text: string }
  /** A word over the radio, set apart from the article. */
  | { kind: 'radio'; who: Speaker; text: string }
  /** A live figure. `task` says what to do with it; `goal` tells the figure when it is done. */
  | { kind: 'figure'; figure: FigureId; caption: string; task?: string; goal?: string; options?: Record<string, unknown> };

export interface Part {
  title: string;
  blocks: Block[];
}

/** A forecasting question: a sky over some hours, and what it is up to. */
export interface Forecast {
  /** The sky over the hours, oldest first; one drawing per entry. */
  sky: { genus: GenusId; when: string }[];
  question: string;
  options: string[];
  answer: number;
  why: string;
}

export interface Shift {
  id: string;
  n: number;
  title: string;
  /** The clouds this shift introduces. */
  clouds: GenusId[];
  /** One line for the shift board. */
  teaches: string;
  parts: Part[];
  /** What was learned, written into the log. */
  learned: string[];
  next: string;
  /** Journal entries this shift unlocks. */
  journal: string[];
}

const text = (t: string): Block => ({ kind: 'text', text: t });
const radio = (t: string, who: Speaker = 'juniper'): Block => ({ kind: 'radio', who, text: t });
const figure = (figureId: FigureId, caption: string, more: Omit<Extract<Block, { kind: 'figure' }>, 'kind' | 'figure' | 'caption'> = {}): Block => ({ kind: 'figure', figure: figureId, caption, ...more });
const nameCheck = (pool: GenusId[], known: GenusId[], count: number): Block =>
  figure('radioCheck', 'Photos from the other lookouts. Call in each cloud by name.', { options: { mode: 'name', pool, known, count } });
const forecasts = (items: Forecast[]): Block =>
  figure('forecast', 'The sky over a few hours, as the other lookouts logged it. What is it up to?', { options: { items } });

/**
 * A shift whose words live in a JSON file in data/shifts, so they can be edited
 * outside the code. The file holds everything but the clouds the shift
 * introduces; its journal entries are merged into JOURNAL below.
 */
interface ShiftFile {
  id: string;
  n: number;
  title: string;
  teaches: string;
  parts: unknown[];
  learned: string[];
  next: string;
  journal: Record<string, { title: string; text: string }>;
}
function fromJson(file: ShiftFile, clouds: GenusId[]): Shift {
  return {
    id: file.id,
    n: file.n,
    title: file.title,
    clouds,
    teaches: file.teaches,
    parts: file.parts as Part[],
    learned: file.learned,
    next: file.next,
    journal: Object.keys(file.journal),
  };
}

export const SHIFTS: readonly Shift[] = [
  // -------------------------------------------------------------------------
  fromJson(textures, ['cumulus', 'stratus']),

  // -------------------------------------------------------------------------
  {
    id: 'low-sky',
    n: 2,
    title: 'The low sky',
    clouds: ['stratocumulus', 'nimbostratus'],
    teaches: 'Stratocumulus and nimbostratus, and telling a harmless grey sky from a rainy one',
    journal: ['floors', 'stratocumulus', 'nimbostratus', 'rain'],
    parts: [
      {
        title: 'Three floors',
        blocks: [
          radio('Morning, Anvil Peak. Today we start filing clouds properly. We file them by height, like the floors of a building.'),
          text('Meteorologists split the lower atmosphere into three floors. The **low** floor runs from the ground to about 2,000 metres. The **middle** floor goes on up to about 7,000 metres. The **high** floor starts at about 5,000 metres, so the two overlap, and runs to the top of the weather at around 12 kilometres. The edges are fuzzy because clouds care about temperature, not exact heights.'),
          text('Height matters because temperature falls as you climb, and temperature decides what a cloud is made of. Climb through the sky and watch.'),
          figure('freezing', 'A mild summer day, from the valley floor to the top of the weather.'),
          text('Low clouds are almost all liquid droplets. Droplets are packed close and reflect light well, so low clouds look solid and their edges sharp. Higher up the droplets start to freeze, and on the high floor everything is ice. A good watcher reads height from texture before anything else.'),
          figure('sort', 'Some of today’s sky.', { task: 'File each cloud onto its floor.', options: { clouds: ['cumulus', 'stratus', 'stratocumulus', 'altocumulus', 'cirrus', 'cumulonimbus'] } }),
        ],
      },
      {
        title: 'Lumpy sheets: stratocumulus',
        blocks: [
          text('Recall the two textures from your first shift. Real skies often mix them. The most common cloud on Earth is a mixture: **stratocumulus**, lumps and rolls of cloud joined into a sheet, grey in the thick parts and white at the edges, with chinks of blue between.'),
          text('It usually forms under a **lid**: a layer of warmer air sitting on top of the cooler air below, often a few hundred metres to two kilometres up. Air stirred from below can rise as far as the lid and no further. Heaps that hit it can’t climb, so they spread sideways and bump into each other.'),
          figure('spread', 'Morning heaps rising under a layer of warmer air.', { task: 'Strengthen the lid and add moisture until the heaps join into a sheet.', goal: 'sheet' }),
          text('Because the lid stops the cloud from growing deep, stratocumulus seldom makes more than a little drizzle. A sky full of it looks gloomy but usually means settled weather: the lid that makes it is a sign of air sinking gently from above, and sinking air is fair-weather air.'),
        ],
      },
      {
        title: 'Why most clouds don’t rain',
        blocks: [
          text('A cloud droplet is tiny: about a hundredth of a millimetre across. At that size air resistance wins easily, and it drifts down slower than a centimetre a second. The faintest updraft holds it up; if it does sink out of the cloud, it evaporates long before reaching the ground.'),
          text('To fall as rain a drop must be about a hundred times wider, and so about a million times heavier. That takes a million cloud droplets bumping and merging, or, in colder clouds, ice crystals growing at the droplets’ expense. Either way it needs a *deep* cloud and a long time.'),
          figure('drops', 'One drop, from cloud droplet to raindrop.', { task: 'Grow the drop until it falls as rain.', goal: 'rain' }),
          radio('That’s why depth is what I listen for. A thin cloud can be as grey as it likes. A deep one, you get your rain gear out.'),
        ],
      },
      {
        title: 'The soaking layer: nimbostratus',
        blocks: [
          text('**Nimbostratus** is the deep one: a dark, featureless layer kilometres thick, from which rain or snow falls steadily for hours. It forms when a whole region of moist air is lifted slowly and together, as happens along a front where warm air rides up over cold. Lifting that wide makes a layer; lifting that deep makes rain.'),
          text('The Cloud Atlas files nimbostratus on the middle floor, since that is where it begins and most of it lies. But under it the rain cools and moistens the air, and ragged scud forms below, so from the ground its dark base seems to sag right down into the low sky.'),
          text('The best test is the sun. Try thickening a layer of cloud in front of it.'),
          figure('sunThrough', 'The sun behind a layer of cloud.', { task: 'Thicken the layer until the sun is gone entirely.', goal: 'nimbostratus' }),
          text('Stratocumulus has a *texture*: lumps, rolls, light and dark patches, and gaps. Nimbostratus has none: it is evenly dark and blurred by falling rain, with no sun anywhere behind it. If you can see the shape of the cloud, it probably isn’t the one soaking you.'),
        ],
      },
      {
        title: 'Radio check',
        blocks: [
          radio('Radio check, Anvil Peak. Names first, then I want your forecast on a few skies.'),
          nameCheck(['stratocumulus', 'nimbostratus', 'stratus', 'cumulus'], ['stratocumulus', 'nimbostratus', 'stratus', 'cumulus'], 6),
          forecasts([
            {
              sky: [{ genus: 'cumulus', when: '10:00' }, { genus: 'stratocumulus', when: '13:00' }, { genus: 'stratocumulus', when: '16:00' }],
              question: 'Morning heaps spread into a lumpy grey sheet by afternoon. Do the crews need rain gear?',
              options: ['No: dry, maybe a spot of drizzle', 'Yes: steady rain by evening', 'Thunderstorms likely'],
              answer: 0,
              why: 'Heaps that spread under a lid make stratocumulus. The lid keeps the cloud thin, so it stays dry or drizzles at most.',
            },
            {
              sky: [{ genus: 'altostratus', when: '09:00' }, { genus: 'nimbostratus', when: '12:00' }, { genus: 'nimbostratus', when: '15:00' }],
              question: 'A grey sheet thickened until the sun vanished and the base looks blurred. What should the crews expect?',
              options: ['A short shower, then sun', 'Steady rain for hours', 'It will burn off by noon'],
              answer: 1,
              why: 'A featureless layer with no sun behind it is nimbostratus: wide, deep lifting, and steady rain until the front passes.',
            },
            {
              sky: [{ genus: 'stratus', when: '06:00' }, { genus: 'stratus', when: '08:00' }, { genus: 'cumulus', when: '12:00' }],
              question: 'A flat grey layer hides the ridges at dawn. What happens next on a summer day?',
              options: ['Rain all day', 'It lifts and burns off by midday', 'It builds into storms'],
              answer: 1,
              why: 'Dawn stratus is cooled overnight air. The sun warms it back above its dew point, and it lifts and thins away.',
            },
          ]),
        ],
      },
    ],
    learned: [
      'The sky has three floors: low to about 2 km, middle to about 7 km, high from about 5 km up.',
      'Low clouds are droplets with crisp edges; high clouds are ice and look silky.',
      'Stratocumulus is lumpy heaps spread under a lid: gloomy but mostly dry.',
      'Rain needs a deep cloud: a raindrop is about a million cloud droplets.',
      'Nimbostratus is dark, featureless and blots out the sun; it means hours of steady rain.',
    ],
    next: 'Next shift, the middle sky, and how to measure a cloud’s height with nothing but your hand.',
  },

  // -------------------------------------------------------------------------
  {
    id: 'middle-sky',
    n: 3,
    title: 'The middle sky and the hand trick',
    clouds: ['altocumulus', 'altostratus'],
    teaches: 'Altocumulus and altostratus, and judging a cloud’s height with your hand and its shadows',
    journal: ['roots', 'hand-trick', 'altocumulus', 'altostratus'],
    parts: [
      {
        title: 'The names are a code',
        blocks: [
          radio('You’ll have noticed the names sound like a spell book. Good news: they’re a code, and you already know half of it.'),
          text('Cloud names are built from five Latin words. **Cumulus** means a heap and **stratus** a layer: your two textures. **Cirrus** means a curl of hair, **nimbus** a rain cloud. And **alto** means high, though for historical reasons it is used for the *middle* floor.'),
          text('Put a height in front of a texture and you have a name. *Cirro-* puts a cloud on the high floor, *alto-* on the middle one, and low clouds take no prefix at all.'),
          figure('names', 'The sky, one name at a time.', {
            task: 'Build each name from its height and texture.',
            options: {
              targets: [
                { clue: 'Rounded heaps in rows on the middle floor', prefix: 'alto', body: 'cumulus' },
                { clue: 'A grey sheet over the sun on the middle floor', prefix: 'alto', body: 'stratus' },
                { clue: 'A thin, even veil on the high floor', prefix: 'cirro', body: 'stratus' },
              ] satisfies { clue: string; prefix: Prefix; body: Body }[],
            },
          }),
          text('That makes six of the ten. The rest bend the rules slightly: stratocumulus and nimbostratus you know, cirrus is just the curls, and cumulonimbus is a heap that rains.'),
        ],
      },
      {
        title: 'Your hand is a ruler',
        blocks: [
          text('Here is the trouble. A patch of **altocumulus**, a layer of rounded clouds on the middle floor, looks almost exactly like a patch of **stratocumulus** below it, or **cirrocumulus** above it. All three are lumps in a layer. Without an altimeter, how do you tell how high they are?'),
          text('Use their size. Cloud lumps in a layer tend to be a few hundred metres across, whatever floor they’re on. So the higher the layer, the smaller its pieces *look*, just as a car looks smaller the further away it is. And you carry a ruler for angles: your hand at arm’s length. A fist covers about 10° of sky, a thumb about 2°, a little-finger nail about 1°.'),
          figure('hand', 'A layer of lumpy cloud, seen from the ground with your arm stretched out.', { task: 'Move the layer through the three floors and see each verdict.', goal: 'all' }),
          text('The rule of thumb, literally: pieces **bigger than your thumb**, up to fist size, are stratocumulus. Pieces about **thumb-sized** are altocumulus. Pieces **smaller than your little-finger nail** are cirrocumulus. Measure pieces well above the horizon, since near it everything looks squashed and small.'),
        ],
      },
      {
        title: 'Shadows give it away',
        blocks: [
          text('The second clue is shading. A cloud lump thick enough to block sunlight casts shadow on its own underside, so it looks grey beneath and bright on top. Thin cloud lets the light through and stays white all over.'),
          figure('shadow', 'One lump of cloud with the sun above it.', { task: 'Thicken the cloud until it shades itself.', goal: 'shade' }),
          text('Altocumulus is usually thick enough for **shaded sides**: grey-bottomed sheep in a flock. Cirrocumulus, high and thin, is pure white grains with **no shading at all**. Stratocumulus is shaded too, but its pieces are bigger, so check with your hand.'),
          radio('One altocumulus to remember. If you see little turrets sprouting from it on a warm, sticky morning, call me. That’s castellanus, and it means the middle sky is unstable. Thunderstorms by afternoon, often.'),
        ],
      },
      {
        title: 'The frosted glass: altostratus',
        blocks: [
          text('**Altostratus** is the middle floor’s layer: a grey or bluish sheet, often covering the whole sky. It is thinner than nimbostratus, so the sun shows through it, but only faintly, as a pale disc behind frosted glass.'),
          figure('sunThrough', 'The sun behind a layer of cloud, again.', { task: 'Thicken the layer until the sun looks like it’s behind frosted glass.', goal: 'altostratus' }),
          text('Two tests tell it from the high veil above it. Under altostratus, **shadows vanish**: the ground is evenly lit. And there is **no halo** around the sun: the sheet is too thick, and too mixed with droplets, for its crystals to bend the light into a clean ring. That halo is coming next shift.'),
          text('Altostratus is usually a stage on the way to rain: a veil thickening and lowering ahead of a warm front, on its way to becoming nimbostratus.'),
        ],
      },
      {
        title: 'Radio check',
        blocks: [
          radio('Radio check. This time I just want the floor for each photo. Use your hand, and look for shading.'),
          figure('radioCheck', 'Photos from the other lookouts. Which floor is each cloud on?', {
            options: { mode: 'floor', pool: ['stratocumulus', 'altocumulus', 'altostratus', 'cirrocumulus', 'stratus', 'nimbostratus', 'cumulus', 'cirrus'], count: 8 },
          }),
        ],
      },
    ],
    learned: [
      'Names are a code: cumulus heap, stratus layer, cirrus curl, nimbus rain; cirro- high, alto- middle.',
      'At arm’s length: fist-sized lumps are stratocumulus, thumb-sized altocumulus, nail-sized cirrocumulus.',
      'Thick lumps shade themselves; altocumulus has grey sides, cirrocumulus none.',
      'Altostratus shows the sun as through frosted glass, with no shadows and no halo.',
    ],
    next: 'Next shift, the ice realm: mares’ tails, halos, and the warning they give a day ahead.',
  },

  // -------------------------------------------------------------------------
  {
    id: 'ice-realm',
    n: 4,
    title: 'The ice realm and early warnings',
    clouds: ['cirrus', 'cirrostratus', 'cirrocumulus'],
    teaches: 'Cirrus, cirrostratus and cirrocumulus, the 22° halo, and reading a warm front a day ahead',
    journal: ['ice', 'cirrus', 'cirrostratus', 'cirrocumulus', 'halo', 'warm-front'],
    parts: [
      {
        title: 'Above the freezing line',
        blocks: [
          text('Climb to the high floor and the air is far below freezing even in summer. Above about 6,000 metres clouds are made of **ice crystals**, not droplets.'),
          figure('freezing', 'A mild summer day, from the valley floor to the top of the weather.', { task: 'Climb above 6,000 m.', goal: 'high' }),
          text('Ice changes everything about how a cloud looks. Crystals are fewer and further apart than droplets, so high clouds are thin and you can often see blue through them. Crystals grow large enough to fall, so high clouds trail and streak. And crystals are little prisms, which bend light into halos.'),
        ],
      },
      {
        title: 'Mares’ tails: cirrus',
        blocks: [
          text('**Cirrus** is made of falling ice. Crystals form in a moist patch near the top of the weather, grow, and start to fall. As they fall they pass through air moving at different speeds; the wind usually gets stronger with height. The crystals left behind lag, and the trail curves.'),
          figure('streaks', 'Ice crystals falling from a moist patch high up.', { task: 'Add wind shear until the trails curl into hooks.', goal: 'hooks' }),
          text('Those hooked streaks are the classic **mares’ tails**. The head of the hook is where the crystals form; the tail is where they fall and evaporate. The way the tails point tells you which way the high wind is blowing compared with the wind below.'),
          text('**Cirrocumulus** is the high floor’s heaped cloud: tiny white grains or ripples with no shading, in rows like fish scales. The old name for it is a *mackerel sky*. It is short-lived and rarely covers much of the sky.'),
        ],
      },
      {
        title: 'Through a crystal',
        blocks: [
          text('Many ice crystals are six-sided columns or plates. Light entering one side and leaving through a side two faces along passes through the crystal as if through a 60° glass prism, and is bent off its path.'),
          figure('prism', 'Sunlight through one hexagonal ice crystal.', { task: 'Turn the crystal until the light is bent the least.', goal: 'min' }),
          text('However you turn the crystal, the light is bent by **at least 22°**, and angles near that minimum are the most common, because the deviation changes slowly there. Turn the crystal a lot and the light still comes out at about 22°.'),
        ],
      },
      {
        title: 'The 22° halo',
        blocks: [
          text('Now fill the sky with millions of crystals, each tumbling at random. Every one sends some sunlight out at 22° or more, and most of it at close to 22°. Seen from the ground, that light comes from a ring 22° around the sun.'),
          figure('halo', 'Sunlight through a sky of randomly turned crystals.', { task: 'Add crystals until the ring appears.', goal: 'ring' }),
          text('That ring is the **22° halo**. Its inner edge is sharp and faintly red, and inside it the sky is darker, since no crystal sends light there. It is big: hold your hand out with fingers spread and the halo’s radius is about a hand-span from thumb to little finger.'),
          text('Halos almost always mean **cirrostratus**: a thin, milky veil of ice across the sky, so thin the sun still casts shadows. On its own it is just a pretty sky. What it means depends on what comes next.'),
        ],
      },
      {
        title: 'A warm front, from far off',
        blocks: [
          radio('Here is why you are really up there, Anvil Peak. The high clouds are my early warning.'),
          text('A **warm front** is the leading edge of warm air pushing into cold. Warm air is lighter, so instead of shoving the cold air aside it rides up over it, along a sloping boundary only about 1 in 100. Where the front is at ground level it might rain; but its upper edge, 10 kilometres up, is a thousand kilometres ahead.'),
          text('The warm air cools as it climbs that slope and makes cloud all along it. So as a warm front approaches, you see the clouds that form at each height in turn, highest first.'),
          figure('front', 'A warm front, moving towards the lookout at about 25 km/h.', { task: 'Let the front come in until rain is about to arrive.', goal: 'arrive' }),
          text('The sequence is the most useful forecast in this job: **cirrus** spreading in from one direction, thickening into **cirrostratus** with a halo, lowering into **altostratus** where the sun goes dim and the halo fades, and finally **nimbostratus** and steady rain. From the first halo to the rain is usually **12 to 24 hours**.'),
          radio('The old rhyme has it: ring around the moon, rain soon. It isn’t right every time, but it’s right more often than not.'),
        ],
      },
      {
        title: 'Radio check',
        blocks: [
          radio('Radio check. Names first, then tell me what each sky is up to.'),
          nameCheck(['cirrus', 'cirrostratus', 'cirrocumulus', 'altocumulus', 'altostratus'], ['cirrus', 'cirrostratus', 'cirrocumulus', 'altocumulus', 'altostratus'], 6),
          forecasts([
            {
              sky: [{ genus: 'cirrus', when: 'Monday 08:00' }, { genus: 'cirrostratus', when: '14:00' }, { genus: 'altostratus', when: '20:00' }],
              question: 'Mares’ tails thickened to a veil with a halo, and now the sun is a dim disc. When will it rain?',
              options: ['It won’t; this is fair weather', 'Within the next several hours', 'In about a week'],
              answer: 1,
              why: 'Cirrus to cirrostratus to altostratus is a warm front coming in, lowest cloud last. Rain usually follows within a day of the halo, sooner now the veil is so thick.',
            },
            {
              sky: [{ genus: 'cirrus', when: '09:00' }, { genus: 'cirrus', when: '13:00' }, { genus: 'cirrus', when: '17:00' }],
              question: 'A few wisps of cirrus all day, not spreading or thickening. What’s up?',
              options: ['Fair weather for now', 'A warm front within hours', 'Thunderstorms this evening'],
              answer: 0,
              why: 'Cirrus on its own is fair weather. It is the thickening and spreading into a veil that warns of a front.',
            },
            {
              sky: [{ genus: 'cirrostratus', when: '11:00' }, { genus: 'cirrostratus', when: '12:00' }],
              question: 'A milky veil with a ring around the sun. The ring is about how far from the sun?',
              options: ['A thumb’s width', 'A hand-span, about 22°', 'Halfway across the sky'],
              answer: 1,
              why: 'Light through a hexagonal ice crystal bends by at least 22°, so the halo sits 22° from the sun: a spread hand at arm’s length.',
            },
          ]),
        ],
      },
    ],
    learned: [
      'Above about 6,000 m clouds are ice: thin, silky, and streaked by falling crystals.',
      'Cirrus hooks are falling crystals bent by winds that change with height.',
      'Ice prisms bend light by at least 22°, which makes the 22° halo in cirrostratus.',
      'Cirrus thickening to cirrostratus then altostratus is a warm front: rain in 12 to 24 hours.',
    ],
    next: 'Last training shift: the giants. Thunderstorms, and a few rare clouds worth staying up for.',
  },

  // -------------------------------------------------------------------------
  {
    id: 'giants',
    n: 5,
    title: 'Vertical giants and rare boss clouds',
    clouds: ['cumulonimbus'],
    teaches: 'How a cumulus becomes a thunderstorm, counting the thunder, and the rare clouds to stay up for',
    journal: ['cumulonimbus', 'lightning', 'lenticularis', 'mammatus', 'fluctus'],
    parts: [
      {
        title: 'How tall a heap grows',
        blocks: [
          radio('Last training shift, Anvil Peak. This is the one the lookout is named for.'),
          text('In your first shift a thermal rose until it reached its dew point and made a cumulus. But reaching the dew point doesn’t stop a bubble. As vapour condenses it releases the heat that evaporated it, so cloudy air cools more slowly as it rises, about 6 °C per kilometre instead of 10. Cloudy air can stay warmer than its surroundings and keep climbing long after air without cloud would have stopped.'),
          text('How high it gets depends on the day. The sun sets how hard the thermals start; moisture sets the cloud base; and a [[lid|env]] of warm air above can stop them dead.'),
          figure('sounding', 'A summer day over the forest, with a warm layer a couple of kilometres up.', { task: 'Grow a cumulus congestus: a tower several kilometres tall.', goal: 'congestus' }),
          text('Glider pilots and meteorologists name heaps by height. Flat **humilis**, small and wider than tall, is fair weather. **Mediocris** is as tall as it is wide. **Congestus** towers, with hard cauliflower tops, and is the one to watch: on an unstable day it may keep going.'),
        ],
      },
      {
        title: 'The thunderstorm',
        blocks: [
          text('If nothing stops the tower it can climb to the top of the weather, 10 to 12 kilometres up, where the air stops cooling with height and the tower can rise no further. Its top freezes to ice and spreads out sideways into a flat **anvil**. A heap that rains is a **cumulonimbus**: the thunderstorm.'),
          figure('sounding', 'The same day, with the instability control added.', { task: 'Remove the lid and make the air unstable enough to grow a cumulonimbus.', goal: 'cumulonimbus' }),
          text('A single storm lives about an hour. Watch one through its life.'),
          figure('storm', 'One thunderstorm cell, from first heap to last shower.', { task: 'Run the storm to the end of its life.', goal: 'end' }),
          text('In the **growing stage** the tower is all updraught. In the **mature stage** rain and hail have grown heavy enough to fall, dragging cold air down with them: the storm now has an updraught and a downdraught side by side, with lightning, downpours and gusts. In the **dissipating stage** the downdraught takes over, smothers the updraught that fed the storm, and the cloud rains itself out, leaving the anvil drifting away.'),
        ],
      },
      {
        title: 'Counting the thunder',
        blocks: [
          text('Lightning is a spark kilometres long between the charged parts of the cloud, or from cloud to ground. It heats the air around it to about 30,000 °C in a few millionths of a second, and the air expands with a crack: thunder.'),
          text('You see the flash at once, but sound is slow: about **343 metres a second**, so it takes about **three seconds to cover a kilometre**. Count the seconds from flash to thunder and divide by three to get the distance in kilometres.'),
          figure('flash', 'A storm somewhere off in the forest.', { task: 'Make the storm strike, and count.', goal: 'strike' }),
          radio('The rule for every crew in the district: if you can count less than thirty seconds, you’re within ten kilometres and inside the storm’s reach. Get off the ridge, and stay off until thirty minutes after the last thunder.'),
        ],
      },
      {
        title: 'Rare spawns: lens clouds',
        blocks: [
          text('The next few clouds are rare. You may watch for a whole summer before seeing one; when you do, call it in and it goes in your journal.'),
          text('When strong, steady wind blows across a mountain ridge, the air is pushed up the far side and then bobs up and down downwind of it, like water flowing over a rock in a stream. These **standing waves** stay in place while the wind blows through them. Where the air rises through the crest of a wave it cools, and if it is moist enough, a cloud forms there.'),
          figure('wave', 'Wind blowing over the ridge west of Anvil Peak.', { task: 'Get the wind and moisture right to make a lens cloud.', goal: 'lens' }),
          text('The result is an **altocumulus lenticularis**: a smooth lens or flying saucer that sits still over or beside the mountain, even in a gale. Air enters its upwind edge and turns to cloud; it leaves the downwind edge and evaporates. The cloud stays put while the air races through it.'),
        ],
      },
      {
        title: 'Rare spawns: pouches and waves',
        blocks: [
          text('Under the anvil of a strong thunderstorm, the sky sometimes fills with smooth hanging pouches. Air laden with ice and droplets sinks out of the anvil, and because it cools as it evaporates it keeps sinking, in rounded lobes.'),
          figure('mamma', 'The underside of an anvil, late in a storm.', { task: 'Let the cold air sink until pouches form.', goal: 'pouches' }),
          text('These are **mammatus**. They look alarming, and they do mean a vigorous storm is nearby, but the pouches themselves are harmless: they hang from the part of the storm that is already spent.'),
          text('Last, the rarest and shortest-lived of all. Where a layer of fast air slides over a layer of slow air, the boundary between them ripples, just as wind ripples a pond. Strong enough, and the ripples curl over like breaking surf.'),
          figure('billow', 'A cloud layer with fast air above and slower air below.', { task: 'Increase the difference in wind until the waves curl over.', goal: 'curl' }),
          text('These are **Kelvin-Helmholtz waves**, called *fluctus* in the Cloud Atlas. They last only minutes, so a watcher who sees them is a lucky one. To pilots they mean turbulence.'),
        ],
      },
      {
        title: 'Final radio check',
        blocks: [
          radio('Final radio check, Anvil Peak. Pass this and you’re a qualified cloud watcher.'),
          nameCheck(['cumulonimbus', 'cumulus', 'nimbostratus', 'altocumulus', 'stratocumulus', 'cirrostratus'], ['cumulonimbus', 'cumulus', 'nimbostratus', 'altocumulus', 'stratocumulus', 'cirrostratus', 'altostratus', 'stratus'], 6),
          forecasts([
            {
              sky: [{ genus: 'cumulus', when: '10:00' }, { genus: 'cumulus', when: '12:00' }, { genus: 'cumulonimbus', when: '15:00' }],
              question: 'Heaps were still growing tall at midday on a hot, sticky day. What’s up by mid-afternoon?',
              options: ['Thunderstorms', 'Steady rain all night', 'Clearing skies'],
              answer: 0,
              why: 'Cumulus still towering by midday on an unstable day can grow into cumulonimbus by afternoon: lightning, downpours and gusts.',
            },
            {
              sky: [{ genus: 'cumulonimbus', when: '16:00' }, { genus: 'cumulonimbus', when: '16:10' }],
              question: 'Flash, then thunder 12 seconds later. How far is the strike?',
              options: ['About 1 km', 'About 4 km', 'About 12 km'],
              answer: 1,
              why: 'Sound covers about a kilometre every three seconds; 12 ÷ 3 is 4 km. Well within reach: get off the ridge.',
            },
            {
              sky: [{ genus: 'altocumulus', when: '07:00' }, { genus: 'cumulus', when: '11:00' }, { genus: 'cumulonimbus', when: '15:00' }],
              question: 'At dawn, little turrets sprout from a layer of altocumulus. What do you radio?',
              options: ['Settled day ahead', 'Watch for thunderstorms this afternoon', 'Fog tonight'],
              answer: 1,
              why: 'Turreted altocumulus, castellanus, means the middle sky is unstable: a classic warning of afternoon storms.',
            },
          ]),
        ],
      },
    ],
    learned: [
      'Condensing vapour warms the air inside a cloud, so cloudy air can keep rising: humilis, mediocris, congestus.',
      'A tower that reaches the top of the weather spreads into an anvil: cumulonimbus, the thunderstorm.',
      'Count from flash to thunder and divide by three for the distance in kilometres.',
      'Rare clouds: lens clouds in mountain waves, mammatus under anvils, and Kelvin-Helmholtz waves in shear.',
    ],
    next: 'Training is done. The district’s cloud-seeding programme is yours to try.',
  },
];

export function shiftById(id: string): Shift | undefined {
  return SHIFTS.find((s) => s.id === id);
}

/** Journal entries and what they say. Shifts unlock them by id. Rare ones are the clouds to stay up for. */
export const JOURNAL: Record<string, { title: string; text: string; rare?: boolean }> = {
  ...textures.journal,
  floors: {
    title: 'The three floors',
    text: 'Low: ground to about 2,000 m, water droplets, crisp edges. Middle: about 2,000 to 7,000 m, droplets and some ice. High: above about 5,000 m, ice crystals, silky and thin. Thunderstorm towers fill all three.',
  },
  stratocumulus: {
    title: 'Stratocumulus',
    text: 'Lumps and rolls joined into a sheet, with dark patches and gaps, formed when heaps spread under a warm lid. Gloomy but mostly dry; the most common cloud on Earth.',
  },
  nimbostratus: {
    title: 'Nimbostratus',
    text: 'A dark, featureless layer kilometres deep, blurred by falling rain, with no sun behind it. Wide, deep lifting along a front; steady rain or snow for hours.',
  },
  rain: {
    title: 'Why most clouds don’t rain',
    text: 'Cloud droplets are about 0.01 mm across and drift down slower than a centimetre a second. A raindrop is about a hundred times wider: a million droplets merged. That takes a deep cloud and time.',
  },
  roots: {
    title: 'Name roots',
    text: 'Cumulus, a heap. Stratus, a layer. Cirrus, a curl of hair. Nimbus, a rain cloud. Cirro- puts a cloud on the high floor and alto- on the middle one; low clouds take no prefix.',
  },
  'hand-trick': {
    title: 'The hand trick',
    text: 'At arm’s length a fist is about 10°, a thumb 2°, a little-finger nail 1°. Lumps in a layer larger than a thumb are stratocumulus, about a thumb altocumulus, smaller than a nail cirrocumulus. Shaded sides mean thick cloud: altocumulus or stratocumulus, never cirrocumulus.',
  },
  altocumulus: {
    title: 'Altocumulus',
    text: 'Rounded patches or rolls with shaded sides on the middle floor, each about a thumb wide at arm’s length. Turrets on a warm morning (castellanus) warn of afternoon storms.',
  },
  altostratus: {
    title: 'Altostratus',
    text: 'A grey or bluish sheet. The sun shows as through frosted glass, with no shadows and no halo. Usually a warm front thickening; rain is likely within hours.',
  },
  ice: {
    title: 'The ice realm',
    text: 'Above about 6,000 m clouds are ice crystals. They are sparse, so high clouds are thin; they fall, so high clouds streak; and they are prisms, so high clouds make halos.',
  },
  cirrus: {
    title: 'Cirrus',
    text: 'Thin white hooks and streaks: mares’ tails. Falling ice crystals bent by winds that change with height. Fair for now; spreading and thickening into a veil warns of a front.',
  },
  cirrostratus: {
    title: 'Cirrostratus',
    text: 'A thin, milky veil of ice over the whole sky; the sun still casts shadows and often wears a 22° halo. Thickening cirrostratus often means rain in 12 to 24 hours.',
  },
  cirrocumulus: {
    title: 'Cirrocumulus',
    text: 'Tiny white grains or ripples with no shading, smaller than a fingernail at arm’s length: a mackerel sky. Short-lived; often an early sign of a system on the way.',
  },
  halo: {
    title: 'The 22° halo',
    text: 'Light through a hexagonal ice crystal, in one side and out a side two faces along, bends by at least 22°, and most often close to it. A sky of tumbling crystals makes a ring 22° around the sun or moon: a hand-span at arm’s length.',
  },
  'warm-front': {
    title: 'A warm front coming',
    text: 'Warm air rides up over cold on a slope of about 1 in 100, making cloud at every height. Cirrus, then cirrostratus with a halo, then altostratus, then nimbostratus and steady rain, usually 12 to 24 hours after the halo.',
  },
  cumulonimbus: {
    title: 'Cumulonimbus',
    text: 'A heap that grew to the top of the weather and spread into an ice anvil. Grows, matures and rains out in about an hour, with lightning, downpours, hail and gusts.',
  },
  lightning: {
    title: 'Counting the thunder',
    text: 'Sound travels about a kilometre every three seconds. Count from flash to thunder and divide by three for kilometres. Under thirty seconds, you are within reach: get off the ridge.',
  },
  lenticularis: {
    title: 'Lens cloud (lenticularis)',
    rare: true,
    text: 'A smooth lens parked in a standing wave downwind of a mountain. Air turns to cloud as it rises into the crest and evaporates as it leaves; the cloud stays put while the wind blows through it.',
  },
  mammatus: {
    title: 'Mammatus',
    rare: true,
    text: 'Smooth pouches hanging under a thunderstorm anvil, where cold, laden air sinks out of it. A sign of a vigorous storm nearby, though the pouches themselves are harmless.',
  },
  fluctus: {
    title: 'Kelvin-Helmholtz waves (fluctus)',
    rare: true,
    text: 'Breaking-surf curls on top of a cloud layer, where fast air slides over slow. They last minutes. To pilots they mean turbulence.',
  },
};
