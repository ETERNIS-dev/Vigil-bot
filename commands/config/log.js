const LogConfig = require('../../database/models/LogConfig');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embedBuilder');

const VALID_CATEGORIES = ['moderation', 'messages', 'members', 'channels', 'roles', 'voice', 'invites', 'server'];

module.exports = {
  name: 'log',
  aliases: [],
  description: 'Configure log channels.',
  usage: 'log <set|remove|list> [category] [#channel]',
  permissions: ['ManageGuild'],
  cooldown: 3,
  async execute(message, args, client) {
    const sub = args[0]?.toLowerCase();
    if (sub === 'list') {
      const config = await LogConfig.findOne({ guildId: message.guild.id });
      if (!config) return message.reply({ embeds: [infoEmbed('Log Channels', 'No log channels configured.')] });
      const lines = VALID_CATEGORIES.map(cat => `**${cat}:** ${config.channels[cat] ? `<#${config.channels[cat]}>` : 'Not set'}`).join('\n');
      return message.reply({ embeds: [infoEmbed('Log Channels', lines)] });
    }
    if (sub === 'set') {
      const category = args[1]?.toLowerCase();
      if (!VALID_CATEGORIES.includes(category)) return message.reply({ embeds: [errorEmbed(`Valid categories: ${VALID_CATEGORIES.join(', ')}`)] });
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply({ embeds: [errorEmbed('Please mention a channel.')] });
      const update = {}; update[`channels.${category}`] = ch.id;
      await LogConfig.findOneAndUpdate({ guildId: message.guild.id }, { $set: update }, { upsert: true, new: true });
      return message.reply({ embeds: [successEmbed(`**${category}** logs → ${ch}.`)] });
    }
    if (sub === 'remove') {
      const category = args[1]?.toLowerCase();
      if (!VALID_CATEGORIES.includes(category)) return message.reply({ embeds: [errorEmbed(`Valid categories: ${VALID_CATEGORIES.join(', ')}`)] });
      const update = {}; update[`channels.${category}`] = null;
      await LogConfig.findOneAndUpdate({ guildId: message.guild.id }, { $set: update }, { upsert: true });
      return message.reply({ embeds: [successEmbed(`**${category}** log channel removed.`)] });
    }
    message.reply({ embeds: [errorEmbed('Usage: `log set <category> <#channel>` | `log remove <category>` | `log list`')] });
  },
};
