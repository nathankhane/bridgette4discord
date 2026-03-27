import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { ACTIVE_CHANNELS, MODEL, RATE_LIMIT_MS } from './config.js';
import { buildSystemPrompt } from './system-prompts.js';
import { askClaude } from './claude.js';
import {
  getHistory,
  addMessage,
  clearMemory,
  getActiveChannelCount,
  getStartTime,
} from './memory.js';
import {
  splitMessage,
  isRateLimited,
  recordRequest,
  formatError,
  formatUptime,
  log,
} from './utils.js';

// Validate required env vars before starting
if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is required in .env');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is required in .env');
  process.exit(1);
}

// Parse optional allowed user IDs
const allowedUserIds = process.env.ALLOWED_USER_IDS
  ? new Set(process.env.ALLOWED_USER_IDS.split(',').map((id) => id.trim()))
  : null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  log(`Bridgette is online as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  // Ignore bots (including self)
  if (message.author.bot) return;

  const channelName = message.channel.name ?? '';
  const isMentioned = message.mentions.has(client.user);
  const isActiveChannel = ACTIVE_CHANNELS.has(channelName);

  // Only respond if mentioned OR in an active channel
  if (!isMentioned && !isActiveChannel) return;

  // Check allowed users if configured
  if (allowedUserIds && !allowedUserIds.has(message.author.id)) {
    log(`Ignored message from unauthorized user ${message.author.id}`);
    return;
  }

  // Handle prefix commands
  const content = message.content.trim();
  if (content.startsWith('!')) {
    await handleCommand(message, content, channelName);
    return;
  }

  // Rate limit check
  if (isRateLimited(message.channel.id, RATE_LIMIT_MS)) {
    await message.reply("Slow down — I'm still processing. Give me a sec.");
    return;
  }
  recordRequest(message.channel.id);

  // Strip the @mention from the message content if present
  const userText = content
    .replace(/<@!?\d+>/g, '')
    .trim();

  if (!userText) {
    await message.reply("Yeah? What's up?");
    return;
  }

  // Show typing indicator
  await message.channel.sendTyping();

  const systemPrompt = buildSystemPrompt(channelName);
  const history = getHistory(message.channel.id);

  try {
    const response = await askClaude(systemPrompt, history, userText);

    // Save to memory
    addMessage(message.channel.id, 'user', userText);
    addMessage(message.channel.id, 'assistant', response);

    // Send response, chunked if needed
    const chunks = splitMessage(response);
    for (const chunk of chunks) {
      await message.channel.send(chunk);
    }
  } catch (error) {
    const errMsg = formatError(error);
    log(`Error handling message: ${error?.message ?? error}`);
    await message.reply(errMsg);
  }
});

async function handleCommand(message, content, channelName) {
  const command = content.split(' ')[0].toLowerCase();

  switch (command) {
    case '!clear': {
      clearMemory(message.channel.id);
      await message.reply('Memory cleared for this channel.');
      break;
    }

    case '!status': {
      const uptime = formatUptime(Date.now() - getStartTime());
      const activeChannels = getActiveChannelCount();
      await message.reply(
        `Online for ${uptime} — running ${MODEL} — ${activeChannels} channel(s) with active memory — all systems go.`
      );
      break;
    }

    case '!help': {
      await message.reply(
        `Here's what I can do:\n\n` +
        `**Commands**\n` +
        `\`!clear\` — wipe my memory for this channel\n` +
        `\`!status\` — uptime, model, and memory info\n` +
        `\`!model\` — which Claude model I'm using\n` +
        `\`!help\` — this message\n\n` +
        `**Capabilities**\n` +
        `Discuss ideas and strategy, draft PRDs and docs, review code, debug problems, brainstorm. Mention me anywhere or just talk in a project channel.`
      );
      break;
    }

    case '!model': {
      await message.reply(`Running on \`${MODEL}\`.`);
      break;
    }

    default: {
      // Unknown command — ignore silently or pass to Claude
      break;
    }
  }
}

client.login(process.env.DISCORD_TOKEN);
