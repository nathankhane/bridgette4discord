// Tracks per-channel rate limit timestamps
const lastRequestTime = new Map();

/**
 * Split a long message into chunks at paragraph breaks, falling back to
 * sentence breaks, then hard-cutting at maxLength.
 */
export function splitMessage(text, maxLength = 1900) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    // Try to split at a paragraph break within the limit
    const slice = remaining.slice(0, maxLength);
    let splitAt = slice.lastIndexOf('\n\n');

    // Fall back to single newline
    if (splitAt === -1) splitAt = slice.lastIndexOf('\n');

    // Fall back to sentence end
    if (splitAt === -1) {
      const sentenceEnd = slice.search(/[.!?]\s+\S/);
      if (sentenceEnd !== -1) {
        splitAt = slice.indexOf(' ', sentenceEnd + 1);
      }
    }

    // Hard cut
    if (splitAt === -1 || splitAt === 0) splitAt = maxLength;

    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (remaining.length > 0) chunks.push(remaining);

  return chunks;
}

/**
 * Returns true if the channel is within the cooldown window.
 */
export function isRateLimited(channelId, cooldownMs = 3000) {
  const last = lastRequestTime.get(channelId);
  if (last === undefined) return false;
  return Date.now() - last < cooldownMs;
}

/**
 * Record that a request was just made for this channel.
 */
export function recordRequest(channelId) {
  lastRequestTime.set(channelId, Date.now());
}

/**
 * Return a user-friendly error message based on the error type.
 */
export function formatError(error) {
  const msg = error?.message ?? '';

  if (msg.includes('rate limit') || error?.status === 429) {
    return "I'm being rate limited by the API right now. Give me a few seconds and try again.";
  }
  if (error?.status === 401 || msg.includes('authentication')) {
    return "API authentication failed. Nathan, check the ANTHROPIC_API_KEY in the env vars.";
  }
  if (msg.includes('network') || msg.includes('ECONNREFUSED') || msg.includes('fetch')) {
    return "Can't reach the Anthropic API right now — network issue. Try again in a moment.";
  }
  if (error?.status >= 500) {
    return "The Anthropic API is having issues on their end. I'll be back once they recover.";
  }

  return `Something went wrong: ${msg || 'unknown error'}. Try again or ping Nathan.`;
}

/**
 * Format uptime in a human-readable way.
 */
export function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}
