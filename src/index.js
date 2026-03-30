import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';
import { ACTIVE_CHANNELS, CHANNEL_CONFIG, MODEL, RATE_LIMIT_MS } from './config.js';
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
import { preprocessVoiceInput } from './voice.js';
import { captureIdea, getAllRecentIdeas } from './ideas.js';

// Validate required env vars before starting
if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is required in .env');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is required in .env');
  process.exit(1);
}

const INTENT_EMOJI = {
  idea: '💡',
  prd: '📋',
  task: '🔨',
  question: '🤔',
  review: '🔍',
  general: '👀',
};

// Parse optional allowed user IDs
const allowedUserIds = process.env.ALLOWED_USER_IDS
  ? new Set(process.env.ALLOWED_USER_IDS.split(',').map((id) => id.trim()))
  : null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, (readyClient) => {
  log(`Bridgette is online as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  // Ignore bots (including self)
  if (message.author.bot) return;

  const isDM = message.channel.isDMBased();
  const channelName = isDM ? 'bridgette' : (message.channel.name ?? '');
  const isMentioned = message.mentions.has(client.user);
  const isActiveChannel = ACTIVE_CHANNELS.has(channelName);

  // DMs always respond; server channels require mention or active channel
  if (!isDM && !isMentioned && !isActiveChannel) return;

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
  const rawText = content.replace(/<@!?\d+>/g, '').trim();

  if (!rawText) {
    await message.reply("Yeah? What's up?");
    return;
  }

  // Preprocess for voice input artifacts + detect intent
  const { cleanedText, intent, isVoiceInput } = preprocessVoiceInput(rawText);

  // React immediately with intent emoji (non-blocking)
  const emoji = INTENT_EMOJI[intent] ?? '👀';
  message.react(emoji).catch(() => {}); // ignore reaction failures silently

  // Show typing indicator
  await message.channel.sendTyping();

  const channelCfg = CHANNEL_CONFIG[channelName];
  const isIdeasChannel = channelCfg?.project === 'ideas';

  // Capture ideas in parallel (don't await — fire and forget)
  if (isIdeasChannel) {
    captureIdea(message, { cleanedText, intent, isVoiceInput }, client).catch((err) =>
      log(`Idea capture error: ${err.message}`)
    );
  }

  const systemPrompt = buildSystemPrompt(channelName, isVoiceInput);
  const history = getHistory(message.channel.id);

  try {
    const response = await askClaude(systemPrompt, history, cleanedText);

    // Save to memory
    addMessage(message.channel.id, 'user', cleanedText);
    addMessage(message.channel.id, 'assistant', response);

    // Thread for long responses or structured doc requests
    const shouldThread = response.length > 1500 || intent === 'prd' || intent === 'task';

    if (shouldThread) {
      try {
        const threadName = `${intent}: ${cleanedText.slice(0, 50)}${cleanedText.length > 50 ? '...' : ''}`;
        const thread = await message.startThread({
          name: threadName,
          autoArchiveDuration: 1440,
        });
        const chunks = splitMessage(response);
        for (const chunk of chunks) {
          await thread.send(chunk);
        }
        return;
      } catch (threadErr) {
        log(`Thread creation failed, falling back to channel: ${threadErr.message}`);
      }
    }

    // Default: send in channel
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

    case '!ideas': {
      const recent = getAllRecentIdeas(10);
      if (recent.length === 0) {
        await message.reply('No ideas captured yet. Drop something in #idea-capture.');
        break;
      }
      const lines = recent.map((idea, i) => {
        const date = new Date(idea.timestamp).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
        return `**${i + 1}.** [${date}] **${idea.author}** in #${idea.channelName}: ${idea.cleaned.slice(0, 100)}${idea.cleaned.length > 100 ? '...' : ''}`;
      });
      await message.reply(`**Last ${recent.length} captured ideas:**\n\n${lines.join('\n')}`);
      break;
    }

    case '!help': {
      await message.reply(
        `Here's what I can do:\n\n` +
        `**Commands**\n` +
        `\`!clear\` — wipe my memory for this channel\n` +
        `\`!status\` — uptime, model, and memory info\n` +
        `\`!model\` — which Claude model I'm using\n` +
        `\`!ideas\` — show last 10 captured ideas\n` +
        `\`!help\` — this message\n\n` +
        `**Capabilities**\n` +
        `Discuss ideas and strategy, draft PRDs and docs, review code, debug problems, brainstorm. Mention me anywhere or just talk in a project channel. Voice input via Wispr Flow is supported.`
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
