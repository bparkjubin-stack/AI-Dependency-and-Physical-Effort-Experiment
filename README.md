# AI Effort Experiment

Behavioral experiment platform: Does delegating tasks to AI increase physical effort avoidance?

## Design

- **IV**: AI delegation (delegate to AI) vs. AI evaluation (judge AI's work) — yoked design
- **DV1**: Physical effort avoidance in everyday scenarios (10 binary choices)
- **DV2**: Real behavioral choice (stretching vs. waiting)
- **Mediators**: Effort-minimising mindset (explicit scale + implicit WFC)
- **Covariate**: Cognitive fatigue

## Quick Start (Local)

```bash
cp .env.example .env
# Edit .env — add your keys
npm install
npm start
# Open http://localhost:3000
# Admin: http://localhost:3000/admin?pw=your-password
```

## Setup Supabase (Free Database)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and paste the contents of `schema.sql`, then run it
4. Go to **Settings → API** and copy:
   - Project URL → `SUPABASE_URL`
   - `anon` public key → `SUPABASE_KEY`
5. Add both to your `.env` file

## Deploy to Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) and connect the repo
3. Add environment variables:
   - `OPENROUTER_API_KEY` — your OpenRouter API key
   - `AI_MODEL` — e.g. `openai/gpt-4o-mini`
   - `SUPABASE_URL` — from Supabase dashboard
   - `SUPABASE_KEY` — from Supabase dashboard
   - `ADMIN_PASSWORD` — choose a strong password
   - `PROLIFIC_COMPLETION_URL` — your Prolific completion link
4. Deploy

## Prolific Integration

Set your Prolific study URL to:
```
https://your-app.up.railway.app/?PROLIFIC_PID={{%PROLIFIC_PID%}}
```

Prolific will automatically pass the participant's ID.

## URLs

| URL | Description |
|-----|-------------|
| `/` | Participant entry (captures Prolific ID) |
| `/admin?pw=PASSWORD` | Admin dashboard with stats & data export |
| `/api/export/TABLE?pw=PASSWORD&format=csv` | CSV export for any table |

**Exportable tables**: `participants`, `task_responses`, `wfc_responses`, `scale_responses`, `scenario_responses`, `experiment_events`

## Experiment Flow

```
Welcome (Prolific ID) → Consent → Demographics
  → [Random Assignment]
  → Cognitive Tasks (3 tasks: AI delegation OR AI evaluation)
  → Word Fragment Completion (12 items, 10s each)
  → State Scales (10 Likert items: fatigue + effort mindset)
  → Lifestyle Scenarios (15 items: 10 target + 5 filler)
  → Behavioral Choice (stretch £0.45 vs. wait £0.15)
  → Manipulation Check (6 Likert items)
  → Debriefing + Data Consent
  → Completion → Prolific Redirect
```

## Architecture

```
server.js            Express routes + API endpoints
lib/db.js            Supabase database operations (with in-memory fallback)
lib/ai.js            OpenRouter API proxy
lib/experiment.js    All experimental materials, randomisation, WFC scoring
views/*.ejs          EJS templates for each experiment phase
public/css/style.css Light theme styling
schema.sql           PostgreSQL table definitions for Supabase
```
