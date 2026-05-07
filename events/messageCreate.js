const runAutomod = require('../listeners/automod');
const { getGuild, expandReason } = require('../utils/helpers');
const { errorEmbed } = require('../utils/embedBuilder');
const MessageCache = require('../database/models/MessageCache');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;

    // Update message cache
    try {
      const entry = await MessageCache.findOneAndUpdate(
        { guildId: message.guild.id, userId: message.author.id },
        {
          $push: {
            messages: {
              $each: [{ content: message.content, channelId: message.channel.id, channelName: message.channel.name, timestamp: new Date() }],
              $slice: -20,
            },
          },
        },
        { upsert: true, new: true },
      );
    } catch (_) { /* silent */ }

    // Run automod
    const blocked = await runAutomod(client, message);
    if (blocked) return;

    // Get guild prefix
    const guildSettings = await getGuild(message.guild.id);
    const prefix = guildSettings.prefix || 'v!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    // Cooldown
    if (!client.cooldowns.has(command.name)) {
      client.cooldowns.set(command.name, new Map());
    }
    const now = Date.now();
    const timestamps = client.cooldowns.get(command.name);
    const cooldownMs = (command.cooldown || 3) * 1000;
    if (timestamps.has(message.author.id)) {
      const expiry = timestamps.get(message.author.id) + cooldownMs;
      if (now < expiry) {
        const remaining = ((expiry - now) / 1000).toFixed(1);
        return message.reply({ embeds: [errorEmbed(`Please wait ${remaining}s before using \`${command.name}\` again.`)] });
      }
    }
    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownMs);

    // Permission check
    if (command.permissions && command.permissions.length > 0) {
      const missing = command.permissions.filter(p => !message.member.permissions.has(p));
      if (missing.length) {
        return message.reply({ embeds: [errorEmbed(`You need the following permissions: ${missing.join(', ')}`)] });
      }
    }

    // Expand reason alias in args
    if (args.length > 0) {
      const maybeAlias = args[args.length - 1];
      const expanded = await expandReason(message.guild.id, maybeAlias);
      if (expanded !== maybeAlias) args[args.length - 1] = expanded;
    }

    try {
      await command.execute(message, args, client);
    } catch (err) {
      console.error(`[Vigil] Command error (${command.name}):`, err);
      message.reply({ embeds: [errorEmbed('An error occurred while executing that command.')] }).catch(() => {});
    }
  },
};
