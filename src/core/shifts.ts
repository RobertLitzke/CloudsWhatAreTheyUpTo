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
// Text takes a little markup (see app/figures/kit.ts prose): **bold**,
// *italic*, and [[words|colour]] to tie a word to the same colour in a figure.

import type { Body, GenusId, Prefix } from './clouds';

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

export const SHIFTS: readonly Shift[] = [
  // -------------------------------------------------------------------------
  {
    id: 'textures',
    n: 1,
    title: 'The two textures',
    clouds: ['cumulus', 'stratus'],
    teaches: 'What a cloud is, and why some air builds heaps while other air lays down a blanket',
    journal: ['what-is-a-cloud', 'stability', 'cumulus', 'stratus'],
    parts: [
      {
        title: 'What a cloud is made of',
        blocks: [
          radio('Anvil Peak, this is District. You made it up the trail, then. Welcome to the Thunderhead. I’m Juniper; I run weather for the district, which mostly means I sit in a trailer and wish I had your view.'),
          radio('The fire lookouts watch for smoke. You watch everything above the smoke. Before any names, though, you need to know what a cloud actually is. Take this part slowly. Everything else this summer stands on it.'),
          text('Start with a kettle. The white plume over the spout is not water vapour. Water vapour is water as a gas: single molecules flying about on their own among the nitrogen and oxygen of the air, and it is completely invisible. Look closely at a boiling kettle and there is a clear gap right at the spout, where the steam is still vapour. The white begins a finger’s width further out, where the vapour has cooled and its molecules have clumped back together into droplets, far too small to see one at a time. A single molecule is far too small to affect light, but a droplet is big enough to bounce it every which way, and billions of droplets bouncing sunlight in every direction look white.'),
          text('A cloud is the same thing on a grander scale. It is not vapour. It is tiny droplets of liquid water (or, very high up, tiny crystals of ice) floating in the air. So the question “why is there a cloud here?” is really “why did invisible vapour turn into droplets here, and not over there?” Answering it takes one idea, and it is worth going through carefully.'),
          text('Water molecules in the air are always bumping into one another, and they are slightly sticky: each is a little positive at one end and negative at the other, so they cling to one another. Now and then a few stick together, the start of a droplet, but a warm molecule is moving fast and soon shakes itself free again. The colder the air, the slower its molecules move, and the more likely they are to stay stuck once they meet. So at any temperature there is a limit to how much water can stay as vapour. Put in more than that and the extra clumps into droplets. Warm air has plenty of room: a cubic metre at 30 °C can have about 30 grams of vapour in it, a couple of spoonfuls. At 0 °C there is room for less than 5 grams.'),
          text('You will hear people say that warm air “holds” more water, as if the air were a sponge. The nitrogen and oxygen aren’t holding anything, though. The water molecules share the air’s temperature, and it is that temperature, and how crowded the vapour is, that decide whether they stick. When you hear “holds”, read “has room for”.'),
          text('Now take some air with a fixed amount of water in it, and cool it. At first nothing happens; there is still room to spare. Keep cooling, and the room shrinks until it is exactly the amount of water the air has. That temperature is the air’s **dew point**. Cool the air below it and there is no longer room for all the water: droplets appear. It is named after the dew on the grass on a cool morning, where the air touching the cold blades has been chilled below it.'),
          figure('jar', 'A sealed jar of air with some water vapour in it. The violet curve is how much vapour there is room for at each temperature.', { task: 'Cool the jar until it fogs.', goal: 'fog' }),
          text('Play with the water slider and notice two things. First, the dew point depends on how crowded the vapour is, how many grams there are in each cubic metre, not on how warm the air happens to be right now. Add water and the dew point goes up, because there is less room to spare, so it takes less cooling to run out. That makes the dew point a handy measure of how humid air is. A dew point of 20 °C is sticky summer air; a dew point of 0 °C is crisp and dry.'),
          text('Second, to make a cloud you don’t have to add any water. You only have to cool the air down to its dew point. The rest of this shift is about the ways the sky does that.'),
        ],
      },
      {
        title: 'Why rising air cools',
        blocks: [
          text('The sky has a few ways of cooling air, but by far the most important one is lifting it. To see why, follow a single blob of air on its way up. Weather people call a blob like this a **parcel**.'),
          text('Is a parcel a real thing? Partly. There is no skin around it, and at its edges it is always mixing with the air outside. But air really does move in blobs. A bubble of warm air coming off a sunny field can be a few hundred metres across and stay itself for many minutes; hawks and glider pilots find them and ride them up. A blob that big mixes only around its edges, so its middle carries its own temperature and water along with it. The parcel is a simplification, like a physicist’s frictionless ball, but a good one. Follow one parcel and you understand most of what clouds do.'),
          text('Air is squeezed by the weight of all the air piled up above it. At the ground that is about ten tonnes on every square metre; we don’t feel it only because it pushes on us from every side at once, and from inside our bodies too. Climb a kilometre and you have left about a tenth of the atmosphere below you, so there is a tenth less air on top, and the squeeze is a tenth weaker. A parcel has no skin, but its edge is still where its air meets other air, and the two push on each other: the air inside pushes outward just as hard as the air outside pushes in. Carry the parcel up, the outside push weakens, the inside push wins, and the parcel swells until the two balance again.'),
          text('And expanding air cools. You have felt the other half of this: pump up a bicycle tyre and the pump gets warm, because you are squeezing air. You may even have seen this half. Open a cold bottle of fizzy drink and a little wisp of fog appears in the neck: the gas in it expands as the pressure is let off, cools below its dew point, and makes a cloud the size of a thumb. Temperature is just how fast the molecules are jostling. When a parcel expands, its molecules spend some of their energy shoving the surrounding air out of the way, and they come away moving a little slower. Slower molecules, cooler air. Nothing warm or cold has touched the parcel; it has paid for its own growing out of its molecules’ energy.'),
          text('The rate works out at about 10 °C for every kilometre the parcel rises (9.8 °C, to be fussy). This is not an average over different days. It follows from just two things, how hard gravity pulls on air and how much energy it takes to warm it, so it is the same every day, as long as no cloud has formed yet.'),
          text('The parcel’s dew point drops too, more slowly: about 2 °C per kilometre. Nothing has been taken out; the parcel still has all the water it started with. But as it expands, the same water is spread through more space, so there are fewer grams in each cubic metre. Less crowded vapour has a lower dew point: it is the jar’s water slider, moved down a little.'),
          text('So a [[rising parcel|parcel]] is a race between two temperatures: its own temperature, falling about 10° per kilometre, and its [[dew point|dew]], falling about 2°. The gap between them closes by about 8° every kilometre it climbs.'),
          figure('parcel', 'A parcel of air at the trailhead, 24 °C with a dew point of 12 °C.', { task: 'Lift the air until it turns to cloud.', goal: 'base' }),
          text('Where the two lines meet, the parcel has reached its dew point. Its vapour gathers into droplets, and the parcel becomes cloud. That height is the **cloud base**, and you can work it out yourself from the race. The gap closes 8° every kilometre, so each degree of gap at the ground takes 1000 ÷ 8 = 125 metres to close. This morning at the trailhead the gap is 24 − 12 = 12°, so the cloud base is about 12 × 125 = 1,500 metres above the trailhead.'),
          text('That little sum explains something you will see from the tower all summer. On a muggy day the dew point is close to the temperature: the gap is small, and clouds form low. On a dry day the gap is wide, and cloud bases are high. Try it with the dew point slider.'),
          text('Two details about the droplets. They need something to form on. A droplet of just a few molecules is so tiny and so curved that molecules escape from it far more easily than they join, so it falls apart before it can grow. Give them a speck of dust, smoke or sea salt and they gather on it easily, and every lungful of air has millions of such specks. And the droplets are tiny, about a hundredth of a millimetre across. They do fall, but less than a centimetre a second, so the gentlest upward breeze holds them up. That is how a cloud floats although it is made of water.'),
          text('So most clouds are a record of air that went up. (A few, like fog, are air cooled where it sits; you will meet those at the end of this shift.) What makes one cloud look different from another is mostly *how* the air went up: in separate bubbles, or all together as a layer.'),
        ],
      },
      {
        title: 'Bubbles or a blanket',
        blocks: [
          text('That last sentence is the key to this whole shift, so here is the question behind it. Give some air a small push upward and it keeps going up on its own. Give other air the same push and it sinks back to where it started. Which kind of air the sky has today decides almost everything about the clouds you will see.'),
          text('Why would air go up on its own? For the same reason a hot-air balloon does. A blob of warm air is squeezed by its neighbours just as hard as any other air at its height. But its molecules move faster, so to push back no harder than its neighbours do, it spreads them a little further apart. Fewer molecules in each cubic metre makes it lighter for its size, so the cooler, heavier air around it slides underneath and pushes it up. Warm air rises; cool air sinks.'),
          text('Now the twist. A rising parcel always cools by about 10° per kilometre. But the [[air around it|env]] also gets colder as you go up, and how fast it does so changes from day to day. Averaged over the whole world and the whole year it cools about 6.5° per kilometre. On a hot afternoon, with the ground baking, the lowest kilometre or two can cool by more than 10° per kilometre. On a clear night it can cool by much less, and some layers even get warmer with height. A warm layer sitting on cooler air like that is called an **inversion**, and it is common. From the lookout you will often see one as haze or smoke spreading out flat, unable to climb through it.'),
          text('So compare the two rates. Nudge a parcel up a few hundred metres; it cools 10° per kilometre on the way. If the air around it cools *faster* than that, say 12° per kilometre, the parcel arrives at its new height warmer than its new neighbours. Warmer means lighter, so it rises further, and the higher it goes the bigger its lead. It runs away upward. That air is **unstable**.'),
          text('If the air around it cools *more slowly* than 10° per kilometre, say 5°, the nudged parcel arrives colder than its new neighbours. Colder means heavier, so it sinks back down to where it started and settles. That air is **stable**. Notice that stable and unstable describe the air around the parcel, the whole column of sky that day. The column decides what happens to any parcel that gets nudged.'),
          text('A ball on a landscape behaves the same way. In a valley, push the ball and it rolls back: stable. Balanced on a hilltop, push it and it rolls away and never comes back: unstable. In the figure, watch the two temperatures beside the bubble as it moves.'),
          figure('nudge', 'A bubble of air nudged upward. Its own temperature is orange; the air around it is violet.', { task: 'Nudge the bubble once in stable air and once in unstable air.', goal: 'both' }),
          text('Those two answers give the sky its two basic textures. In unstable air, bubbles shoot up on their own wherever the ground gives them a start, and each one becomes its own cloud: you get **heaps**. In stable air nothing climbs by itself. Air becomes cloud only if something else cools it: a wind pushing it slowly up a mountainside, or cold ground chilling it from below. Then a whole wide layer is cooled gently and all together, and you get a flat **sheet**.'),
          text('Nearly every cloud in the low sky is a heap, a sheet, or something in between, like heaps squashed flat into a lumpy sheet. Later shifts meet the in-betweens, and the high, icy wisps that play by slightly different rules. For now, the two pure cases.'),
        ],
      },
      {
        title: 'Heaps: cumulus',
        blocks: [
          text('Sunlight passes through air almost without warming it; air is nearly transparent. The ground soaks the light up instead, and the ground warms the air touching it. Not all ground warms alike. Dark rock, bare fields and roofs get hot, while a lake or a damp forest spends much of the sun’s energy evaporating water and stays cool.'),
          text('The air over a hot patch warms, becomes lighter than the air around it, and once it is warm enough it breaks away and rises as a bubble called a **thermal**. Hawks circle inside them to climb without flapping, and glider pilots hunt for them over dark fields. A thermal is a parcel, and it does just what the parcel did: cools 10° per kilometre and closes the gap on its dew point. Where the gap closes it becomes visible, as a heap of cloud: a **cumulus**.'),
          figure('thermals', 'A sunny morning over the forest. Thermals rise from the warmest ground.', { task: 'Bring the sun up until two clouds have formed.', goal: 'clouds' }),
          text('Look at what the figure gives away. Every heap starts at the same height, so cumulus have **flat bases**, all at one level. You might expect a bubble off the hottest rock to start warmer, and so turn to cloud higher up. It does, but only a little. By mid-morning the thermals have stirred the lowest kilometre of air so thoroughly that the air all over the valley has nearly the same temperature and the same water in it. A bubble breaks away when it is only a degree or so warmer than its surroundings, which lifts its cloud base by a hundred metres at most. From twenty kilometres away the bases still line up as if ruled.'),
          text('The **moisture** slider moves that line, for the reason you met in the race: humid air starts with a small gap to its dew point, so its bases are low, and dry air with a wide one, so its bases are high. A bubble only keeps rising while it is warmer than the air around it, and on very dry days the bubbles lose their lead and stop before they ever reach their dew point, and the thermals stay invisible: a blue, cloudless sky that is still bumpy for gliders.'),
          text('Why doesn’t a bubble stop when it reaches the cloud base? Here is one of nature’s lovely tricks. When vapour turns to droplets, it gives back the heat it took to evaporate it in the first place: the same heat that leaves your skin when sweat dries. That heat warms the cloudy air from inside, so above the base the rising air cools only about 5° per kilometre instead of 10. The test for whether it keeps rising is the same as before: compare how fast the bubble cools with how fast the air around it cools. Only the bubble’s rate has changed. The air around it, meanwhile, goes on cooling at the day’s own rate, often 6 or 7° per kilometre. A dry bubble in that air would soon have lost its lead and stopped. The cloudy bubble now cools more slowly than its surroundings, so its lead grows instead, and it keeps climbing, boiling up in rounded towers. That is the cauliflower top, bright white where the sun catches it.'),
          text('And between the clouds? Every bit of air that goes up must be replaced by air coming down somewhere else. The sinking air between the thermals runs the parcel’s rule in reverse: it is squeezed as it descends and warms 10° per kilometre, which takes it further from its dew point. No cloud can form in it. That is why cumulus stand apart, with blue sky between them.'),
          radio('Small cumulus scattered across a blue sky is the best weather this job has. We call them fair-weather cumulus. They come with the morning sun and fade at sunset, when the ground stops heating the air and the thermals stop.'),
        ],
      },
      {
        title: 'Blankets: stratus',
        blocks: [
          text('Now the other texture, and a different way of cooling air, with no lifting at all.'),
          text('Everything warm glows. You glow, the rocks glow, the ground glows, in infrared light that eyes can’t see but that carries heat away. In the daytime the sun pours in more than the ground glows away. At night nothing comes in, and on a clear night the ground’s glow goes straight out to space. The ground cools, and the air resting on it gives up its heat to the cold ground by touch, the way your hand cools on a cold window. Touch alone chills only the bottom few centimetres, but the night air is never perfectly still: faint stirring, and the air’s own glow, carry the chill up through the bottom few tens of metres. Clouds glow as well, back down at the ground, which is why a cloudy night stays mild and a clear one turns cold.'),
          text('That leaves the coldest air at the bottom, with warmer air above it: an inversion, the most stable arrangement there is, because the coldest, heaviest air is already as low as it can go. Nothing bubbles; the chilled layer just slowly deepens through the night. Unlike the rising parcel, this air is not expanding, so its water is not being spread any thinner, and its dew point stays put while its temperature falls towards it.'),
          figure('night', 'A night in the valley below the lookout.', { task: 'Find a night that ends in fog by dawn.', goal: 'fog' }),
          text('Cloud that forms on the ground is **fog**. In the figure the cooling slows through the night, because as the ground gets colder it glows less and loses heat more slowly. And watch the wind. A light breeze stirs only the bottom few dozen metres, which are all chilled, so it spreads the chill upward and the fog grows deeper. A real wind stirs a far deeper layer, reaching down the warmer air from above the inversion, and the mix never gets cold enough at all.'),
          text('Fog and **stratus** are the same cloud; the name only says whether it touches the ground. When a morning breeze or the first warmth of the sun clears the bottom of a fog, what is left hanging above is stratus: a flat, even layer with no shape at all, often low enough to hide the hilltops. Stratus also forms without any night. Warm, moist air drifting over cold ground or cold sea water is chilled from below as it goes, the way a breath fogs a cold window. Either way it is stable air, cooled gently and all together, and it makes a sheet.'),
          text('From below, stratus looks grey. It is made of the same white droplets as a cumulus, but you see only its underside, in the shade of the whole layer above, while its sunlit top faces away from you. The flat base of a cumulus is grey for the same reason; what makes a cumulus look white is its sunlit sides and top, which a sheet never shows you. Fly above stratus and it is dazzling white.'),
          text('A thick layer can drizzle. The droplets in it bump into each other, and now and then two merge; after enough merging, which in a thick layer takes an hour or so, a few become drops a few tenths of a millimetre across. Those fall at a metre or two a second, far faster than any breeze in a quiet layer can hold up, and they sink out of the cloud as drizzle.'),
          radio('Stratus is a nuisance more than a danger. Drizzle at most, and it usually burns off by late morning. The sun gets through the layer and warms the ground, the ground warms the air from below, and once the air’s temperature climbs back above its dew point the droplets turn back into vapour.'),
        ],
      },
      {
        title: 'Radio check',
        blocks: [
          radio('Time for your first radio check. The other lookouts have sent in photos. Heaps or a blanket: call each one in. They’ve picked clear examples of each for you.'),
          text('**Cumulus**: separate heaps with flat bases and bright tops, blue sky between. **Stratus**: one flat grey layer, no shape, no gaps, often hiding the hills.'),
          nameCheck(['cumulus', 'stratus'], ['cumulus', 'stratus'], 6),
        ],
      },
    ],
    learned: [
      'A cloud is droplets (or ice crystals), not vapour. Air turns to cloud when it cools to its dew point, and the more crowded its vapour, the higher its dew point.',
      'Rising air expands and cools about 10 °C per kilometre; its dew point falls about 2 °C, so the gap closes 8 °C per kilometre.',
      'The cloud base is about 125 m up for each degree between the temperature and dew point at the ground: low on humid days, high on dry ones.',
      'Air is unstable when it cools with height faster than a rising bubble does (10 °C per kilometre for clear air, about 5 inside cloud): a nudged bubble keeps rising. That builds heaps: cumulus, with flat bases and bright tops.',
      'In stable air a nudged bubble sinks back; it turns to cloud only when a whole layer is lifted or chilled together: stratus, or fog on the ground.',
    ],
    next: 'Next shift, the low sky: lumpy sheets that mean nothing, and grey ones that mean a soaking.',
  },

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
  'what-is-a-cloud': {
    title: 'What a cloud is',
    text: 'A cloud is droplets (or ice), not vapour. Air turns to cloud when it is cooled to its dew point, the temperature below which there is no longer room for all its water as vapour; the wetter the air, the higher its dew point. Rising air expands and cools about 10 °C per kilometre while its dew point falls about 2 °C, so the cloud base is about 125 m up for each degree between the temperature and dew point at the ground.',
  },
  stability: {
    title: 'Stable and unstable air',
    text: 'A nudged parcel cools 10 °C per kilometre. If the air around it cools faster with height, the parcel ends up warmer than its neighbours and keeps rising: unstable air, heaps. If the air around cools more slowly, or warms with height (an inversion), the parcel ends up colder and sinks back: stable air, which turns to cloud only when a whole layer is cooled together, in sheets.',
  },
  cumulus: {
    title: 'Cumulus',
    text: 'Separate heaps with flat bases and bright tops, built by thermals on sunny days. Small ones mean fair weather; ones still growing tall at midday can bring afternoon showers.',
  },
  stratus: {
    title: 'Stratus',
    text: 'A flat, even grey layer, low enough to hide the hills: fog off the ground. Formed by gentle cooling of stable air, overnight or over cold ground. Drizzle at most; it often burns off by midday.',
  },
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
