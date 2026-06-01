/**
 * Task scenarios for the hallucination vigilance experiment.
 * Each scenario has real_data (shown to participant) and corrupted_data (fed to AI on hallucination trials).
 */

const PRACTICE_SCENARIO = {
  id: 'practice',
  title: 'Bookstore display decision',
  scenario: 'You manage a small bookstore. Here are last month\'s sales numbers for your top 5 genres. You need to decide which genre to feature in next month\'s front-of-store display.',
  question: 'Which genre should you feature in the front display next month?',
  options: ['Fiction', 'Non-fiction', 'Children\'s', 'Sci-fi', 'Romance'],
  correct_answer: 'Fiction',
  real_data: {
    columns: ['Genre', 'Units sold', 'Revenue'],
    rows: [
      ['Fiction', 420, '$6,300'],
      ['Non-fiction', 310, '$5,270'],
      ['Children\'s', 280, '$3,360'],
      ['Sci-fi', 195, '$2,925'],
      ['Romance', 150, '$1,950']
    ]
  },
  corrupted_data: {
    columns: ['Genre', 'Units sold', 'Revenue'],
    rows: [
      ['Fiction', 120, '$1,800'],
      ['Non-fiction', 310, '$5,270'],
      ['Children\'s', 280, '$3,360'],
      ['Sci-fi', 195, '$2,925'],
      ['Romance', 150, '$1,950']
    ]
  },
  hallucination_detail: 'Fiction units changed from 420 to 120; AI will recommend against Fiction'
};

const TRIAL_SCENARIOS = [
  {
    id: 'trial_1',
    title: 'Food truck location',
    scenario: 'You run a food truck and can only go to one location tomorrow. Here are this week\'s average daily sales at each of your regular spots.',
    question: 'Which location should you go to tomorrow?',
    options: ['Downtown', 'University', 'Park', 'Shopping Mall'],
    correct_answer: 'Downtown',
    real_data: {
      columns: ['Location', 'Avg daily sales', 'Avg customers'],
      rows: [
        ['Downtown', '$850', 95],
        ['University', '$620', 78],
        ['Park', '$480', 52],
        ['Shopping Mall', '$390', 41]
      ]
    },
    corrupted_data: null // normal trial — no corruption
  },
  {
    id: 'trial_2',
    title: 'Software tool selection',
    scenario: 'Your team has budget for one new project management tool. Here are the three finalists from your evaluation.',
    question: 'Which tool should the team adopt?',
    options: ['TaskFlow Pro', 'WorkHub', 'PlanIt'],
    correct_answer: 'WorkHub',
    real_data: {
      columns: ['Tool', 'Monthly cost', 'User rating', 'Features'],
      rows: [
        ['TaskFlow Pro', '$30/user', '4.5/5', '15 core features'],
        ['WorkHub', '$45/user', '4.8/5', '22 core features'],
        ['PlanIt', '$25/user', '4.2/5', '12 core features']
      ]
    },
    corrupted_data: null
  },
  {
    id: 'trial_3',
    title: 'Airbnb pricing',
    scenario: 'You manage an Airbnb apartment. Here are your occupancy rates and average nightly prices for each day of the week. You\'re deciding whether to adjust your weekend pricing.',
    question: 'Should you raise, keep, or lower your Saturday price?',
    options: ['Raise to $169', 'Keep at $149', 'Lower to $119'],
    correct_answer: 'Keep at $149',
    real_data: {
      columns: ['Day', 'Occupancy rate', 'Avg nightly price'],
      rows: [
        ['Mon–Thu', '45%', '$89'],
        ['Friday', '78%', '$129'],
        ['Saturday', '92%', '$149'],
        ['Sunday', '55%', '$99']
      ]
    },
    corrupted_data: {
      columns: ['Day', 'Occupancy rate', 'Avg nightly price'],
      rows: [
        ['Mon–Thu', '45%', '$89'],
        ['Friday', '78%', '$129'],
        ['Saturday', '52%', '$149'],
        ['Sunday', '55%', '$99']
      ]
    },
    hallucination_detail: 'Saturday occupancy changed from 92% to 52%; AI will suggest lowering price'
  },
  {
    id: 'trial_4',
    title: 'Lunch vendor choice',
    scenario: 'You\'re organizing the quarterly company lunch for 40 people. Here are the ratings from last quarter\'s employee survey on your three regular catering vendors.',
    question: 'Which vendor should you book?',
    options: ['Golden Kitchen', 'Fresh & Fast', 'Budget Bites'],
    correct_answer: 'Golden Kitchen',
    real_data: {
      columns: ['Vendor', 'Taste (5pt)', 'Value (5pt)', 'Speed (5pt)', 'Price/person'],
      rows: [
        ['Golden Kitchen', 4.7, 3.8, 4.1, '$18'],
        ['Fresh & Fast', 4.0, 4.2, 4.6, '$14'],
        ['Budget Bites', 3.5, 4.8, 3.9, '$10']
      ]
    },
    corrupted_data: null
  },
  {
    id: 'trial_5',
    title: 'Gym membership trend',
    scenario: 'You manage a small gym. Here are this quarter\'s membership numbers. You\'re deciding whether to launch a promotion campaign to attract new members.',
    question: 'Based on the trend, should you run a promotion?',
    options: ['Yes, urgently needed', 'Yes, as a precaution', 'No, things look fine'],
    correct_answer: 'Yes, urgently needed',
    real_data: {
      columns: ['Month', 'New sign-ups', 'Cancellations', 'Net change'],
      rows: [
        ['January', 45, 12, '+33'],
        ['February', 52, 18, '+34'],
        ['March', 38, 31, '+7']
      ]
    },
    corrupted_data: {
      columns: ['Month', 'New sign-ups', 'Cancellations', 'Net change'],
      rows: [
        ['January', 45, 12, '+33'],
        ['February', 52, 18, '+34'],
        ['March', 38, 8, '+30']
      ]
    },
    hallucination_detail: 'March cancellations changed from 31 to 8; AI will say trend is healthy'
  },
  {
    id: 'trial_6',
    title: 'Product quality review',
    scenario: 'Your online store sells 4 products. Here are last month\'s return rates and customer complaint counts. You need to flag one product for immediate quality review.',
    question: 'Which product should be flagged for quality review?',
    options: ['Wireless Earbuds', 'Phone Case', 'USB-C Cable', 'Screen Protector'],
    correct_answer: 'Phone Case',
    real_data: {
      columns: ['Product', 'Units sold', 'Return rate', 'Complaints'],
      rows: [
        ['Wireless Earbuds', 340, '3.2%', 4],
        ['Phone Case', 520, '11.8%', 23],
        ['USB-C Cable', 410, '4.5%', 7],
        ['Screen Protector', 290, '6.1%', 9]
      ]
    },
    corrupted_data: null
  }
];

// Trial sequence configs: which trials are hallucination trials
// Multiple sequences for counterbalancing
const TRIAL_SEQUENCES = [
  { id: 'seq_A', hallucination_trials: [2, 4] }, // trial_3 and trial_5 (0-indexed: 2,4)
  { id: 'seq_B', hallucination_trials: [1, 3] }, // trial_2 and trial_4
  { id: 'seq_C', hallucination_trials: [0, 5] }, // trial_1 and trial_6
];

// Note: For sequences B and C, we'd need corrupted_data for those trials too.
// For the MVP, only seq_A is fully implemented (trials 3 and 5 have corrupted data).

function getTrialConfig(sequenceId) {
  const seq = TRIAL_SEQUENCES.find(s => s.id === sequenceId) || TRIAL_SEQUENCES[0];
  return TRIAL_SCENARIOS.map((scenario, index) => ({
    ...scenario,
    is_hallucination: seq.hallucination_trials.includes(index),
    trial_number: index + 1
  }));
}

function getPracticeScenario(condition) {
  return {
    ...PRACTICE_SCENARIO,
    is_hallucination: condition === 'experience' // experience group gets hallucination in practice
  };
}

module.exports = {
  PRACTICE_SCENARIO,
  TRIAL_SCENARIOS,
  TRIAL_SEQUENCES,
  getTrialConfig,
  getPracticeScenario
};
