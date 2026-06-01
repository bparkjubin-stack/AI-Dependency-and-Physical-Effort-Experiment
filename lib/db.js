const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getClient() {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key || url === 'https://your-project.supabase.co') {
    console.warn('[DB] Supabase not configured — using in-memory fallback');
    return null;
  }
  supabase = createClient(url, key);
  console.log('[DB] Supabase connected');
  return supabase;
}

// ========== In-memory fallback ==========
const mem = {
  participants: [], task_responses: [], wfc_responses: [],
  scale_responses: [], scenario_responses: [], experiment_events: []
};
let memId = 0;

// ========== Participants ==========

async function createParticipant(data) {
  const sb = getClient();
  if (sb) {
    const { data: row, error } = await sb.from('participants').insert(data).select().single();
    if (error) throw error;
    return row;
  }
  const row = { id: ++memId, ...data, started_at: new Date().toISOString() };
  mem.participants.push(row);
  return row;
}

async function getParticipant(prolificId) {
  const sb = getClient();
  if (sb) {
    const { data } = await sb.from('participants').select('*').eq('prolific_id', prolificId).single();
    return data;
  }
  return mem.participants.find(p => p.prolific_id === prolificId) || null;
}

async function updateParticipant(prolificId, updates) {
  const sb = getClient();
  if (sb) {
    const { data, error } = await sb.from('participants').update(updates).eq('prolific_id', prolificId).select().single();
    if (error) throw error;
    return data;
  }
  const p = mem.participants.find(p => p.prolific_id === prolificId);
  if (p) Object.assign(p, updates);
  return p;
}

// ========== Task Responses ==========

async function saveTaskResponse(data) {
  const sb = getClient();
  if (sb) {
    const { error } = await sb.from('task_responses').insert(data);
    if (error) throw error;
    return;
  }
  mem.task_responses.push({ id: ++memId, ...data, created_at: new Date().toISOString() });
}

// ========== WFC Responses ==========

async function saveWFCResponses(rows) {
  const sb = getClient();
  if (sb) {
    const { error } = await sb.from('wfc_responses').insert(rows);
    if (error) throw error;
    return;
  }
  rows.forEach(r => mem.wfc_responses.push({ id: ++memId, ...r, created_at: new Date().toISOString() }));
}

// ========== Scale Responses ==========

async function saveScaleResponses(rows) {
  const sb = getClient();
  if (sb) {
    const { error } = await sb.from('scale_responses').insert(rows);
    if (error) throw error;
    return;
  }
  rows.forEach(r => mem.scale_responses.push({ id: ++memId, ...r, created_at: new Date().toISOString() }));
}

// ========== Scenario Responses ==========

async function saveScenarioResponses(rows) {
  const sb = getClient();
  if (sb) {
    const { error } = await sb.from('scenario_responses').insert(rows);
    if (error) throw error;
    return;
  }
  rows.forEach(r => mem.scenario_responses.push({ id: ++memId, ...r, created_at: new Date().toISOString() }));
}

// ========== Events (behavior, manip check, debrief) ==========

async function saveEvent(data) {
  const sb = getClient();
  if (sb) {
    const { error } = await sb.from('experiment_events').insert(data);
    if (error) throw error;
    return;
  }
  mem.experiment_events.push({ id: ++memId, ...data, created_at: new Date().toISOString() });
}

// ========== Admin / Export ==========

async function getAll(table) {
  const sb = getClient();
  if (sb) {
    const { data, error } = await sb.from(table).select('*').order('id', { ascending: true });
    if (error) return [];
    return data;
  }
  return mem[table] || [];
}

async function getStats() {
  const sb = getClient();
  if (sb) {
    const { data: parts } = await sb.from('participants').select('condition, current_phase, completed_at');
    const total = parts ? parts.length : 0;
    const delegation = parts ? parts.filter(p => p.condition === 'delegation').length : 0;
    const evaluation = parts ? parts.filter(p => p.condition === 'evaluation').length : 0;
    const completed = parts ? parts.filter(p => p.completed_at).length : 0;
    return { total, delegation, evaluation, completed };
  }
  const parts = mem.participants;
  return {
    total: parts.length,
    delegation: parts.filter(p => p.condition === 'delegation').length,
    evaluation: parts.filter(p => p.condition === 'evaluation').length,
    completed: parts.filter(p => p.completed_at).length,
  };
}

// ========== Condition assignment (balanced) ==========

async function getNextCondition() {
  const sb = getClient();
  let dCount = 0, eCount = 0;
  if (sb) {
    const { data } = await sb.from('participants').select('condition');
    if (data) {
      dCount = data.filter(p => p.condition === 'delegation').length;
      eCount = data.filter(p => p.condition === 'evaluation').length;
    }
  } else {
    dCount = mem.participants.filter(p => p.condition === 'delegation').length;
    eCount = mem.participants.filter(p => p.condition === 'evaluation').length;
  }
  // Balanced assignment: assign to whichever has fewer; if equal, random
  if (dCount < eCount) return 'delegation';
  if (eCount < dCount) return 'evaluation';
  return Math.random() < 0.5 ? 'delegation' : 'evaluation';
}

module.exports = {
  createParticipant, getParticipant, updateParticipant,
  saveTaskResponse, saveWFCResponses, saveScaleResponses,
  saveScenarioResponses, saveEvent,
  getAll, getStats, getNextCondition,
};
