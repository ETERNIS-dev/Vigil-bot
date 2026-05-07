require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const connectDB = require('./database/connection');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember,
    Partials.Reaction,
    Partials.User,
  ],
});

client.commands = new Collection();
client.cooldowns = new Collection();

function loadCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadCommands(fullPath);
    } else if (entry.name.endsWith('.js')) {
      const cmd = require(fullPath);
      if (cmd.name) {
        client.commands.set(cmd.name, cmd);
        if (Array.isArray(cmd.aliases)) {
          cmd.aliases.forEach(a => client.commands.set(a, cmd));
        }
      }
    }
  }
}

loadCommands(path.join(__dirname, 'commands'));

const eventsDir = path.join(__dirname, 'events');
fs.readdirSync(eventsDir)
  .filter(f => f.endsWith('.js'))
  .forEach(file => {
    const event = require(path.join(eventsDir, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  });

async function start() {
  await connectDB();
  require('./dashboard/app')(client);
  await client.login(process.env.BOT_TOKEN);
}

start().catch(err => {
  console.error('Failed to start Vigil:', err);
  process.exit(1);
});
