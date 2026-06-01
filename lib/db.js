const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'experiment-db.json');

const DEFAULT_DB = {
  participants: {},
  trials: {},
  chat_messages: [],
  behavioral_events: [],
  eye_tracking: [],
  responses: [],
  questionnaires: [],
  assignment_counts: { experience: 0, control: 0 }
};

function loadDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      saveDb(DEFAULT_DB);
      return JSON.parse(JSON.stringify(DEFAULT_DB));
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (err) {
    console.error('Error loading DB:', err);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function saveDb(db) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

// ========== PARTICIPANTS ==========

function createParticipant(pid, condition, sequenceId) {
  const db = loadDb();
  db.participants[pid] = {
    pid,
    condition,         // 'experience' or 'control'
    sequence_id: sequenceId,
    created_at: new Date().toISOString(),
    current_phase: 'consent',  // consent → calibration → practice → trials → questionnaire → debrief
    current_trial: 0,
    practice_completed: false,
    trials_completed: false,
    questionnaire_completed: false,
    total_trials: 6
  };
  saveDb(db);
  return db.participants[pid];
}

function getParticipant(pid) {
  const db = loadDb();
  return db.participants[pid] || null;
}

function updateParticipant(pid, updates) {
  const db = loadDb();
  if (db.participants[pid]) {
    Object.assign(db.participants[pid], updates);
    saveDb(db);
  }
  return db.participants[pid] || null;
}

// ========== CHAT MESSAGES ==========

function saveChatMessage(data) {
  const db = loadDb();
  db.chat_messages.push({
    pid: data.pid,
    trial_id: data.trial_id,
    role: data.role,           // 'user' or 'assistant'
    content: data.content,
    is_hallucination_trial: data.is_hallucination_trial || false,
    created_at: new Date().toISOString()
  });
  saveDb(db);
}

function getChatMessages(pid, trialId) {
  const db = loadDb();
  return db.chat_messages.filter(m => m.pid === pid && m.trial_id === trialId);
}

// ========== BEHAVIORAL EVENTS ==========

function saveBehavioralEvent(data) {
  const db = loadDb();
  db.behavioral_events.push({
    pid: data.pid,
    trial_id: data.trial_id,
    event_type: data.event_type,  // 'panel_switch', 'scroll', 'focus_change', 'copy_paste', etc.
    details: data.details || {},
    timestamp: data.timestamp || new Date().toISOString()
  });
  saveDb(db);
}

// ========== EYE TRACKING ==========

function saveEyeTrackingBatch(data) {
  const db = loadDb();
  // data.points is an array of {x, y, region, t}
  const batch = (data.points || []).map(p => ({
    pid: data.pid,
    trial_id: data.trial_id,
    x: p.x,
    y: p.y,
    region: p.region,  // 'data_panel', 'chat_panel', 'answer_area'
    timestamp: p.t
  }));
  db.eye_tracking.push(...batch);
  saveDb(db);
}

// ========== RESPONSES ==========

function saveResponse(data) {
  const db = loadDb();
  db.responses.push({
    pid: data.pid,
    trial_id: data.trial_id,
    trial_number: data.trial_number,
    is_hallucination_trial: data.is_hallucination_trial || false,
    initial_answer: data.initial_answer,
    ai_suggestion: data.ai_suggestion || null,
    final_answer: data.final_answer,
    confidence: data.confidence,       // 0-100
    is_correct: data.is_correct,
    initial_correct: data.initial_correct,
    answer_changed: data.initial_answer !== data.final_answer,
    response_time_ms: data.response_time_ms,
    consultation_duration_ms: data.consultation_duration_ms || 0,
    chat_message_count: data.chat_message_count || 0,
    created_at: new Date().toISOString()
  });
  saveDb(db);
}

// ========== QUESTIONNAIRE ==========

function saveQuestionnaire(data) {
  const db = loadDb();
  db.questionnaires.push({
    pid: data.pid,
    scale_name: data.scale_name,
    responses: data.responses,
    created_at: new Date().toISOString()
  });
  saveDb(db);
}

// ========== ASSIGNMENT COUNTS ==========

function getAssignmentCounts() {
  const db = loadDb();
  return db.assignment_counts || { experience: 0, control: 0 };
}

function incrementAssignment(condition) {
  const db = loadDb();
  if (!db.assignment_counts) db.assignment_counts = { experience: 0, control: 0 };
  db.assignment_counts[condition] = (db.assignment_counts[condition] || 0) + 1;
  saveDb(db);
}

// ========== EXPORT ==========

function getAll(tableName) {
  const db = loadDb();
  if (tableName === 'participants') return Object.values(db.participants);
  return db[tableName] || [];
}

function getFullParticipantData(pid) {
  const db = loadDb();
  const participant = db.participants[pid];
  if (!participant) return null;
  return {
    participant,
    chat_messages: db.chat_messages.filter(m => m.pid === pid),
    behavioral_events: db.behavioral_events.filter(e => e.pid === pid),
    eye_tracking_count: db.eye_tracking.filter(e => e.pid === pid).length,
    responses: db.responses.filter(r => r.pid === pid),
    questionnaires: db.questionnaires.filter(q => q.pid === pid)
  };
}

module.exports = {
  createParticipant,
  getParticipant,
  updateParticipant,
  saveChatMessage,
  getChatMessages,
  saveBehavioralEvent,
  saveEyeTrackingBatch,
  saveResponse,
  saveQuestionnaire,
  getAssignmentCounts,
  incrementAssignment,
  getAll,
  getFullParticipantData
};
