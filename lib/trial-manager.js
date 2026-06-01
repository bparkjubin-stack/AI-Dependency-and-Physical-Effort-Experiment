/**
 * Trial Manager — controls the flow of trials for each participant.
 * Manages which trial they're on, what data to show, and phase transitions.
 */

const scenarios = require('./scenarios');
const db = require('./db');

/**
 * Get the current trial config for a participant.
 */
function getCurrentTrial(pid) {
  const participant = db.getParticipant(pid);
  if (!participant) return null;

  const trialConfigs = scenarios.getTrialConfig(participant.sequence_id);
  const trialIndex = participant.current_trial;

  if (trialIndex >= trialConfigs.length) return null;

  return trialConfigs[trialIndex];
}

/**
 * Get the practice trial config based on participant condition.
 */
function getPracticeTrial(pid) {
  const participant = db.getParticipant(pid);
  if (!participant) return null;
  return scenarios.getPracticeScenario(participant.condition);
}

/**
 * Advance participant to the next trial.
 * Returns the next trial config, or null if all trials are done.
 */
function advanceToNextTrial(pid) {
  const participant = db.getParticipant(pid);
  if (!participant) return null;

  const nextTrial = participant.current_trial + 1;
  const totalTrials = participant.total_trials;

  if (nextTrial >= totalTrials) {
    db.updateParticipant(pid, {
      current_trial: nextTrial,
      trials_completed: true,
      current_phase: 'questionnaire'
    });
    return null;
  }

  db.updateParticipant(pid, { current_trial: nextTrial });
  return getCurrentTrial(pid);
}

/**
 * Get the practice feedback message based on condition.
 */
function getPracticeFeedback(pid) {
  const participant = db.getParticipant(pid);
  if (!participant) return null;

  if (participant.condition === 'experience') {
    return {
      type: 'warning',
      title: 'Did you notice?',
      message: 'The AI assistant made an error in its analysis — the numbers it cited did not match the actual data table. In the upcoming tasks, the AI may also produce similar inaccuracies. We recommend cross-checking the AI\'s claims against the data before making your decision.',
      buttonText: 'I understand, continue to tasks'
    };
  } else {
    return {
      type: 'neutral',
      title: 'Practice complete',
      message: 'Great, you\'re now familiar with the interface. In the upcoming tasks, you\'ll work with the AI assistant to make decisions based on data. Take your time and use the AI however you find helpful.',
      buttonText: 'Continue to tasks'
    };
  }
}

/**
 * Get a summary of participant progress.
 */
function getProgress(pid) {
  const participant = db.getParticipant(pid);
  if (!participant) return null;

  return {
    current_trial: participant.current_trial + 1,
    total_trials: participant.total_trials,
    phase: participant.current_phase,
    practice_done: participant.practice_completed,
    trials_done: participant.trials_completed,
    questionnaire_done: participant.questionnaire_completed
  };
}

module.exports = {
  getCurrentTrial,
  getPracticeTrial,
  advanceToNextTrial,
  getPracticeFeedback,
  getProgress
};
