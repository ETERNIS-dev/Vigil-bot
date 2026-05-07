# Vigil Discord Moderation Bot

A full-featured Discord moderation bot with automod, logging, welcome messages, reaction roles, and a web dashboard.

## Run & Operate

- `node index.js` — start the bot + dashboard
- Dashboard runs on `DASHBOARD_PORT` (default 3000)

## Stack

- Node.js 24, CommonJS
- discord.js v14 (prefix-based commands, `v!`)
- MongoDB + Mongoose
- Express 4 + EJS dashboard
- passport-discord OAuth2

## Where things live

- `index.js` — bot entry point (loads commands, events, connects DB, starts dashboard)
- `commands/` — 44 commands split into `moderation/`, `automod/`, `config/`, `roles/`, `utility/`
- `events/` — 17 Discord event handlers
- `listeners/automod.js` — full automod engine (10 rules)
- `utils/helpers.js` — shared helpers (getGuild, createCase, parseDuration, etc.)
- `utils/embedBuilder.js` — consistent embed builders + COLORS
- `database/models/` — 11 Mongoose models
- `database/connection.js` — MongoDB connect
- `dashboard/` — Express web dashboard (EJS views, Tailwind CSS)
- `.env.example` — all required env vars

## Required Environment Variables

| Variable | Description |
|---|---|
| `BOT_TOKEN` | Discord bot token |
| `MONGO_URI` | MongoDB connection string |
| `CLIENT_ID` | Discord app client ID |
| `CLIENT_SECRET` | Discord app client secret |
| `CALLBACK_URL` | OAuth2 callback (e.g. `http://localhost:3000/auth/callback`) |
| `SESSION_SECRET` | Session secret (already set as Replit secret) |
| `OWNER_ID` | Your Discord user ID (dashboard access) |
| `DASHBOARD_PORT` | Dashboard port (default 3000) |

## Architecture decisions

- All bot files live at workspace root (index.js, commands/, events/, etc.) alongside the monorepo
- Bot dependencies installed with `pnpm add --ignore-workspace-root-check` into root node_modules
- Automod config is cached in-memory per-guild for 60 seconds (`invalidateAutomodCache` on writes)
- Dashboard is owner-only — checks `req.user.id === process.env.OWNER_ID`
- Cases auto-log to `modLogChannel` via `createCase()` helper
- Warn threshold checks run after every `WARN` type case is created

## Product

- **44 commands**: ban, unban, kick, warn, mute, unmute, purge, lock, unlock, case management, 10 automod rules, 12 config commands, reaction roles, role connections, 5 utility commands
- **10 automod rules**: spam, channel spam, mentions, attachments, emojis, message lines, caps, blocked words, link filter, invite filter
- **Logging**: 8 categories (moderation, messages, members, channels, roles, voice, invites, server)
- **Welcome system**: unlimited join/leave/boost/role messages with full embed builder
- **Web dashboard**: GUI for automod, cases, logging, messages, reaction roles

## User preferences

- Prefix: `v!` (customizable per server via `v!prefix`)
- No placeholders — all files fully implemented
- Silent error handling on Discord API calls to prevent bot crashes

## Gotchas

- Discord requires `MessageContent` privileged intent to be enabled in the Developer Portal
- `GuildPresences` intent also needs to be enabled for `v!serverinfo` online count
- Maximum timeout duration is 28 days (Discord API limit) — enforced in `v!mute`
- Purge only works on messages <14 days old (Discord bulk delete limit)
- Dashboard OAuth callback URL must exactly match what's set in Discord Developer Portal
