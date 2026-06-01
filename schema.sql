-- Run this in Supabase SQL Editor to create all tables

CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  prolific_id VARCHAR(100) UNIQUE NOT NULL,
  condition VARCHAR(20) NOT NULL,
  age INTEGER,
  gender VARCHAR(30),
  education VARCHAR(50),
  occupation VARCHAR(50),
  exercise_freq VARCHAR(30),
  ai_usage_freq VARCHAR(30),
  consented BOOLEAN DEFAULT FALSE,
  current_phase VARCHAR(30) DEFAULT 'welcome',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  debrief_consent VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS task_responses (
  id SERIAL PRIMARY KEY,
  prolific_id VARCHAR(100) REFERENCES participants(prolific_id),
  task_number INTEGER NOT NULL,
  condition VARCHAR(20),
  prompt_sent TEXT,
  ai_response TEXT,
  submitted_answer TEXT,
  ratings JSONB,
  time_spent_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wfc_responses (
  id SERIAL PRIMARY KEY,
  prolific_id VARCHAR(100) REFERENCES participants(prolific_id),
  trial_order INTEGER,
  fragment VARCHAR(30),
  response VARCHAR(50),
  response_time_ms INTEGER,
  is_target BOOLEAN,
  category VARCHAR(20),
  scored BOOLEAN DEFAULT FALSE,
  timed_out BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scale_responses (
  id SERIAL PRIMARY KEY,
  prolific_id VARCHAR(100) REFERENCES participants(prolific_id),
  scale VARCHAR(30),
  item_id VARCHAR(10),
  item_text TEXT,
  value INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenario_responses (
  id SERIAL PRIMARY KEY,
  prolific_id VARCHAR(100) REFERENCES participants(prolific_id),
  trial_order INTEGER,
  scenario_id VARCHAR(10),
  is_target BOOLEAN,
  choice VARCHAR(1),
  is_lazy BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experiment_events (
  id SERIAL PRIMARY KEY,
  prolific_id VARCHAR(100) REFERENCES participants(prolific_id),
  event_type VARCHAR(50),
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_participants_pid ON participants(prolific_id);
CREATE INDEX IF NOT EXISTS idx_task_pid ON task_responses(prolific_id);
CREATE INDEX IF NOT EXISTS idx_wfc_pid ON wfc_responses(prolific_id);
CREATE INDEX IF NOT EXISTS idx_scale_pid ON scale_responses(prolific_id);
CREATE INDEX IF NOT EXISTS idx_scenario_pid ON scenario_responses(prolific_id);
CREATE INDEX IF NOT EXISTS idx_events_pid ON experiment_events(prolific_id);
