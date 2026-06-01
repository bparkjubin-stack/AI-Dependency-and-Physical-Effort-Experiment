# AI Hallucination Vigilance Experiment

An online experiment platform studying whether awareness of AI hallucinations improves decision-making vigilance and metacognition.

## Core hypothesis

When people experience AI making errors (hallucinations), they become more vigilant, less reliant on AI suggestions, and show better metacognitive calibration in subsequent AI-assisted tasks.

## Design

**Between-subjects, single factor:**
- **Experience group**: Sees an obvious AI hallucination in the practice trial + receives a warning
- **Control group**: Normal practice trial + neutral message

**Task**: 6 short decision scenarios (~60s each). Participants see a data table, give an initial answer, consult a real AI assistant (via OpenRouter API), then give a final answer with confidence rating.

**Hallucination injection**: On hallucination trials, the AI receives a *corrupted* version of the data table in its system prompt, while the participant sees the real data. The AI naturally produces confident but incorrect analyses.

## Measurements

- **Weight of Advice (WOA)**: How much participants shift toward AI's suggestion
- **Appropriate reliance**: WOA on correct trials vs. hallucination trials
- **Confidence calibration**: Confidence rating vs. actual accuracy
- **Chat behavior**: Verification questions, follow-ups, message count
- **Panel switching**: How often participants check data table after AI responds
- **Eye tracking**: Gaze distribution between data panel and AI chat (via WebGazer.js)
- **Questionnaires**: UWES (engagement), AI trust, metacognitive awareness

## Tech stack

- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: EJS templates + vanilla JS
- **AI**: OpenRouter API (OpenAI SDK compatible)
- **Eye tracking**: WebGazer.js (webcam-based, browser-only)
- **Database**: JSON file (lightweight, Railway-compatible)
- **Deployment**: GitHub → Railway

## Setup

```bash
# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your OpenRouter API key

# Run
npm start
# Open http://localhost:3000
```

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | (mock mode if empty) |
| `OPENROUTER_MODEL` | LLM model to use | `anthropic/claude-sonnet-4-20250514` |
| `CHAT_TIME_PER_TRIAL` | Seconds for AI consultation phase | `60` |
| `PORT` | Server port | `3000` |
| `ADMIN_PASSWORD` | Password for admin dashboard | `admin123` |
| `PROLIFIC_COMPLETION_URL` | Prolific redirect URL | (none) |

## Routes

| URL | Description |
|-----|-------------|
| `/` | Welcome + consent |
| `/calibration?pid=X` | Eye tracking calibration |
| `/practice?pid=X` | Practice trial (manipulation) |
| `/trial?pid=X` | Main experiment trials |
| `/questionnaire?pid=X` | Post-task questionnaire |
| `/debrief?pid=X` | Debriefing page |
| `/admin?pw=PASSWORD` | Researcher dashboard |
| `/api/export/TABLE?pw=PASSWORD` | JSON data export |

## Railway deployment

1. Push to GitHub
2. Create new project on Railway
3. Connect GitHub repo
4. Add environment variables (especially `OPENROUTER_API_KEY`)
5. Deploy — Railway auto-detects Node.js

## Literature

- Sniezek & Buckley (1995) — Judge-Advisor System
- Dietvorst et al. (2015) — Algorithm aversion
- Buccinca et al. (2021) — Cognitive forcing functions
- Yin et al. (2019) — Trust calibration in ML
- Parasuraman & Manzey (2010) — Automation complacency
