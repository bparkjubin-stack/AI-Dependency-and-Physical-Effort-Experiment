/**
 * AI Advisor module — calls OpenRouter API.
 * The hallucination injection works by feeding the AI corrupted data
 * in its system prompt, while the participant sees the real data.
 */

let client = null;
let mockMode = false;

function getClient() {
  if (client) return client;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'sk-or-xxx' || apiKey.trim() === '') {
    console.log('[AI Advisor] No valid OPENROUTER_API_KEY. Running in MOCK mode.');
    mockMode = true;
    return null;
  }

  try {
    const OpenAI = require('openai');
    client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1'
    });
    console.log('[AI Advisor] OpenRouter client initialized.');
    return client;
  } catch (err) {
    console.error('[AI Advisor] Failed to init client:', err.message);
    mockMode = true;
    return null;
  }
}

// Conversation histories keyed by sessionId
const conversations = new Map();

function initSession(sessionId) {
  conversations.set(sessionId, []);
}

/**
 * Build system prompt with the appropriate data (real or corrupted).
 */
function buildSystemPrompt(trialConfig) {
  const data = trialConfig.is_hallucination
    ? trialConfig.corrupted_data
    : trialConfig.real_data;

  const tableStr = formatDataTable(data);

  return `You are a helpful data analysis assistant. The user is making a decision based on a data table. Here is the data they are working with:

${tableStr}

TASK CONTEXT: ${trialConfig.scenario}

QUESTION: ${trialConfig.question}

YOUR ROLE:
- Analyze the data and help the user make a decision
- Be concise: 2-3 sentences max per response
- Reference specific numbers from the data to support your points
- Sound natural and conversational
- If the user asks follow-up questions, answer based on the data provided
- Do NOT mention that you are an AI or that you might make errors
- Do NOT hedge or add disclaimers about data accuracy`;
}

function formatDataTable(data) {
  if (!data || !data.columns || !data.rows) return 'No data available.';
  const header = data.columns.join(' | ');
  const separator = data.columns.map(() => '---').join(' | ');
  const rows = data.rows.map(r => r.join(' | ')).join('\n');
  return `${header}\n${separator}\n${rows}`;
}

/**
 * Get AI response for a message in a trial context.
 */
async function getResponse(sessionId, userMessage, trialConfig) {
  let history = conversations.get(sessionId);
  if (!history) {
    history = [];
    conversations.set(sessionId, history);
  }

  history.push({ role: 'user', content: userMessage });

  // Simulate typing delay
  const delay = 500 + Math.random() * 1000;
  await new Promise(r => setTimeout(r, delay));

  getClient();

  if (mockMode || !client) {
    return getMockResponse(trialConfig, userMessage, history);
  }

  try {
    const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-20250514';
    const systemPrompt = buildSystemPrompt(trialConfig);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history
    ];

    const completion = await client.chat.completions.create({
      model,
      messages,
      max_tokens: 200,
      temperature: 0.7
    });

    const reply = completion.choices[0]?.message?.content
      || 'Could you rephrase that? I want to make sure I give you a useful answer.';

    history.push({ role: 'assistant', content: reply });
    return reply;
  } catch (err) {
    console.error('[AI Advisor] API error:', err.message);
    return getMockResponse(trialConfig, userMessage, history);
  }
}

/**
 * Generate initial AI recommendation (auto-shown at start of AI interaction phase).
 */
async function getInitialRecommendation(sessionId, trialConfig) {
  const prompt = `Based on the data, what would you recommend? Give a brief analysis and your suggestion in 2-3 sentences.`;
  return getResponse(sessionId, prompt, trialConfig);
}

/**
 * Mock responses for testing without API key.
 */
function getMockResponse(trialConfig, userMessage, history) {
  const data = trialConfig.is_hallucination
    ? trialConfig.corrupted_data
    : trialConfig.real_data;

  const msg = userMessage.toLowerCase();
  let reply;

  if (msg.includes('recommend') || msg.includes('suggest') || msg.includes('which') || msg.includes('what would') || msg.includes('based on')) {
    // Give recommendation based on the data (corrupted or real)
    const topRow = data.rows[0];
    reply = `Looking at the data, ${topRow[0]} stands out with ${topRow[1]}. I'd suggest focusing there. Want me to break down the comparison further?`;
  } else if (msg.includes('sure') || msg.includes('correct') || msg.includes('where') || msg.includes('source') || msg.includes('check')) {
    // Verification question — double down on the data (which may be corrupted)
    const randomRow = data.rows[Math.floor(Math.random() * data.rows.length)];
    reply = `Yes, according to the data: ${randomRow[0]} shows ${randomRow[1]}. These numbers are from the dataset provided.`;
  } else if (msg.includes('why') || msg.includes('explain') || msg.includes('reason')) {
    reply = `The main factor is the difference in the key metric. If you compare across all rows, there's a clear gap that points to one option being stronger.`;
  } else {
    reply = `That's a good point. Based on what the data shows, I'd weigh the key numbers — particularly ${data.columns[1]} — to make this call. Would you like me to compare specific options?`;
  }

  history.push({ role: 'assistant', content: reply });
  return reply;
}

function clearSession(sessionId) {
  conversations.delete(sessionId);
}

function isMockMode() {
  getClient();
  return mockMode;
}

module.exports = {
  initSession,
  getResponse,
  getInitialRecommendation,
  clearSession,
  isMockMode
};
