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
  yellow: { kind: 'ask', question: 'Which leaves yellowed first?', answers: [
    { say: 'The oldest, low down', next: 'yellow-old' },
    { say: 'The youngest, at the tips', next: 'yellow-new' },
  ] },
  'yellow-old': { kind: 'ask', question: 'Is the bed wet and slow to drain?', test: { name: 'The can test', lesson: 'water' }, answers: [
    { say: 'Yes, water stands for hours', next: 'drowned' },
    { say: 'No, it drains', next: 'yellow-veins' },
  ] },
  'yellow-veins': { kind: 'ask', question: 'Look closely: are the veins still green?', answers: [
    { say: 'Yes, yellow between green veins', next: 'magnesium' },
    { say: 'No, the whole leaf is pale', next: 'nitrogen' },
  ] },
  'yellow-new': { kind: 'ask', question: 'What is the pH?', test: { name: 'A pH test', lesson: 'nutrients' }, answers: [
    { say: 'Above 7.5', next: 'iron-lock' },
    { say: '7 or below', next: 'sulfur' },
  ] },
  drowned: { kind: 'finding', cause: 'Roots short of air', why: 'In a waterlogged bed the pores are full of water and roots cannot breathe, so they stop taking up nitrogen even when it is there.', fix: ['Stay off the bed while it is wet.', 'Lay compost or mulch on top and let worms work it in.', 'Grow deep-rooted cover crops between crops.', 'For a bed that never drains, build it up as a raised bed.'], lesson: 'water' },
  nitrogen: { kind: 'finding', cause: 'Short of nitrogen', why: 'Nitrogen moves within the plant, so it robs the old leaves to feed the new ones, and they yellow first.', fix: ['Feed with compost, manure or a nitrogen fertilizer.', 'Do not dig fresh woody material in: microbes eating it take the nitrogen first.', 'Grow beans, peas or clover before a hungry crop.'], lesson: 'nutrients' },
  magnesium: { kind: 'finding', cause: 'Short of magnesium', why: 'Magnesium is at the heart of the green pigment, and it moves from old leaves to new, so old leaves yellow between the veins.', fix: ['Test the pH: in acid soil, dolomitic lime adds magnesium as it raises the pH.', 'Ease off potassium-rich feeds, which crowd magnesium off the parking spots.'], lesson: 'nutrients' },
  'iron-lock': { kind: 'finding', cause: 'Iron locked away by a high pH', why: 'There is usually plenty of iron in soil, but above pH 7.5 it turns into forms roots cannot take up. Iron cannot move to new leaves, so they yellow first.', fix: ['Do not add lime or wood ash.', 'Work in compost, which buffers the pH and holds iron in reach.', 'Lower the pH slowly with elemental sulfur, if a test says so.'], lesson: 'nutrients' },
  sulfur: { kind: 'finding', cause: 'Short of sulfur, or of nitrogen in a young plant', why: 'Sulfur cannot move to new growth, so a shortage shows in young leaves first, pale all over. It is commonest in sandy soils low in organic matter.', fix: ['Add compost or well-rotted manure.', 'If a soil test confirms it, a sulfate fertilizer such as gypsum.'], lesson: 'nutrients' },

  // Soggy.
  soggy: { kind: 'ask', question: 'What does the jar test say?', test: { name: 'The jar test', lesson: 'made-of' }, answers: [
    { say: 'Mostly clay', next: 'soggy-clay' },
    { say: 'A loam or sandier', next: 'soggy-loam' },
  ] },
  'soggy-clay': { kind: 'ask', question: 'Does a dry crumb hold together in water?', test: { name: 'The slake test', lesson: 'structure' }, answers: [
    { say: 'It falls apart at once', next: 'clay-no-crumb' },
    { say: 'It holds', next: 'clay-wet' },
  ] },
  'soggy-loam': { kind: 'ask', question: 'Can you push a screwdriver into the moist soil?', test: { name: 'The screwdriver test', lesson: 'structure' }, answers: [
    { say: 'It stops a few inches down', next: 'compacted' },
    { say: 'It goes in easily', next: 'low-ground' },
  ] },
  'clay-no-crumb': { kind: 'finding', cause: 'Clay with no crumb', why: 'Clay alone has only tiny pores. Without crumbs to open big ones between them, water has nowhere to go.', fix: ['Stop digging it and stay off it when wet.', 'Lay 5 cm of compost on top each year.', 'Keep living roots in it all year, with cover crops.'], lesson: 'structure' },
  'clay-wet': { kind: 'finding', cause: 'A clay soil that is simply slow', why: 'Even with good crumbs, clay holds a lot of water and drains slowly. It is not broken; it needs patience.', fix: ['Plant a little later in spring, when it has dried.', 'Grow in raised beds or on ridges for early crops.', 'Keep adding organic matter on top.'], lesson: 'water' },
  compacted: { kind: 'finding', cause: 'A compacted layer', why: 'Footsteps, machines or digging to the same depth every year can press a hard layer with no big pores, and water sits on top of it.', fix: ['Break it once with a fork, rocking the tines without turning the soil.', 'Then keep off the bed: use paths.', 'Grow deep-rooted cover crops, such as daikon radish, to keep it open.'], lesson: 'structure' },
  'low-ground': { kind: 'finding', cause: 'Water running in from around', why: 'The soil drains, but the bed sits low and collects water from paths, roofs or a slope.', fix: ['Divert the water with a shallow ditch or a swale.', 'Raise the bed.'], lesson: 'water' },

  // Dry.
  dry: { kind: 'ask', question: 'What does the jar test say?', test: { name: 'The jar test', lesson: 'made-of' }, answers: [
    { say: 'Mostly sand', next: 'sandy' },
    { say: 'A loam or heavier', next: 'dry-bare' },
  ] },
  'dry-bare': { kind: 'ask', question: 'Is the soil bare between plants?', answers: [
    { say: 'Yes', next: 'bare' },
    { say: 'No, it is mulched', next: 'shallow' },
  ] },
  sandy: { kind: 'finding', cause: 'A sandy soil', why: 'Sand has big pores that drain fast and few small ones to hold water, so it holds little a plant can use.', fix: ['Mulch every bed, all year.', 'Add compost each year: organic matter holds water like a sponge.', 'Water deeply and less often, so roots grow down.'], lesson: 'water' },
  bare: { kind: 'finding', cause: 'Bare soil drying in sun and wind', why: 'A bare surface heats up and loses water to the air quickly, and the rain that falls on it runs off.', fix: ['Mulch with straw, leaves or compost.', 'Plant closer, or fill gaps with a living cover.'], lesson: 'seasons' },
  shallow: { kind: 'finding', cause: 'Roots that stay shallow', why: 'Plants watered a little every day keep their roots in the top few centimetres, the first part to dry.', fix: ['Water deeply once or twice a week instead of daily.', 'Check for a hard layer that stops roots going down.'], lesson: 'water' },

  // Crust.
  crust: { kind: 'ask', question: 'Does a dry crumb hold together in water?', test: { name: 'The slake test', lesson: 'structure' }, answers: [
    { say: 'It melts', next: 'crust-weak' },
    { say: 'It holds', next: 'crust-silt' },
  ] },
  'crust-weak': { kind: 'finding', cause: 'Crumbs too weak to stand rain', why: 'Raindrops smash weak crumbs, the loose grains wash into the pores, and the surface dries to a skin.', fix: ['Keep the surface covered with mulch.', 'Dig less: every digging breaks crumbs and burns organic matter.', 'Add compost to feed the life that glues crumbs.'], lesson: 'structure' },
  'crust-silt': { kind: 'finding', cause: 'A silty soil left bare', why: 'Silt grains are just the size to pack into a crust, even in a soil with decent crumbs.', fix: ['Mulch after sowing, or sow under a thin layer of compost.', 'Water seedlings gently, not with a hard spray.'], lesson: 'made-of' },

  // Stunted.
  stunted: { kind: 'ask', question: 'What is the pH?', test: { name: 'A pH test', lesson: 'nutrients' }, answers: [
    { say: 'Below 5.5', next: 'acid' },
    { say: 'Above 7.5', next: 'chalky' },
    { say: 'Between', next: 'stunted-worms' },
  ] },
  'stunted-worms': { kind: 'ask', question: 'How many worms in a spadeful?', test: { name: 'The worm count', lesson: 'food-web' }, answers: [
    { say: 'Fewer than five', next: 'hungry' },
    { say: 'Plenty', next: 'stunted-hard' },
  ] },
  'stunted-hard': { kind: 'ask', question: 'Can you push a screwdriver into the moist soil?', test: { name: 'The screwdriver test', lesson: 'structure' }, answers: [
    { say: 'It stops a few inches down', next: 'compacted' },
    { say: 'It goes in easily', next: 'lab' },
  ] },
  acid: { kind: 'finding', cause: 'Soil too acid', why: 'Below about 5.5 many nutrients are locked away, and aluminium dissolves and harms roots.', fix: ['Add garden lime, by the amount a soil test suggests, a little each year.', 'Choose acid-loving plants, such as blueberries and potatoes, until it comes up.'], lesson: 'nutrients' },
  chalky: { kind: 'finding', cause: 'Soil too alkaline', why: 'Above about 7.5, phosphorus, iron, manganese and zinc are hard for roots to reach.', fix: ['Do not lime.', 'Add compost generously; it softens the effect.', 'Lower the pH with sulfur only if a test says so; it is slow and has to be repeated.'], lesson: 'nutrients' },
  hungry: { kind: 'finding', cause: 'A soil short of life and food', why: 'Few worms means little to eat: not much organic matter, bare soil, or a lot of digging.', fix: ['Add compost and mulch.', 'Keep roots in the bed for as many months as you can.', 'Dig less.'], lesson: 'food-web' },
  lab: { kind: 'finding', cause: 'Time for a lab soil test', why: 'The pH, the life and the structure all look fine. A lab test will show whether a nutrient is short.', fix: ['Send a sample to a soil lab or extension service.', 'Read its report against the reference page.'], lesson: 'diagnosis' },
};

/** Every step a symptom can lead to, for a content test. */
export function reachable(from: string, seen = new Set<string>()): Set<string> {
  if (seen.has(from)) return seen;
  seen.add(from);
  const step = STEPS[from];
  if (step?.kind === 'ask') for (const a of step.answers) reachable(a.next, seen);
  return seen;
}
