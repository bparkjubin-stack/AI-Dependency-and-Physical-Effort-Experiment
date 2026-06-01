const OpenAI = require('openai');

let client = null;
const MODEL = process.env.AI_MODEL || 'openai/gpt-4o-mini';

function getClient() {
  if (client) return client;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'sk-or-v1-xxx') {
    console.warn('[AI] No API key — mock mode');
    return null;
  }
  client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://ai-effort-experiment.up.railway.app',
      'X-Title': 'AI Effort Experiment',
    },
  });
  console.log(`[AI] Ready. Model: ${MODEL}`);
  return client;
}

async function chat(systemPrompt, userMessage) {
  const c = getClient();
  if (!c) {
    // Mock response for testing without API key
    return 'This is a mock AI response. Configure OPENROUTER_API_KEY for real responses.';
  }
  try {
    const response = await c.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error('[AI] Error:', err.message);
    return 'Sorry, there was an error generating a response. Please try again.';
  }
}

module.exports = { chat };
