const db = require('./db');
const scenarios = require('./scenarios');

/**
 * Adaptive randomization for 2-group between-subjects design.
 * Groups: 'experience' (sees hallucination in practice) vs 'control' (no hallucination in practice)
 */
function assignCondition() {
  const counts = db.getAssignmentCounts();
  const totalExp = counts.experience || 0;
  const totalCtrl = counts.control || 0;
  const total = totalExp + totalCtrl;

  let condition;
  if (total === 0) {
    condition = Math.random() < 0.5 ? 'experience' : 'control';
  } else {
    const expRatio = totalExp / total;
    if (expRatio < 0.45) {
      condition = 'experience';
    } else if (expRatio > 0.55) {
      condition = 'control';
    } else {
      condition = Math.random() < 0.5 ? 'experience' : 'control';
    }
  }

  // Assign trial sequence (counterbalance which trials have hallucinations)
  // For MVP, use seq_A for all (trials 3 and 5 are hallucination trials)
  const sequenceId = 'seq_A';

  db.incrementAssignment(condition);
  return { condition, sequenceId };
}

module.exports = { assignCondition };
