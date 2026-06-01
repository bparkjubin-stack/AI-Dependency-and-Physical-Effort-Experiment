require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const db = require('./lib/db');
const aiAdvisor = require('./lib/ai-advisor');
const assignment = require('./lib/assignment');
const scenarios = require('./lib/scenarios');
const trialManager = require('./lib/trial-manager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const CHAT_TIME_PER_TRIAL = parseInt(process.env.CHAT_TIME_PER_TRIAL) || 60;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== PARTICIPANT ROUTES ==========

// Welcome + consent
app.get('/', (req, res) => {
  res.render('welcome', {
    prefillPid: req.query.PROLIFIC_PID || '',
    error: null
  });
});

// Register participant
app.post('/register', (req, res) => {
  const pid = (req.body.pid || '').trim();
  if (!pid) {
    return res.render('welcome', { prefillPid: '', error: 'Please enter your participant ID.' });
  }
  if (!req.body.consent) {
    return res.render('welcome', { prefillPid: pid, error: 'You must agree to participate.' });
  }

  // Check if returning
  let participant = db.getParticipant(pid);
  if (participant) {
    return res.redirect(getResumeUrl(participant));
  }

  // New participant
  const { condition, sequenceId } = assignment.assignCondition();
  participant = db.createParticipant(pid, condition, sequenceId);
  console.log(`[Assign] ${pid} → ${condition} (${sequenceId}) | Counts: ${JSON.stringify(db.getAssignmentCounts())}`);

  res.redirect(`/calibration?pid=${pid}`);
});

// Eye tracking calibration
app.get('/calibration', (req, res) => {
  const pid = req.query.pid;
  if (!pid) return res.redirect('/');
  const participant = db.getParticipant(pid);
  if (!participant) return res.redirect('/');
  db.updateParticipant(pid, { current_phase: 'calibration' });
  res.render('calibration', { pid });
});

// Practice trial
app.get('/practice', (req, res) => {
  const pid = req.query.pid;
  if (!pid) return res.redirect('/');
  const participant = db.getParticipant(pid);
  if (!participant) return res.redirect('/');

  db.updateParticipant(pid, { current_phase: 'practice' });
  const practice = trialManager.getPracticeTrial(pid);
  const feedback = trialManager.getPracticeFeedback(pid);

  res.render('trial', {
    pid,
    trial: practice,
    trialNumber: 0,
    totalTrials: participant.total_trials,
    isPractice: true,
    feedback,
    chatTimeLimit: CHAT_TIME_PER_TRIAL
  });
});

// Main trial page
app.get('/trial', (req, res) => {
  const pid = req.query.pid;
  if (!pid) return res.redirect('/');
  const participant = db.getParticipant(pid);
  if (!participant) return res.redirect('/');

  if (participant.trials_completed) {
    return res.redirect(`/questionnaire?pid=${pid}`);
  }

  db.updateParticipant(pid, { current_phase: 'trials' });
  const trial = trialManager.getCurrentTrial(pid);
  if (!trial) return res.redirect(`/questionnaire?pid=${pid}`);

  res.render('trial', {
    pid,
    trial,
    trialNumber: participant.current_trial + 1,
    totalTrials: participant.total_trials,
    isPractice: false,
    feedback: null,
    chatTimeLimit: CHAT_TIME_PER_TRIAL
  });
});

// Questionnaire
app.get('/questionnaire', (req, res) => {
  const pid = req.query.pid;
  if (!pid) return res.redirect('/');
  const participant = db.getParticipant(pid);
  if (!participant) return res.redirect('/');
  db.updateParticipant(pid, { current_phase: 'questionnaire' });
  res.render('questionnaire', { pid });
});

// Debrief
app.get('/debrief', (req, res) => {
  const pid = req.query.pid;
  if (!pid) return res.redirect('/');
  const participant = db.getParticipant(pid);
  if (!participant) return res.redirect('/');
  db.updateParticipant(pid, { current_phase: 'debrief' });
  const prolificUrl = process.env.PROLIFIC_COMPLETION_URL || null;
  res.render('debrief', { pid, condition: participant.condition, prolificUrl });
});

// ========== ADMIN ROUTES ==========

app.get('/admin', (req, res) => {
  const pw = req.query.pw;
  if (pw !== ADMIN_PASSWORD) {
    return res.status(401).send('Unauthorized. Use /admin?pw=YOUR_PASSWORD');
  }
  const participants = db.getAll('participants');
  const responses = db.getAll('responses');
  const chatMessages = db.getAll('chat_messages');
  const counts = db.getAssignmentCounts();
  res.render('admin', { participants, responses, chatMessages, counts, pw: ADMIN_PASSWORD });
});

app.get('/admin/participant/:pid', (req, res) => {
  const pw = req.query.pw;
  if (pw !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  const data = db.getFullParticipantData(req.params.pid);
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

app.get('/api/export/:table', (req, res) => {
  const pw = req.query.pw;
  if (pw !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  const table = req.params.table;
  const valid = ['participants', 'chat_messages', 'behavioral_events', 'eye_tracking', 'responses', 'questionnaires'];
  if (!valid.includes(table)) return res.status(400).json({ error: 'Invalid table', valid });
  res.json(db.getAll(table));
});

app.get('/api/status', (req, res) => {
  const counts = db.getAssignmentCounts();
  res.json({
    assignment_counts: counts,
    ai_mode: aiAdvisor.isMockMode() ? 'MOCK' : 'LIVE',
    total_participants: db.getAll('participants').length,
    total_responses: db.getAll('responses').length,
    total_messages: db.getAll('chat_messages').length
  });
});

// ========== HELPERS ==========

function getResumeUrl(participant) {
  const pid = participant.pid;
  switch (participant.current_phase) {
    case 'consent': return `/`;
    case 'calibration': return `/calibration?pid=${pid}`;
    case 'practice': return `/practice?pid=${pid}`;
    case 'trials': return `/trial?pid=${pid}`;
    case 'questionnaire': return `/questionnaire?pid=${pid}`;
    case 'debrief': return `/debrief?pid=${pid}`;
    default: return `/trial?pid=${pid}`;
  }
}

// ========== SOCKET.IO ==========

io.on('connection', (socket) => {

  // ---- Start AI session for a trial ----
  socket.on('trial:start', ({ pid, trialId, isPractice }) => {
    const sessionId = `${pid}_${trialId}_${Date.now()}`;
    aiAdvisor.initSession(sessionId);
    socket.emit('trial:ready', { sessionId });
  });

  // ---- User sends message to AI ----
  socket.on('trial:send-message', async ({ pid, sessionId, trialId, message, trialConfig }) => {
    // Save user message
    db.saveChatMessage({
      pid,
      trial_id: trialId,
      role: 'user',
      content: message,
      is_hallucination_trial: trialConfig.is_hallucination || false
    });

    // Get AI response with appropriate data (real or corrupted)
    const configForAI = {
      ...trialConfig,
      real_data: trialConfig.real_data,
      corrupted_data: trialConfig.corrupted_data
    };

    const reply = await aiAdvisor.getResponse(sessionId, message, configForAI);

    // Save AI message
    db.saveChatMessage({
      pid,
      trial_id: trialId,
      role: 'assistant',
      content: reply,
      is_hallucination_trial: trialConfig.is_hallucination || false
    });

    socket.emit('trial:ai-response', { reply });
  });

  // ---- Get initial AI recommendation ----
  socket.on('trial:get-recommendation', async ({ pid, sessionId, trialId, trialConfig }) => {
    const configForAI = {
      ...trialConfig,
      real_data: trialConfig.real_data,
      corrupted_data: trialConfig.corrupted_data
    };

    const reply = await aiAdvisor.getInitialRecommendation(sessionId, configForAI);

    db.saveChatMessage({
      pid,
      trial_id: trialId,
      role: 'assistant',
      content: reply,
      is_hallucination_trial: trialConfig.is_hallucination || false
    });

    socket.emit('trial:ai-recommendation', { reply });
  });

  // ---- Save response ----
  socket.on('trial:save-response', ({ pid, responseData }) => {
    db.saveResponse({ pid, ...responseData });
  });

  // ---- Advance to next trial ----
  socket.on('trial:advance', ({ pid, isPractice }) => {
    if (isPractice) {
      db.updateParticipant(pid, { practice_completed: true, current_phase: 'trials', current_trial: 0 });
      socket.emit('trial:next', { url: `/trial?pid=${pid}` });
    } else {
      const next = trialManager.advanceToNextTrial(pid);
      if (next) {
        socket.emit('trial:next', { url: `/trial?pid=${pid}` });
      } else {
        socket.emit('trial:next', { url: `/questionnaire?pid=${pid}` });
      }
    }
  });

  // ---- End AI session ----
  socket.on('trial:end-session', ({ sessionId }) => {
    aiAdvisor.clearSession(sessionId);
  });

  // ---- Behavioral events ----
  socket.on('behavior:event', (data) => {
    db.saveBehavioralEvent(data);
  });

  // ---- Eye tracking data ----
  socket.on('eyetracking:batch', (data) => {
    db.saveEyeTrackingBatch(data);
  });

  // ---- Save questionnaire ----
  socket.on('questionnaire:save', ({ pid, scaleName, responses }) => {
    db.saveQuestionnaire({ pid, scale_name: scaleName, responses });
  });

  socket.on('questionnaire:complete', ({ pid }) => {
    db.updateParticipant(pid, { questionnaire_completed: true, current_phase: 'debrief' });
    socket.emit('questionnaire:done', { url: `/debrief?pid=${pid}` });
  });
});

// ========== START ==========
server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  Hallucination Vigilance Experiment`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  AI: ${aiAdvisor.isMockMode() ? 'MOCK' : 'LIVE (OpenRouter)'}`);
  console.log(`  Chat time/trial: ${CHAT_TIME_PER_TRIAL}s`);
  console.log(`  Counts: ${JSON.stringify(db.getAssignmentCounts())}`);
  console.log(`========================================\n`);
});
