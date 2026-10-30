// Reading a bed: from what a gardener sees, through a few questions that each
// lean on a test from an earlier lesson, to the likely cause and what to do
// first. Pure TypeScript, no DOM.

export interface Ask {
  kind: 'ask';
  question: string;
  /** The test that answers it, and the lesson it comes from. */
  test?: { name: string; lesson: string };
  answers: { say: string; next: string }[];
}

export interface Finding {
  kind: 'finding';
  cause: string;
  why: string;
  /** What to do, cheapest and broadest first. */
  fix: string[];
  lesson: string;
}

export type Step = Ask | Finding;

export const START = ['yellow', 'soggy', 'dry', 'crust', 'stunted'] as const;
export type Symptom = (typeof START)[number];

export const SYMPTOMS: Record<Symptom, string> = {
  yellow: 'Leaves turning yellow',
  soggy: 'Water pools and the bed stays wet',
  dry: 'The bed dries out in a day or two',
  crust: 'A hard crust after rain',
  stunted: 'Everything grows slowly',
};

export const STEPS: Record<string, Step> = {
  // Yellow leaves.
  yellow: { kind: 'ask', question: 'Which leaves turned yellow first?', answers: [
    { say: 'The oldest lower leaves', next: 'yellow-old' },
    { say: 'The youngest top leaves', next: 'yellow-new' },
  ] },
  'yellow-old': { kind: 'ask', question: 'Is the soil waterlogged and slow to drain?', test: { name: 'The can test', lesson: 'water' }, answers: [
    { say: 'Yes, water stands for hours', next: 'drowned' },
    { say: 'No, it drains well', next: 'yellow-veins' },
  ] },
  'yellow-veins': { kind: 'ask', question: 'Look closely at the yellow leaves: are the veins still green?', answers: [
    { say: 'Yes, yellow tissue between green veins', next: 'magnesium' },
    { say: 'No, the entire leaf blade is pale yellow', next: 'nitrogen' },
  ] },
  'yellow-new': { kind: 'ask', question: 'What is the soil pH?', test: { name: 'A pH test', lesson: 'nutrients' }, answers: [
    { say: 'Above 7.5', next: 'iron-lock' },
    { say: '7.0 or below', next: 'sulfur' },
  ] },
  drowned: { kind: 'finding', cause: 'Waterlogged roots starved of oxygen', why: 'When soil pores stay filled with water, roots lack the oxygen required for respiration and cannot absorb nitrogen even from fertile soil.', fix: ['Stay off the bed whenever the soil is wet.', 'Spread compost or organic mulch on the surface and let earthworms pull it down.', 'Sow deep-rooted cover crops between vegetable harvests to open drainage channels.', 'If the site sits in a wet hollow that never drains, build a raised bed.'], lesson: 'water' },
  nitrogen: { kind: 'finding', cause: 'Low available nitrogen', why: 'Because nitrogen is mobile inside the plant, hungry shoots pull nitrogen out of older lower leaves, turning them uniformly pale yellow first.', fix: ['Top-dress with finished compost, aged manure, or an organic nitrogen fertilizer.', 'Keep woody chips or straw on the surface as mulch rather than digging them in, where microbes will tie up soil nitrogen.', 'Rotate nitrogen-fixing legumes (beans, peas, clover, or vetch) ahead of heavy-feeding crops.'], lesson: 'nutrients' },
  magnesium: { kind: 'finding', cause: 'Magnesium deficiency', why: 'Magnesium sits at the centre of every chlorophyll molecule and is mobile in the plant, so a shortage turns older leaves yellow between green veins.', fix: ['Check the soil pH: if the bed is acidic, apply dolomitic limestone, which supplies both calcium and magnesium as it raises pH.', 'Cut back on heavy potash (potassium) fertilizers, which compete with magnesium for uptake at the root surface.'], lesson: 'nutrients' },
  'iron-lock': { kind: 'finding', cause: 'Iron locked up by alkaline soil', why: 'Most soils contain plenty of total iron, but above pH 7.5 iron forms insoluble compounds that roots cannot absorb. Because iron is immobile in plants, young top leaves turn yellow between green veins first.', fix: ['Avoid adding limestone, mushroom compost, or wood ash, all of which raise pH further.', 'Top-dress with acidic or neutral compost, whose organic acids help keep iron soluble near roots.', 'Apply elemental sulfur to gradually lower the pH if your soil does not contain free chalk or limestone.'], lesson: 'nutrients' },
  sulfur: { kind: 'finding', cause: 'Sulfur deficiency (or early nitrogen shortage)', why: 'Because sulfur moves poorly inside the plant, a shortage turns the youngest leaves uniformly pale green or yellow first, most often in leached sandy soils with little organic matter.', fix: ['Top-dress the bed with finished compost or well-rotted manure.', 'Apply agricultural gypsum (calcium sulfate) if a lab test confirms low sulfur without needing a pH change.'], lesson: 'nutrients' },

  // Soggy.
  soggy: { kind: 'ask', question: 'What texture does the jar test show?', test: { name: 'The jar test', lesson: 'made-of' }, answers: [
    { say: 'Mostly clay', next: 'soggy-clay' },
    { say: 'Loam or sandy soil', next: 'soggy-loam' },
  ] },
  'soggy-clay': { kind: 'ask', question: 'Does a dry soil clod hold together in water?', test: { name: 'The slake test', lesson: 'structure' }, answers: [
    { say: 'It disintegrates right away', next: 'clay-no-crumb' },
    { say: 'It stays intact', next: 'clay-wet' },
  ] },
  'soggy-loam': { kind: 'ask', question: 'How easily does a screwdriver push into moist soil?', test: { name: 'The screwdriver test', lesson: 'structure' }, answers: [
    { say: 'It hits a hard layer a few inches down', next: 'compacted' },
    { say: 'It pushes in smoothly to the handle', next: 'low-ground' },
  ] },
  'clay-no-crumb': { kind: 'finding', cause: 'Clay soil with weak crumb structure', why: 'Unaggregated clay contains only microscopic pores that hold water tightly. Without humus and fungal glues to bind clay into crumbs with wide channels between them, rainwater cannot drain.', fix: ['Stop tilling or digging, and never step on the bed when the clay is wet.', 'Spread 5 cm of compost on the surface each year and let worms incorporate it.', 'Grow fibrous and taprooted cover crops through winter to open root channels.'], lesson: 'structure' },
  'clay-wet': { kind: 'finding', cause: 'Well-structured clay that warms and drains slowly', why: 'Even well-aggregated clay holds a large volume of water and warms up more slowly in spring than sandy ground, so working with its natural pace pays off.', fix: ['Wait until the soil is crumbly rather than sticky before planting in spring.', 'Mound the soil into raised beds or ridges to help early spring crops drain and warm faster.', 'Continue mulching with compost each year to maintain surface crumbs.'], lesson: 'water' },
  compacted: { kind: 'finding', cause: 'Subsurface compaction (hardpan)', why: 'Foot traffic, wheelbarrows, or tilling to the same depth every year can pack a dense layer a few inches down, blocking roots and perching water above it.', fix: ['Loosen the pan once with a garden fork or broadfork, rocking the tines back to crack the layer without flipping the soil.', 'Dedicate permanent walking paths so feet never press the growing bed again.', 'Plant taprooted cover crops like daikon (forage) radish in late summer to punch biological channels through the pan.'], lesson: 'structure' },
  'low-ground': { kind: 'finding', cause: 'Runoff collecting in a low spot', why: 'The soil itself has open pores, but the bed sits in a dip that catches surface runoff from surrounding paths, downspouts, or slopes.', fix: ['Intercept uphill water with a shallow diversion swale or French drain.', 'Build the growing area up into a raised bed above the standing water level.'], lesson: 'water' },

  // Dry.
  dry: { kind: 'ask', question: 'What texture does the jar test show?', test: { name: 'The jar test', lesson: 'made-of' }, answers: [
    { say: 'Mostly sand', next: 'sandy' },
    { say: 'Loam, silt, or clay', next: 'dry-bare' },
  ] },
  'dry-bare': { kind: 'ask', question: 'Is the soil surface left bare between plants?', answers: [
    { say: 'Yes, bare soil is exposed', next: 'bare' },
    { say: 'No, the surface is mulched', next: 'shallow' },
  ] },
  sandy: { kind: 'finding', cause: 'Fast-draining sandy texture', why: 'Coarse sand grains create wide pores that drain rapidly by gravity and very few medium pores to hold plant-available moisture.', fix: ['Keep the surface blanketed with organic mulch year-round.', 'Top-dress with compost every year to build humus, which holds several times its weight in water.', 'Water thoroughly and less frequently to encourage roots to grow deeper.'], lesson: 'water' },
  bare: { kind: 'finding', cause: 'Evaporation from exposed bare soil', why: 'Direct sun and wind bake exposed soil and wick moisture out of the top layer, while rain crusts the bare surface and runs off instead of soaking in.', fix: ['Tuck 5 to 8 cm of straw, shredded leaves, or compost mulch around plants.', 'Space vegetable rows closely so leaf canopies shade the bed, or intersow quick cover crops in open gaps.'], lesson: 'seasons' },
  shallow: { kind: 'finding', cause: 'Shallow rooting from light daily watering (or a hardpan)', why: 'Sprinkling a bed lightly every day wets only the top few centimetres of soil, training roots to stay near the surface where they bake as soon as a hot afternoon arrives.', fix: ['Soak the bed deeply once or twice a week so moisture penetrates 15 to 20 cm down.', "Probe with a screwdriver to make sure a compacted layer isn't physically blocking roots from growing deeper."], lesson: 'water' },

  // Crust.
  crust: { kind: 'ask', question: 'Does a dry soil clod hold together in water?', test: { name: 'The slake test', lesson: 'structure' }, answers: [
    { say: 'It disintegrates', next: 'crust-weak' },
    { say: 'It stays intact', next: 'crust-silt' },
  ] },
  'crust-weak': { kind: 'finding', cause: 'Weak soil crumbs collapsing under rain', why: 'Without enough organic glues, falling raindrops shatter surface crumbs and wash loose silt and clay into the pores, drying into a sealed crust.', fix: ['Keep the soil surface cushioned under mulch or living foliage.', 'Stop tilling or digging, which shatters aggregates and speeds up the loss of humus.', 'Spread compost on top to feed the fungi, bacteria, and worms that cement soil particles into water-stable crumbs.'], lesson: 'structure' },
  'crust-silt': { kind: 'finding', cause: 'Exposed silty soil sealing after rain', why: 'Smooth, medium-sized silt particles pack closely together when splashed by rain or overhead watering, forming a surface skin even when the soil underneath has decent structure.', fix: ['Cover seed drills with a thin layer of sifted compost rather than native silty soil, and mulch between rows.', 'Water germinating beds with a fine rose on a watering can or drip tape rather than a forceful hose spray.'], lesson: 'made-of' },

  // Stunted.
  stunted: { kind: 'ask', question: 'What is the soil pH?', test: { name: 'A pH test', lesson: 'nutrients' }, answers: [
    { say: 'Below 5.5', next: 'acid' },
    { say: 'Above 7.5', next: 'chalky' },
    { say: 'Between 5.5 and 7.5', next: 'stunted-worms' },
  ] },
  'stunted-worms': { kind: 'ask', question: 'How many earthworms do you find in a spadeful of moist, mild soil?', test: { name: 'The worm count', lesson: 'food-web' }, answers: [
    { say: 'Fewer than five', next: 'hungry' },
    { say: 'Five or more', next: 'stunted-hard' },
  ] },
  'stunted-hard': { kind: 'ask', question: 'How easily does a screwdriver push into moist soil?', test: { name: 'The screwdriver test', lesson: 'structure' }, answers: [
    { say: 'It hits a hard layer a few inches down', next: 'compacted' },
    { say: 'It pushes in smoothly to the handle', next: 'lab' },
  ] },
  acid: { kind: 'finding', cause: 'Strongly acidic soil (below pH 5.5)', why: 'Below pH 5.5, phosphorus, calcium, and magnesium become scarce, beneficial bacteria slow down, and aluminium dissolves out of clay to stunt root tips.', fix: ['Apply ground garden limestone according to a soil test recommendation to gradually raise the pH.', 'Grow acid-tolerant crops like potatoes, berries, or rhubarb while the limestone reacts over several months.'], lesson: 'nutrients' },
  chalky: { kind: 'finding', cause: 'Alkaline soil (above pH 7.5)', why: 'Above pH 7.5, phosphorus binds to calcium and micronutrients like iron, manganese, boron, and zinc lock into insoluble compounds.', fix: ['Never add limestone, wood ash, or lime-treated amendments.', 'Apply generous layers of compost each year; decomposing organic matter releases mild acids that help roots absorb trace minerals.', 'If the soil is not naturally chalky (test with vinegar first), apply elemental sulfur according to a lab test to lower pH gradually.'], lesson: 'nutrients' },
  hungry: { kind: 'finding', cause: 'Depleted organic matter and low biological activity', why: 'Finding very few earthworms in moist spring or autumn soil indicates a sparse underground food web, usually caused by bare ground, frequent tilling, or a lack of organic matter.', fix: ['Blanket the bed with compost and organic mulch to feed decomposers.', 'Keep living roots in the ground year-round using succession planting and winter cover crops.', 'Leave the soil undug so fungal networks and worm burrows remain intact.'], lesson: 'food-web' },
  lab: { kind: 'finding', cause: 'A specific nutrient deficiency (or pest/disease)', why: 'When drainage, crumb structure, pH, and worm counts all look healthy, poor growth points to a specific mineral shortage (such as phosphorus or potassium) or a root pest.', fix: ['Mail a composite soil sample to an agricultural extension or commercial soil lab.', 'Compare the lab report against the course reference page and add only the specific nutrients recommended.'], lesson: 'diagnosis' },
};

/** Every step a symptom can lead to, for a content test. */
export function reachable(from: string, seen = new Set<string>()): Set<string> {
  if (seen.has(from)) return seen;
  seen.add(from);
  const step = STEPS[from];
  if (step?.kind === 'ask') for (const a of step.answers) reachable(a.next, seen);
  return seen;
}
