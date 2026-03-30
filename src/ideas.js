import { CHANNEL_CONFIG } from './config.js';
import { log } from './utils.js';

// Map of channelId -> array of captured idea objects
const ideaStore = new Map();

/**
 * Format and store a captured idea. Also posts to the log channel if configured.
 * @param {import('discord.js').Message} message
 * @param {{ cleanedText: string, intent: string, isVoiceInput: boolean }} processedInput
 * @param {import('discord.js').Client} client
 */
export async function captureIdea(message, processedInput, client) {
  const channelName = message.channel.name ?? '';
  const channelCfg = CHANNEL_CONFIG[channelName];
  const project = channelCfg?.project ?? 'general';
  const timestamp = new Date().toISOString();

  const idea = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp,
    author: message.author.username,
    channelId: message.channel.id,
    channelName,
    project,
    intent: processedInput.intent,
    raw: message.content,
    cleaned: processedInput.cleanedText,
    isVoiceInput: processedInput.isVoiceInput,
  };

  if (!ideaStore.has(message.channel.id)) {
    ideaStore.set(message.channel.id, []);
  }
  ideaStore.get(message.channel.id).push(idea);

  log(`Idea captured in #${channelName} from ${idea.author}: "${idea.cleaned.slice(0, 60)}..."`);

  // Format the capture block
  const captureBlock = formatIdeaBlock(idea);

  // If a log channel is configured and accessible, mirror the idea there
  const logChannelId = process.env.LOG_CHANNEL_ID;
  if (logChannelId && logChannelId !== message.channel.id) {
    try {
      const logChannel = await client.channels.fetch(logChannelId);
      if (logChannel?.isTextBased()) {
        await logChannel.send(captureBlock);
      }
    } catch (err) {
      log(`Could not post to log channel: ${err.message}`);
    }
  }

  return captureBlock;
}

/**
 * Format an idea object into a Discord message block.
 */
function formatIdeaBlock(idea) {
  const date = new Date(idea.timestamp).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return [
    `💡 **Idea captured** — ${date}`,
    `**From:** ${idea.author}`,
    `**Context:** ${idea.project}`,
    `**Raw:** ${idea.raw}`,
    idea.cleaned !== idea.raw ? `**Cleaned:** ${idea.cleaned}` : null,
  ].filter(Boolean).join('\n');
}

/**
 * Return the last N ideas from a channel.
 * @param {string} channelId
 * @param {number} count
 * @returns {Array}
 */
export function getRecentIdeas(channelId, count = 10) {
  const ideas = ideaStore.get(channelId) ?? [];
  return ideas.slice(-count);
}

/**
 * Return all ideas across all channels, most recent first.
 */
export function getAllRecentIdeas(count = 10) {
  const all = [];
  for (const ideas of ideaStore.values()) {
    all.push(...ideas);
  }
  return all
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, count);
}
