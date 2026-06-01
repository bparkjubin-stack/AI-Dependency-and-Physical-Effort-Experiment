// ========== TASK MATERIALS ==========

const READING_PASSAGE = `In recent years, an increasing number of cities have prioritised the development and planning of public green spaces. Research indicates that urban green spaces not only improve air quality and regulate city temperatures but also have significant positive effects on residents' mental health. A large-scale study spanning 20 European cities found that residents living within 300 metres of green spaces reported notably lower stress levels and anxiety symptoms compared to those living further away. Furthermore, urban green spaces provide social venues for communities, fostering interaction among neighbours and strengthening community cohesion. However, the distribution of urban green spaces is often unequal — low-income neighbourhoods typically have significantly less green space per capita than affluent areas, sparking widespread discussions about environmental justice.`;

const TASKS = [
  {
    number: 1,
    title: 'Text Summarisation',
    instruction: 'Summarise the key points of the following passage in 2–3 sentences.',
    material: READING_PASSAGE,
    aiAnswer: `Urban green spaces offer multiple benefits, including improved air quality, temperature regulation, and significant positive effects on residents' mental health — research confirms that people living near green spaces experience lower stress and anxiety levels. Green spaces also strengthen community cohesion by providing shared social venues for neighbours. However, the distribution of green spaces remains unequal, with low-income neighbourhoods having significantly less green space per capita, raising important questions about environmental justice.`,
  },
  {
    number: 2,
    title: 'Creative Divergent Thinking',
    instruction: 'Come up with 5 creative uses for an ordinary paperclip (other than holding papers together).',
    material: null,
    aiAnswer: `1. Mini bookmark — Bend one end of the paperclip and clip it to a page edge; it's sturdier and less likely to fall out than a paper bookmark.\n2. Phone SIM card ejector — Straighten the paperclip and use the tip to press into the small hole on the side of your phone to eject the SIM tray.\n3. Emergency zip pull — If a zip pull breaks off, thread a paperclip through the small hole to use as a replacement pull tab.\n4. Cable organiser — Bend the paperclip into an S-shape and attach it to the edge of your desk to keep charging cables and earphones tidy.\n5. Tiny display stand — Bend two paperclips into a support structure to prop up small photos or business cards on your desk.`,
  },
  {
    number: 3,
    title: 'Logical Reasoning',
    instruction: 'Solve the following problem. Show your working.',
    material: 'A company has 300 employees. 40% of them cycle to work. Among those who cycle, 25% also take public transport. How many employees use both cycling and public transport to commute?',
    aiAnswer: `Solution:\nStep 1: Calculate the number of employees who cycle to work: 300 × 40% = 120\nStep 2: Among these 120 cyclists, 25% also take public transport: 120 × 25% = 30\n\nAnswer: 30 employees use both cycling and public transport to commute.`,
  },
];

const AI_SYSTEM_PROMPT = 'You are a helpful AI assistant. The user will give you a cognitive task. Complete it clearly and concisely. Respond in English.';

// ========== WFC ITEMS ==========

const WFC_ITEMS = {
  targets: [
    { id: 'T1', fragment: 'R E _ _', category: 'effort', words: ['rest'] },
    { id: 'T2', fragment: 'E A _ _', category: 'effort', words: ['easy', 'ease'] },
    { id: 'T3', fragment: 'L A _ _', category: 'effort', words: ['lazy', 'laze'] },
    { id: 'T4', fragment: '_ A P',   category: 'effort', words: ['nap'] },
    { id: 'T5', fragment: '_ _ L K', category: 'exercise', words: ['walk'] },
    { id: 'T6', fragment: '_ U N',   category: 'exercise', words: ['run'] },
    { id: 'T7', fragment: 'S _ _ R T', category: 'exercise', words: ['sport'] },
    { id: 'T8', fragment: '_ _ M P', category: 'exercise', words: ['jump'] },
  ],
  fillers: [
    { id: 'F1', fragment: 'B _ _ K', category: 'filler', words: [] },
    { id: 'F2', fragment: '_ _ N G', category: 'filler', words: [] },
    { id: 'F3', fragment: 'D _ _ K', category: 'filler', words: [] },
    { id: 'F4', fragment: '_ _ E A M', category: 'filler', words: [] },
  ],
};

function getShuffledWFC() {
  const all = [...WFC_ITEMS.targets, ...WFC_ITEMS.fillers];
  return shuffle(all);
}

function scoreWFCResponse(itemId, response) {
  if (!response) return false;
  const item = [...WFC_ITEMS.targets, ...WFC_ITEMS.fillers].find(i => i.id === itemId);
  if (!item || item.words.length === 0) return false;
  const clean = response.trim().toLowerCase();
  // Exact match or Levenshtein distance <= 1
  return item.words.some(w => clean === w || levenshtein(clean, w) <= 1);
}

// ========== SCALE ITEMS ==========

const FATIGUE_ITEMS = [
  { id: 'F1', text: 'I feel energetic right now.', scale: 'fatigue', reverse: true },
  { id: 'F2', text: 'My mind feels a bit tired right now.', scale: 'fatigue', reverse: false },
  { id: 'F3', text: 'I can concentrate well right now.', scale: 'fatigue', reverse: true },
  { id: 'F4', text: 'I feel like I need a break.', scale: 'fatigue', reverse: false },
];

const MINDSET_ITEMS = [
  { id: 'M1', text: "Right now, I'm inclined to do things in the easiest way possible.", scale: 'effort_mindset', reverse: false },
  { id: 'M2', text: "If there's a shortcut available right now, I'd take it without hesitation.", scale: 'effort_mindset', reverse: false },
  { id: 'M3', text: "Right now, I'd rather have someone or something else handle tasks for me.", scale: 'effort_mindset', reverse: false },
  { id: 'M4', text: 'At this moment, I find satisfaction in doing things myself.', scale: 'effort_mindset', reverse: true },
  { id: 'M5', text: "I don't feel like putting effort into anything right now.", scale: 'effort_mindset', reverse: false },
  { id: 'M6', text: "If I could achieve the same result with less effort, I'd definitely choose the easier way.", scale: 'effort_mindset', reverse: false },
];

function getShuffledScales() {
  return shuffle([...FATIGUE_ITEMS, ...MINDSET_ITEMS]);
}

// ========== SCENARIO ITEMS ==========

const TARGET_SCENARIOS = [
  { id: 'T1', text: "You need to pick up a few everyday items. There's a convenience store about a 5-minute walk from your home.", optA: 'Walk to the shop and buy them', optB: 'Order them on your phone and have them delivered', lazyIs: 'B' },
  { id: 'T2', text: "You're on the ground floor of an office building and need to get to a meeting on the 3rd floor.", optA: 'Take the lift', optB: 'Take the stairs', lazyIs: 'A' },
  { id: 'T3', text: 'You fancy something to eat for lunch. There are ingredients in the kitchen to make a simple meal.', optA: 'Spend 15 minutes making something yourself', optB: 'Order food delivery on your phone', lazyIs: 'B' },
  { id: 'T4', text: "You're meeting a friend at a restaurant about 1 km away. The weather is nice.", optA: 'Get a taxi or rideshare', optB: 'Walk there', lazyIs: 'A' },
  { id: 'T5', text: "You want to ask a colleague a quick question. Their desk is about a 1-minute walk away on the same floor.", optA: 'Walk over and ask in person', optB: 'Send them a message', lazyIs: 'B' },
  { id: 'T6', text: "It's Saturday afternoon, you have no plans, and the weather is lovely.", optA: 'Stay home and watch videos or scroll your phone', optB: 'Go for a walk in a nearby park', lazyIs: 'A' },
  { id: 'T7', text: "You're out collecting a parcel and notice a nice coffee shop across the street, about a 3-minute walk away.", optA: 'Walk over and grab a coffee', optB: 'Go home and order one for delivery', lazyIs: 'B' },
  { id: 'T8', text: "You drive to a shopping centre. There are no spots near the entrance, but there are spaces further away — about a 3-minute walk.", optA: 'Wait near the entrance for a closer spot to open up', optB: 'Park further away and walk', lazyIs: 'A' },
  { id: 'T9', text: 'You receive a notification that your parcel is ready for collection at a pickup point, about a 5-minute walk away.', optA: 'Head out now and walk to collect it', optB: 'Request home redelivery through the app', lazyIs: 'B' },
  { id: 'T10', text: "You need to pop into the bank this weekend. It's a 15-minute walk or a 5-minute drive.", optA: 'Drive there', optB: 'Walk there', lazyIs: 'A' },
];

const FILLER_SCENARIOS = [
  { id: 'F1', text: 'You feel like watching a film tonight.', optA: 'Watch something new that just came out', optB: 'Rewatch an old favourite', lazyIs: null },
  { id: 'F2', text: "You're going out for dinner with a friend.", optA: 'Try a new restaurant', optB: 'Go to your usual spot', lazyIs: null },
  { id: 'F3', text: 'You want to learn a new skill.', optA: 'Watch video tutorials', optB: 'Read written guides or documentation', lazyIs: null },
  { id: 'F4', text: "You're changing your phone wallpaper.", optA: 'A landscape photo', optB: 'A solid colour or minimalist design', lazyIs: null },
  { id: 'F5', text: "You're buying a new book to read.", optA: 'A physical copy', optB: 'An e-book', lazyIs: null },
];

function getShuffledScenarios() {
  const allItems = [
    ...TARGET_SCENARIOS.map(s => ({ ...s, isTarget: true })),
    ...FILLER_SCENARIOS.map(s => ({ ...s, isTarget: false })),
  ];
  return shuffle(allItems);
}

// ========== MANIPULATION CHECK ==========

const MANIP_CHECK_ITEMS = [
  { id: 'MC1', text: 'I felt that the AI was completing the task on my behalf.' },
  { id: 'MC2', text: 'I felt like I was "outsourcing" the work to the AI.' },
  { id: 'MC3', text: 'During the task, I felt more like a judge or evaluator.' },
  { id: 'MC4', text: 'After the task, I felt the outcome was mainly due to my own judgement.' },
  { id: 'MC5', text: 'I put a fair amount of mental effort into the task.' },
  { id: 'MC6', text: 'I found the task process fairly easy.' },
];

// ========== HELPERS ==========

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

module.exports = {
  TASKS, AI_SYSTEM_PROMPT, READING_PASSAGE,
  WFC_ITEMS, getShuffledWFC, scoreWFCResponse,
  FATIGUE_ITEMS, MINDSET_ITEMS, getShuffledScales,
  TARGET_SCENARIOS, FILLER_SCENARIOS, getShuffledScenarios,
  MANIP_CHECK_ITEMS, shuffle,
};
