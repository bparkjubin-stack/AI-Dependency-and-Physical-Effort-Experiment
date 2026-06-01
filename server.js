require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./lib/db');
const ai = require('./lib/ai');
const exp = require('./lib/experiment');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const PROLIFIC_URL = process.env.PROLIFIC_COMPLETION_URL || '';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== HELPER =====
function phaseNum(phase) {
  const phases = ['consent','demographics','tasks','wfc','scales','scenarios','behavior','manip_check'];
  const idx = phases.indexOf(phase);
  return idx >= 0 ? idx + 1 : 0;
}

// ===== ROUTES =====

// Welcome — capture Prolific PID
app.get('/', (req, res) => {
  const prefill = req.query.PROLIFIC_PID || req.query.prolific_pid || '';
  res.render('welcome', { prefill, error: null });
});

// Join — create participant + assign condition
app.post('/join', async (req, res) => {
  const pid = (req.body.prolific_id || '').trim();
  if (!pid) return res.render('welcome', { prefill: '', error: 'Please enter your Prolific ID.' });

  try {
    let participant = await db.getParticipant(pid);
    if (participant) {
      // Returning participant — resume from where they left off
      const phase = participant.current_phase || 'consent';
      if (phase === 'complete') return res.redirect(`/complete?pid=${pid}`);
      return res.redirect(`/${phase}?pid=${pid}`);
    }
    const condition = await db.getNextCondition();
    await db.createParticipant({ prolific_id: pid, condition, current_phase: 'consent' });
    res.redirect(`/consent?pid=${pid}`);
  } catch (err) {
    console.error('[Join]', err.message);
    res.render('welcome', { prefill: pid, error: 'An error occurred. Please try again.' });
  }
});

// Consent
app.get('/consent', async (req, res) => {
  const pid = req.query.pid;
  if (!pid) return res.redirect('/');
  res.render('consent', { pid, phase: 1, totalPhases: 8 });
});

app.post('/api/consent', async (req, res) => {
  const { pid } = req.body;
  try {
    await db.updateParticipant(pid, { consented: true, current_phase: 'demographics' });
    res.json({ ok: true, next: `/demographics?pid=${pid}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Demographics
app.get('/demographics', async (req, res) => {
  const pid = req.query.pid;
  if (!pid) return res.redirect('/');
  res.render('demographics', { pid, phase: 2, totalPhases: 8 });
});

app.post('/api/demographics', async (req, res) => {
  const { pid, age, gender, education, occupation, exercise_freq, ai_usage_freq } = req.body;
  try {
    await db.updateParticipant(pid, { age: parseInt(age), gender, education, occupation, exercise_freq, ai_usage_freq, current_phase: 'tasks' });
    res.json({ ok: true, next: `/tasks?pid=${pid}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tasks — render based on condition
app.get('/tasks', async (req, res) => {
  const pid = req.query.pid;
  if (!pid) return res.redirect('/');
  const participant = await db.getParticipant(pid);
  if (!participant) return res.redirect('/');
  const condition = participant.condition;
  const template = condition === 'delegation' ? 'task-delegation' : 'task-evaluation';
  res.render(template, { pid, condition, tasks: exp.TASKS, phase: 3, totalPhases: 8 });
});

// AI Chat endpoint (delegation group only)
app.post('/api/ai-chat', async (req, res) => {
  const { prompt, taskNumber } = req.body;
  try {
    const task = exp.TASKS.find(t => t.number === taskNumber);
    let fullPrompt = prompt;
    if (task && task.material) {
      fullPrompt = `Context material:\n${task.material}\n\nUser request: ${prompt}`;
    }
    const response = await ai.chat(exp.AI_SYSTEM_PROMPT, fullPrompt);
    res.json({ response });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Save task response
app.post('/api/task-response', async (req, res) => {
  const { pid, task_number, condition, prompt_sent, ai_response, submitted_answer, ratings, time_spent_ms } = req.body;
  try {
    await db.saveTaskResponse({
      prolific_id: pid, task_number, condition,
      prompt_sent: prompt_sent || null,
      ai_response: ai_response || null,
      submitted_answer: submitted_answer || null,
      ratings: ratings || null,
      time_spent_ms: time_spent_ms || null,
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark tasks complete
app.post('/api/tasks-complete', async (req, res) => {
  const { pid } = req.body;
  try {
    await db.updateParticipant(pid, { current_phase: 'wfc' });
    res.json({ ok: true, next: `/wfc?pid=${pid}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// WFC
app.get('/wfc', async (req, res) => {
  const pid = req.query.pid;
  if (!pid) return res.redirect('/');
  const items = exp.getShuffledWFC();
  res.render('wfc', { pid, items: JSON.stringify(items), phase: 4, totalPhases: 8 });
});

app.post('/api/wfc', async (req, res) => {
  const { pid, responses } = req.body;
  try {
    const rows = responses.map((r, i) => ({
      prolific_id: pid,
      trial_order: i + 1,
      fragment: r.fragment,
      response: r.response || null,
      response_time_ms: r.response_time_ms || null,
      is_target: r.category !== 'filler',
      category: r.category,
      scored: exp.scoreWFCResponse(r.id, r.response),
      timed_out: r.timed_out || false,
    }));
    await db.saveWFCResponses(rows);
    await db.updateParticipant(pid, { current_phase: 'scales' });
    res.json({ ok: true, next: `/scales?pid=${pid}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Scales
app.get('/scales', async (req, res) => {
  const pid = req.query.pid;
  if (!pid) return res.redirect('/');
  const items = exp.getShuffledScales();
  res.render('scales', { pid, items: JSON.stringify(items), phase: 5, totalPhases: 8 });
});

app.post('/api/scales', async (req, res) => {
  const { pid, responses } = req.body;
  try {
    const rows = responses.map(r => ({
      prolific_id: pid, scale: r.scale, item_id: r.id, item_text: r.text, value: r.value,
    }));
    await db.saveScaleResponses(rows);
    await db.updateParticipant(pid, { current_phase: 'scenarios' });
    res.json({ ok: true, next: `/scenarios?pid=${pid}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Scenarios
app.get('/scenarios', async (req, res) => {
  const pid = req.query.pid;
  if (!pid) return res.redirect('/');
  const items = exp.getShuffledScenarios();
  res.render('scenarios', { pid, items: JSON.stringify(items), phase: 6, totalPhases: 8 });
});

app.post('/api/scenarios', async (req, res) => {
  const { pid, responses } = req.body;
  try {
    const rows = responses.map((r, i) => ({
      prolific_id: pid,
      trial_order: i + 1,
      scenario_id: r.id,
      is_target: r.isTarget,
      choice: r.choice,
      is_lazy: r.isTarget ? (r.choice === r.lazyIs) : null,
    }));
    await db.saveScenarioResponses(rows);
    await db.updateParticipant(pid, { current_phase: 'behavior' });
    res.json({ ok: true, next: `/behavior?pid=${pid}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Behavior choice
app.get('/behavior', async (req, res) => {
  const pid = req.query.pid;
  if (!pid) return res.redirect('/');
  res.render('behavior', { pid, phase: 7, totalPhases: 8 });
});

app.post('/api/behavior', async (req, res) => {
  const { pid, choice } = req.body;
  try {
    await db.saveEvent({ prolific_id: pid, event_type: 'behavior_choice', data: { choice, is_lazy: choice === 'wait' } });
    await db.updateParticipant(pid, { current_phase: 'manip_check' });
    res.json({ ok: true, next: `/manip-check?pid=${pid}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Manipulation check
app.get('/manip-check', async (req, res) => {
  const pid = req.query.pid;
  if (!pid) return res.redirect('/');
  res.render('manip-check', { pid, items: exp.MANIP_CHECK_ITEMS, phase: 8, totalPhases: 8 });
});

app.post('/api/manip-check', async (req, res) => {
  const { pid, responses } = req.body;
  try {
    await db.saveEvent({ prolific_id: pid, event_type: 'manipulation_check', data: responses });
    await db.updateParticipant(pid, { current_phase: 'debrief' });
    res.json({ ok: true, next: `/debrief?pid=${pid}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Debrief
app.get('/debrief', async (req, res) => {
  const pid = req.query.pid;
  if (!pid) return res.redirect('/');
  const participant = await db.getParticipant(pid);
  res.render('debrief', { pid, condition: participant ? participant.condition : '' });
});

app.post('/api/debrief', async (req, res) => {
  const { pid, consent } = req.body;
  try {
    await db.saveEvent({ prolific_id: pid, event_type: 'debrief_consent', data: { consent } });
    await db.updateParticipant(pid, { debrief_consent: consent, completed_at: new Date().toISOString(), current_phase: 'complete' });
    res.json({ ok: true, next: `/complete?pid=${pid}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Complete
app.get('/complete', (req, res) => {
  const pid = req.query.pid;
  res.render('complete', { pid, prolificUrl: PROLIFIC_URL });
});

// ===== ADMIN =====

app.get('/admin', async (req, res) => {
  if (req.query.pw !== ADMIN_PASSWORD) return res.status(403).send('Access denied. Use /admin?pw=PASSWORD');
  const stats = await db.getStats();
  res.render('admin', { stats, password: ADMIN_PASSWORD });
});

app.get('/api/admin-data', async (req, res) => {
  if (req.query.pw !== ADMIN_PASSWORD) return res.status(403).json({ error: 'denied' });
  const [participants, tasks, wfc, scales, scenarios, events] = await Promise.all([
    db.getAll('participants'), db.getAll('task_responses'), db.getAll('wfc_responses'),
    db.getAll('scale_responses'), db.getAll('scenario_responses'), db.getAll('experiment_events'),
  ]);
  res.json({ participants, tasks, wfc, scales, scenarios, events });
});

app.get('/api/export/:table', async (req, res) => {
  if (req.query.pw !== ADMIN_PASSWORD) return res.status(403).json({ error: 'denied' });
  const valid = ['participants','task_responses','wfc_responses','scale_responses','scenario_responses','experiment_events'];
  if (!valid.includes(req.params.table)) return res.status(400).json({ error: 'Invalid table', valid });
  const data = await db.getAll(req.params.table);
  // Return as CSV
  if (req.query.format === 'csv' && data.length > 0) {
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(row => headers.map(h => {
      let v = row[h];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') v = JSON.stringify(v);
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${req.params.table}.csv`);
    return res.send(csv);
  }
  res.json(data);
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  AI Effort Experiment`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Admin: http://localhost:${PORT}/admin?pw=${ADMIN_PASSWORD}`);
  console.log(`========================================\n`);
});
