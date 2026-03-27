# Bridgette

AI agent for Bridge, powered by Claude. Lives in Discord. Knows your projects.

---

## Setup (5 steps)

**1. Clone the repo**
```bash
git clone https://github.com/your-org/bridgette.git
cd bridgette
```

**2. Set up your environment**
```bash
cp .env.example .env
```
Open `.env` and fill in:
- `DISCORD_TOKEN` — your Discord bot token (from the Discord Developer Portal)
- `ANTHROPIC_API_KEY` — your Anthropic API key (from console.anthropic.com)

**3. Install dependencies**
```bash
npm install
```

**4. Start the bot**
```bash
npm start
```
For development with auto-restart on file changes:
```bash
npm run dev
```

**5. Invite Bridgette to your server**

Generate your invite URL from the Discord Developer Portal:
- Go to your app → OAuth2 → URL Generator
- Scopes: `bot`
- Bot permissions: `Send Messages`, `Read Message History`, `Add Reactions`, `Use External Emojis`, `Embed Links`, `Attach Files`

Or use this URL format (replace `YOUR_CLIENT_ID`):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274878032960&scope=bot
```

---

## How Bridgette works

- **@mention her** in any channel to get a response
- **Send any message** in a mapped project channel (no @mention needed)
- She remembers the last 20 messages per channel (resets on restart)

### Mapped channels
| Channel | Context |
|---|---|
| `#bridgette` | General — anything goes |
| `#bridge-frontend` | Next.js, React, Tailwind, shadcn/ui |
| `#bridge-backend` | Supabase, Postgres, APIs |
| `#bridge-prd` | PRDs and product specs |
| `#moralis-site` | Morális studio website |
| `#idea-capture` | Quick ideas and brainstorms |
| `#skills-lab` | Agent templates and workflows |
| `#agent-logs` | Logs and reports |

### Commands
| Command | What it does |
|---|---|
| `!clear` | Wipe Bridgette's memory for the current channel |
| `!status` | Uptime, model, and active memory info |
| `!model` | Which Claude model is running |
| `!help` | List commands and capabilities |

---

## Deploy to Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Select your repo
4. Go to the service → Variables tab
5. Add `DISCORD_TOKEN` and `ANTHROPIC_API_KEY`
6. Railway auto-deploys. Bridgette goes online.

That's it. Railway uses Nixpacks to detect Node.js automatically — no Dockerfile needed.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | Yes | Your Discord bot token |
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `ALLOWED_USER_IDS` | No | Comma-separated Discord user IDs. If set, only these users can talk to Bridgette. If not set, anyone in the server can. |
| `LOG_CHANNEL_ID` | No | Reserved for future use |
