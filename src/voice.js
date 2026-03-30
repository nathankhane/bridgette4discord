const FILLER_WORDS = /^(um+,?\s*|uh+,?\s*|like,?\s*|so,?\s*|okay so,?\s*|ok so,?\s*|hey so,?\s*|well,?\s*|you know,?\s*)+/i;

const VOICE_INVOCATIONS = /^(hey bridgette[,.]?\s*|yo bridgette[,.]?\s*|bridgette[,.]?\s*|ok bridgette[,.]?\s*|okay bridgette[,.]?\s*)/i;

const INTENT_PATTERNS = {
  idea: /\b(idea|what if|we could|imagine if|what about|i was thinking)\b/i,
  prd: /\b(prd|spec|requirements|document|product doc|write up|write a doc)\b/i,
  task: /\b(build|create|make|implement|add|fix|update|refactor|deploy|set up|scaffold)\b/i,
  review: /\b(review|look at|check|analyze|read|audit|evaluate)\b/i,
  question: /^(what|how|why|when|where|who|can you|could you|would you|is there|are there|does|do you)/i,
};

/**
 * Detect the intent of a message via keyword matching. No API call.
 * @param {string} text
 * @returns {'idea'|'prd'|'task'|'question'|'review'|'general'}
 */
export function detectIntent(text) {
  const t = text.trim();

  // Question mark at end is a strong signal
  if (t.endsWith('?')) return 'question';

  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(t)) return intent;
  }

  return 'general';
}

/**
 * Heuristic: is this likely a voice-transcribed message?
 * Signals: no punctuation, starts with filler words, long run-on sentence.
 * @param {string} original
 * @returns {boolean}
 */
function detectVoiceInput(original) {
  const hasPunctuation = /[.,!?;:]/.test(original);
  const startsWithFiller = FILLER_WORDS.test(original);
  const hasVoiceInvocation = VOICE_INVOCATIONS.test(original);
  const isLongRunOn = original.length > 80 && !hasPunctuation;

  return startsWithFiller || hasVoiceInvocation || isLongRunOn;
}

/**
 * Preprocess a message for voice-transcription artifacts.
 * @param {string} text - raw message content (after @mention stripping)
 * @returns {{ cleanedText: string, intent: string, isVoiceInput: boolean }}
 */
export function preprocessVoiceInput(text) {
  const isVoiceInput = detectVoiceInput(text);

  let cleaned = text;

  // Strip voice invocation prefixes
  cleaned = cleaned.replace(VOICE_INVOCATIONS, '');

  // Strip leading filler words
  cleaned = cleaned.replace(FILLER_WORDS, '');

  // Fix double periods
  cleaned = cleaned.replace(/\.{2,}/g, '.');

  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  cleaned = cleaned.trim();

  const intent = detectIntent(cleaned);

  return { cleanedText: cleaned, intent, isVoiceInput };
}
