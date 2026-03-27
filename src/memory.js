import { MAX_MEMORY_MESSAGES } from './config.js';

// Map of channelId -> array of { role, content }
const history = new Map();

export function getHistory(channelId) {
  return history.get(channelId) ?? [];
}

export function addMessage(channelId, role, content) {
  if (!history.has(channelId)) {
    history.set(channelId, []);
  }

  const messages = history.get(channelId);
  messages.push({ role, content });

  // Keep only the last MAX_MEMORY_MESSAGES messages
  if (messages.length > MAX_MEMORY_MESSAGES) {
    messages.splice(0, messages.length - MAX_MEMORY_MESSAGES);
  }
}

export function clearMemory(channelId) {
  history.delete(channelId);
}

export function getActiveChannelCount() {
  return history.size;
}

export function getStartTime() {
  return startTime;
}

const startTime = Date.now();
