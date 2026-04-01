import Anthropic from '@anthropic-ai/sdk';
import { MODEL, MAX_TOKENS } from './config.js';
import { formatError, log } from './utils.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Send a message to Claude and return the response text.
 * @param {string} systemPrompt
 * @param {Array<{role: string, content: string}>} history - prior messages
 * @param {string} userMessage - the new user message
 * @returns {Promise<string>}
 */
export async function askClaude(systemPrompt, history, userMessage) {
  const messages = [
    ...history,
    { role: 'user', content: userMessage },
  ].filter((m) => m.content);

  try {
    log(`Calling Claude (${MODEL}) with ${messages.length} messages`);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    log(`Claude responded with ${text.length} chars`);
    return text;
  } catch (error) {
    log(`Claude API error: ${error?.message ?? error}`);
    throw error;
  }
}

export { formatError };
