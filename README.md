# ⚔️ Vigil — Discord Moderation Bot

A full-featured Discord moderation bot with automod, logging, welcome messages, reaction roles, and a web dashboard.

## Features

- **Moderation**: ban, unban, kick, warn, mute (native timeout), unmute, purge, lock/unlock, case management, reporting
- **Automod Engine**: spam, channel spam, mentions, attachments, emojis, message lines, caps, blocked words, link filter, invite filter
- **Warn Thresholds**: Auto-punish users who accumulate warnings
- **Logging**: Full server audit logs across 8 categories
- **Welcome System**: Unlimited join/leave/boost/role messages per server with embed builder
- **Reaction Roles**: Interactive role assignment via emoji reactions
- **Role Connections**: Auto-add/remove roles when another role changes
- **Auto Roles**: Assign roles to new members automatically (with optional delay)
- **Immune Roles**: Roles that bypass automod and moderation commands
- **Reason Aliases**: Shortcut aliases for common moderation reasons
- **Web Dashboard**: Full GUI for all configuration

## Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Discord Application with Bot token

## Installation

```bash
git clone <your-repo>
cd vigil
npm install
cp .env.example .env
# Edit .env with your values
node index.js
```

## Environment Variables

| Variable | Description |
|---|---|
| `BOT_TOKEN` | Your Discord bot token |
| `MONGO_URI` | MongoDB connection string |
| `CLIENT_ID` | Discord application client ID |
| `CLIENT_SECRET` | Discord application client secret |
| `CALLBACK_URL` | OAuth2 callback URL (e.g. `http://localhost:3000/auth/callback`) |
| `SESSION_SECRET` | Random secret string for sessions |
| `OWNER_ID` | Your Discord user ID (dashboard access) |
| `DASHBOARD_PORT` | Port for the web dashboard (default: 3000) |

## Inviting the Bot

Required permissions:
- Manage Roles, Kick Members, Ban Members, Manage Channels
- Manage Messages, Read Message History, Send Messages
- View Channels, Moderate Members

## Dashboard

Access at `http://localhost:3000` (or your configured `CALLBACK_URL` host).
Only the user with `OWNER_ID` can access the dashboard.

## Commands

### Moderation
| Command | Description | Permission |
|---|---|---|
| `v!ban <@user> [reason]` | Ban a member | BanMembers |
| `v!unban <id> [reason]` | Unban a user | BanMembers |
| `v!kick <@user> [reason]` | Kick a member | KickMembers |
| `v!warn <@user> [reason]` | Warn a member | ModerateMembers |
| `v!mute <@user> <duration> [reason]` | Timeout a member | ModerateMembers |
| `v!unmute <@user> [reason]` | Remove timeout | ModerateMembers |
| `v!purge <amount> [--user @user]` | Bulk delete messages | ManageMessages |
| `v!lock [#channel] [reason]` | Lock a channel | ManageChannels |
| `v!unlock [#channel] [reason]` | Unlock a channel | ManageChannels |
| `v!case <id>` | View a case | ModerateMembers |
| `v!cases <@user>` | View all cases for a user | ModerateMembers |
| `v!delcase <id>` | Delete a case | Administrator |
| `v!report <@user> <reason>` | Report a user | None |

### Automod
| Command | Description |
|---|---|
| `v!automod` | View automod overview |
| `v!spam [on\|off\|limit\|window\|punishment\|mute\|alert\|message]` | Configure spam filter |
| `v!channelspam [...]` | Configure channel spam filter |
| `v!mentions [...]` | Configure mentions filter |
| `v!attachments [...]` | Configure attachments filter |
| `v!emojis [...]` | Configure emoji filter |
| `v!msglines [on\|off\|warnat\|deleteat\|window\|...]` | Configure message lines filter |
| `v!caps [on\|off\|percent\|minchars\|...]` | Configure caps filter |
| `v!words [on\|off\|group ...]` | Configure blocked words |
| `v!links [on\|off\|whitelist\|...]` | Configure link filter |
| `v!invites [on\|off\|whitelist\|...]` | Configure invite filter |
| `v!warnthreshold [add\|remove]` | Configure warn thresholds |

### Config
| Command | Description |
|---|---|
| `v!setup` | Interactive setup wizard |
| `v!prefix <prefix>` | Change bot prefix |
| `v!modlog <#channel>` | Set mod log channel |
| `v!log set/remove/list <category> [#channel]` | Configure log channels |
| `v!autorole <add\|remove\|list\|delay>` | Manage auto-roles |
| `v!immune <add\|remove\|list>` | Manage immune roles |
| `v!reason <add\|remove\|list>` | Manage reason aliases |
| `v!welcome <list\|create\|edit\|delete\|toggle\|test>` | Manage join messages |
| `v!leave <list\|create\|delete\|toggle\|test>` | Manage leave messages |
| `v!boost <list\|create\|delete\|toggle\|test>` | Manage boost messages |
| `v!rolemsg <list\|create\|delete\|toggle>` | Manage role messages |

### Roles
| Command | Description |
|---|---|
| `v!rrole create <#channel> <title> \| <desc>` | Create reaction role message |
| `v!rrole addoption <msgID> <emoji> <@role> [desc]` | Add option to reaction role |
| `v!rrole removeoption <msgID> <emoji>` | Remove option |
| `v!rrole list` | List all reaction roles |
| `v!rrole edit <msgID> <title> \| <desc>` | Edit reaction role |
| `v!rrole delete <msgID>` | Delete reaction role |
| `v!roleconnect <add\|remove\|list>` | Manage role connections |

### Utility
| Command | Description |
|---|---|
| `v!help [command\|category]` | Show help menu |
| `v!userinfo [@user]` | View user information |
| `v!serverinfo` | View server information |
| `v!botinfo` | View bot information |
| `v!msghistory <@user>` | View cached message history |

## Welcome Message Variables

| Variable | Description |
|---|---|
| `{user}` | Mention the user |
| `{username}` | Plain username |
| `{tag}` | username#0000 |
| `{server}` | Server name |
| `{memberCount}` | Total member count |
| `{boostCount}` | Total boost count |
| `{roleAdded}` | Name of role added (rolemsg) |
| `{roleRemoved}` | Name of role removed (rolemsg) |
